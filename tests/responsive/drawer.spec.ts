import { expect, test } from "@playwright/test";
import { cleanupSessions, seedSession } from "../support/seed";

/*
 * Mobile shell: below md the expanded sidebar becomes an overlay drawer
 * with a dismissible backdrop; selection closes the drawer. The desktop
 * collapse behavior is unchanged (desktop project covers it elsewhere).
 */
test.describe.configure({ mode: "serial" });

const topic = `Drawer session ${Date.now()}`;

test("rail → drawer → backdrop dismissal", async ({ page }) => {
  await seedSession(page.request, topic);
  await page.goto("/studio");
  await page.getByRole("heading", { level: 1 }).waitFor();

  // Mobile starts on the rail.
  const expand = page.getByRole("button", { name: "Expand sidebar" });
  await expect(expand).toBeVisible();

  await expand.click();
  const panel = page.locator(".sidebar-panel");
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute("data-drawer-open", "true");

  // Escape closes the drawer.
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(expand).toBeVisible();
});

test("selecting a session closes the drawer", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: "Expand sidebar" }).click();
  const panel = page.locator(".sidebar-panel");
  await expect(panel).toBeVisible();

  await panel.getByRole("button", { name: topic, exact: false }).click();
  await expect(panel).toBeHidden();
});

test.afterAll(async ({ request }) => {
  await cleanupSessions(request);
});
