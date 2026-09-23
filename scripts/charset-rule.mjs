// Frontend Checklist rule html/charset — "Declare UTF-8 character encoding".
// https://frontendchecklist.io/rules/html/charset
//
// Pure checker shared by the CLI (scripts/check-charset.mjs), its unit tests
// and the Playwright suite. Operates on the raw bytes of one HTML document.

const BOM = [0xef, 0xbb, 0xbf];
const BYTE_LIMIT = 1024;

const ATTR_RE = /([^\s"'=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

function parseAttrs(tag) {
  const body = tag.replace(/^<[a-z0-9-]+/i, "").replace(/\/?>$/, "");
  const attrs = {};
  for (const m of body.matchAll(ATTR_RE)) {
    attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? "";
  }
  return attrs;
}

/**
 * @param {Buffer | string} input raw document
 * @returns {string[] | null} problems (empty = pass), or null when the input
 *   has no <head> (fragments/partials are not in scope for this rule)
 */
export function checkCharset(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, "utf8");
  const problems = [];

  let src = buf.toString("utf8");
  if (BOM.every((b, i) => buf[i] === b)) {
    problems.push("file starts with a UTF-8 BOM");
    src = src.slice(1);
  }

  const head = /<head\b[^>]*>/i.exec(src);
  if (!head) return problems.length ? problems : null;

  const headStart = head.index + head[0].length;
  const closeIdx = src.slice(headStart).search(/<\/head\s*>/i);
  const headSrc = src.slice(headStart, closeIdx === -1 ? undefined : headStart + closeIdx);

  // Every <meta> inside <head>, with its offset relative to the document.
  const metas = [...headSrc.matchAll(/<meta\b[^>]*>/gi)].map((m) => ({
    tag: m[0],
    attrs: parseAttrs(m[0]),
    end: headStart + m.index + m[0].length,
  }));
  const charsetMetas = metas.filter((m) => "charset" in m.attrs);
  const legacyMetas = metas.filter((m) => (m.attrs["http-equiv"] ?? "").toLowerCase() === "content-type");

  if (legacyMetas.length) {
    problems.push(
      'legacy <meta http-equiv="Content-Type"> found; use the HTML5 short form <meta charset="utf-8"> only',
    );
  }
  if (charsetMetas.length === 0) {
    problems.push('no <meta charset="utf-8"> declaration in <head>');
    return problems;
  }
  if (charsetMetas.length > 1) {
    problems.push(`${charsetMetas.length} <meta charset> declarations in <head>; exactly one is allowed`);
  }
  for (const m of charsetMetas) {
    if (m.attrs.charset.trim().toLowerCase() !== "utf-8") {
      problems.push(`charset is "${m.attrs.charset}", must be "utf-8"`);
    }
  }

  // First thing inside <head> (whitespace aside) must be the charset meta.
  const lead = headSrc.replace(/^\s+/, "");
  if (lead.startsWith("<!--")) {
    problems.push("a comment precedes <meta charset>; the charset meta must be the first element in <head>");
  }
  const firstTag = /^(?:\s*<!--[\s\S]*?-->)*\s*(<[^>]+>)/.exec(lead)?.[1];
  if (!firstTag || firstTag !== charsetMetas[0].tag) {
    const name = firstTag ? `<${/^<\/?([^\s/>]+)/.exec(firstTag)?.[1] ?? "?"}>` : "text content";
    problems.push(`first element in <head> is ${name}, expected <meta charset="utf-8">`);
  }

  const endByte = Buffer.byteLength(src.slice(0, charsetMetas[0].end), "utf8");
  if (endByte > BYTE_LIMIT) {
    problems.push(`<meta charset> ends at byte ${endByte}; it must be within the first ${BYTE_LIMIT} bytes`);
  }

  return problems;
}

/** Content-Type header check for live responses ("belt and braces"). */
export function checkContentTypeHeader(value) {
  if (!value) return ["response has no Content-Type header"];
  const charset = /charset\s*=\s*"?([^";\s]+)/i.exec(value)?.[1];
  if (!/^text\/html\b/i.test(value)) return [`Content-Type is "${value}", expected text/html`];
  if (!charset || charset.toLowerCase() !== "utf-8") {
    return [`Content-Type is "${value}", expected "text/html; charset=utf-8"`];
  }
  return [];
}
