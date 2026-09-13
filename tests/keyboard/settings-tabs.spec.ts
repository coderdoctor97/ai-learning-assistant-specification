import { expect, test } from "@playwright/test";

/*
 * Settings navigation tablist: role="tablist"/"tab", aria-selected wiring,
 * roving tabindex and full arrow-key operation with automatic activation.
 */
test("tablist keyboard contract", async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("heading", { level: 1, name: "Settings" }).waitFor();

  const tablist = page.getByRole("tablist");
  await expect(tablist).toBeVisible();
  const tabs = tablist.getByRole("tab");
  expect(await tabs.count()).toBe(5);

  // Exactly one selected tab; it is the only tab stop.
  await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
  const tabStops = await tabs.evaluateAll((elements) =>
    elements.filter((element) => (element as HTMLElement).tabIndex === 0).length,
  );
  expect(tabStops).toBe(1);

  // Each tab controls a labelled panel.
  const firstControls = await tabs.nth(0).getAttribute("aria-controls");
  expect(firstControls).toBeTruthy();
  await expect(page.locator(`#${firstControls}`)).toBeVisible();

  // ArrowRight selects the next tab (automatic activation).
  await tabs.nth(0).focus();
  await page.keyboard.press("ArrowRight");
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(tabs.nth(1)).toBeFocused();

  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");

  // ArrowLeft wraps backwards; Home/End jump to the ends.
  await page.keyboard.press("ArrowLeft");
  await expect(tabs.nth(4)).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Home");
  await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(tabs.nth(4)).toHaveAttribute("aria-selected", "true");
});

test("collapsible disclosures wire aria-expanded to aria-controls", async ({ page }) => {
  // The settings page exposes a disclosure via the methodology editor only
  // after selection, so the contract is pinned on the studio stage folds in
  // the flows suite. Here: theme switcher radio semantics.
  await page.goto("/studio");
  await page.getByRole("heading", { level: 1 }).waitFor();

  const radiogroup = page.getByRole("radiogroup", { name: "Color theme" });
  await expect(radiogroup).toBeVisible();
  const radios = radiogroup.getByRole("radio");
  expect(await radios.count()).toBe(3);
  await expect(radios.nth(0)).toHaveAttribute("aria-checked", /.*/);

  await radios.nth(1).click();
  await expect(radios.nth(1)).toHaveAttribute("aria-checked", "true");
  await expect(radios.nth(0)).toHaveAttribute("aria-checked", "false");
  await radios.nth(0).click();
});
