import { parse, type DefaultTreeAdapterMap } from "parse5";

export const VIEWPORT_CONTENT = "width=device-width, initial-scale=1";
export const VIEWPORT_ROUTES = ["/", "/studio", "/settings", "/__viewport-404-probe__"];

type Node = DefaultTreeAdapterMap["node"];
type Element = DefaultTreeAdapterMap["element"];

/** Parse actual HTML, not JSX or regex matches in scripts/comments. Keep source
 * locations: HTML parsers repair misplaced head elements, hiding regressions. */
export function viewportProblems(html: string): string[] {
  const problems: string[] = [];
  const document = parse(html, { sourceCodeLocationInfo: true });
  const elements: Element[] = [];
  function walk(node: Node) {
    if ("tagName" in node) elements.push(node);
    if ("childNodes" in node) node.childNodes.forEach(walk);
  }
  walk(document);
  const attr = (node: Element, name: string) => node.attrs.find((a) => a.name === name)?.value;
  const metas = elements.filter((node) =>
    node.tagName === "meta" && attr(node, "name")?.trim().toLowerCase() === "viewport",
  );
  if (metas.length !== 1) problems.push(`Expected one viewport meta, found ${metas.length}`);
  const head = elements.find((node) => node.tagName === "head");
  const headLocation = head?.sourceCodeLocation;
  for (const meta of metas) {
    if (attr(meta, "name") !== "viewport") problems.push("Viewport name must be lowercase");
    const location = meta.sourceCodeLocation;
    if (meta.parentNode !== head || !headLocation?.startTag || !headLocation.endTag || !location ||
        location.startOffset < headLocation.startTag.endOffset ||
        location.endOffset > headLocation.endTag.startOffset) {
      problems.push("Viewport must be inside the explicit head, before body content");
    }
    // This project's canonical policy intentionally has no zoom limits, legacy
    // workarounds or viewport-fit override. 1.0 is numerically equivalent to 1.
    const directives = (attr(meta, "content") ?? "").split(",").map((part) => part.trim());
    if (directives.length !== 2 || !directives.includes("width=device-width") ||
        !directives.some((part) => /^initial-scale=1(?:\.0+)?$/.test(part))) {
      problems.push("Expected only device-width and initial scale 1, with unrestricted zoom");
    }
  }
  return problems;
}
