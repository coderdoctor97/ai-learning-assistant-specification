/*
 * Tiny ICU subset formatter.
 *
 * Supports exactly the constructs used by the UI catalog:
 *   "{name}"                              → variable interpolation
 *   "{count, plural, one {…} other {…}}"  → ICU plural, "#" = formatted count
 *
 * Exact matches (=N) win over grammar categories; `other` is the fallback.
 * Branch bodies may contain plain text, {vars} and "#", but no nested
 * plural constructs — the catalog is intentionally kept flat, which keeps
 * this parser small and total.
 */

export const DEFAULT_LOCALE = "en";

type Vars = Record<string, string | number>;

function findBranchEnd(source: string, openIndex: number): number {
  let depth = 0;
  for (let i = openIndex; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    else if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function selectPluralBody(selectorSource: string, count: number, locale: string): string {
  const branches = new Map<string, string>();
  let index = 0;
  while (index < selectorSource.length) {
    while (index < selectorSource.length && /\s/.test(selectorSource[index])) index += 1;
    let keyword = "";
    while (index < selectorSource.length && /\S/.test(selectorSource[index])) {
      keyword += selectorSource[index];
      index += 1;
    }
    while (index < selectorSource.length && /\s/.test(selectorSource[index])) index += 1;
    if (!keyword || selectorSource[index] !== "{") break;
    const end = findBranchEnd(selectorSource, index);
    if (end === -1) break;
    branches.set(keyword, selectorSource.slice(index + 1, end));
    index = end + 1;
  }
  const exact = branches.get(`=${count}`);
  if (exact !== undefined) return exact;
  const category = new Intl.PluralRules(locale).select(count);
  return branches.get(category) ?? branches.get("other") ?? "";
}

function render(template: string, vars: Vars, count: number | null, locale: string): string {
  let output = "";
  let index = 0;
  while (index < template.length) {
    const char = template[index];
    if (char !== "{") {
      output += char;
      index += 1;
      continue;
    }
    // Read the token head up to the next "," or the closing "}".
    let headEnd = index + 1;
    while (headEnd < template.length && !"{},".includes(template[headEnd])) headEnd += 1;
    const head = template.slice(index + 1, headEnd).trim();
    if (template[headEnd] === "}" || headEnd >= template.length) {
      // Simple {var} interpolation.
      const value = vars[head];
      output += value === undefined ? `{${head}}` : String(value);
      index = headEnd + 1;
      continue;
    }
    // Structured token: read the type keyword after the comma.
    let typeEnd = headEnd + 1;
    while (typeEnd < template.length && !"{},".includes(template[typeEnd])) typeEnd += 1;
    const type = template.slice(headEnd + 1, typeEnd).trim();
    if (type === "plural" && count !== null) {
      // Skip ", " after the type keyword, then slice out the selector body
      // (everything up to the brace that closes the construct).
      let selectorStart = typeEnd + 1;
      while (selectorStart < template.length && /\s/.test(template[selectorStart])) selectorStart += 1;
      const body = selectPluralBody(template.slice(selectorStart), count, locale);
      const formattedCount = new Intl.NumberFormat(locale).format(count);
      output += render(body, vars, null, locale).replace(/#/g, formattedCount);
      // Advance past the plural construct: walk balanced braces from the
      // construct's opening brace.
      let depth = 1;
      let cursor = index + 1;
      while (cursor < template.length && depth > 0) {
        if (template[cursor] === "{") depth += 1;
        else if (template[cursor] === "}") depth -= 1;
        cursor += 1;
      }
      index = cursor;
      continue;
    }
    // Unknown construct: emit verbatim.
    const end = findBranchEnd(template, index);
    if (end === -1) {
      output += template.slice(index);
      return output;
    }
    output += template.slice(index, end + 1);
    index = end + 1;
  }
  return output;
}

/** Format a catalog message: `{var}` interpolation plus ICU plurals. */
export function formatMessage(
  template: string,
  vars: Vars = {},
  count: number | null = null,
  locale: string = DEFAULT_LOCALE,
): string {
  return render(template, vars, count, locale);
}
