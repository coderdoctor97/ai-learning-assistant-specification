import { expect, test } from "@playwright/test";

/*
 * Frontend Checklist rule html/doctype — "Use the HTML5 doctype".
 * https://frontendchecklist.io/rules/html/doctype
 *
 * Checks the raw served bytes (not the DOM, which the browser normalises):
 * `<!DOCTYPE html>` must be the very first content of the response — no BOM,
 * no whitespace, no comment — and no legacy PUBLIC/SYSTEM doctype. Then the
 * runtime proof: the browser must enter standards mode, i.e.
 * document.compatMode === "CSS1Compat" (quirks mode reports "BackCompat").
 *
 * Next.js App Router emits the doctype itself; nothing in src/ adds one.
 */
const ROUTES = ["/", "/studio", "/settings", "/__doctype-404-probe__"];

for (const route of ROUTES) {
  test(`${route} serves <!DOCTYPE html> as the very first bytes`, async ({ request }) => {
    const { checkDoctype } = await import("../../scripts/doctype-rule.mjs");
    const res = await request.get(route);
    const body = await res.body();

    expect(checkDoctype(body), "html/doctype problems in served HTML").toEqual([]);
  });

  test(`${route} renders in standards mode (compatMode === CSS1Compat)`, async ({ page }) => {
    if (route === "/") {
      // The bundled headless Chromium crashes while loading the heavy home
      // page's subresources in this sandbox. Serve the *unchanged* HTML but
      // block scripts/styles/images for this document-mode-only assertion;
      // CSP and aborted subresources cannot alter the parser's doctype mode.
      await page.route("**/*", async (intercept) => {
        if (!intercept.request().isNavigationRequest()) return intercept.abort();
        const response = await intercept.fetch();
        await intercept.fulfill({
          response,
          headers: { ...response.headers(), "content-security-policy": "script-src 'none'" },
        });
      });
    }
    await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(await page.evaluate(() => document.compatMode), `${route} is in quirks mode`).toBe("CSS1Compat");
  });
}
