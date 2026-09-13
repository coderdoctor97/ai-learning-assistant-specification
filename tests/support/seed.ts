import type { APIRequestContext, Page } from "@playwright/test";

/*
 * Seed helpers: drive the app's own HTTP API so keyboard/a11y suites can
 * assume a populated studio without clicking through creation flows (the
 * full creation flow itself is covered by the flows suite).
 */

const created = new Map<string, string[]>(); // worker signature → session ids

export async function seedSession(
  request: APIRequestContext,
  topic: string,
  options: { stages?: number } = {},
): Promise<string> {
  const created_ = await request.post("/api/sessions", {
    data: { topic, title: topic },
  });
  const created_json = (await created_.json()) as { session: { id: string } };
  const id = created_json.session.id;
  const stages = options.stages ?? 1;
  for (let index = 0; index < stages; index += 1) {
    const response = await request.post(`/api/sessions/${id}/generate`, {
      data: { stageIndex: index, modifier: "none" },
    });
    if (!response.ok()) throw new Error(`generate stage ${index} failed: ${response.status()}`);
  }
  const sessions = created.get(key()) ?? [];
  sessions.push(id);
  created.set(key(), sessions);
  return id;
}

function key(): string {
  return process.env.TEST_WORKER_INDEX ?? "0";
}

/** Open the studio and make sure the seeded session is the active one. */
export async function openSession(page: Page, topic: string): Promise<void> {
  await page.goto("/studio");
  const row = page.getByRole("button", { name: topic, exact: false }).first();
  await row.waitFor({ state: "visible", timeout: 30_000 });
  await row.click();
  await page.getByRole("heading", { level: 1, name: topic }).waitFor({ timeout: 30_000 });
}

export async function cleanupSessions(request: APIRequestContext): Promise<void> {
  const ids = created.get(key()) ?? [];
  for (const id of ids) {
    await request.delete(`/api/sessions/${id}`).catch(() => undefined);
  }
  created.set(key(), []);
}

/*
 * The Next.js dev overlay mounts a focusable <nextjs-portal> button at the
 * head of the document tab order in `next dev`. Production builds do not
 * have it, and the suites below assert real page tab order — so tests that
 * walk focus from the document root call this first.
 */
export async function clearDevPortal(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(() => {
    document.querySelectorAll("nextjs-portal").forEach((element) => element.remove());
  });
}
