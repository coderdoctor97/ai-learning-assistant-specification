// Unit tests for the html/charset checker. Run: node --test scripts/
import assert from "node:assert/strict";
import { test } from "node:test";
import { checkCharset, checkContentTypeHeader } from "./charset-rule.mjs";

const doc = (head) => `<!DOCTYPE html><html lang="en"><head>${head}</head><body>Café, 北京</body></html>`;
const fails = (input, pattern) => {
  const problems = checkCharset(input);
  assert.ok(problems?.some((p) => pattern.test(p)), `expected ${pattern}, got ${JSON.stringify(problems)}`);
};

test("passes the canonical document", () => {
  assert.deepEqual(checkCharset(doc('\n    <meta charset="utf-8">\n    <title>x</title>')), []);
});

test("passes Next.js rendered output (charSet, self-closing, uppercase value)", () => {
  assert.deepEqual(checkCharset(doc('<meta charSet="utf-8"/><meta name="viewport" content="width=device-width"/>')), []);
  assert.deepEqual(checkCharset(doc("<meta charset=UTF-8>")), []);
});

test("ignores fragments without <head>", () => {
  assert.equal(checkCharset("<div>partial</div>"), null);
});

test("does not confuse <header> with <head>", () => {
  assert.equal(checkCharset('<header><meta charset="latin1"></header>'), null);
});

test("fails when the declaration is missing", () => fails(doc("<title>x</title>"), /no <meta charset/));

test("fails when it is not the first element", () => {
  fails(doc('<script>1</script><meta charset="utf-8">'), /first element in <head> is <script>/);
  fails(doc('<title>x</title><meta charset="utf-8">'), /first element in <head> is <title>/);
});

test("fails when a comment precedes it", () => fails(doc('<!-- hi --><meta charset="utf-8">'), /comment precedes/));

test("fails on duplicates", () => fails(doc('<meta charSet="utf-8"/><meta charSet="utf-8"/>'), /2 <meta charset>/));

test("fails on a non-UTF-8 charset", () => fails(doc('<meta charset="windows-1252">'), /must be "utf-8"/));

test("fails on the legacy http-equiv form, alone or alongside", () => {
  const legacy = '<meta http-equiv="Content-Type" content="text/html; charset=utf-8">';
  fails(doc(legacy), /legacy/);
  fails(doc(`<meta charset="utf-8">${legacy}`), /legacy/);
});

test("fails beyond the first 1024 bytes", () => {
  const padded = `<!DOCTYPE html><html lang="en" data-x="${"é".repeat(600)}"><head><meta charset="utf-8"></head></html>`;
  fails(padded, /within the first 1024 bytes/);
});

test("fails on a UTF-8 BOM", () => {
  fails(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(doc('<meta charset="utf-8">'))]), /BOM/);
});

test("Content-Type header check", () => {
  assert.deepEqual(checkContentTypeHeader("text/html; charset=utf-8"), []);
  assert.deepEqual(checkContentTypeHeader('text/html;charset="UTF-8"'), []);
  assert.equal(checkContentTypeHeader("text/html").length, 1);
  assert.equal(checkContentTypeHeader("text/html; charset=iso-8859-1").length, 1);
  assert.equal(checkContentTypeHeader(null).length, 1);
});
