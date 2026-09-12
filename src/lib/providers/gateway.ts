import type { ModelCapabilities, ModelPricing, Provider } from "@/db/schema";
import { capabilitiesForModelId, catalogEntry, NO_CAPABILITIES, protocolFor } from "./catalog";
import { demoResponse, demoStream } from "./demo";

export const DEMO_MODEL_ID = "studio-demo-scaffold";

export type ChatImage = { mime: string; dataBase64: string };

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
  images?: ChatImage[];
};

export type ChatOptions = {
  model: string;
  messages: ChatMessage[];
  maxTokens: number;
  temperature: number;
  stream: boolean;
  reasoning: boolean;
  signal?: AbortSignal;
};

export type ChatEvent =
  | { type: "content"; text: string }
  | { type: "reasoning"; text: string };

export type DiscoveredModel = {
  modelId: string;
  displayName: string;
  contextLength: number;
  maxOutput: number;
  capabilities: ModelCapabilities;
  pricing: ModelPricing | null;
  isFree: boolean;
};

export class ProviderError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "ProviderError";
    this.status = status;
  }
}

export function resolveApiKey(provider: Pick<Provider, "apiKey" | "apiKeyEnv">): string | null {
  if (provider.apiKey && provider.apiKey.trim().length > 0) return provider.apiKey.trim();
  if (provider.apiKeyEnv) {
    const fromEnv = process.env[provider.apiKeyEnv];
    if (fromEnv && fromEnv.trim().length > 0) return fromEnv.trim();
  }
  return null;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function headersFor(provider: Provider, key: string | null): Record<string, string> {
  const protocol = protocolFor(provider.kind);
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (protocol === "anthropic") {
    if (key) headers["x-api-key"] = key;
    headers["anthropic-version"] = "2023-06-01";
  } else if (key) {
    headers.authorization = `Bearer ${key}`;
  }
  if (provider.kind === "openrouter") {
    headers["http-referer"] = "http://localhost:3000";
    headers["x-title"] = "Learning Studio";
  }
  return headers;
}

/* ------------------------------------------------------------------ */
/* Model discovery                                                      */
/* ------------------------------------------------------------------ */

type OpenRouterModel = {
  id: string;
  name?: string;
  context_length?: number;
  top_provider?: { max_completion_tokens?: number | null; context_length?: number | null };
  pricing?: Record<string, string>;
  architecture?: { input_modalities?: string[]; output_modalities?: string[]; modality?: string };
  supported_parameters?: string[];
};

function fromOpenRouter(model: OpenRouterModel): DiscoveredModel {
  const inputs = model.architecture?.input_modalities ?? [];
  const params = model.supported_parameters ?? [];
  const modality = model.architecture?.modality ?? "";
  const caps: ModelCapabilities = {
    vision: inputs.includes("image") || modality.includes("image"),
    voice: inputs.includes("audio") || (model.architecture?.output_modalities ?? []).includes("audio"),
    reasoning: params.includes("reasoning") || params.includes("include_reasoning"),
    tools: params.includes("tools") || params.includes("tool_choice"),
    streaming: true,
    documents: inputs.includes("file") || inputs.includes("image"),
  };
  const promptPrice = model.pricing?.prompt ?? null;
  const completionPrice = model.pricing?.completion ?? null;
  const isFree =
    model.id.endsWith(":free") ||
    (Number(promptPrice ?? "1") === 0 && Number(completionPrice ?? "1") === 0);
  return {
    modelId: model.id,
    displayName: model.name ?? model.id,
    contextLength: model.context_length ?? model.top_provider?.context_length ?? 8192,
    maxOutput: model.top_provider?.max_completion_tokens ?? Math.min(model.context_length ?? 8192, 8192),
    capabilities: caps,
    pricing: { prompt: promptPrice, completion: completionPrice, currency: "USD" },
    isFree,
  };
}

export async function listModels(provider: Provider): Promise<DiscoveredModel[]> {
  const entry = catalogEntry(provider.kind);
  const key = resolveApiKey(provider);

  if (provider.kind === "demo") {
    return [
      {
        modelId: DEMO_MODEL_ID,
        displayName: "Studio demo scaffold (offline)",
        contextLength: 32000,
        maxOutput: 4000,
        capabilities: { vision: false, voice: false, reasoning: false, tools: false, streaming: true, documents: true },
        pricing: null,
        isFree: true,
      },
    ];
  }

  const base = normalizeBaseUrl(provider.baseUrl || entry.baseUrl);
  if (!base) throw new ProviderError("No base URL configured for this provider.", 400);

  const url = `${base}/models`;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: headersFor(provider, key),
      signal: AbortSignal.timeout(20000),
    });
  } catch (error) {
    throw new ProviderError(
      `Could not reach ${base}: ${error instanceof Error ? error.message : "network error"}`,
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new ProviderError(
      `${response.status} ${response.statusText}${body ? ` — ${body.slice(0, 220)}` : ""}`,
      response.status === 401 || response.status === 403 ? 401 : 502,
    );
  }

  const payload = (await response.json()) as { data?: unknown[]; models?: unknown[] };
  const rows = (payload.data ?? payload.models ?? []) as Record<string, unknown>[];

  return rows
    .map((row) => {
      const id = String(row.id ?? row.name ?? "").trim();
      if (!id) return null;
      if (provider.kind === "openrouter") return fromOpenRouter(row as OpenRouterModel);

      const declaredContext = Number(row.context_length ?? row.context_window ?? row.max_context_length ?? 0);
      const resolved = capabilitiesForModelId(id);
      const caps: ModelCapabilities = {
        ...resolved.caps,
        streaming: resolved.caps.streaming || protocolFor(provider.kind) === "anthropic",
      };
      return {
        modelId: id,
        displayName: String(row.display_name ?? row.name ?? id),
        contextLength: declaredContext > 0 ? declaredContext : resolved.context,
        maxOutput: Number(row.max_output_tokens ?? 0) || resolved.output,
        capabilities: caps,
        pricing: null,
        isFree: /:free$/.test(id),
      } satisfies DiscoveredModel;
    })
    .filter((model): model is DiscoveredModel => model !== null)
    .sort((a, b) => a.modelId.localeCompare(b.modelId));
}

/* ------------------------------------------------------------------ */
/* Chat                                                                 */
/* ------------------------------------------------------------------ */

function openAiBody(options: ChatOptions, provider: Provider) {
  const messages = options.messages.map((message) => {
    if (!message.images?.length) return { role: message.role, content: message.content };
    return {
      role: message.role,
      content: [
        { type: "text", text: message.content },
        ...message.images.map((image) => ({
          type: "image_url",
          image_url: { url: `data:${image.mime};base64,${image.dataBase64}` },
        })),
      ],
    };
  });
  const body: Record<string, unknown> = {
    model: options.model,
    messages,
    max_tokens: options.maxTokens,
    temperature: options.temperature,
    stream: options.stream,
  };
  if (options.reasoning) {
    if (provider.kind === "openrouter") body.reasoning = { effort: "medium" };
    else body.reasoning_effort = "medium";
  }
  if (options.stream) body.stream_options = { include_usage: false };
  return body;
}

function anthropicBody(options: ChatOptions) {
  const system = options.messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
  const messages = options.messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role,
      content: message.images?.length
        ? [
            ...message.images.map((image) => ({
              type: "image",
              source: { type: "base64", media_type: image.mime, data: image.dataBase64 },
            })),
            { type: "text", text: message.content },
          ]
        : message.content,
    }));
  const body: Record<string, unknown> = {
    model: options.model,
    system,
    messages,
    max_tokens: options.maxTokens,
    temperature: options.reasoning ? 1 : options.temperature,
    stream: options.stream,
  };
  if (options.reasoning) {
    body.thinking = { type: "enabled", budget_tokens: Math.max(1024, Math.floor(options.maxTokens / 2)) };
  }
  return body;
}

async function postChat(provider: Provider, options: ChatOptions): Promise<Response> {
  const entry = catalogEntry(provider.kind);
  const base = normalizeBaseUrl(provider.baseUrl || entry.baseUrl);
  const isAnthropic = entry.protocol === "anthropic";
  const url = isAnthropic ? `${base}/messages` : `${base}/chat/completions`;
  const key = resolveApiKey(provider);
  const body = isAnthropic ? anthropicBody(options) : openAiBody(options, provider);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: headersFor(provider, key),
      body: JSON.stringify(body),
      signal: options.signal ?? AbortSignal.timeout(180000),
    });
  } catch (error) {
    throw new ProviderError(
      `Request to ${base} failed: ${error instanceof Error ? error.message : "network error"}`,
    );
  }
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    let detail = text.slice(0, 400);
    try {
      const parsed = JSON.parse(text) as { error?: { message?: string } | string };
      if (parsed?.error) {
        detail = typeof parsed.error === "string" ? parsed.error : parsed.error.message ?? detail;
      }
    } catch {
      /* keep raw text */
    }
    throw new ProviderError(`${response.status} ${response.statusText}: ${detail}`, response.status);
  }
  return response;
}

type StreamChunk = {
  choices?: { delta?: { content?: string | null; reasoning?: string | null; reasoning_content?: string | null } }[];
  type?: string;
  delta?: { type?: string; text?: string; thinking?: string; partial_json?: string };
  content_block?: { type?: string };
};

export async function* streamChat(provider: Provider, options: ChatOptions): AsyncGenerator<ChatEvent> {
  if (provider.kind === "demo") {
    yield* demoStream(options.messages);
    return;
  }
  const response = await postChat(provider, { ...options, stream: true });
  if (!response.body) throw new ProviderError("Provider returned an empty stream.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let blockIsThinking = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      let chunk: StreamChunk;
      try {
        chunk = JSON.parse(data) as StreamChunk;
      } catch {
        continue;
      }
      if (chunk.choices?.length) {
        const delta = chunk.choices[0]?.delta;
        const reasoning = delta?.reasoning ?? delta?.reasoning_content;
        if (reasoning) yield { type: "reasoning", text: reasoning };
        if (delta?.content) yield { type: "content", text: delta.content };
        continue;
      }
      if (chunk.type === "content_block_start") {
        blockIsThinking = chunk.content_block?.type === "thinking";
      } else if (chunk.type === "content_block_delta") {
        if (chunk.delta?.thinking) yield { type: "reasoning", text: chunk.delta.thinking };
        else if (chunk.delta?.text) {
          yield { type: blockIsThinking ? "reasoning" : "content", text: chunk.delta.text };
        }
      } else if (chunk.type === "content_block_stop") {
        blockIsThinking = false;
      }
    }
  }
}

export async function completeChat(
  provider: Provider,
  options: ChatOptions,
): Promise<{ content: string; reasoning: string }> {
  if (provider.kind === "demo") {
    return { content: demoResponse(options.messages), reasoning: "" };
  }
  const response = await postChat(provider, { ...options, stream: false });
  const payload = (await response.json()) as Record<string, unknown>;
  if (protocolFor(provider.kind) === "anthropic") {
    const blocks = (payload.content ?? []) as { type: string; text?: string; thinking?: string }[];
    return {
      content: blocks.filter((b) => b.type === "text").map((b) => b.text ?? "").join(""),
      reasoning: blocks.filter((b) => b.type === "thinking").map((b) => b.thinking ?? "").join(""),
    };
  }
  const choices = (payload.choices ?? []) as {
    message?: { content?: string; reasoning?: string; reasoning_content?: string };
  }[];
  const message = choices[0]?.message;
  return {
    content: message?.content ?? "",
    reasoning: message?.reasoning ?? message?.reasoning_content ?? "",
  };
}

export function mergeCapabilities(
  stored: ModelCapabilities | null | undefined,
  modelId: string,
): ModelCapabilities {
  if (stored) return { ...NO_CAPABILITIES, ...stored };
  return capabilitiesForModelId(modelId).caps;
}
