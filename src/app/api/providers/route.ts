import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { providers as providersTable, settings as settingsTable } from "@/db/schema";
import { fail, handleError, ok, readJson, requireString, sanitizeProvider } from "@/lib/api";
import { ensureBootstrap } from "@/lib/bootstrap";
import { PROVIDER_CATALOG, catalogEntry } from "@/lib/providers/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureBootstrap();
    const rows = await db.select().from(providersTable).orderBy(asc(providersTable.createdAt));
    return ok({ providers: rows.map(sanitizeProvider), catalog: PROVIDER_CATALOG });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    await ensureBootstrap();
    const body = await readJson<{ name?: string; kind?: string; baseUrl?: string; apiKey?: string }>(request);
    const kind = body.kind && PROVIDER_CATALOG.some((entry) => entry.kind === body.kind) ? body.kind : "custom";
    const entry = catalogEntry(kind);
    const baseUrl = (body.baseUrl ?? entry.baseUrl).trim();
    if (!/^https?:\/\//i.test(baseUrl)) return fail("Provide a base URL starting with http:// or https://");

    const [created] = await db
      .insert(providersTable)
      .values({
        name: requireString(body.name ?? entry.name, "Provider name", 80),
        kind,
        baseUrl: baseUrl.replace(/\/+$/, ""),
        apiKey: body.apiKey?.trim() ? body.apiKey.trim() : null,
        apiKeyEnv: entry.apiKeyEnv || null,
        builtIn: false,
      })
      .returning();
    return ok({ provider: sanitizeProvider(created) }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await readJson<{
      id?: string;
      name?: string;
      baseUrl?: string;
      apiKey?: string | null;
      apiKeyEnv?: string | null;
      enabled?: boolean;
    }>(request);
    const id = requireString(body.id, "Provider id", 64);
    const patch: Record<string, unknown> = { updatedAt: new Date() };

    if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim().slice(0, 80);
    if (typeof body.baseUrl === "string" && body.baseUrl.trim()) {
      const url = body.baseUrl.trim();
      if (!/^(https?:\/\/|local:\/\/)/i.test(url)) return fail("Base URL must start with http:// or https://");
      patch.baseUrl = url.replace(/\/+$/, "");
    }
    if (body.apiKey === null) {
      patch.apiKey = null;
      patch.status = "unknown";
      patch.statusMessage = null;
    } else if (typeof body.apiKey === "string" && body.apiKey.trim()) {
      patch.apiKey = body.apiKey.trim();
      patch.status = "unknown";
      patch.statusMessage = null;
    }
    if (typeof body.apiKeyEnv === "string") patch.apiKeyEnv = body.apiKeyEnv.trim() || null;
    if (typeof body.enabled === "boolean") patch.enabled = body.enabled;

    const [updated] = await db.update(providersTable).set(patch).where(eq(providersTable.id, id)).returning();
    if (!updated) return fail("Provider not found.", 404);
    return ok({ provider: sanitizeProvider(updated) });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return fail("Provider id is required.");
    const [provider] = await db.select().from(providersTable).where(eq(providersTable.id, id)).limit(1);
    if (!provider) return fail("Provider not found.", 404);
    if (provider.builtIn) {
      await db
        .update(providersTable)
        .set({ apiKey: null, status: "unknown", statusMessage: null, enabled: false, updatedAt: new Date() })
        .where(eq(providersTable.id, id));
      return ok({ cleared: true });
    }
    const [current] = await db.select().from(settingsTable).where(eq(settingsTable.id, "global")).limit(1);
    if (current?.activeProviderId === id) {
      await db
        .update(settingsTable)
        .set({ activeProviderId: null, activeModelId: null, updatedAt: new Date() })
        .where(eq(settingsTable.id, "global"));
    }
    await db.delete(providersTable).where(eq(providersTable.id, id));
    return ok({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}
