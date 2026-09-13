import { expect, test } from "@playwright/test";
import { cleanupSessions, seedSession } from "../support/seed";

/*
 * Model picker popover (accessibility-a11y workstream):
 *   • trigger carries aria-haspopup="listbox" + aria-expanded
 *   • ArrowDown opens and moves focus onto the roving-cursor option
 *   • options use roving tabindex (tabIndex 0 on the cursor, -1 elsewhere)
 *   • ArrowUp/ArrowDown/Home/End move focus among options
 *   • Escape closes and restores focus to the trigger
 */
test.describe.configure({ mode: "serial" });

test("listbox keyboard contract", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("heading", { level: 1 }).waitFor();

  const trigger = page.locator('button[aria-haspopup="listbox"]');
  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");

  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");

  const listbox = page.getByRole("listbox");
  await expect(listbox).toBeVisible();

  // Roving tabindex: exactly one option is a tab stop.
  const tabStops = await listbox.locator('[role="option"][tabindex="0"]').count();
  expect(tabStops).toBe(1);
  const cursorOption = listbox.locator('[role="option"][tabindex="0"]');
  await expect(cursorOption).toBeFocused();

  // Arrow navigation walks focus across options.
  const optionCount = await listbox.locator('[role="option"]').count();
  test.skip(optionCount < 2, "needs at least two cached models to exercise arrows");
  await page.keyboard.press("ArrowDown");
  const secondOption = listbox.locator('[role="option"]').nth(1);
  await expect(secondOption).toBeFocused();

  await page.keyboard.press("Home");
  await expect(listbox.locator('[role="option"]').first()).toBeFocused();

  await page.keyboard.press("End");
  await expect(listbox.locator('[role="option"]').last()).toBeFocused();

  await page.keyboard.press("ArrowUp");
  await expect(listbox.locator('[role="option"]').nth(optionCount - 2)).toBeFocused();

  // Escape closes and restores focus to the trigger.
  await page.keyboard.press("Escape");
  await expect(listbox).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

test("selection via Enter applies the model and closes the popover", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("heading", { level: 1 }).waitFor();

  const trigger = page.locator('button[aria-haspopup="listbox"]');
  const request = page.request;
  const state = await (await request.get("/api/state")).json();
  test.skip(state.models.length < 2, "needs at least two cached models");

  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  const listbox = page.getByRole("listbox");
  const target = listbox.locator('[role="option"]').nth(1);
  const modelName = await target.locator("span").first().textContent();
  await target.focus();
  await page.keyboard.press("Enter");

  await expect(listbox).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(trigger).toContainText(modelName ?? "");

  // Restore the original selection.
  await trigger.click();
  await listbox
    .locator('[role="option"]', { hasText: state.settings.activeModelId ?? "" })
    .first()
    .click()
    .catch(() => undefined);
});

test.afterAll(async ({ request }) => {
  await cleanupSessions(request);
});
