import type { ModelCapabilities } from "@/db/schema";

export type ProviderKind =
  | "openai"
  | "openrouter"
  | "anthropic"
  | "xai"
  | "tokenrouter"
  | "opencode"
  | "go"
  | "zen"
  | "demo"
  | "custom";

export type CatalogEntry = {
  kind: ProviderKind;
  name: string;
  baseUrl: string;
  apiKeyEnv: string;
  protocol: "openai" | "anthropic";
  supportsDiscovery: boolean;
  blurb: string;
};

export const PROVIDER_CATALOG: CatalogEntry[] = [
  {
    kind: "demo",
    name: "Studio demo engine",
    baseUrl: "local://demo",
    apiKeyEnv: "",
    protocol: "openai",
    supportsDiscovery: true,
    blurb: "Offline deterministic scaffold. No key required — use it to explore the studio, then connect a real provider.",
  },
  {
    kind: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    apiKeyEnv: "OPENAI_API_KEY",
    protocol: "openai",
    supportsDiscovery: true,
    blurb: "GPT family. Vision, tools and streaming on current models.",
  },
  {
    kind: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKeyEnv: "OPENROUTER_API_KEY",
    protocol: "openai",
    supportsDiscovery: true,
    blurb: "Hundreds of models behind one OpenAI-compatible API, including :free tiers.",
  },
  {
    kind: "anthropic",
    name: "Anthropic (Claude)",
    baseUrl: "https://api.anthropic.com/v1",
    apiKeyEnv: "ANTHROPIC_API_KEY",
    protocol: "anthropic",
    supportsDiscovery: true,
    blurb: "Claude models with long context, vision and extended thinking.",
  },
  {
    kind: "xai",
    name: "xAI (Grok)",
    baseUrl: "https://api.x.ai/v1",
    apiKeyEnv: "XAI_API_KEY",
    protocol: "openai",
    supportsDiscovery: true,
    blurb: "Grok models over an OpenAI-compatible endpoint.",
  },
  {
    kind: "tokenrouter",
    name: "TokenRouter",
    baseUrl: "https://api.tokenrouter.io/v1",
    apiKeyEnv: "TOKENROUTER_API_KEY",
    protocol: "openai",
    supportsDiscovery: true,
    blurb: "Routing layer exposing an OpenAI-compatible surface.",
  },
  {
    kind: "opencode",
    name: "OpenCode Zen",
    baseUrl: "https://opencode.ai/zen/v1",
    apiKeyEnv: "OPENCODE_API_KEY",
    protocol: "openai",
    supportsDiscovery: true,
    blurb: "OpenCode's curated gateway, OpenAI-compatible.",
  },
  {
    kind: "go",
    name: "Go / local gateway",
    baseUrl: "http://localhost:11434/v1",
    apiKeyEnv: "GO_GATEWAY_API_KEY",
    protocol: "openai",
    supportsDiscovery: true,
    blurb: "Point at any local OpenAI-compatible runtime (Ollama, llama.cpp, vLLM).",
  },
  {
    kind: "zen",
    name: "Zen",
    baseUrl: "https://api.zen.ai/v1",
    apiKeyEnv: "ZEN_API_KEY",
    protocol: "openai",
    supportsDiscovery: true,
    blurb: "OpenAI-compatible Zen endpoint.",
  },
  {
    kind: "custom",
    name: "Custom provider",
    baseUrl: "",
    apiKeyEnv: "CUSTOM_API_KEY",
    protocol: "openai",
    supportsDiscovery: true,
    blurb: "Any OpenAI-compatible base URL. Bring your own endpoint.",
  },
];

export function catalogEntry(kind: string): CatalogEntry {
  return PROVIDER_CATALOG.find((entry) => entry.kind === kind) ?? PROVIDER_CATALOG[PROVIDER_CATALOG.length - 1];
}

export function protocolFor(kind: string): "openai" | "anthropic" {
  return catalogEntry(kind).protocol;
}

export const NO_CAPABILITIES: ModelCapabilities = {
  vision: false,
  voice: false,
  reasoning: false,
  tools: false,
  streaming: false,
  documents: false,
};

type KnownModel = {
  match: RegExp;
  caps: Partial<ModelCapabilities>;
  context?: number;
  output?: number;
};

/**
 * Capability facts for widely deployed models. Used when a provider does not
 * publish machine-readable capability metadata. Anything unknown stays `false`
 * rather than being guessed from the model name alone.
 */
const KNOWN_MODELS: KnownModel[] = [
  { match: /^o[13-9](-|$)/, caps: { reasoning: true, tools: true, streaming: true, vision: true, documents: true }, context: 200000, output: 100000 },
  { match: /^gpt-5/, caps: { reasoning: true, tools: true, streaming: true, vision: true, documents: true }, context: 400000, output: 128000 },
  { match: /^gpt-4\.1/, caps: { tools: true, streaming: true, vision: true, documents: true }, context: 1000000, output: 32768 },
  { match: /^gpt-4o-.*audio/, caps: { tools: true, streaming: true, vision: true, voice: true }, context: 128000, output: 16384 },
  { match: /^gpt-4o/, caps: { tools: true, streaming: true, vision: true, documents: true }, context: 128000, output: 16384 },
  { match: /^gpt-4-turbo/, caps: { tools: true, streaming: true, vision: true }, context: 128000, output: 4096 },
  { match: /^gpt-4(-|$)/, caps: { tools: true, streaming: true }, context: 8192, output: 4096 },
  { match: /^gpt-3\.5/, caps: { tools: true, streaming: true }, context: 16385, output: 4096 },
  { match: /^claude-(sonnet|opus|haiku)-4/, caps: { reasoning: true, tools: true, streaming: true, vision: true, documents: true }, context: 200000, output: 64000 },
  { match: /^claude-3-7/, caps: { reasoning: true, tools: true, streaming: true, vision: true, documents: true }, context: 200000, output: 64000 },
  { match: /^claude-3/, caps: { tools: true, streaming: true, vision: true, documents: true }, context: 200000, output: 8192 },
  { match: /^grok-4/, caps: { reasoning: true, tools: true, streaming: true, vision: true }, context: 256000, output: 32000 },
  { match: /^grok-.*vision/, caps: { tools: true, streaming: true, vision: true }, context: 32768, output: 8192 },
  { match: /^grok-3-mini/, caps: { reasoning: true, tools: true, streaming: true }, context: 131072, output: 16384 },
  { match: /^grok/, caps: { tools: true, streaming: true }, context: 131072, output: 16384 },
  { match: /^deepseek-r/, caps: { reasoning: true, streaming: true, tools: true }, context: 65536, output: 8192 },
  { match: /^qwen.*(qwq|thinking)/, caps: { reasoning: true, streaming: true }, context: 32768, output: 8192 },
  { match: /^llama/, caps: { streaming: true, tools: true }, context: 128000, output: 8192 },
  { match: /^mistral|^mixtral/, caps: { streaming: true, tools: true }, context: 32768, output: 8192 },
  { match: /^gemini/, caps: { streaming: true, tools: true, vision: true, documents: true, reasoning: true }, context: 1000000, output: 65536 },
];

export function capabilitiesForModelId(
  modelId: string,
  fallback: Partial<ModelCapabilities> = {},
): { caps: ModelCapabilities; context: number; output: number } {
  const normalized = modelId.toLowerCase().split("/").pop() ?? modelId.toLowerCase();
  const known = KNOWN_MODELS.find((entry) => entry.match.test(normalized));
  const caps: ModelCapabilities = {
    ...NO_CAPABILITIES,
    ...(known?.caps ?? {}),
    ...fallback,
  };
  return {
    caps,
    context: known?.context ?? 8192,
    output: known?.output ?? 2048,
  };
}
