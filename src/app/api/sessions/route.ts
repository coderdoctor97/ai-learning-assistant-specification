import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { learningConfigs, sessions as sessionsTable, settings as settingsTable } from "@/db/schema";
import { fail, handleError, ok, readJson, requireString } from "@/lib/api";
import { ensureBootstrap } from "@/lib/bootstrap";
import { DEFAULT_STEPS } from "@/lib/defaults";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureBootstrap();
    const rows = await db.select().from(sessionsTable).orderBy(desc(sessionsTable.updatedAt));
    return ok({ sessions: rows });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    await ensureBootstrap();
    const body = await readJson<{
      topic?: string;
      title?: string;
      configId?: string | null;
      projectId?: string | null;
      dynamicAgent?: boolean;
    }>(request);

    const topic = requireString(body.topic, "Topic", 500);
    const [current] = await db.select().from(settingsTable).where(eq(settingsTable.id, "global")).limit(1);
    const configId = body.configId ?? current?.activeConfigId ?? null;

    let configName = "Default methodology";
    let steps = DEFAULT_STEPS;
    if (configId) {
      const [config] = await db.select().from(learningConfigs).where(eq(learningConfigs.id, configId)).limit(1);
      if (config) {
        configName = config.name;
        steps = config.steps;
      }
    }
    if (!steps.length) return fail("The selected methodology has no steps.");

    const [created] = await db
      .insert(sessionsTable)
      .values({
        topic,
        title: (body.title?.trim() || topic).slice(0, 120),
        configId,
        configName,
        configSteps: steps,
        projectId: body.projectId ?? null,
        dynamicAgent: typeof body.dynamicAgent === "boolean" ? body.dynamicAgent : (current?.dynamicAgent ?? false),
      })
      .returning();

    if (configId && current?.activeConfigId !== configId) {
      await db
        .update(settingsTable)
        .set({ activeConfigId: configId, updatedAt: new Date() })
        .where(eq(settingsTable.id, "global"));
    }

    return ok({ session: created }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
