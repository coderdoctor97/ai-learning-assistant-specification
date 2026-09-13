import { isolatedDbDirectory } from "../support/isolated-db";
import { ensureBootstrap } from "@/lib/bootstrap";
import { db } from "@/db";
import { providers, settings } from "@/db/schema";
import { sanitizeProvider } from "@/lib/api";
import { resolveApiKey } from "@/lib/providers/gateway";
import { test, expect } from "@playwright/test";
import { rmSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { eq } from "drizzle-orm";

// Separate worker/file: imported DB modules never touch the application's real data.
test("fresh bootstrap defaults, secret isolation and additive legacy-settings migration", async () => {
  const connection = globalThis as typeof globalThis & { __studioSqlite?: DatabaseSync };
  const previousKey = process.env.ABHIBOTS_API_KEY;
  try {
    await ensureBootstrap();
    await ensureBootstrap();
    const rows = await db.select().from(providers);
    expect(rows.filter((row) => row.kind === "abhibots")).toHaveLength(1);
    const gateway = rows.find((row) => row.kind === "abhibots")!;
    expect(gateway).toMatchObject({ builtIn: true, enabled: false, status: "unknown", apiKey: null });
    const [current] = await db.select().from(settings);
    expect(current).toMatchObject({ activeProviderId: rows.find((row) => row.kind === "demo")!.id,
      activeModelId: "studio-demo-scaffold", dynamicAgent: false, toolUse: false });
    process.env.ABHIBOTS_API_KEY = "contract-env-key-never-real";
    expect(resolveApiKey(gateway)).toBe(process.env.ABHIBOTS_API_KEY);
    const safe = sanitizeProvider(gateway);
    expect(safe).not.toHaveProperty("apiKey");
    expect(JSON.stringify(safe)).not.toContain(process.env.ABHIBOTS_API_KEY);
    expect(safe.keySource).toBe("env");

    // Simulate a pre-integration local DB, preserving a nondefault preference.
    await db.update(settings).set({ temperature: 0.7, toolUse: true }).where(eq(settings.id, "global"));
    connection.__studioSqlite!.exec("ALTER TABLE settings DROP COLUMN tool_use");
    connection.__studioSqlite!.close();
    delete connection.__studioSqlite;
    const [migrated] = await db.select().from(settings);
    expect(migrated).toMatchObject({ temperature: 0.7, toolUse: false, activeModelId: current.activeModelId });
    // Reopening the already migrated database must be idempotent too.
    connection.__studioSqlite!.close();
    delete connection.__studioSqlite;
    expect((await db.select().from(settings))[0].toolUse).toBe(false);
  } finally {
    connection.__studioSqlite?.close();
    delete connection.__studioSqlite;
    if (previousKey === undefined) delete process.env.ABHIBOTS_API_KEY;
    else process.env.ABHIBOTS_API_KEY = previousKey;
    rmSync(isolatedDbDirectory, { recursive: true, force: true });
  }
});
