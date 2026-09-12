import { asc, eq } from "drizzle-orm";
import { marked } from "marked";
import { db } from "@/db";
import {
  attachments as attachmentsTable,
  messages as messagesTable,
  sessions as sessionsTable,
  stages as stagesTable,
  type ResourceRef,
} from "@/db/schema";

export type StudyStage = {
  index: number;
  title: string;
  content: string;
  qa: { question: string; answer: string }[];
  resources: ResourceRef[];
};

export type StudyDocument = {
  sessionId: string;
  title: string;
  topic: string;
  methodology: string;
  completedAt: string;
  stages: StudyStage[];
  resources: ResourceRef[];
  images: { name: string; dataUrl: string }[];
  complete: boolean;
};

/** Remove anything that belongs to the machinery rather than the study material. */
function sanitize(markdown: string): string {
  return markdown
    .replace(/<<<LEARNING_STATE>>>[\s\S]*$/g, "")
    .replace(/^\s*(PLATFORM CONSTRAINTS|CORE ENGINE INSTRUCTION|OUTPUT CONTRACT|RETRIEVED CONTEXT|SESSION CONTEXT)[\s\S]*?$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function buildStudyDocument(sessionId: string): Promise<StudyDocument | null> {
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId)).limit(1);
  if (!session) return null;

  const [stageRows, messageRows, attachmentRows] = await Promise.all([
    db.select().from(stagesTable).where(eq(stagesTable.sessionId, sessionId)).orderBy(asc(stagesTable.index)),
    db.select().from(messagesTable).where(eq(messagesTable.sessionId, sessionId)).orderBy(asc(messagesTable.createdAt)),
    db.select().from(attachmentsTable).where(eq(attachmentsTable.sessionId, sessionId)),
  ]);

  const stages: StudyStage[] = stageRows
    .filter((stage) => stage.content.trim().length > 0)
    .map((stage) => {
      const stageMessages = messageRows.filter((message) => message.stageId === stage.id);
      const qa: { question: string; answer: string }[] = [];
      for (let index = 0; index < stageMessages.length; index += 1) {
        const message = stageMessages[index];
        if (message.role !== "user") continue;
        const answer = stageMessages.slice(index + 1).find((entry) => entry.role === "assistant");
        if (answer) qa.push({ question: message.content.trim(), answer: sanitize(answer.content) });
      }
      return {
        index: stage.index,
        title: stage.title,
        content: sanitize(stage.content),
        qa,
        resources: stage.resources ?? [],
      };
    });

  const resourceMap = new Map<string, ResourceRef>();
  for (const stage of stages) {
    for (const resource of stage.resources) resourceMap.set(resource.url || resource.id, resource);
  }
  for (const message of messageRows) {
    for (const resource of message.resources ?? []) resourceMap.set(resource.url || resource.id, resource);
  }

  return {
    sessionId,
    title: session.title,
    topic: session.topic,
    methodology: session.configName,
    completedAt: (session.completedAt ?? session.updatedAt).toISOString().slice(0, 10),
    stages,
    resources: Array.from(resourceMap.values()),
    images: attachmentRows
      .filter((attachment) => attachment.kind === "image" && attachment.dataUrl)
      .map((attachment) => ({ name: attachment.name, dataUrl: attachment.dataUrl as string })),
    complete: session.status === "completed" && stages.length >= session.configSteps.length,
  };
}

/* ------------------------------------------------------------------ */
/* Renderers                                                            */
/* ------------------------------------------------------------------ */

export function toMarkdown(doc: StudyDocument, imagePaths: Map<string, string> = new Map()): string {
  const parts: string[] = [
    `# ${doc.title}`,
    "",
    `*Study document · ${doc.topic} · ${doc.methodology} · ${doc.completedAt}*`,
    "",
    "## Contents",
    ...doc.stages.map((stage, index) => `${index + 1}. ${stage.title}`),
    "",
  ];

  for (const [index, stage] of doc.stages.entries()) {
    parts.push(`## ${index + 1}. ${stage.title}`, "", stage.content, "");
    if (stage.qa.length) {
      parts.push("### Questions raised while studying", "");
      for (const item of stage.qa) {
        parts.push(`**Q. ${item.question}**`, "", item.answer, "");
      }
    }
  }

  if (doc.images.length) {
    parts.push("## Attached material", "");
    for (const image of doc.images) {
      const path = imagePaths.get(image.name);
      parts.push(path ? `![${image.name}](${path})` : `- ${image.name}`, "");
    }
  }

  if (doc.resources.length) {
    parts.push("## Sources consulted", "");
    for (const resource of doc.resources) {
      parts.push(`- ${resource.title} — ${resource.source}${resource.url ? ` (${resource.url})` : ""}`);
    }
    parts.push("");
  }

  return parts.join("\n").replace(/\n{3,}/g, "\n\n");
}

export function toText(doc: StudyDocument): string {
  const plain = toMarkdown(doc)
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`{1,3}([^`]*)`{1,3}/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");
  return plain;
}

export function toHtml(doc: StudyDocument, options: { print?: boolean } = {}): string {
  const body = marked.parse(toMarkdown(doc), { async: false }) as string;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(doc.title)}</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; background: #f6f4f1; color: #1e1b18; font-family: "Iowan Old Style", Georgia, "Times New Roman", serif; line-height: 1.65; }
  main { max-width: 46rem; margin: 0 auto; padding: 4rem 1.5rem 6rem; }
  h1 { font-size: 2.4rem; line-height: 1.15; margin-bottom: .25rem; letter-spacing: -.01em; }
  h2 { margin-top: 2.75rem; font-size: 1.55rem; border-bottom: 1px solid #dcd4cb; padding-bottom: .4rem; }
  h3 { margin-top: 1.75rem; font-size: 1.15rem; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .9em; background: #ece7e1; padding: .1em .35em; border-radius: 4px; }
  pre { background: #ece7e1; padding: 1rem; border-radius: 10px; overflow-x: auto; }
  pre code { background: none; padding: 0; }
  blockquote { border-left: 3px solid #c08a6a; margin: 1.25rem 0; padding: .1rem 1rem; color: #52463d; font-style: italic; }
  table { border-collapse: collapse; width: 100%; margin: 1.25rem 0; font-size: .95rem; }
  th, td { border: 1px solid #d8d0c7; padding: .5rem .65rem; text-align: left; }
  th { background: #ece7e1; }
  img { max-width: 100%; border-radius: 10px; }
  a { color: #9a5b3c; }
  em { color: #6b5a4d; }
  @media print { body { background: #fff; } main { padding: 0; max-width: none; } h2 { break-after: avoid; } }
</style>
</head>
<body>
<main>${body}</main>
${options.print ? "<script>window.addEventListener('load',()=>window.print());</script>" : ""}
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char,
  );
}

/* ------------------------------------------------------------------ */
/* DOCX                                                                 */
/* ------------------------------------------------------------------ */

export async function toDocx(doc: StudyDocument): Promise<Buffer> {
  const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import("docx");

  const runs = (text: string): InstanceType<typeof TextRun>[] => {
    const out: InstanceType<typeof TextRun>[] = [];
    const pattern = /(\*\*[^*]+\*\*|_[^_]+_|\*[^*]+\*|`[^`]+`)/g;
    let lastIndex = 0;
    let match = pattern.exec(text);
    while (match) {
      if (match.index > lastIndex) out.push(new TextRun(text.slice(lastIndex, match.index)));
      const token = match[0];
      if (token.startsWith("**")) out.push(new TextRun({ text: token.slice(2, -2), bold: true }));
      else if (token.startsWith("`")) out.push(new TextRun({ text: token.slice(1, -1), font: "Consolas" }));
      else out.push(new TextRun({ text: token.slice(1, -1), italics: true }));
      lastIndex = match.index + token.length;
      match = pattern.exec(text);
    }
    if (lastIndex < text.length) out.push(new TextRun(text.slice(lastIndex)));
    return out.length ? out : [new TextRun(text)];
  };

  const children: InstanceType<typeof Paragraph>[] = [];
  const markdown = toMarkdown(doc);
  let inCode = false;

  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (line.trim().startsWith("```")) {
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      children.push(new Paragraph({ children: [new TextRun({ text: line, font: "Consolas", size: 18 })] }));
      continue;
    }
    if (!line.trim()) {
      children.push(new Paragraph(""));
      continue;
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      const levels = [HeadingLevel.TITLE, HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3];
      children.push(new Paragraph({ children: runs(heading[2]), heading: levels[heading[1].length - 1] }));
      continue;
    }
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      children.push(new Paragraph({ children: runs(bullet[1]), bullet: { level: 0 } }));
      continue;
    }
    const numbered = /^(\d+)\.\s+(.*)$/.exec(line);
    if (numbered) {
      children.push(new Paragraph({ children: runs(`${numbered[1]}. ${numbered[2]}`), indent: { left: 360 } }));
      continue;
    }
    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      children.push(new Paragraph({ children: runs(quote[1]), indent: { left: 360 }, style: undefined }));
      continue;
    }
    if (/^\|/.test(line)) {
      children.push(new Paragraph({ children: [new TextRun({ text: line.replace(/\|/g, "  ").trim(), font: "Consolas", size: 18 })] }));
      continue;
    }
    children.push(new Paragraph({ children: runs(line) }));
  }

  const document = new Document({
    creator: "Learning Studio",
    title: doc.title,
    description: `Study document for ${doc.topic}`,
    sections: [{ children }],
  });
  return Buffer.from(await Packer.toBuffer(document));
}

/* ------------------------------------------------------------------ */
/* Markdown + images bundle                                             */
/* ------------------------------------------------------------------ */

export async function toZipBundle(doc: StudyDocument): Promise<Buffer> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const folder = zip.folder("images");
  const paths = new Map<string, string>();

  doc.images.forEach((image, index) => {
    const [meta, base64] = image.dataUrl.split(",");
    if (!base64) return;
    const extension = /image\/(\w+)/.exec(meta)?.[1] ?? "png";
    const safeName = `${String(index + 1).padStart(2, "0")}-${image.name.replace(/[^\w.-]+/g, "_")}`.replace(
      /\.[^.]*$/,
      "",
    );
    const fileName = `${safeName}.${extension}`;
    folder?.file(fileName, base64, { base64: true });
    paths.set(image.name, `images/${fileName}`);
  });

  zip.file("study-document.md", toMarkdown(doc, paths));
  zip.file("study-document.html", toHtml(doc));
  return zip.generateAsync({ type: "nodebuffer" });
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60) || "study-document"
  );
}
