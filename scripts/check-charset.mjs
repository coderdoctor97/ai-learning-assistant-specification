#!/usr/bin/env node
// Enforces Frontend Checklist rule html/charset on every full HTML document:
// exactly one <meta charset="utf-8">, first element in <head>, within the
// first 1024 bytes, no legacy http-equiv form, no UTF-8 BOM.
//
// Usage: node scripts/check-charset.mjs [path|url ...]      (default: .)
//   path  file or directory; directories are walked for HTML-like templates.
//         When a directory contains .next/server/app (Next.js prerendered
//         output) it is checked too — for this App Router project that is
//         where the real <head> lives, since layout.tsx is JSX.
//   url   http(s) URL; checks the served body plus the Content-Type header.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { checkCharset, checkContentTypeHeader } from "./charset-rule.mjs";

const IGNORE = new Set([
  "node_modules", ".git", "dist", "build", ".next", "out", "coverage", "vendor", ".cache",
  "test-results", "playwright-report", "blob-report",
]);
const EXTS = new Set([
  ".html", ".htm", ".xhtml", ".vue", ".svelte", ".astro", ".ejs", ".hbs", ".njk",
  ".liquid", ".php", ".erb", ".twig", ".jinja", ".j2",
]);
const NEXT_OUTPUT = join(".next", "server", "app");

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (IGNORE.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (EXTS.has(extname(name))) acc.push(p);
  }
  return acc;
}

const targets = process.argv.slice(2);
if (targets.length === 0) targets.push(".");

const failures = [];
let checked = 0;

function record(label, problems) {
  if (problems === null) return; // no <head>: fragment/partial, out of scope
  checked++;
  for (const p of problems) failures.push(`${label}: ${p}`);
}

for (const target of targets) {
  if (/^https?:\/\//i.test(target)) {
    let res;
    try {
      res = await fetch(target, { redirect: "follow" });
    } catch (err) {
      failures.push(`${target}: request failed (${err.cause?.code ?? err.message})`);
      continue;
    }
    const body = Buffer.from(await res.arrayBuffer());
    const problems = checkCharset(body) ?? ["response has no <head>"];
    record(target, [...problems, ...checkContentTypeHeader(res.headers.get("content-type"))]);
    continue;
  }

  if (!existsSync(target)) {
    failures.push(`${target}: path does not exist${target.includes(".next") ? " (run `npm run build` first)" : ""}`);
    continue;
  }
  const files = statSync(target).isDirectory() ? walk(target) : [target];
  const nextOut = join(target, NEXT_OUTPUT);
  if (statSync(target).isDirectory() && existsSync(nextOut)) files.push(...walk(nextOut));
  for (const file of files) record(relative(".", file) || file, checkCharset(readFileSync(file)));
}

if (failures.length) {
  console.error(`Charset check failed (html/charset):\n${failures.map((f) => `  ✗ ${f}`).join("\n")}`);
  process.exit(1);
}
if (checked === 0) {
  console.error(
    "Charset check found no HTML documents to check. For this Next.js app run `npm run build` first " +
      "so .next/server/app exists, or pass a URL of a running server.",
  );
  process.exit(1);
}
console.log(`Charset check passed (${checked} document${checked === 1 ? "" : "s"}).`);
