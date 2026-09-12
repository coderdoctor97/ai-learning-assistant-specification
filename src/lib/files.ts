export const MAX_FILE_BYTES = 15 * 1024 * 1024;

export const REJECTED_EXTENSIONS = [".zip", ".json", ".exe", ".sh", ".js", ".ts", ".bat", ".dll", ".7z", ".rar", ".tar", ".gz"];

const IMAGE_MIMES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const DOC_MIMES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/markdown",
  "text/plain",
  "text/x-markdown",
];

export type IngestResult = {
  ok: true;
  kind: "image" | "document";
  mime: string;
  extractedText: string;
  dataUrl: string | null;
  note?: string;
};

export type IngestFailure = { ok: false; error: string; status: number };

function extensionOf(name: string): string {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
}

/** Magic-number sniffing so we do not trust the browser-reported MIME type. */
function sniff(bytes: Uint8Array): string | null {
  const startsWith = (sig: number[]) => sig.every((byte, index) => bytes[index] === byte);
  if (startsWith([0x25, 0x50, 0x44, 0x46])) return "application/pdf";
  if (startsWith([0x89, 0x50, 0x4e, 0x47])) return "image/png";
  if (startsWith([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith([0x47, 0x49, 0x46, 0x38])) return "image/gif";
  if (startsWith([0x52, 0x49, 0x46, 0x46])) return "image/webp";
  if (startsWith([0x50, 0x4b, 0x03, 0x04])) return "application/zip"; // docx is a zip too
  if (startsWith([0xd0, 0xcf, 0x11, 0xe0])) return "application/msword";
  return null;
}

export async function ingestFile(
  name: string,
  declaredMime: string,
  buffer: ArrayBuffer,
  options: { visionAvailable: boolean },
): Promise<IngestResult | IngestFailure> {
  const bytes = new Uint8Array(buffer);
  const extension = extensionOf(name);

  if (bytes.byteLength === 0) return { ok: false, error: "That file is empty.", status: 400 };
  if (bytes.byteLength > MAX_FILE_BYTES) {
    return { ok: false, error: `Files must be 15 MB or smaller (this one is ${(bytes.byteLength / 1048576).toFixed(1)} MB).`, status: 413 };
  }
  if (REJECTED_EXTENSIONS.includes(extension)) {
    return { ok: false, error: `${extension} files are not accepted. Supported: PDF, DOC/DOCX, Markdown, TXT and images.`, status: 415 };
  }
  if (/^application\/(zip|json)|^text\/json/i.test(declaredMime)) {
    return { ok: false, error: "ZIP and JSON uploads are rejected by the studio.", status: 415 };
  }

  const sniffed = sniff(bytes);
  const isDocx =
    extension === ".docx" ||
    declaredMime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  if (sniffed === "application/zip" && !isDocx) {
    return { ok: false, error: "This file is a ZIP archive. Archives are not accepted.", status: 415 };
  }

  const mime = sniffed && sniffed !== "application/zip" ? sniffed : declaredMime || "application/octet-stream";

  // Images -------------------------------------------------------------
  if (IMAGE_MIMES.includes(mime)) {
    if (!options.visionAvailable) {
      return {
        ok: false,
        error: "The active model does not support image input. Switch to a vision-capable model first.",
        status: 415,
      };
    }
    const base64 = Buffer.from(bytes).toString("base64");
    return {
      ok: true,
      kind: "image",
      mime,
      extractedText: "",
      dataUrl: `data:${mime};base64,${base64}`,
    };
  }

  // PDF ----------------------------------------------------------------
  if (mime === "application/pdf") {
    try {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(bytes);
      const { text } = await extractText(pdf, { mergePages: true });
      const merged = Array.isArray(text) ? text.join("\n\n") : text;
      const cleaned = merged.replace(/\u0000/g, "").replace(/\n{3,}/g, "\n\n").trim();
      if (!cleaned) {
        return {
          ok: true,
          kind: "document",
          mime,
          extractedText: "",
          dataUrl: null,
          note: "No selectable text found — this looks like a scanned PDF. Upload it as an image to a vision-capable model instead.",
        };
      }
      return { ok: true, kind: "document", mime, extractedText: cleaned.slice(0, 200000), dataUrl: null };
    } catch (error) {
      return {
        ok: false,
        error: `Could not read that PDF: ${error instanceof Error ? error.message : "parse error"}`,
        status: 422,
      };
    }
  }

  // DOC / DOCX ----------------------------------------------------------
  if (isDocx || mime === "application/msword" || extension === ".doc") {
    try {
      const mammoth = (await import("mammoth")).default;
      const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
      const cleaned = result.value.replace(/\n{3,}/g, "\n\n").trim();
      return { ok: true, kind: "document", mime, extractedText: cleaned.slice(0, 200000), dataUrl: null };
    } catch (error) {
      return {
        ok: false,
        error: `Could not read that Word document: ${error instanceof Error ? error.message : "parse error"}`,
        status: 422,
      };
    }
  }

  // Markdown / plain text ------------------------------------------------
  if (
    DOC_MIMES.includes(mime) ||
    mime.startsWith("text/") ||
    [".md", ".markdown", ".txt", ".rst"].includes(extension)
  ) {
    const text = Buffer.from(bytes).toString("utf8");
    if (/\u0000/.test(text.slice(0, 2000))) {
      return { ok: false, error: "That file does not look like readable text.", status: 415 };
    }
    const textMime = mime.startsWith("text/")
      ? mime
      : [".md", ".markdown"].includes(extension)
        ? "text/markdown"
        : "text/plain";
    return { ok: true, kind: "document", mime: textMime, extractedText: text.slice(0, 200000), dataUrl: null };
  }

  return {
    ok: false,
    error: "Unsupported file type. Supported: PDF, DOC/DOCX, Markdown, TXT and images (PNG, JPEG, WebP, GIF).",
    status: 415,
  };
}
