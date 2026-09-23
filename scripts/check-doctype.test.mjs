// Unit tests for the html/doctype checker. Run: node --test scripts/check-doctype.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { checkDoctype } from "./doctype-rule.mjs";

const doc = (rest = '<html lang="en"><head><meta charset="utf-8"><title>x</title></head><body>ok</body></html>') =>
  `<!DOCTYPE html>${rest}`;
const fails = (input, pattern) => {
  const problems = checkDoctype(input);
  assert.ok(problems?.some((p) => pattern.test(p)), `expected ${pattern}, got ${JSON.stringify(problems)}`);
};

test("passes the canonical document (doctype at byte 0)", () => {
  assert.deepEqual(checkDoctype(doc()), []);
});

test("passes Next.js rendered output (no newline between doctype and <html>)", () => {
  assert.deepEqual(checkDoctype('<!DOCTYPE html><html lang="en"><head><meta charSet="utf-8"/></head><body></body></html>'), []);
});

test("passes the multi-line template form", () => {
  assert.deepEqual(checkDoctype('<!DOCTYPE html>\n<html lang="en">\n<head><meta charset="utf-8"><title>t</title></head>\n<body></body>\n</html>\n'), []);
});

test("accepts lowercase <!doctype html> (valid per the HTML Living Standard)", () => {
  assert.deepEqual(checkDoctype('<!doctype html><html><head><title>t</title></head><body></body></html>'), []);
});

test("ignores fragments and SFCs without document markers", () => {
  assert.equal(checkDoctype("<div>partial</div>"), null);
  assert.equal(checkDoctype("<template><p>Vue SFC</p></template>"), null);
});

test("fails when the doctype is missing entirely", () => {
  fails('<html lang="en"><head><title>x</title></head><body></body></html>', /missing <!DOCTYPE html>/);
});

test("fails on leading blank lines / whitespace", () => {
  fails(`\n${doc()}`, /leading whitespace/);
  fails(` ${doc()}`, /leading whitespace/);
});

test("fails on a comment before the doctype", () => {
  fails(`<!-- build:prod -->${doc()}`, /comment precedes/);
});

test("fails on an XML declaration before the doctype", () => {
  fails(`<?xml version="1.0" encoding="UTF-8"?>${doc()}`, /XML declaration/);
});

test("fails on a UTF-8 BOM", () => {
  const withBom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(doc())]);
  fails(withBom, /UTF-8 BOM/);
});

test("fails on legacy HTML4/XHTML doctypes", () => {
  fails(
    '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><html><head><title>t</title></head><body></body></html>',
    /legacy doctype/,
  );
  fails(
    '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd"><html><head><title>t</title></head><body></body></html>',
    /legacy doctype/,
  );
  fails('<!DOCTYPE html SYSTEM "about:legacy-compat"><html><head><title>t</title></head><body></body></html>', /legacy doctype/);
});

test("fails when the doctype is present but not first", () => {
  fails('<html lang="en"><!DOCTYPE html><head><title>x</title></head><body></body></html>', /not the very first content/);
});

test("fails on duplicate doctypes", () => {
  fails(doc("<html><head><title>x</title></head><body></body></html><!DOCTYPE html>"), /2 doctype declarations/);
});

test("fails on incorrect doctype syntax even at byte 0", () => {
  fails('<!DOCTYPE  html><html><head><title>x</title></head></html>', /not the literal/);
  fails('<!DOCTYPE html ><html><head><title>x</title></head></html>', /not the literal/);
  fails('<!DOCTYPE html SYSTEM "about:legacy-compat"><html><head></head></html>', /legacy doctype/);
});

test("CLI rejects a copy of the template with a leading blank line (exit 1)", () => {
  const dir = mkdtempSync(join(tmpdir(), "doctype-check-"));
  try {
    const fixture = join(dir, "index.html");
    const source = readFileSync(new URL("../templates/index.html", import.meta.url), "utf8");
    writeFileSync(fixture, `\n${source}`);
    const result = spawnSync(process.execPath, [fileURLToPath(new URL("./check-doctype.mjs", import.meta.url)), fixture], {
      encoding: "utf8",
    });
    assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stderr, /leading whitespace\/blank lines precede the doctype/);

    writeFileSync(fixture, ""); // Empty .html must not be silently skipped.
    const empty = spawnSync(process.execPath, [fileURLToPath(new URL("./check-doctype.mjs", import.meta.url)), fixture], {
      encoding: "utf8",
    });
    assert.equal(empty.status, 1, `${empty.stdout}\n${empty.stderr}`);
    assert.match(empty.stderr, /missing <!DOCTYPE html>/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
