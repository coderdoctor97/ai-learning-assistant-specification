import { expect, test } from "@playwright/test";
import { VIEWPORT_CONTENT, VIEWPORT_ROUTES } from "../support/viewport";

// Explicit mobile emulation makes a missing viewport observable (desktop-only
// setViewportSize checks can pass even when a mobile browser would use 980px).
for (const width of [375, 768, 1440]) {
  test.describe(`viewport at ${width}px`, () => {
    test.use({
      viewport: { width, height: 812 },
      isMobile: width < 1440,
      hasTouch: width < 1440,
    });
    for (const route of VIEWPORT_ROUTES) {
      test(`${route} matches device width without horizontal overflow`, async ({ page }) => {
        await page.goto(route);
        await page.locator("main").waitFor();
        // Wait for client-rendered Studio/Settings content, not just their shells.
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        const viewport = page.locator('meta[name="viewport" i]');
        await expect(viewport).toHaveCount(1);
        await expect(viewport).toHaveAttribute("name", "viewport");
        await expect(viewport).toHaveAttribute("content", VIEWPORT_CONTENT);
        await expect(page.locator('head > meta[name="viewport"]')).toHaveCount(1);
        const dimensions = await page.evaluate(() => ({
          inner: window.innerWidth,
          client: document.documentElement.clientWidth,
          scroll: document.documentElement.scrollWidth,
        }));
        console.log(`${route} @ ${width}: ${JSON.stringify(dimensions)}`);
        expect(dimensions.inner).toBe(width);
        expect(dimensions.client).toBe(dimensions.inner);
        expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.inner + 1);
      });
    }
  });
}
