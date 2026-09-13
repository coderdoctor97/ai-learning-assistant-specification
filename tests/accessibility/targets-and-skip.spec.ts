import { expect, test } from "@playwright/test";
import { clearDevPortal, cleanupSessions } from "../support/seed";

/*
 * Geometry and landmark checks (WCAG 2.2 AA):
 *  • 2.5.8 Target Size — every visible interactive control is ≥24×24px.
 *  • 2.4.11 Focus Not Obscured — focusable regions scroll clear of the
 *    sticky header (scroll-margin-top is set).
 *  • Skip links + <main id="main-content"> landmark on / and /studio.
 */
test.describe.configure({ mode: "serial" });

test("landing: skip link appears on focus and jumps to main", async ({ page }) => {
  await page.goto("/");
  await clearDevPortal(page);
  const skipLink = page.locator(".skip-link");
  // Unfocused, the link sits off-canvas (translateY(-200%)) rather than
  // display:none — assert the computed transform, not Playwright's
  // visibility heuristic (offscreen elements still count as "visible").
  const offscreen = await skipLink.evaluate((element) => getComputedStyle(element).transform);
  expect(offscreen).not.toBe("none");

  await page.keyboard.press("Tab");
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();

  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  const main = page.locator("main#main-content");
  await expect(main).toBeVisible();
});

test("studio: skip link appears on focus", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("heading", { level: 1 }).waitFor();
  await clearDevPortal(page);
  // /studio autofocuses the new-session topic input; reset focus to the
  // document so the first Tab starts from the top of the tab order.
  await page.evaluate(() => {
    // blur() alone retains Chromium's sequential navigation starting point at
    // the autofocus input. Focus the document root to actually reset traversal.
    document.body.tabIndex = -1;
    document.body.focus();
    document.body.removeAttribute("tabindex");
  });
  const skipLink = page.locator(".skip-link");
  await page.keyboard.press("Tab");
  await expect(skipLink).toBeFocused();
});

test("every visible interactive control meets the 24px target minimum", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("heading", { level: 1 }).waitFor();

  const controls = page.locator("main#main-content a:visible, main#main-content button:visible");
  const count = await controls.count();
  expect(count).toBeGreaterThan(5);

  const undersized: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const control = controls.nth(index);
    const box = await control.boundingBox();
    if (!box) continue;
    if (box.width < 24 || box.height < 24) {
      undersized.push(
        `${await control.getAttribute("aria-label") ?? (await control.textContent())?.trim().slice(0, 30) ?? "control"} ` +
          `→ ${Math.round(box.width)}×${Math.round(box.height)}`,
      );
    }
  }
  expect(undersized).toEqual([]);
});

test("focusable sections scroll clear of the sticky header", async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("heading", { level: 1, name: "Settings" }).waitFor();
  const scrollMargin = await page.locator("#methodologies, [id='settings-panel-providers']").first().evaluate(
    (element) => getComputedStyle(element).scrollMarginTop,
  );
  expect(parseFloat(scrollMargin)).toBeGreaterThanOrEqual(48);
});

test("forced-colors fallback: boxed surfaces carry opaque outlines", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/");
  const card = page.locator(".card").first();
  await expect(card).toBeVisible();
  const outline = await card.evaluate((element) => getComputedStyle(element).outlineStyle);
  expect(outline).not.toBe("none");
});

test.afterAll(async ({ request }) => {
  await cleanupSessions(request);
});
