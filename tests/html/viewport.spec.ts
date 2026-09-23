import { expect, test } from "@playwright/test";
import { VIEWPORT_CONTENT, VIEWPORT_ROUTES, viewportProblems } from "../support/viewport";

const meta = (content = VIEWPORT_CONTENT) => `<meta name="viewport" content="${content}">`;
const document = (head: string, body = "") =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8">${head}<title>Test</title></head><body>${body}</body></html>`;

test("viewport parser accepts standard HTML and ignores inert text", () => {
  expect(viewportProblems(document(meta()))).toEqual([]);
  expect(viewportProblems(document(meta("initial-scale=1.0, width=device-width")))).toEqual([]);
  expect(viewportProblems(document(`${meta()}<!-- ${meta()} --><script>const example = '${meta()}';</script>`))).toEqual([]);
});

const invalid: [string, string][] = [
  ["missing", document("")],
  ["duplicate", document(meta() + meta())],
  ["body only", document("", meta())],
  ["duplicate in body", document(meta(), meta())],
  ["after head before body", document("").replace("</head>", `</head>${meta()}`)],
  ["implicit head", `<html>${meta()}<body>Test</body></html>`],
  ["content closes head early", document(`<p>Content</p>${meta()}`)],
  ["comment only", document(`<!-- ${meta()} -->`)],
  ["script only", document(`<script>const example = '${meta()}';</script>`)],
  ["template only", document(`<template>${meta()}</template>`)],
  ["wrong name case", document(meta().replace('name="viewport"', 'name="Viewport"'))],
  ["missing content", document('<meta name="viewport">')],
  ["empty content", document(meta(""))],
  ["fixed width", document(meta("width=1024, initial-scale=1"))],
  ["missing scale", document(meta("width=device-width"))],
  ["wrong scale", document(meta("width=device-width, initial-scale=10"))],
];
// Construct invalid inputs rather than shipping zoom-blocking HTML fixtures.
for (const [key, value] of [
  ["user-scalable", "no"], ["user-scalable", "0"],
  ["maximum-scale", "1"], ["maximum-scale", "1.0"], ["maximum-scale", "1.5"],
  ["minimum-scale", "0.5"], ["shrink-to-fit", "no"], ["viewport-fit", "cover"],
  ["width", "1024"],
]) invalid.push([`${key} ${value}`, document(meta(`${VIEWPORT_CONTENT}, ${key}=${value}`))]);

for (const [name, html] of invalid) {
  test(`viewport parser rejects ${name}`, () => {
    expect(viewportProblems(html).length).toBeGreaterThan(0);
  });
}

for (const route of VIEWPORT_ROUTES) {
  test(`${route} serves exactly one responsive viewport in head`, async ({ request }) => {
    const response = await request.get(route);
    expect(response.status()).toBe(route.includes("404-probe") ? 404 : 200);
    expect(response.headers()["content-type"]).toContain("text/html");
    expect(viewportProblems(await response.text())).toEqual([]);
  });
}

test("HTML and print exports retain the standalone document viewport", async ({ request }) => {
  test.setTimeout(180_000);
  const created = await request.post("/api/sessions", {
    data: { topic: "Viewport regression fixture", title: "Viewport regression fixture" },
  });
  expect(created.status()).toBe(201);
  const { session } = await created.json() as { session: { id: string; configSteps: unknown[] } };
  try {
    for (let index = 0; index < session.configSteps.length; index++) {
      const generated = await request.post(`/api/sessions/${session.id}/generate`, {
        data: { stageIndex: index, modifier: "none" },
      });
      expect(generated.ok()).toBeTruthy();
      await generated.body();
    }
    for (const format of ["html", "pdf"]) {
      const response = await request.get(`/api/sessions/${session.id}/export?format=${format}`);
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toContain("text/html");
      expect(viewportProblems(await response.text()), `${format} export`).toEqual([]);
    }
  } finally {
    await request.delete(`/api/sessions/${session.id}`);
  }
});
