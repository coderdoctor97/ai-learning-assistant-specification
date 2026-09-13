import { safeUrl, fetchPublicUrl } from "./public-url";
export { safeUrl } from "./public-url";
import type { ResourceRef } from "@/db/schema";

/**
 * Internal tool layer. Conceptually this is the application's own MCP surface:
 * the learning engine calls these tools, the learner never configures them.
 */

export type ToolResult = {
  resources: ResourceRef[];
  text: string;
};

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)));
}

export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
      .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
      .replace(/<\/(p|div|section|article|li|h[1-6]|tr)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function titleFromHtml(html: string, fallback: string): string {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return match ? decodeEntities(match[1]).trim().slice(0, 160) : fallback;
}

/* ------------------------------------------------------------------ */
/* web_search                                                           */
/* ------------------------------------------------------------------ */

type RawResult = { title: string; url: string; snippet: string; source: string };

async function tavilySearch(query: string, key: string): Promise<RawResult[]> {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ query, max_results: 5, search_depth: "basic", include_answer: false }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as { results?: { title?: string; url?: string; content?: string }[] };
  return (payload.results ?? []).map((row) => ({
    title: row.title ?? row.url ?? "Result",
    url: row.url ?? "",
    snippet: (row.content ?? "").slice(0, 1200),
    source: "Tavily",
  }));
}

async function braveSearch(query: string, key: string): Promise<RawResult[]> {
  const response = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
    { headers: { accept: "application/json", "x-subscription-token": key }, signal: AbortSignal.timeout(15000) },
  );
  if (!response.ok) return [];
  const payload = (await response.json()) as {
    web?: { results?: { title?: string; url?: string; description?: string }[] };
  };
  return (payload.web?.results ?? []).map((row) => ({
    title: row.title ?? "Result",
    url: row.url ?? "",
    snippet: htmlToText(row.description ?? "").slice(0, 1200),
    source: "Brave",
  }));
}

async function duckDuckGoSearch(query: string): Promise<RawResult[]> {
  const response = await fetch("https://lite.duckduckgo.com/lite/", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": "Mozilla/5.0 (compatible; LearningStudio/1.0)",
    },
    body: new URLSearchParams({ q: query }).toString(),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) return [];
  const html = await response.text();
  const results: RawResult[] = [];
  const linkPattern = /<a[^>]+class="result-link"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match = linkPattern.exec(html);
  while (match && results.length < 6) {
    let href = decodeEntities(match[1]);
    const uddg = /[?&]uddg=([^&]+)/.exec(href);
    if (uddg) href = decodeURIComponent(uddg[1]);
    if (href.startsWith("//")) href = `https:${href}`;
    const title = htmlToText(match[2]).slice(0, 160);
    if (safeUrl(href)) results.push({ title: title || href, url: href, snippet: "", source: "DuckDuckGo" });
    match = linkPattern.exec(html);
  }
  return results;
}

type InstantAnswer = {
  AbstractText?: string;
  AbstractURL?: string;
  Heading?: string;
  RelatedTopics?: { FirstURL?: string; Text?: string; Topics?: { FirstURL?: string; Text?: string }[] }[];
};

async function duckDuckGoInstant(query: string): Promise<RawResult[]> {
  const response = await fetch(
    `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
    { headers: { "user-agent": "LearningStudio/1.0" }, signal: AbortSignal.timeout(12000) },
  );
  if (!response.ok) return [];
  const payload = (await response.json()) as InstantAnswer;
  const results: RawResult[] = [];
  if (payload.AbstractText && payload.AbstractURL) {
    results.push({
      title: payload.Heading ?? query,
      url: payload.AbstractURL,
      snippet: payload.AbstractText.slice(0, 1200),
      source: "DuckDuckGo",
    });
  }
  const flat = (payload.RelatedTopics ?? []).flatMap((topic) => topic.Topics ?? [topic]);
  for (const topic of flat.slice(0, 5)) {
    if (!topic.FirstURL || !topic.Text) continue;
    results.push({
      title: topic.Text.split(" - ")[0].slice(0, 140),
      url: topic.FirstURL,
      snippet: topic.Text.slice(0, 600),
      source: "DuckDuckGo",
    });
  }
  return results;
}

async function wikipediaSearch(query: string): Promise<RawResult[]> {
  const endpoint = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
    query,
  )}&srlimit=4&format=json&origin=*`;
  const response = await fetch(endpoint, {
    headers: { "user-agent": "LearningStudio/1.0 (local study app)" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as { query?: { search?: { title: string; snippet: string }[] } };
  return (payload.query?.search ?? []).map((row) => ({
    title: row.title,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(row.title.replace(/ /g, "_"))}`,
    snippet: htmlToText(row.snippet),
    source: "Wikipedia",
  }));
}

export async function webSearch(query: string): Promise<ToolResult> {
  const trimmed = query.trim().slice(0, 300);
  if (!trimmed) return { resources: [], text: "" };

  let raw: RawResult[] = [];
  const tavilyKey = process.env.TAVILY_API_KEY;
  const braveKey = process.env.BRAVE_API_KEY;
  try {
    if (tavilyKey) raw = await tavilySearch(trimmed, tavilyKey);
    if (!raw.length && braveKey) raw = await braveSearch(trimmed, braveKey);
    if (!raw.length) raw = await duckDuckGoSearch(trimmed);
    if (!raw.length) raw = await duckDuckGoInstant(trimmed);
    if (raw.length < 3) raw = [...raw, ...(await wikipediaSearch(trimmed))];
  } catch {
    try {
      raw = await wikipediaSearch(trimmed);
    } catch {
      raw = [];
    }
  }

  const seen = new Set<string>();
  const resources: ResourceRef[] = [];
  for (const row of raw) {
    const url = safeUrl(row.url);
    if (!url) continue;
    const dedupeKey = `${url.hostname}${url.pathname}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    resources.push({
      id: crypto.randomUUID(),
      title: row.title || url.hostname,
      url: url.toString(),
      source: url.hostname.replace(/^www\./, ""),
      type: "web",
      snippet: row.snippet.slice(0, 700),
      retrievedAt: new Date().toISOString(),
      query: trimmed,
    });
    if (resources.length >= 5) break;
  }

  const text = resources
    .map((resource, index) => `[${index + 1}] ${resource.title} — ${resource.source}\n${resource.snippet ?? ""}`)
    .join("\n\n");

  return { resources, text };
}

/* ------------------------------------------------------------------ */
/* fetch_url                                                            */
/* ------------------------------------------------------------------ */

export async function fetchUrl(rawUrl: string, maxChars = 6000): Promise<ToolResult> {
  const url = safeUrl(rawUrl);
  if (!url) return { resources: [], text: "" };
  try {
    const response = await fetchPublicUrl(url.toString(), AbortSignal.timeout(20000));
    if (!response.ok) return { resources: [], text: "" };
    const contentType = response.headers.get("content-type") ?? "";
    if (!/text\/|json|xml/i.test(contentType)) return { resources: [], text: "" };
    const body = (await response.text()).slice(0, 400000);
    const text = /html/i.test(contentType) ? htmlToText(body) : body;
    const trimmed = text.slice(0, maxChars);
    const resource: ResourceRef = {
      id: crypto.randomUUID(),
      title: /html/i.test(contentType) ? titleFromHtml(body, url.hostname) : url.pathname || url.hostname,
      url: url.toString(),
      source: url.hostname.replace(/^www\./, ""),
      type: "web",
      snippet: trimmed.slice(0, 500),
      retrievedAt: new Date().toISOString(),
    };
    return { resources: [resource], text: `${resource.title}\n${trimmed}` };
  } catch {
    return { resources: [], text: "" };
  }
}

export function dedupeResources(resources: ResourceRef[]): ResourceRef[] {
  const seen = new Set<string>();
  const out: ResourceRef[] = [];
  for (const resource of resources) {
    const key = resource.url || resource.title;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(resource);
  }
  return out;
}

export function budgetText(text: string, budget: number): string {
  if (text.length <= budget) return text;
  return `${text.slice(0, budget)}\n…[truncated]`;
}
