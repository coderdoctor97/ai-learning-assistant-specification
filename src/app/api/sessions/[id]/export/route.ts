import { fail, handleError } from "@/lib/api";
import {
  buildStudyDocument,
  slugify,
  toDocx,
  toHtml,
  toMarkdown,
  toText,
  toZipBundle,
} from "@/lib/export/document";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FORMATS = ["md", "html", "txt", "docx", "zip", "pdf"] as const;
type Format = (typeof FORMATS)[number];

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const format = (url.searchParams.get("format") ?? "md") as Format;
    if (!FORMATS.includes(format)) return fail("Unsupported export format.");

    const doc = await buildStudyDocument(id);
    if (!doc) return fail("Session not found.", 404);
    if (!doc.complete) {
      return fail("Export unlocks once every stage of the learning sequence has been completed.", 409);
    }

    const base = slugify(doc.title);

    if (format === "pdf") {
      // Browser print pipeline: a clean, print-ready study document.
      return new Response(toHtml(doc, { print: true }), {
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
      });
    }
    if (format === "html") {
      return new Response(toHtml(doc), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "content-disposition": `attachment; filename="${base}.html"`,
        },
      });
    }
    if (format === "txt") {
      return new Response(toText(doc), {
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "content-disposition": `attachment; filename="${base}.txt"`,
        },
      });
    }
    if (format === "docx") {
      const buffer = await toDocx(doc);
      return new Response(new Uint8Array(buffer), {
        headers: {
          "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "content-disposition": `attachment; filename="${base}.docx"`,
        },
      });
    }
    if (format === "zip") {
      const buffer = await toZipBundle(doc);
      return new Response(new Uint8Array(buffer), {
        headers: {
          "content-type": "application/zip",
          "content-disposition": `attachment; filename="${base}-bundle.zip"`,
        },
      });
    }

    return new Response(toMarkdown(doc), {
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "content-disposition": `attachment; filename="${base}.md"`,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
