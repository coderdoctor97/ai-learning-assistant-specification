import type { ModelCapabilities, ModelPricing, Provider } from "@/db/schema";
import { capabilitiesForModelId, catalogEntry, NO_CAPABILITIES, protocolFor } from "./catalog";
import { ABHIBOTS_SEED_MODELS } from "./abhibots";
import { safeUrl } from "@/lib/tools";
import { demoResponse, demoStream } from "./demo";

export const DEMO_MODEL_ID = "studio-demo-scaffold";

export type ChatImage = { mime: string; dataBase64: string } | { url: string };
export type ChatDocument = { mime: "application/pdf"; dataBase64: string };
export type ChatAudio = { dataBase64: string; format: "mp3" | "wav" | "m4a" | "ogg" | "webm" | "flac" };
// Keep unknown provider fields (notably Gemini thought_signature) on replay.
export type ContentBlock = { type: string; [key: string]: unknown };
export type ToolDefinition = { name: string; description: string; input_schema: Record<string, unknown> };

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
  images?: ChatImage[];
  documents?: ChatDocument[];
  audio?: ChatAudio[];
  blocks?: ContentBlock[];
};

export type ChatOptions = {
  model: string;
  messages: ChatMessage[];
  maxTokens: number;
  temperature: number;
  stream: boolean;
  reasoning: boolean;
  tools?: ToolDefinition[];
  signal?: AbortSignal;
};

export type ChatEvent =
  | { type: "content"; text: string }
  | { type: "reasoning"; text: string }
  | { type: "tool_call"; id: string; name: string; input: Record<string, unknown> }
  | { type: "assistant"; blocks: ContentBlock[] }
  | { type: "stop"; reason: string };

export type FamilyRoute = "anthropic-messages" | "openai-chat";
export function routeFor(provider: Pick<Provider, "kind">, options: Pick<ChatOptions, "model" | "messages">): FamilyRoute {
  if (provider.kind !== "abhibots") {
    return protocolFor(provider.kind) === "anthropic" ? "anthropic-messages" : "openai-chat";
  }
  if (options.messages.some((message) => message.audio?.length)) return "openai-chat";
  const id = options.model.toLowerCase();
  return id.startsWith("gpt-") || id.startsWith("o") ? "openai-chat" : "anthropic-messages";
}

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

function headersFor(provider: Provider, key: string | null, protocol = protocolFor(provider.kind)): Record<string, string> {
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

async function discoverModels(provider: Provider): Promise<DiscoveredModel[]> {
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
      const resolved = capabilitiesForModelId(id, {}, provider.kind);
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

export type ModelDiscovery = DiscoveredModel[] & { usedFallback?: boolean };

export async function listModels(provider: Provider): Promise<ModelDiscovery> {
  // A static list is not evidence that credentials work. Never hide auth errors.
  if (provider.kind === "abhibots" && !resolveApiKey(provider)) {
    throw new ProviderError("Add an API key before discovering models.", 400);
  }
  try {
    const models = await discoverModels(provider);
    if (models.length || provider.kind !== "abhibots") return models;
  } catch (error) {
    if (provider.kind !== "abhibots" || (error instanceof ProviderError && error.status === 401)) throw error;
  }
  return Object.assign(ABHIBOTS_SEED_MODELS.map((modelId): DiscoveredModel => {
    const resolved = capabilitiesForModelId(modelId, {}, provider.kind);
    return { modelId, displayName: modelId, contextLength: resolved.context, maxOutput: resolved.output,
      capabilities: resolved.caps, pricing: null, isFree: false };
  }), { usedFallback: true });
}

/** Payload-level guard also covers callers other than the harness. No URL fetches here. */
export function prepareMessages(provider: Provider, options: ChatOptions): ChatMessage[] {
  if (provider.kind !== "abhibots") return options.messages;
  const caps = capabilitiesForModelId(options.model, {}, provider.kind).caps;
  const anthropic = routeFor(provider, options) === "anthropic-messages";
  const limit = /^claude-/i.test(options.model) ? 5 * 1048576 : 20 * 1048576;
  return options.messages.map((message) => {
    const notes: string[] = [];
    const images = message.images?.filter((image, index) => {
      let reason = "";
      if (!caps.vision) reason = "unsupported by this model";
      else if ("url" in image) {
        if (!anthropic || !/^gemini-/i.test(options.model) || !safeUrl(image.url)) reason = "unsupported or unsafe URL";
      } else if (Buffer.byteLength(image.dataBase64, "base64") > limit) reason = "exceeds size limit";
      if (reason) notes.push(`Image ${index + 1} omitted: ${reason}.`);
      return !reason;
    });
    if (message.documents?.length && (!caps.documents || !anthropic)) {
      throw new ProviderError("PDF blocks require a document-capable Messages route. Use extracted text with audio.", 400);
    }
    if (message.audio?.length && !caps.voice) throw new ProviderError("This model does not support audio input.", 400);
    return { ...message, images, content: [message.content, ...notes].join("\n") };
  });
}

export function openAiBody(options: ChatOptions, provider: Provider) {
  const messages = prepareMessages(provider, options).map((message) => {
    if (!message.images?.length && !message.audio?.length) return { role: message.role, content: message.content };
    return {
      role: message.role,
      content: [
        { type: "text", text: message.content },
        ...(message.images ?? []).map((image) => ({
          type: "image_url",
          image_url: { url: "url" in image ? image.url : `data:${image.mime};base64,${image.dataBase64}` },
        })),
        ...(message.audio ?? []).map((audio) => ({
          type: "input_audio", input_audio: { data: audio.dataBase64, format: audio.format },
        })),
      ],
    };
  });
  const body: Record<string, unknown> = {
    model: options.model, messages, max_tokens: options.maxTokens,
    temperature: options.temperature, stream: options.stream,
  };
  if (options.reasoning) {
    if (provider.kind === "openrouter") body.reasoning = { effort: "medium" };
    else body.reasoning_effort = "medium";
  }
  if (options.stream) body.stream_options = { include_usage: false };
  // No native OpenAI tools loop ships in this integration.
  return body;
}

export function anthropicBody(options: ChatOptions, provider?: Provider) {
  const prepared = provider ? prepareMessages(provider, options) : options.messages;
  const system = prepared.filter((message) => message.role === "system").map((message) => message.content).join("\n\n");
  const messages = prepared.filter((message) => message.role !== "system").map((message) => ({
    role: message.role,
    content: message.blocks ?? (message.images?.length || message.documents?.length
      ? [
          ...(message.images ?? []).map((image) => ({ type: "image", source: "url" in image
            ? { type: "url", url: image.url }
            : { type: "base64", media_type: image.mime, data: image.dataBase64 } })),
          ...(message.documents ?? []).map((document) => ({ type: "document",
            source: { type: "base64", media_type: document.mime, data: document.dataBase64 } })),
          { type: "text", text: message.content },
        ]
      : message.content),
  }));
  const body: Record<string, unknown> = {
    model: options.model, system, messages, max_tokens: options.maxTokens,
    temperature: options.reasoning ? 1 : options.temperature, stream: options.stream,
  };
  if (options.reasoning) {
    body.thinking = { type: "enabled", budget_tokens: Math.max(1024, Math.floor(options.maxTokens / 2)) };
  }
  if (options.tools?.length && (!provider || capabilitiesForModelId(options.model, {}, provider.kind).caps.tools)) {
    if (options.tools.some((tool) => !/^[A-Za-z0-9_]{1,64}$/.test(tool.name))) {
      throw new ProviderError("Invalid tool name.", 400);
    }
    body.tools = options.tools;
  }
  return body;
}

async function postChat(provider: Provider, options: ChatOptions): Promise<Response> {
  const entry = catalogEntry(provider.kind);
  const base = normalizeBaseUrl(provider.baseUrl || entry.baseUrl);
  const isAnthropic = routeFor(provider, options) === "anthropic-messages";
  const url = isAnthropic ? `${base}/messages` : `${base}/chat/completions`;
  const key = resolveApiKey(provider);
  const body = isAnthropic ? anthropicBody(options, provider) : openAiBody(options, provider);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: headersFor(provider, key, isAnthropic ? "anthropic" : "openai"),
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
  index?: number;
  delta?: { type?: string; text?: string; thinking?: string; partial_json?: string; signature?: string; stop_reason?: string };
  content_block?: ContentBlock;
  error?: { message?: string };
};

export function toolCall(block: ContentBlock): Extract<ChatEvent, { type: "tool_call" }> {
  if (typeof block.id !== "string" || !block.id || typeof block.name !== "string" ||
      !block.input || typeof block.input !== "object" || Array.isArray(block.input)) {
    throw new ProviderError("Incomplete tool call; no tools were executed. Retry with a larger output budget.");
  }
  return { type: "tool_call", id: block.id, name: block.name, input: block.input as Record<string, unknown> };
}

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
  const blocks: ContentBlock[] = [];
  const toolJson = new Map<number, string>();
  let currentIndex = 0;

  function* parseLine(rawLine: string): Generator<ChatEvent> {
    const line = rawLine.trim();
    if (!line.startsWith("data:")) return;
    const data = line.slice(5).trim();
    if (!data || data === "[DONE]") return;
    let chunk: StreamChunk;
    try { chunk = JSON.parse(data) as StreamChunk; } catch { return; }
    if (chunk.type === "error") throw new ProviderError(chunk.error?.message ?? "Provider stream failed.");
    if (chunk.choices?.length) {
      const delta = chunk.choices[0]?.delta;
      const reasoning = delta?.reasoning ?? delta?.reasoning_content;
      if (reasoning) yield { type: "reasoning", text: reasoning };
      if (delta?.content) yield { type: "content", text: delta.content };
      return;
    }
    const index = chunk.index ?? currentIndex;
    if (chunk.type === "content_block_start" && chunk.content_block) {
      currentIndex = index;
      blocks[index] = { ...chunk.content_block };
      if (chunk.content_block.type === "text" && typeof chunk.content_block.text === "string" && chunk.content_block.text) {
        yield { type: "content", text: chunk.content_block.text };
      }
      if (chunk.content_block.type === "thinking" && typeof chunk.content_block.thinking === "string" && chunk.content_block.thinking) {
        yield { type: "reasoning", text: chunk.content_block.thinking };
      }
    } else if (chunk.type === "content_block_delta") {
      const block = blocks[index];
      if (chunk.delta?.partial_json !== undefined) {
        toolJson.set(index, (toolJson.get(index) ?? "") + chunk.delta.partial_json);
      }
      if (chunk.delta?.signature && block) block.signature = String(block.signature ?? "") + chunk.delta.signature;
      if (chunk.delta?.thinking) {
        if (block) block.thinking = String(block.thinking ?? "") + chunk.delta.thinking;
        yield { type: "reasoning", text: chunk.delta.thinking };
      } else if (chunk.delta?.text) {
        if (block) block.text = String(block.text ?? "") + chunk.delta.text;
        yield { type: block?.type === "thinking" ? "reasoning" : "content", text: chunk.delta.text };
      }
    } else if (chunk.type === "content_block_stop") {
      const block = blocks[index];
      if (block?.type === "tool_use") {
        const json = toolJson.get(index);
        if (json) {
          try { block.input = JSON.parse(json) as unknown; }
          catch { throw new ProviderError("Truncated tool input; no tools were executed. Increase the output budget."); }
        }
        yield toolCall(block);
      }
    } else if (chunk.type === "message_delta" && chunk.delta?.stop_reason) {
      yield { type: "stop", reason: chunk.delta.stop_reason };
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) yield* parseLine(line);
      if (done) {
        if (buffer.trim()) yield* parseLine(buffer);
        break;
      }
    }
    if (blocks.length) yield { type: "assistant", blocks };
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

export async function completeChat(
  provider: Provider,
  options: ChatOptions,
): Promise<{ content: string; reasoning: string; blocks?: ContentBlock[]; stopReason?: string }> {
  if (provider.kind === "demo") {
    return { content: demoResponse(options.messages), reasoning: "" };
  }
  const response = await postChat(provider, { ...options, stream: false });
  const payload = (await response.json()) as Record<string, unknown>;
  if (routeFor(provider, options) === "anthropic-messages") {
    const blocks = (payload.content ?? []) as { type: string; text?: string; thinking?: string }[];
    return {
      blocks: payload.content as ContentBlock[],
      stopReason: String(payload.stop_reason ?? ""),
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
  stored: Partial<ModelCapabilities> | null | undefined,
  modelId: string,
  kind?: string,
): ModelCapabilities {
  if (stored && kind !== "abhibots") return { ...NO_CAPABILITIES, ...stored };
  return capabilitiesForModelId(modelId, stored ?? {}, kind).caps;
}
