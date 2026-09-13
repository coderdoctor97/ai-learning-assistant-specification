import type { ModelCapabilities } from "@/db/schema";

/** Proxy-specific facts; never apply these to another provider's models. */
export const ABHIBOTS_FAMILY_CAPS: { match: RegExp; caps: Partial<ModelCapabilities> }[] = [
  { match: /^claude-/, caps: { vision: true, documents: true, voice: true, tools: true, streaming: true, reasoning: true } },
  { match: /^gemini-/, caps: { vision: true, documents: true, voice: true, tools: true, streaming: true, reasoning: true } },
  { match: /^grok-/, caps: { vision: false, documents: false, voice: true, tools: true, streaming: true } },
  { match: /^(gpt-4\.1-mini|o4-mini)/, caps: { vision: false, documents: false, voice: true, tools: false, streaming: true } },
  { match: /^gpt-4\.1/, caps: { vision: false, documents: false, voice: true, tools: true, streaming: true } },
];

// Only IDs explicitly named in the hand-off. Other Gemini/Grok IDs must be
// confirmed by discovery; do not fabricate aliases or pricing for them.
export const ABHIBOTS_SEED_MODELS = [
  "claude-opus-4-8", "claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5",
  "gemini-3-flash-ag", "gpt-4.1", "gpt-4.1-mini", "o4-mini",
];

export function abhibotsCapabilities(modelId: string): Partial<ModelCapabilities> {
  return ABHIBOTS_FAMILY_CAPS.find(({ match }) => match.test(modelId.toLowerCase()))?.caps ?? {};
}
