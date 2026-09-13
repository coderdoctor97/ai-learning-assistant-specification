import { expect, test } from "@playwright/test";

/*
 * Visual regression checkpoint for the landing page. Animations are forced
 * to their settled state (reducedMotion) and fonts are pinned to the bundled
 * Open Sans so the baseline stays deterministic across machines.
 */
test("landing page matches baseline", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("heading", { level: 1 }).waitFor();
  await page.addStyleTag({ content: "*{font-family:'Open Sans',ui-sans-serif,system-ui,sans-serif !important}" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  await expect(page).toHaveScreenshot("landing.png", {
    fullPage: true,
    maxDiffPixelRatio: 0.02,
  });
});

/*
 * Viewport-bound reveals: below-fold sections must stay settled until they
 * enter the viewport, and must never stay hidden under reduced motion.
 */
test("below-fold reveals trigger on viewport entry", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("heading", { level: 1 }).waitFor();

  const lastPillar = page.locator("article").nth(2);
  await expect(lastPillar).toBeAttached();
  // Below the fold: the observer has not revealed it yet.
  expect(await lastPillar.getAttribute("class")).not.toContain("is-inview");

  await lastPillar.scrollIntoViewIfNeeded();
  await expect(lastPillar).toHaveClass(/is-inview/, { timeout: 10_000 });
});

test("reduced motion never hides revealed content", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const lastPillar = page.locator("article").nth(2);
  await expect(lastPillar).toBeVisible();
  // The observer gate is skipped entirely, so content is never hidden.
  const opacity = await lastPillar.evaluate((element) => getComputedStyle(element).opacity);
  expect(Number(opacity)).toBe(1);
});
