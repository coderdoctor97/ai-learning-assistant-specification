import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { cleanupSessions, seedSession } from "../support/seed";

/*
 * Automated accessibility gate (WCAG 2.2 AA): every primary surface must
 * scan clean with axe-core, including the wcag22aa rules (target size,
 * focus obscurity related checks).
 */
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

async function scan(page: import("@playwright/test").Page) {
  // Let entrance transitions/animations settle so opacity-based contrast
  // math runs against the final rendered state. Infinite decorative loops
  // (pulse, shimmer) are excluded, and the wait is capped so a looping
  // animation can never hang the scan.
  await page.evaluate(() => {
    /* `getAnimations(options)` is newer than this project's DOM lib — the
       runtime (Chromium) supports the subtree filter. */
    type SubtreeDocument = Document & {
      getAnimations: (options?: { subtree?: boolean }) => Animation[];
    };
    const finite = (document as SubtreeDocument)
      .getAnimations({ subtree: true })
      .filter((animation) => {
        const iterations = animation.effect?.getComputedTiming().iterations ?? 1;
        return Number.isFinite(iterations) && animation.playState === "running";
      })
      .map((animation) => animation.finished.catch(() => undefined));
    const capped = new Promise((resolve) => setTimeout(resolve, 3_000));
    return Promise.race([Promise.all(finite), capped]);
  });
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  const summary = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    nodes: violation.nodes.map((node) => node.target.join(" ")),
  }));
  expect(summary).toEqual([]);
}

test.describe("axe-core scans", () => {
  test.describe.configure({ mode: "serial" });

  let seededTopic: string;

  test("landing page has zero violations", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("heading", { level: 1 }).waitFor();
    await scan(page);
  });

  test("settings page has zero violations", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("heading", { level: 1, name: "Settings" }).waitFor();
    await scan(page);
  });

  test("studio (new-session view) has zero violations", async ({ page }) => {
    await page.goto("/studio");
    await page.getByRole("heading", { level: 1 }).waitFor();
    await scan(page);
  });

  test("studio (open session) has zero violations", async ({ page }) => {
    const request = page.request;
    seededTopic = `Axe scan session ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await seedSession(request, seededTopic);
    await page.goto("/studio");
    await page.getByRole("heading", { level: 1, name: seededTopic }).waitFor();
    // Let entrance animations settle so elements are at their final state.
    await page.waitForTimeout(500);
    await scan(page);
  });

  test.afterAll(async ({ request }) => {
    await cleanupSessions(request);
  });
});
