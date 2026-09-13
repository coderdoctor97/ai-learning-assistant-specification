import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { attachments as attachmentsTable, models as modelsTable, settings as settingsTable, providers as providersTable } from "@/db/schema";
import { fail, handleError, ok } from "@/lib/api";
import { ingestFile, MAX_FILE_BYTES } from "@/lib/files";
import { NO_CAPABILITIES } from "@/lib/providers/catalog";
import { mergeCapabilities } from "@/lib/providers/gateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

async function activeCapabilities() {
  const [current] = await db.select().from(settingsTable).where(eq(settingsTable.id, "global")).limit(1);
  if (!current?.activeProviderId || !current.activeModelId) return NO_CAPABILITIES;
  const rows = await db.select().from(modelsTable).where(eq(modelsTable.providerId, current.activeProviderId));
  const model = rows.find((row) => row.modelId === current.activeModelId);
  const [provider] = await db.select().from(providersTable).where(eq(providersTable.id, current.activeProviderId));
  return mergeCapabilities(model?.capabilities, current.activeModelId, provider?.kind);
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const form = await request.formData().catch(() => null);
    if (!form) return fail("Expected a multipart upload.");
    const file = form.get("file");
    if (!(file instanceof File)) return fail("No file received.");
    if (file.size > MAX_FILE_BYTES) return fail("Files must be 15 MB or smaller.", 413);

    const capabilities = await activeCapabilities();
    const result = await ingestFile(file.name, file.type, await file.arrayBuffer(), {
      visionAvailable: capabilities.vision,
      documentsAvailable: capabilities.documents,
      audioAvailable: capabilities.voice,
    });
    if (!result.ok) return fail(result.error, result.status);

    const [created] = await db
      .insert(attachmentsTable)
      .values({
        sessionId: id,
        name: file.name.slice(0, 200),
        mime: result.mime,
        size: file.size,
        kind: result.kind,
        extractedText: result.extractedText,
        dataUrl: result.dataUrl,
      })
      .returning();

    return ok(
      {
        attachment: {
          id: created.id,
          name: created.name,
          mime: created.mime,
          size: created.size,
          kind: created.kind,
          hasBinary: Boolean(created.dataUrl),
          hasText: created.extractedText.length > 0,
          createdAt: created.createdAt,
        },
        note: result.note ?? null,
      },
      { status: 201 },
    );
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const attachmentId = new URL(request.url).searchParams.get("attachmentId");
    if (!attachmentId) return fail("attachmentId is required.");
    await db
      .delete(attachmentsTable)
      .where(and(eq(attachmentsTable.sessionId, id), eq(attachmentsTable.id, attachmentId)));
    return ok({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}
