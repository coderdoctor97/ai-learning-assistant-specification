# AbhiBots Opus Gateway — Provider Integration Plan

> **Hand-off document for the next agent.** Everything below is researched against the
> current codebase (post PR #3). **Do not treat this file as implemented work** — it is the
> plan. Follow the milestones in order; each has file-level tasks and acceptance criteria.

---

## 0. Mandatory directive (from the product owner)

Add the owner's custom provider as a **built-in default provider registered with the
OpenAI-compatible base URL**, then unlock every capability its endpoint exposes.

Exact constants to add:

| Field | Value |
| --- | --- |
| `kind` | `abhibots` (new `ProviderKind`) |
| Display name | `AbhiBots Opus Gateway` |
| `baseUrl` (OpenAI-compatible, per directive) | `https://opus.abhibots.com/v1` |
| Anthropic-Messages endpoint (same origin) | `https://opus.abhibots.com/v1/messages` |
| `apiKeyEnv` | `ABHIBOTS_API_KEY` |
| `protocol` | `"openai"` (the registered default; routing is per-model — see M2) |
| `supportsDiscovery` | `true` (with static fallback, see M3) |
| Auth | Same key on both endpoints: `Authorization: Bearer <key>` on `/chat/completions`, `x-api-key: <key>` + `anthropic-version: 2023-06-01` on `/messages` |

"Default provider" means: a **built-in catalog entry that is auto-seeded** into the
`providers` table by `ensureBootstrap()` like the other built-ins (Settings → Provider card
pre-filled; the user only pastes their key). It must **not** auto-activate: the Studio demo
engine stays the active zero-key experience on fresh databases (README contract), and this
provider seeds `enabled: false, status: "unknown"` exactly like OpenAI/Anthropic/etc. today.

---

## 1. What the provider actually is (verified capability sheet)

A multi-family inference gateway. **Capabilities differ per model family, not per endpoint.**
Both API shapes live on the same origin:

- `POST /v1/messages` — Anthropic Messages format. Vision (base64 + URL for Gemini), PDF
  `document` blocks, tools (`tool_use`/`tool_result`), thinking, streaming. Works for
  `claude-*`, `gemini-*`, `grok-*`, `gpt-4.1`.
- `POST /v1/chat/completions` — OpenAI-compatible. The **only** way to send audio
  (`input_audio` parts; transcribed server-side). Also serves `gpt-4.1`, `gpt-4.1-mini`,
  `o4-mini`.
- No model on the proxy has built-in internet access. Web search = a tool **we** define and
  execute client-side (the app already has this: `src/lib/tools/index.ts`).

Family capability matrix (from the owner's doc — authoritative for this provider):

| Family | Models | Vision | PDF | Audio | Tools | Stream | Thinking |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Claude | opus-4.8, opus-4.7, sonnet-4.6, haiku-4.5 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |


Operational facts:

- **Images**: JPEG/PNG/GIF/WebP; ≤5 MB (Claude) / ≤20 MB (Gemini); multiple per message.
  `media_type` mismatches are auto-corrected server-side; a truly unconvertible image
  (e.g. HEIC) is replaced with a short note instead of failing the request.
- **Image URLs**: Gemini accepts `{ type: "url", url }` sources directly on `/messages`.
- **PDFs**: base64 `document` blocks, `application/pdf`, mixable with text, multiple per
  message. If the pinned model can't read documents you get an answer written *without*
  seeing the file — always prefer a document-capable model for PDF work.
- **Audio**: pre-recorded clips only (mp3, wav, m4a, ogg, webm, flac). No live mic endpoint.
  Transcription happens server-side, so any family can answer about a clip.
- **Tools**: standard Anthropic tool loop — model emits `tool_use`, client runs the tool and
  echoes `tool_result` with the matching `tool_use_id`. Tool names: alphanumeric +
  underscore, ≤64 chars (Gemini rejects others).

**Known pitfalls published by the provider** (must be handled in code, see M6/M7):

1. `tool_use_id` mismatch → error 2013 ("tool call result does not follow tool call").
2. Gemini `tool_use` blocks carry `thought_signature` — **do not strip it** when replaying
   assistant history.
3. Tool names must be `[A-Za-z0-9_]`, ≤64 chars.
4. Sending `tools` to `gpt-4.1-mini`/`o4-mini` → HTTP 400.
5. Image over family size limit → compress or drop with a note.
6. `max_tokens` exhausted mid-`tool_use` → the block is unanswerable; raise the budget.

---

## 2. Current architecture map (what exists today, post PR #3)

Read these before touching anything:

| File | Role today |
| --- | --- |
| `src/lib/providers/catalog.ts` | `PROVIDER_CATALOG` (10 kinds incl. `custom`), `CatalogEntry` (kind/name/baseUrl/apiKeyEnv/protocol/supportsDiscovery/blurb), `KNOWN_MODELS` regex table → `capabilitiesForModelId()`, `NO_CAPABILITIES`. |
| `src/lib/providers/gateway.ts` | `headersFor()` (protocol-aware auth), `listModels()` (GET `/models`), `postChat()` (routes `/messages` vs `/chat/completions` by **provider kind**), `anthropicBody()`/`openAiBody()` (images already supported on both), `streamChat()` (parses OpenAI deltas **and** Anthropic SSE incl. `thinking` blocks), `completeChat()`, `mergeCapabilities()`, `resolveApiKey()`. |
| `src/lib/providers/demo.ts` | Offline scaffold; must remain byte-for-byte unchanged. |
| `src/lib/bootstrap.ts` | `doBootstrap()` seeds every `PROVIDER_CATALOG` entry except `custom` as a built-in provider row (`enabled` only for demo). **Adding a catalog entry is sufficient to register the provider.** |
| `src/db/schema.ts` | `providers` (name, kind, baseUrl, apiKey, apiKeyEnv, enabled, builtIn, status…), `models` (modelId, capabilities JSON, pricing, isFree), `attachments` (name, mime, size, kind `"image"|"document"`, extractedText, dataUrl). |
| `src/lib/files.ts` | `ingestFile()`: magic-number sniffing, `MAX_FILE_BYTES = 15 MB`, images → `kind:"image"` + dataUrl (only when the active model has vision), PDF → `kind:"document"` + unpdf `extractedText` (**binary is discarded**), DOC/MD/TXT → text. No audio support. |
| `src/lib/engine/harness.ts` | `buildMessages()`: system stack + user text + up to 4 images **only when `supportsVision`**; attachment *text* is embedded as untrusted "LEARNER-SUPPLIED MATERIAL". No PDF blocks, no audio, no tools. |
| `src/lib/engine/run.ts` | Stage/QA loop: JSON planner (needsRetrieval/queries/urls) → app-side retrieval via `webSearch`/`fetchUrl` → `streamChat` with `BodySplitter` trailer handling → STATE_CONTRACT JSON parsing; resources surfaced separately. |
| `src/lib/tools/index.ts` | The app's own tool layer: `webSearch()`, `fetchUrl()`, `dedupeResources()`, SSRF guard (`BLOCKED_HOSTS`, `safeUrl()`). **This is what backs the provider's "bring-your-own web search" pattern.** |
| `src/app/api/sessions/[id]/attachments/route.ts` | Upload endpoint; `visionAvailable()` gates image ingest off the active model's capabilities. |
| `src/app/api/providers/route.ts` | Provider CRUD; kind must be in `PROVIDER_CATALOG`; baseUrl must be http(s). |
| `src/components/settings/ProviderCard.tsx` | Provider card UI (kind select, base URL, key, discovery). Auto-shows new catalog entries. |
| `src/components/studio/stage/AttachmentRow.tsx` | Upload trigger + chips; accept list `pdf,doc,docx,md,markdown,txt,png,jpeg,webp,gif`; `visionAvailable` prop. |
| `tests/contracts/components.test-d.ts` | Compile-time prop pins. `Capabilities` = `{vision, voice, reasoning, tools, streaming, documents}` — all six flags exist already; `voice` is currently never `true` anywhere. |

### Gap analysis (target vs current)

| Capability | Status today | Work needed |
| --- | --- | --- |
| Provider registration | ❌ no `abhibots` kind | Catalog entry + bootstrap seed (M1) |
| Correct per-family capabilities | ⚠️ generic `KNOWN_MODELS` **over-claims** for this proxy (`grok-4` → vision: true; `/^gpt-4\.1/` matches `-mini` → vision/documents/tools: true) | Provider-scoped override map (M2) |
| Per-model endpoint routing | ❌ protocol chosen per provider kind only | Family-aware route function (M2) |
| Vision base64 | ✅ already on both protocols | Family size limits + Gemini URL source (M4) |
| PDF `document` blocks | ❌ PDF text-only (binary discarded) | Persist base64, emit blocks, UI gating (M5) |
| Audio | ❌ nothing (`voice` flag exists, always false) | Ingest + `input_audio` on `/chat/completions` only (M6) |
| Tools loop | ⚠️ app-side planner retrieval exists; no native `tool_use` loop | Optional native loop reusing `src/lib/tools` (M7) |
| Streaming | ✅ both protocols incl. thinking | Extend for `tool_use` deltas + `stop_reason` (M7) |

---

## 3. Milestones

### M1 — Register the provider (the directive)

**Files:** `src/lib/providers/catalog.ts`, `src/lib/bootstrap.ts` (no change needed if seeding loop untouched), `src/lib/i18n/messages.ts`.

1. Add to `PROVIDER_CATALOG` (before `custom`):

```ts
{
  kind: "abhibots",
  name: "AbhiBots Opus Gateway",
  baseUrl: "https://opus.abhibots.com/v1",   // OpenAI-compatible base (directive)
  apiKeyEnv: "ABHIBOTS_API_KEY",
  protocol: "openai",                        // default shape; per-model routing in M2
  supportsDiscovery: true,
  blurb: "Multi-family gateway: Claude, Gemini, Grok and GPT-4.1 behind one key. Vision, PDFs, audio, tools and streaming per family.",
},
```

2. i18n keys for any new Settings copy (e.g. `settings.provider.abhibots.hint` explaining
   the family matrix). Follow the existing dot-notation catalog; no hardcoded strings.
3. **Do not** auto-enable. `ensureBootstrap()` will pick it up because the seed loop skips
   only `kind === "custom"`. Verify with a fresh `.data/studio.db`: provider row exists,
   `builtIn: 1`, `enabled: 0`, demo still active.

**Accept:** fresh DB shows the built-in card; demo default untouched; `tsc`/`eslint`/`stylelint` clean.

### M2 — Family-aware routing + provider-scoped capability overrides

This is the heart of the integration. The proxy's contract is "same endpoint, capabilities
differ per family", but audio *only* exists on the OpenAI shape and GPT-other rejects tools.

**Files:** `src/lib/providers/gateway.ts`, `src/lib/providers/catalog.ts` (or a new
`src/lib/providers/abhibots.ts` to keep it isolated — preferred).

1. **Route function** (gateway):

```ts
type FamilyRoute = "anthropic-messages" | "openai-chat";

/** Which upstream shape a given request must use on this provider. */
function routeFor(provider: Provider, options: ChatOptions): FamilyRoute {
  if (provider.kind !== "abhibots") return protocolFor(provider.kind) === "anthropic" ? "anthropic-messages" : "openai-chat";
  if (options.audio?.length) return "openai-chat";            // audio has no Anthropic block
  const id = options.model.toLowerCase();
  if (id.startsWith("gpt-") || id.startsWith("o")) return "openai-chat";
  return "anthropic-messages";                                 // claude-* / gemini-* / grok-*
}
```

- `postChat()` uses `routeFor()` instead of the kind-only protocol; headers stay
  protocol-shaped (`headersFor` already emits both auth styles correctly).
- `anthropicBody()`/`openAiBody()` selection follows the same route.
- **Zero behavioral change:** every non-`abhibots` provider resolves exactly as before.

2. **Capability overrides, provider-scoped.** The generic `KNOWN_MODELS` regexes stay
   untouched (other providers rely on them). Add an override consulted only for
   `provider.kind === "abhibots"`:

```ts
// abhibots.ts
export const ABHIBOTS_FAMILY_CAPS: { match: RegExp; caps: Partial<ModelCapabilities> }[] = [
  { match: /^claude-/,       caps: { vision: true, documents: true, voice: true, tools: true, streaming: true, reasoning: true } },
  { match: /^gemini-/,       caps: { vision: true, documents: true, voice: true, tools: true, streaming: true, reasoning: true } },
  { match: /^grok-/,         caps: { vision: false, documents: false, voice: true, tools: true, streaming: true } },
  { match: /^gpt-4\.1-mini|^o4-mini/, caps: { vision: false, documents: false, voice: true, tools: false, streaming: true } },
  { match: /^gpt-4\.1/,      caps: { vision: false, documents: false, voice: true, tools: true, streaming: true } },
];
```

- Thread `provider.kind` into `listModels()` → `capabilitiesForModelId(id, fallback, kind)`
  and into `mergeCapabilities(stored, modelId, kind)` (keep old signatures working via
  optional param). Stored per-model overrides (DB `models.capabilities`) still win — the
  existing `mergeCapabilities` precedence is `{...NO_CAPABILITIES, ...stored}`; add the
  family map as the layer *between* generic guess and stored value.
- Rationale: today a user selecting `grok-4` on this gateway would see the vision chip lit
  and uploads would 4xx at the provider. The override makes the capability-aware UI honest.

**Accept:** unit-check via contract tests — `grok-4 @ abhibots` → `vision:false, tools:true`;
`gpt-4.1-mini @ abhibots` → `tools:false`; `claude-opus-4-7 @ anthropic` (official) unchanged.

### M3 — Model discovery with static fallback

`GET https://opus.abhibots.com/v1/models` may or may not exist (doc doesn't document it).
**Files:** `gateway.ts`, `catalog.ts`/`abhibots.ts`.

1. Try discovery exactly as today (`listModels` already handles OpenAI-shape `data[]`).
2. On non-OK/empty result for `abhibots`, fall back to a seeded static list so the provider
   is usable without discovery:

```ts
const ABHIBOTS_SEED_MODELS = [
  "claude-opus-4-8", "claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5",
  ,
];
```

   Mark the exact IDs for `gemini-3.1-pro-low`, `gemini-3-pro-agent`, `grok-*` as
   **to-confirm against the live `/models` endpoint** during M3 verification (the owner's
   doc confirms `claude-opus-4-7` and `gemini-3-flash-ag` verbatim from examples).
   Insert them as `models` rows with family-map capabilities, `pricing: null`.
3. Surface a status note on the provider card when the fallback was used
   (`statusMessage`, i18n'd), so users know discovery failed but the provider still works.

**Accept:** with a real key, model dropdown populates (discovery or fallback); without a key,
card shows the standard "key required" state.

### M4 — Vision completions (base64 now, URLs for Gemini)

Mostly exists. **Files:** `gateway.ts`, `engine/harness.ts`, `lib/files.ts`.

1. Keep the existing base64 path (both body builders already emit correct blocks).
2. Add optional `url` to `ChatImage` (`{ mime, dataBase64 } | { url }`). In `anthropicBody`,
   emit `{ type: "image", source: { type: "url", url } }` for URL images. Only use URLs for
   `gemini-*` (route-aware guard in the harness). **Never fetch user URLs app-side** — they
   go to the provider untouched; if the app ever must fetch one, it must pass through
   `safeUrl()` (SSRF guard) in `src/lib/tools/index.ts`.
3. Enforce family size limits *before* send: Claude 5 MB, Gemini 20 MB per image
   (`harness.buildMessages` already slices to 4 images). Over-limit image → drop from the
   request and append a one-line note in the user text ("image X omitted: too large for this
   model") instead of failing the stage. Rely on the provider's auto-`media_type` correction
   (don't reimplement sniffing — `files.ts` already sniffs magic numbers at ingest).
4. HEIC/unsupported: provider degrades gracefully; no client work, but note it in the
   AttachmentRow help text (i18n).

**Accept:** with a Claude/Gemini model active, image upload → generate works end-to-end;
with Grok/GPT active the upload is rejected client-side (existing `visionAvailable` gate).

### M5 — PDF `document` blocks

**Files:** `src/lib/files.ts`, `src/db/schema.ts` (optional column), `engine/harness.ts`, `gateway.ts`, `AttachmentRow.tsx` + i18n.

1. Today `ingestFile()` keeps only `extractedText` for PDFs and throws the bytes away
   (`dataUrl: null`). Change: when PDF and `documentsAvailable()` (new helper mirroring
   `visionAvailable()` but checking `capabilities.documents`), also persist the base64 —
   either reuse `dataUrl` (`data:application/pdf;base64,…`) or add a nullable
   `blob`/`binary` column via a Drizzle migration. Reusing `dataUrl` avoids a migration;
   prefer that unless size is a concern (15 MB cap already enforced).
2. Extend `ChatMessage` with `documents?: { mime: "application/pdf"; dataBase64: string }[]`;
   `anthropicBody()` emits `{ type: "document", source: { type: "base64", media_type: "application/pdf", data } }`
   blocks after images. Grok/GPT routes must **never** receive document blocks (capability
   gate at harness level).
3. Harness policy (mirror the owner's warning): when the active model is document-capable,
   *stop inlining PDF text* into the system stack for that attachment and send the real
   block instead (the model reads the file itself); keep the text-inline path for
   non-document models so behavior there is unchanged. Add a QA-mode note reminding the
   model to quote from the document (the provider warns answers may hallucinate without a
   capable model).
4. UI: AttachmentRow accept list unchanged (PDF already allowed); chip shows a "sent as
   document" affordance only when the active model reads documents.

**Accept:** PDF upload with `claude-*` → request contains a `document` block (log/trace
verify); with a text-only model → current extracted-text behavior, byte-identical prompts.

### M6 — Audio clips (OpenAI endpoint only)

**Files:** `src/lib/files.ts`, `attachments/route.ts`, `ChatMessage`/`openAiBody()`, `engine/harness.ts`, `AttachmentRow.tsx`, i18n.

1. Ingest: accept `audio/mpeg, wav, mp4(m4a), ogg, webm, flac` (magic-sniff what's reliable;
   fall back to extension for m4a), `kind: "audio"`, store base64 in `dataUrl`, no
   `extractedText`. Gate on a new `audioAvailable()` helper → `capabilities.voice` of the
   active model (finally makes the `voice` flag real). Respect `MAX_FILE_BYTES`.
2. Extend `ChatMessage` with `audio?: { dataBase64: string; format: "mp3"|"wav"|"m4a"|"ogg"|"webm"|"flac" }[]`.
   `openAiBody()` maps to `{ type: "input_audio", input_audio: { data, format } }` parts.
   **`routeFor()` already forces the OpenAI endpoint when audio is present** — even for
   Claude models; that is the provider's documented behavior (server-side transcription,
   then the requested model answers).
3. UI: AttachmentRow gains a mic-free "attach audio clip" control when `voice` is available
   (icon-only button ≥24×24 px, `.icon-btn`, Escape-dismissible hover reveal per existing
   a11y pattern). No recording UI — the provider is pre-recorded clips only.
4. i18n for chip labels/errors; tokens only (no hex, no inline styles).

**Accept:** mp3 upload with any family active → QA answer references the clip content;
audio attachment on a `voice:false` model is rejected client-side.

### M7 — Tools: native `tool_use` loop (feature-flagged) + streaming deltas

**Files:** `engine/run.ts`, `gateway.ts`, `schema.ts` (settings), i18n, `tests/`.

1. **Gate:** add `settings.toolUse` (boolean, default **off**) next to `webRetrieval`.
   Native loop engages only when `toolUse && webRetrieval && active model tools-capable &&
   route is anthropic-messages` (Grok/GPT-4.1 also support tools, but the loop ships
   Anthropic-shape first; OpenAI-shape tool calls can be a stretch goal). Off = today's
   JSON-planner retrieval, untouched (zero behavioral change).
2. **Loop** (in `run.ts`, cap 3 iterations, overall stage budget unchanged):
   - Define tools with **safe names** (alphanumeric/underscore, ≤64): `web_search`
     (schema: `{ query: string }`) and `open_url` (`{ url: string }`) — implemented by the
     existing `webSearch()` / `fetchUrl()` from `src/lib/tools/index.ts` (keeps SSRF guards,
     dedupe, resource extraction, and the "sources separate" contract).
   - On `stop_reason === "tool_use"`: run each requested tool, then append
     `{ role: "user", content: [{ type: "tool_result", tool_use_id, content }] }` —
     **ids must match exactly** (pitfall #1).
   - **Preserve `thought_signature`**: when replaying the assistant turn, echo the raw
     content blocks back unmodified (store the original JSON, don't reconstruct) — pitfall #2.
   - Raise effective `max_tokens` headroom when a tool call is in flight (pitfall #6):
     e.g. `Math.min(maxOutputTokens, 4096)` minimum per continuation.
3. **Gateway streaming:** extend the Anthropic SSE branch for `content_block_start`
   `type:"tool_use"` (+ `input_json_delta` accumulation) and surface
   `stop_reason` from `message_delta` as a new `ChatEvent` variant
   (`{ type: "tool_call"; id; name; input }` / `{ type: "stop"; reason }`). The OpenAI
   branch gains `delta.tool_calls` parsing only if OpenAI-shape tools ship.
4. Resources produced by tool executions flow through the existing
   `dedupeResources()` → `ResourceRef` → "Sources used" panel pipeline. No inline citations.

**Accept:** with `toolUse` on + `claude-*`: a "latest population of Durgapur" style question
triggers `web_search` → `tool_result` → answer with a Sources entry; with `toolUse` off:
prompts/behavior byte-identical to today (diff a fixture run).

### M8 — Verification, tests, docs

1. **Contract tests** (`tests/contracts/` or a new `tests/unit` run via `tsx`):
   capability matrix assertions (M2), route selection table (M2), body-builder snapshots:
   image block, URL image (gemini only), PDF document block, `input_audio` part, tool
   schema names pass `[A-Za-z0-9_]{1,64}`.
2. **Playwright e2e** stays on the demo engine (offline CI); add one suite that registers a
   fake provider pointing at a local mock (optional; do not call the real gateway in tests).
3. **Manual smoke checklist against the live endpoint** (document results in the PR):
   discovery or fallback → select `claude-opus-4-7` → generate stage (stream + thinking
   visible) → upload image → ask about it → upload PDF → ask for a quoted fact → upload mp3
   (QA mode) → enable toolUse → question that needs search → switch to `gpt-4.1-mini` and
   confirm tools/vision controls disable (chips honest) → confirm demo engine untouched.
4. **README** provider list + capabilities table update (keep the "capability-aware UI,
   controls never faked" wording true).
5. **Gates (hard requirement):** `npm run typecheck`, `npm run lint`, `npm run lint:css`
   zero errors **and zero warnings**; `npm run build` clean; `npm run test:e2e` green
   (19 passed / 2 skipped baseline must not regress).

---

## 4. Constraints & guardrails (carried over — still binding)

- **Zero behavioral change** for existing providers and the demo engine: new code paths key
  off `provider.kind === "abhibots"`, the `toolUse` flag, or new capability gates. The demo
  provider, preset methodologies, README contract (stages on demand, Dynamic Agent off by
  default, sources separate, exports scrubbed) must not drift.
- **A11y (WCAG 2.2 AA)**: every new control ≥24×24 px, labelled, keyboard-reachable,
  Escape-dismissible; axe scans in `tests/accessibility/` must stay clean. All copy through
  `src/lib/i18n` (`t()`), no hardcoded strings.
- **Design system**: tokens only (`--type-*`, `--surface-muted`, `--disabled-opacity`…);
  no hex, no `!important`, no inline `style={{}}`; stylelint enforced.
- **Keys stay server-side**: reuse `resolveApiKey()` / `sanitizeProvider()`; never send keys
  to the browser; `ABHIBOTS_API_KEY` env var must work.
- **Untrusted input discipline**: attachment text/images/PDFs are learner-supplied untrusted
  data — keep the existing harness framing; never let attachment content reach the protected
  core instruction; URLs from tools pass `safeUrl()`.

## 5. Suggested commit sequence

1. `feat(providers): register AbhiBots Opus Gateway built-in provider` (M1)
2. `feat(gateway): family-aware routing + provider-scoped capability overrides` (M2+M3)
3. `feat(attachments): PDF document blocks and audio clips` (M4–M6)
4. `feat(engine): native tool-use loop behind toolUse flag` (M7)
5. `test+docs: contract tests, README, smoke results` (M8)

Each step must pass all gates independently so review stays bisectable.


also a skill dictionary driven instruction 

### 🎯 Enriched Task Objective

Register the `abhibots` ("AbhiBots Opus Gateway") built-in inference provider into the catalog, implementing protocol routing across Anthropic Messages and OpenAI Chat Completions, provider-scoped capability overrides, multimodal ingest (vision, PDF documents, audio clips), and a native tool execution loop without altering existing provider behavior or demo offline stability.

---

### 🧰 Bound Skills Invoked

1. `strict-typing-contracts` - Narrow TypeScript interfaces, model capabilities, discriminated union request payloads, and route guards to eliminate loose `any` types and runtime protocol mismatch errors.
2. `risk-fmea-premortem` - Neutralize documented gateway failure modes (tool call ID mismatch error 2013, Gemini `thought_signature` stripping, audio protocol restrictions, and payload size thresholds).
3. `threat-model-sast` - Enforce SSRF boundary guards (`safeUrl()`), server-side secret isolation (`ABHIBOTS_API_KEY`), and untrusted attachment containment against system prompt injection.
4. `accessibility-a11y` - Implement WCAG 2.2 AA compliance for new UI controls (≥24×24px hit targets, keyboard accessibility, Escape-dismissible states, design system tokens, and strict i18n localization).

---

### 📋 Enriched Operational Instructions

#### Milestone 1: Provider Catalog Registration & Seeding

* **File:** `src/lib/providers/catalog.ts`
* Register `kind: "abhibots"` with `protocol: "openai"` (default base URL `[https://opus.abhibots.com/v1](https://opus.abhibots.com/v1)`, Anthropic endpoint `[https://opus.abhibots.com/v1/messages](https://opus.abhibots.com/v1/messages)`, `apiKeyEnv: "ABHIBOTS_API_KEY"`, `supportsDiscovery: true`).


* **File:** `src/lib/bootstrap.ts`
* Verify that `ensureBootstrap()` seeds the provider row with `builtIn: true`, `enabled: false`, and `status: "unknown"`. Ensure the Studio demo engine remains the active default.


* **File:** `src/lib/i18n/messages.ts`
* Add localized string keys for card metadata and descriptions (`settings.provider.abhibots.*`). Avoid hardcoded text in UI components (`accessibility-a11y`, `i18n-localization`).



#### Milestone 2: Family-Aware Routing & Provider-Scoped Overrides

* **File:** `src/lib/providers/abhibots.ts` (isolated module)
* Define `ABHIBOTS_FAMILY_CAPS` regex map to accurately scope capabilities:
* `^claude-`, `^gemini-`: `vision: true, documents: true, voice: true, tools: true, streaming: true, reasoning: true`.
* `^grok-`: `vision: false, documents: false, voice: true, tools: true, streaming: true`.
* `^gpt-4\.1-mini|^o4-mini`: `vision: false, documents: false, voice: true, tools: false, streaming: true`.
* `^gpt-4\.1`: `vision: false, documents: false, voice: true, tools: true, streaming: true`.




* **File:** `src/lib/providers/gateway.ts`
* Implement a discriminated union route selector (`strict-typing-contracts`):
```ts
type FamilyRoute = "anthropic-messages" | "openai-chat";

export function routeFor(provider: Provider, options: ChatOptions): FamilyRoute {
  if (provider.kind !== "abhibots") {
    return protocolFor(provider.kind) === "anthropic" ? "anthropic-messages" : "openai-chat";
  }
  if (options.audio?.length) return "openai-chat";
  const id = options.model.toLowerCase();
  if (id.startsWith("gpt-") || id.startsWith("o")) return "openai-chat";
  return "anthropic-messages";
}

```


* Thread `provider.kind` through `listModels()` and `mergeCapabilities()`. Ensure stored database overrides take precedence while the fallback sits between generic regexes and stored state.



#### Milestone 3: Model Discovery with Static Fallback

* **File:** `src/lib/providers/gateway.ts` & `src/lib/providers/abhibots.ts`
* In `listModels()`, query `GET [https://opus.abhibots.com/v1/models](https://opus.abhibots.com/v1/models)` using OpenAI formatting.
* If discovery fails or returns an empty list, fall back gracefully to `ABHIBOTS_SEED_MODELS` (`claude-opus-4-8`, `claude-opus-4-7`, `claude-sonnet-4-6`, `claude-haiku-4-5`, `gemini-3-flash-ag`, `gpt-4.1`, etc.).
* Set a localized notification status (`statusMessage`) indicating fallback mode.



#### Milestone 4: Multimodal Vision Ingestion & SSRF Defense

* **File:** `src/lib/engine/harness.ts` & `src/lib/providers/gateway.ts`
* Support `ChatImage` type narrowing: `{ mime: string; dataBase64: string } | { url: string }`.
* Pass URL image sources directly to the upstream Anthropic endpoint only for `gemini-*` models.
* Route all external URL resolution through `safeUrl()` in `src/lib/tools/index.ts` to block private IPv4/IPv6 ranges and internal metadata endpoints (`threat-model-sast`).
* Enforce payload constraints before dispatch (`risk-fmea-premortem`):
* Cap Claude images at 5 MB and Gemini images at 20 MB.
* If an image exceeds limits, drop it and append an explicit note (`"image omitted: exceeds size limit"`) to prevent payload rejection.





#### Milestone 5: PDF Document Blocks

* **File:** `src/lib/files.ts` & `src/lib/engine/harness.ts`
* For PDF uploads when `capabilities.documents` is active on the selected model, retain base64 data in `dataUrl`.
* For document-capable models (`claude-*`), emit Anthropic `{ type: "document", source: { type: "base64", media_type: "application/pdf", data } }` blocks.
* For non-document models, preserve the existing extraction path (`extractedText` wrapped as untrusted learner material) without behavioral drift.



#### Milestone 6: Audio Input Handling

* **File:** `src/lib/files.ts` & `src/lib/engine/harness.ts`
* Ingest pre-recorded audio formats (`mp3`, `wav`, `m4a`, `ogg`, `webm`, `flac`) under `kind: "audio"`.
* Restrict audio upload gating to models with `capabilities.voice === true`.
* Format requests as `{ type: "input_audio", input_audio: { data, format } }` and force dispatch via `routeFor()` to `POST /v1/chat/completions`.


* **File:** `src/components/studio/stage/AttachmentRow.tsx`
* Add audio attach trigger adhering to design tokens: minimum 24×24px target, `.icon-btn`, full keyboard focus outline, and Escape key dismissal (`accessibility-a11y`).



#### Milestone 7: Native Anthropic Tool Execution Loop & Stream Parsing

* **File:** `src/lib/engine/run.ts`
* Gate native execution behind `settings.toolUse && activeModel.tools && route === "anthropic-messages"`.
* Register strictly validated tool identifiers matching `^[A-Za-z0-9_]{1,64}$` (`web_search`, `open_url`).
* Max loop iterations capped at 3 per turn.
* Enforce critical state invariants (`risk-fmea-premortem`):
* Tool replay must maintain exact matching `tool_use_id` values to prevent gateway error 2013.
* Store and replay raw assistant message chunks to preserve Gemini `thought_signature` blocks verbatim.
* Allocate token headroom (`min(maxOutputTokens, 4096)`) when tool executions are pending.




* **File:** `src/lib/providers/gateway.ts`
* Extend Anthropic SSE parsing for `content_block_start` with `type: "tool_use"` and accumulate `input_json_delta` chunks.



#### Milestone 8: Automated Verification & Documentation

* Add unit and contract tests under `tests/contracts/` covering:
* Route determination truth table across all model families and audio conditions.
* Correct capability mapping for `abhibots` models.
* Serialized JSON shapes for vision, PDF documents, and audio payloads.


* Update `README.md` provider capability matrix.

---

### 🛑 Definition of Done & Verification Guardrails

1. **Type & Linter Enforcement (`strict-typing-contracts`)**:
* `npm run typecheck`, `npm run lint`, and `npm run lint:css` complete with 0 errors and 0 warnings.
* All routing and payload functions have zero untyped `any` casts.


2. **Security & Protocol Isolation (`threat-model-sast`)**:
* `ABHIBOTS_API_KEY` is resolved strictly server-side and never exposed to the client.
* All image/resource URLs pass `safeUrl()` SSRF validation before network dispatch.
* Attachment content remains isolated in untrusted learner contexts.


3. **Failure-Mode Prevention (`risk-fmea-premortem`)**:
* Tool loop tests verify `tool_use_id` parity between tool call and result.
* Assistant history replay maintains `thought_signature` fields intact.
* Models marked without tool support (`gpt-4.1-mini`, `o4-mini`) never receive `tools` schemas.
* Audio attachments route to OpenAI-compatible endpoints regardless of model family.


4. **Accessibility & Design System Invariants (`accessibility-a11y`)**:
* UI elements satisfy WCAG 2.2 AA with interactive targets ≥24×24px and keyboard navigation support.
* Zero hardcoded UI strings; all user-facing labels use typed i18n messages.
* Existing E2E test baseline (19 passed, 2 skipped) remains green with no regressions on the demo engine.