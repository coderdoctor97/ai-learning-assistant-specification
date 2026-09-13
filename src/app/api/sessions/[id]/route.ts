import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  attachments as attachmentsTable,
  messages as messagesTable,
  sessions as sessionsTable,
  stages as stagesTable,
} from "@/db/schema";
import { fail, handleError, ok, readJson } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, id)).limit(1);
    if (!session) return fail("Session not found.", 404);

    const [stageRows, messageRows, attachmentRows] = await Promise.all([
      db.select().from(stagesTable).where(eq(stagesTable.sessionId, id)).orderBy(asc(stagesTable.index)),
      db.select().from(messagesTable).where(eq(messagesTable.sessionId, id)).orderBy(asc(messagesTable.createdAt)),
      db.select().from(attachmentsTable).where(eq(attachmentsTable.sessionId, id)),
    ]);

    return ok({
      session,
      stages: stageRows,
      messages: messageRows,
      attachments: attachmentRows.map((attachment) => ({
        id: attachment.id,
        name: attachment.name,
        mime: attachment.mime,
        size: attachment.size,
        kind: attachment.kind,
        hasText: attachment.extractedText.length > 0,
        hasBinary: Boolean(attachment.dataUrl),
        createdAt: attachment.createdAt,
      })),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await readJson<{
      title?: string;
      pinned?: boolean;
      projectId?: string | null;
      currentStage?: number;
      dynamicAgent?: boolean;
      status?: string;
      steps?: { id?: string; title?: string; instructions?: string }[];
    }>(request);

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (Array.isArray(body.steps)) {
      const steps = body.steps
        .map((step) => ({
          id: String(step.id ?? crypto.randomUUID()).slice(0, 64),
          title: String(step.title ?? "").trim().slice(0, 120),
          instructions: String(step.instructions ?? "").trim().slice(0, 4000),
        }))
        .filter((step) => step.title);
      if (!steps.length) return fail("A session needs at least one step.");
      patch.configSteps = steps;
    }
    if (typeof body.title === "string" && body.title.trim()) patch.title = body.title.trim().slice(0, 120);
    if (typeof body.pinned === "boolean") patch.pinned = body.pinned;
    if ("projectId" in body) patch.projectId = body.projectId ?? null;
    if (typeof body.dynamicAgent === "boolean") patch.dynamicAgent = body.dynamicAgent;
    if (typeof body.currentStage === "number") patch.currentStage = Math.max(0, Math.round(body.currentStage));
    if (body.status === "active" || body.status === "completed") patch.status = body.status;

    const [updated] = await db.update(sessionsTable).set(patch).where(eq(sessionsTable.id, id)).returning();
    if (!updated) return fail("Session not found.", 404);
    return ok({ session: updated });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    await db.delete(sessionsTable).where(eq(sessionsTable.id, id));
    return ok({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}
