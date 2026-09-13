import { expect, test } from "@playwright/test";
import { cleanupSessions, seedSession } from "../support/seed";

/*
 * Sidebar session ⋯ menu: hover/focus-revealed trigger, menu semantics,
 * Escape dismissal with trigger focus restoration (1.4.13 + keyboard
 * parity).
 */
test.describe.configure({ mode: "serial" });

const topic = `Menu keyboard session ${Date.now()}`;

test("menu opens via keyboard, arrows move items, Escape restores focus", async ({ page }) => {
  await seedSession(page.request, topic);
  await page.goto("/studio");
  const row = page.getByRole("button", { name: topic, exact: false }).first();
  await row.waitFor({ state: "visible" });

  // Keyboard: focus the row, then Tab reaches the ⋯ trigger (it is revealed
  // to pointer users on hover, and to keyboard users on focus).
  await row.focus();
  await page.keyboard.press("Tab");
  const menuTrigger = page.locator('button[aria-haspopup="menu"]').first();
  await expect(menuTrigger).toBeFocused();
  await expect(menuTrigger).toBeVisible();

  await page.keyboard.press("Enter");
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  await expect(menu.locator('[role="menuitem"]').first()).toBeFocused();

  // ArrowDown moves between menu items.
  const items = menu.locator('[role="menuitem"]');
  const itemCount = await items.count();
  expect(itemCount).toBeGreaterThanOrEqual(2);
  await page.keyboard.press("ArrowDown");
  await expect(items.nth(1)).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(items.first()).toBeFocused();

  // Escape dismisses and hands focus back to the ⋯ trigger.
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(menuTrigger).toBeFocused();
});

test("outside click dismisses the menu", async ({ page }) => {
  await page.goto("/studio");
  const row = page.getByRole("button", { name: topic, exact: false }).first();
  await row.waitFor({ state: "visible" });
  await row.hover();
  const menuTrigger = page.locator('button[aria-haspopup="menu"]').first();
  await menuTrigger.click();
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  await page.mouse.click(600, 400);
  await expect(menu).toBeHidden();
});

test.afterAll(async ({ request }) => {
  await cleanupSessions(request);
});
