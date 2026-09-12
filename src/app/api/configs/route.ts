import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { learningConfigs, settings as settingsTable, type LearningStep } from "@/db/schema";
import { fail, handleError, ok, readJson, requireString } from "@/lib/api";
import { ensureBootstrap } from "@/lib/bootstrap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeSteps(raw: unknown): LearningStep[] {
  if (!Array.isArray(raw)) throw Object.assign(new Error("Steps must be a list."), { status: 400 });
  const steps = raw
    .map((entry) => {
      const item = entry as Record<string, unknown>;
      const title = String(item.title ?? "").trim().slice(0, 120);
      const instructions = String(item.instructions ?? "").trim().slice(0, 4000);
      if (!title) return null;
      return {
        id: String(item.id ?? crypto.randomUUID()).slice(0, 64),
        title,
        instructions: instructions || `Deliver the "${title}" stage of this learning sequence.`,
      } satisfies LearningStep;
    })
    .filter((step): step is LearningStep => step !== null)
    .slice(0, 20);
  if (!steps.length) throw Object.assign(new Error("A configuration needs at least one step."), { status: 400 });
  return steps;
}

export async function GET() {
  try {
    await ensureBootstrap();
    const rows = await db.select().from(learningConfigs).orderBy(asc(learningConfigs.createdAt));
    return ok({ configs: rows });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    await ensureBootstrap();
    const body = await readJson<{ name?: string; description?: string; steps?: unknown; activate?: boolean }>(request);
    const [created] = await db
      .insert(learningConfigs)
      .values({
        name: requireString(body.name, "Configuration name", 100),
        description: String(body.description ?? "").slice(0, 400),
        kind: "custom",
        steps: normalizeSteps(body.steps),
        builtIn: false,
      })
      .returning();
    if (body.activate) {
      await db
        .update(settingsTable)
        .set({ activeConfigId: created.id, updatedAt: new Date() })
        .where(eq(settingsTable.id, "global"));
    }
    return ok({ config: created }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await readJson<{ id?: string; name?: string; description?: string; steps?: unknown }>(request);
    const id = requireString(body.id, "Configuration id", 64);
    const [existing] = await db.select().from(learningConfigs).where(eq(learningConfigs.id, id)).limit(1);
    if (!existing) return fail("Configuration not found.", 404);
    if (existing.builtIn) {
      return fail("Built-in methodologies are read-only. Duplicate it first, then edit the copy.", 400);
    }
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim().slice(0, 100);
    if (typeof body.description === "string") patch.description = body.description.slice(0, 400);
    if (body.steps !== undefined) patch.steps = normalizeSteps(body.steps);
    const [updated] = await db.update(learningConfigs).set(patch).where(eq(learningConfigs.id, id)).returning();
    return ok({ config: updated });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return fail("Configuration id is required.");
    const [existing] = await db.select().from(learningConfigs).where(eq(learningConfigs.id, id)).limit(1);
    if (!existing) return fail("Configuration not found.", 404);
    if (existing.builtIn) return fail("Built-in methodologies cannot be deleted.", 400);

    const [current] = await db.select().from(settingsTable).where(eq(settingsTable.id, "global")).limit(1);
    if (current?.activeConfigId === id) {
      const [fallback] = await db
        .select()
        .from(learningConfigs)
        .where(eq(learningConfigs.presetKey, "default"))
        .limit(1);
      await db
        .update(settingsTable)
        .set({ activeConfigId: fallback?.id ?? null, updatedAt: new Date() })
        .where(eq(settingsTable.id, "global"));
    }
    await db.delete(learningConfigs).where(eq(learningConfigs.id, id));
    return ok({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}
