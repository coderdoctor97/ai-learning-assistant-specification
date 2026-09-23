import { expect, test } from "@playwright/test";

/*
 * Frontend Checklist rule html/charset — "Declare UTF-8 character encoding".
 * https://frontendchecklist.io/rules/html/charset
 *
 * Checks the raw served bytes (not the DOM, which the browser normalises):
 * exactly one <meta charset="utf-8">, first element in <head>, within the
 * first 1024 bytes, no BOM, and a `text/html; charset=utf-8` header.
 *
 * Next.js App Router emits the charset meta itself; src/app/layout.tsx must
 * NOT add another one, or this spec fails on the duplicate.
 */
const ROUTES = ["/", "/studio", "/settings", "/__charset-404-probe__"];

for (const route of ROUTES) {
  test(`${route} declares UTF-8 as the first element in <head>`, async ({ request }) => {
    const { checkCharset, checkContentTypeHeader } = await import("../../scripts/charset-rule.mjs");
    const res = await request.get(route);
    const body = await res.body();

    expect(checkCharset(body), "html/charset problems in served HTML").toEqual([]);
    expect(checkContentTypeHeader(res.headers()["content-type"]), "Content-Type header").toEqual([]);
  });
}

test("browser decodes the document as UTF-8", async ({ page }) => {
  await page.goto("/");
  expect(await page.evaluate(() => document.characterSet)).toBe("UTF-8");
});
