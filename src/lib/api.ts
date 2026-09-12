import { NextResponse } from "next/server";
import type { Provider } from "@/db/schema";
import { catalogEntry } from "@/lib/providers/catalog";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Flatten an error and its nested `cause` chain into one readable message. */
export function errorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Unexpected server error.";
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; current instanceof Error && depth < 5; depth += 1) {
    const text = current.message?.trim();
    if (text && !parts.includes(text)) parts.push(text);
    current = (current as { cause?: unknown }).cause;
  }
  return parts.length ? parts.join(" — ") : "Unexpected server error.";
}

export function handleError(error: unknown) {
  const status = typeof (error as { status?: number })?.status === "number" ? (error as { status: number }).status : 500;
  return NextResponse.json({ error: errorMessage(error) }, { status: status >= 400 && status < 600 ? status : 500 });
}

export type ClientProvider = {
  id: string;
  name: string;
  kind: string;
  baseUrl: string;
  builtIn: boolean;
  enabled: boolean;
  status: string;
  statusMessage: string | null;
  lastCheckedAt: string | null;
  hasKey: boolean;
  keySource: "stored" | "env" | "none";
  apiKeyEnv: string | null;
  keyHint: string | null;
  protocol: "openai" | "anthropic";
  supportsDiscovery: boolean;
  blurb: string;
  requiresKey: boolean;
};

/** Never let provider credentials leave the server. */
export function sanitizeProvider(provider: Provider): ClientProvider {
  const entry = catalogEntry(provider.kind);
  const storedKey = provider.apiKey?.trim() ?? "";
  const envKey = provider.apiKeyEnv ? (process.env[provider.apiKeyEnv] ?? "").trim() : "";
  const keySource: ClientProvider["keySource"] = storedKey ? "stored" : envKey ? "env" : "none";
  return {
    id: provider.id,
    name: provider.name,
    kind: provider.kind,
    baseUrl: provider.baseUrl,
    builtIn: provider.builtIn,
    enabled: provider.enabled,
    status: provider.status,
    statusMessage: provider.statusMessage,
    lastCheckedAt: provider.lastCheckedAt ? provider.lastCheckedAt.toISOString() : null,
    hasKey: keySource !== "none",
    keySource,
    apiKeyEnv: provider.apiKeyEnv,
    keyHint: storedKey ? `••••${storedKey.slice(-4)}` : envKey ? `from ${provider.apiKeyEnv}` : null,
    protocol: entry.protocol,
    supportsDiscovery: entry.supportsDiscovery,
    blurb: entry.blurb,
    requiresKey: provider.kind !== "demo",
  };
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw Object.assign(new Error("Invalid JSON body."), { status: 400 });
  }
}

export function requireString(value: unknown, field: string, max = 4000): string {
  if (typeof value !== "string" || !value.trim()) {
    throw Object.assign(new Error(`${field} is required.`), { status: 400 });
  }
  return value.trim().slice(0, max);
}
