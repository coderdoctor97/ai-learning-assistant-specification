import { eq } from "drizzle-orm";
import { db } from "@/db";
import { learningConfigs, models, providers, settings } from "@/db/schema";
import { PRESETS } from "@/lib/defaults";
import { PROVIDER_CATALOG } from "@/lib/providers/catalog";
import { DEMO_MODEL_ID } from "@/lib/providers/gateway";

let bootstrapped: Promise<void> | null = null;

/**
 * Idempotent local bootstrap. Runs at most once per process and never resets
 * existing user data — it only fills in what is missing.
 */
export function ensureBootstrap(): Promise<void> {
  if (!bootstrapped) {
    bootstrapped = doBootstrap().catch((error) => {
      bootstrapped = null;
      throw error;
    });
  }
  return bootstrapped;
}

async function doBootstrap(): Promise<void> {
  // 1. Built-in learning configurations (presets are kept in sync, user copies are untouched).
  const existingConfigs = await db.select().from(learningConfigs);
  for (const preset of PRESETS) {
    const match = existingConfigs.find((config) => config.builtIn && config.presetKey === preset.key);
    if (!match) {
      await db.insert(learningConfigs).values({
        name: preset.name,
        description: preset.description,
        kind: preset.key === "default" ? "default" : "preset",
        presetKey: preset.key,
        steps: preset.steps,
        builtIn: true,
      });
    }
  }

  // 2. Built-in provider entries (unconfigured placeholders the user can fill in).
  const existingProviders = await db.select().from(providers);
  for (const entry of PROVIDER_CATALOG) {
    if (entry.kind === "custom") continue;
    const match = existingProviders.find((provider) => provider.builtIn && provider.kind === entry.kind);
    if (!match) {
      await db.insert(providers).values({
        name: entry.name,
        kind: entry.kind,
        baseUrl: entry.baseUrl,
        apiKeyEnv: entry.apiKeyEnv || null,
        builtIn: true,
        enabled: entry.kind === "demo",
        status: entry.kind === "demo" ? "connected" : "unknown",
        statusMessage: entry.kind === "demo" ? "Offline scaffold ready" : null,
      });
    }
  }

  // 3. Demo model row so a model is always selectable.
  const [demoProvider] = await db.select().from(providers).where(eq(providers.kind, "demo")).limit(1);
  if (demoProvider) {
    const demoModels = await db.select().from(models).where(eq(models.providerId, demoProvider.id));
    if (!demoModels.length) {
      await db.insert(models).values({
        providerId: demoProvider.id,
        modelId: DEMO_MODEL_ID,
        displayName: "Studio demo scaffold (offline)",
        contextLength: 32000,
        maxOutput: 4000,
        capabilities: {
          vision: false,
          voice: false,
          reasoning: false,
          tools: false,
          streaming: true,
          documents: true,
        },
        isFree: true,
      });
    }
  }

  // 4. Settings singleton.
  const [current] = await db.select().from(settings).where(eq(settings.id, "global")).limit(1);
  const [defaultConfig] = await db
    .select()
    .from(learningConfigs)
    .where(eq(learningConfigs.presetKey, "default"))
    .limit(1);

  if (!current) {
    await db.insert(settings).values({
      id: "global",
      activeConfigId: defaultConfig?.id ?? null,
      activeProviderId: demoProvider?.id ?? null,
      activeModelId: demoProvider ? DEMO_MODEL_ID : null,
    });
    return;
  }

  const patch: Partial<typeof settings.$inferInsert> = {};
  if (!current.activeConfigId && defaultConfig) patch.activeConfigId = defaultConfig.id;
  if (!current.activeProviderId && demoProvider) {
    patch.activeProviderId = demoProvider.id;
    patch.activeModelId = DEMO_MODEL_ID;
  }
  if (Object.keys(patch).length) {
    await db.update(settings).set(patch).where(eq(settings.id, "global"));
  }
}
