import { t } from "@/lib/i18n";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { models as modelsTable, providers as providersTable } from "@/db/schema";
import { fail, handleError, ok, readJson, sanitizeProvider } from "@/lib/api";
import { listModels, ProviderError, resolveApiKey } from "@/lib/providers/gateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const providerId = new URL(request.url).searchParams.get("providerId");
    const rows = providerId
      ? await db.select().from(modelsTable).where(eq(modelsTable.providerId, providerId))
      : await db.select().from(modelsTable);
    return ok({ models: rows });
  } catch (error) {
    return handleError(error);
  }
}

/** Discover models from the provider and refresh the local cache. */
export async function POST(request: Request) {
  try {
    const body = await readJson<{ providerId?: string }>(request);
    if (!body.providerId) return fail("providerId is required.");
    const [provider] = await db
      .select()
      .from(providersTable)
      .where(eq(providersTable.id, body.providerId))
      .limit(1);
    if (!provider) return fail("Provider not found.", 404);

    if (provider.kind !== "demo" && !resolveApiKey(provider)) {
      await db
        .update(providersTable)
        .set({
          status: "error",
          statusMessage: "No API key configured.",
          lastCheckedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(providersTable.id, provider.id));
      return fail("Add an API key before discovering models.", 400);
    }

    try {
      const discovered = await listModels(provider);
      await db.delete(modelsTable).where(eq(modelsTable.providerId, provider.id));
      if (discovered.length) {
        await db.insert(modelsTable).values(
          discovered.map((model) => ({
            providerId: provider.id,
            modelId: model.modelId,
            displayName: model.displayName,
            contextLength: model.contextLength,
            maxOutput: model.maxOutput,
            capabilities: model.capabilities,
            pricing: model.pricing,
            isFree: model.isFree,
          })),
        );
      }
      const [updated] = await db
        .update(providersTable)
        .set({
          status: discovered.usedFallback ? "unknown" : "connected",
          statusMessage: discovered.usedFallback ? t("settings.provider.abhibots.fallback") : `${discovered.length} models available`,
          enabled: true,
          lastCheckedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(providersTable.id, provider.id))
        .returning();

      const rows = await db.select().from(modelsTable).where(eq(modelsTable.providerId, provider.id));
      return ok({ provider: sanitizeProvider(updated), models: rows });
    } catch (error) {
      const message = error instanceof ProviderError ? error.message : "Discovery failed.";
      await db
        .update(providersTable)
        .set({ status: "error", statusMessage: message.slice(0, 240), lastCheckedAt: new Date(), updatedAt: new Date() })
        .where(eq(providersTable.id, provider.id));
      return fail(message, 502);
    }
  } catch (error) {
    return handleError(error);
  }
}
