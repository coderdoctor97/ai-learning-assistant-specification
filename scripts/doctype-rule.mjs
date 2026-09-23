// Frontend Checklist rule html/doctype — "Use the HTML5 doctype".
// https://frontendchecklist.io/rules/html/doctype
//
// Pure checker shared by the CLI, node:test, and Playwright. Check raw bytes,
// not the browser-normalised DOM. Next.js renders `<!DOCTYPE html><html...>`
// on one line, so do not require a newline after the doctype.

const HTML5_PREFIX = /^<!DOCTYPE html>/i;
const ANY_DOCTYPE = /<!DOCTYPE\b/gi;
const LEGACY_DOCTYPE = /<!DOCTYPE\s+html\s+(?:PUBLIC|SYSTEM)\b/i;
const BOM = [0xef, 0xbb, 0xbf];

/**
 * @param {Buffer | string} input raw document bytes (or UTF-8 string)
 * @returns {string[] | null} problems (empty = pass), or null if it is a
 *   fragment/partial without <html>, <head>, or a doctype. The CLI treats
 *   .html/.htm files and HTTP responses as documents even if empty.
 */
export function checkDoctype(input) {
  const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input, "utf8");
  const src = bytes.toString("utf8");
  const hasBom = BOM.every((b, i) => bytes[i] === b);
  const problems = [];
  if (hasBom) problems.push("file starts with a UTF-8 BOM");

  if (!/<html\b|<head\b|<!DOCTYPE\b/i.test(src)) {
    return problems.length ? problems : null;
  }

  const doctypes = [...src.matchAll(ANY_DOCTYPE)];
  if (!HTML5_PREFIX.test(src)) {
    // These cases are all violations of the repo policy, even where an HTML5
    // parser would ignore the leading bytes (e.g. blank lines).
    if (hasBom) {
      problems.push("doctype must be at byte 0, before any BOM");
    } else if (/^\s/.test(src)) {
      problems.push("leading whitespace/blank lines precede the doctype");
    } else if (/^<!--/.test(src)) {
      problems.push("an HTML comment precedes the doctype");
    } else if (/^<\?xml\b/i.test(src)) {
      problems.push("an XML declaration (<?xml ...?>) precedes the doctype");
    }

    if (doctypes.length === 0) {
      problems.push('missing <!DOCTYPE html> — browsers may enter quirks mode (document.compatMode === "BackCompat")');
    } else if (doctypes[0].index > 0) {
      problems.push("doctype is present but is not the very first content of the document");
    } else {
      problems.push('first bytes are not the literal <!DOCTYPE html> (case-insensitive); check syntax');
    }
  }

  if (LEGACY_DOCTYPE.test(src)) {
    problems.push("legacy doctype with PUBLIC/SYSTEM identifier (HTML4/XHTML DTD); use <!DOCTYPE html>");
  }
  if (doctypes.length > 1) {
    problems.push(`${doctypes.length} doctype declarations found; exactly one is allowed`);
  }
  return problems;
}
