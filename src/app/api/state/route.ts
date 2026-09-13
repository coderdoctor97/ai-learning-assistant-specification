import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  learningConfigs,
  models as modelsTable,
  projects as projectsTable,
  providers as providersTable,
  sessions as sessionsTable,
  settings as settingsTable,
  skills as skillsTable,
} from "@/db/schema";
import { ensureBootstrap } from "@/lib/bootstrap";
import { fail, handleError, ok, readJson, sanitizeProvider } from "@/lib/api";
import { CONTEXT_LEVELS } from "@/lib/defaults";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureBootstrap();
    const [settingsRows, providerRows, modelRows, configRows, projectRows, sessionRows, skillRows] = await Promise.all([
      db.select().from(settingsTable).where(eq(settingsTable.id, "global")).limit(1),
      db.select().from(providersTable).orderBy(asc(providersTable.createdAt)),
      db.select().from(modelsTable),
      db.select().from(learningConfigs).orderBy(asc(learningConfigs.createdAt)),
      db.select().from(projectsTable).orderBy(asc(projectsTable.createdAt)),
      db.select().from(sessionsTable).orderBy(desc(sessionsTable.updatedAt)),
      db.select().from(skillsTable).orderBy(desc(skillsTable.createdAt)),
    ]);

    const settingsRow = settingsRows[0];
    return ok({
      settings: settingsRow,
      providers: providerRows.map(sanitizeProvider),
      models: modelRows,
      configs: configRows,
      projects: projectRows,
      sessions: sessionRows.map((session) => ({
        id: session.id,
        projectId: session.projectId,
        title: session.title,
        topic: session.topic,
        status: session.status,
        pinned: session.pinned,
        currentStage: session.currentStage,
        stageCount: session.configSteps.length,
        configName: session.configName,
        updatedAt: session.updatedAt,
        createdAt: session.createdAt,
      })),
      skills: skillRows,
      contextLevels: CONTEXT_LEVELS,
    });
  } catch (error) {
    return handleError(error);
  }
}

type SettingsPatch = {
  activeProviderId?: string | null;
  activeModelId?: string | null;
  activeConfigId?: string | null;
  theme?: string;
  contextLevel?: string;
  maxOutputTokens?: number;
  temperature?: number;
  dynamicAgent?: boolean;
  reasoningEnabled?: boolean;
  streaming?: boolean;
  webRetrieval?: boolean;
  toolUse?: boolean;
  learnerProfile?: { level?: string; background?: string; goals?: string; preferences?: string };
};

export async function PATCH(request: Request) {
  try {
    await ensureBootstrap();
    const body = await readJson<SettingsPatch>(request);
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    const warnings: string[] = [];

    if ("activeProviderId" in body) patch.activeProviderId = body.activeProviderId ?? null;
    if ("activeConfigId" in body) patch.activeConfigId = body.activeConfigId ?? null;
    if ("activeModelId" in body) patch.activeModelId = body.activeModelId ?? null;

    if (body.theme && ["light", "dark", "editorial"].includes(body.theme)) patch.theme = body.theme;
    if (body.contextLevel && CONTEXT_LEVELS.some((level) => level.key === body.contextLevel)) {
      patch.contextLevel = body.contextLevel;
    }
    if (typeof body.dynamicAgent === "boolean") patch.dynamicAgent = body.dynamicAgent;
    if (typeof body.reasoningEnabled === "boolean") patch.reasoningEnabled = body.reasoningEnabled;
    if (typeof body.streaming === "boolean") patch.streaming = body.streaming;
    if (typeof body.toolUse === "boolean") patch.toolUse = body.toolUse;
    if (typeof body.webRetrieval === "boolean") patch.webRetrieval = body.webRetrieval;
    if (typeof body.temperature === "number") {
      patch.temperature = Math.min(2, Math.max(0, body.temperature));
    }
    if (body.learnerProfile) {
      patch.learnerProfile = {
        level: String(body.learnerProfile.level ?? "").slice(0, 400),
        background: String(body.learnerProfile.background ?? "").slice(0, 1500),
        goals: String(body.learnerProfile.goals ?? "").slice(0, 1500),
        preferences: String(body.learnerProfile.preferences ?? "").slice(0, 1500),
      };
    }

    // Clamp the output budget against the active model's real ceiling.
    if (typeof body.maxOutputTokens === "number") {
      const [current] = await db.select().from(settingsTable).where(eq(settingsTable.id, "global")).limit(1);
      const providerId = (patch.activeProviderId as string | null | undefined) ?? current?.activeProviderId ?? null;
      const modelId = (patch.activeModelId as string | null | undefined) ?? current?.activeModelId ?? null;
      let ceiling = 8192;
      if (providerId && modelId) {
        const [model] = await db.select().from(modelsTable).where(eq(modelsTable.providerId, providerId));
        const all = await db.select().from(modelsTable).where(eq(modelsTable.providerId, providerId));
        const exact = all.find((entry) => entry.modelId === modelId) ?? model;
        if (exact) ceiling = exact.maxOutput;
      }
      const requested = Math.max(256, Math.round(body.maxOutputTokens));
      patch.maxOutputTokens = Math.min(requested, ceiling);
      if (requested > ceiling) {
        warnings.push(`Output tokens clamped to the model maximum of ${ceiling.toLocaleString()}.`);
      }
    }

    const [updated] = await db
      .update(settingsTable)
      .set(patch)
      .where(eq(settingsTable.id, "global"))
      .returning();
    if (!updated) return fail("Settings row is missing.", 500);
    return ok({ settings: updated, warnings });
  } catch (error) {
    return handleError(error);
  }
}
