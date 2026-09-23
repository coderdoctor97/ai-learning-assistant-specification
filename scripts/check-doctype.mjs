#!/usr/bin/env node
// Enforces Frontend Checklist rule html/doctype on every full HTML document:
// `<!DOCTYPE html>` as the very first content — no BOM, no whitespace, no
// comment, no XML declaration — and no legacy PUBLIC/SYSTEM doctype.
//
// Usage: node scripts/check-doctype.mjs [path|url ...]      (default: .)
//   path  file or directory; directories are walked for HTML-like templates.
//         When a directory contains .next/server/app (Next.js prerendered
//         output) it is checked too — for this App Router project that is
//         where the real documents live, since layout.tsx is JSX and the
//         framework emits the doctype itself.
//   url   http(s) URL; checks the raw served bytes (not the DOM).
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { checkDoctype } from "./doctype-rule.mjs";

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
  if (problems === null) return; // fragment/partial/SFC: out of scope
  checked++;
  if (problems.length === 0) console.log(`✔ ${label}`);
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
    const problems = checkDoctype(body) ?? ["response is not a full HTML document"];
    record(target, problems);
    continue;
  }

  if (!existsSync(target)) {
    failures.push(`${target}: path does not exist${target.includes(".next") ? " (run `npm run build` first)" : ""}`);
    continue;
  }
  const isDirectory = statSync(target).isDirectory();
  const files = isDirectory ? walk(target) : [target];
  const nextOut = join(target, NEXT_OUTPUT);
  if (isDirectory && existsSync(nextOut)) files.push(...walk(nextOut));
  for (const file of files) {
    const problems = checkDoctype(readFileSync(file));
    // A standalone .html/.htm is always a document: never silently skip an
    // empty file or one missing <html>/<head> as a "fragment". Only templating
    // formats such as .vue/.hbs can intentionally contain partial markup.
    const standalone = [".html", ".htm"].includes(extname(file).toLowerCase());
    record(relative(".", file) || file, problems ?? (standalone ? ["missing <!DOCTYPE html> in HTML document"] : null));
  }
}

if (failures.length) {
  console.error(`Doctype check failed (html/doctype):\n${failures.map((f) => `  ✗ ${f}`).join("\n")}`);
  console.error('Fix: make "<!DOCTYPE html>" the literal first line (byte 0, no BOM) of each document.');
  process.exit(1);
}
if (checked === 0) {
  console.error(
    "Doctype check found no HTML documents to check. For this Next.js app run `npm run build` first " +
      "so .next/server/app exists, or pass a URL of a running server.",
  );
  process.exit(1);
}
console.log(`Doctype check passed (${checked} document${checked === 1 ? "" : "s"}).`);
