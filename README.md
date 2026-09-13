# Learning Studio

A **local-first AI learning engine** — not a chat wrapper. You pick a teaching methodology, hand the engine a topic,
and it executes the learning workflow one stage at a time, keeping every session on your own machine.

## What it does

| Area | Behaviour |
| --- | --- |
| **Instruction harness** | Platform constraints → core engine instruction → active methodology → current step → learner profile → session context → your input. The core instruction is protected and never editable from step configuration. |
| **Sequential stages** | Each step is a dedicated learning page. Stage 1 is generated when the session starts; every later stage is generated **only** when you ask for it. Previous / Next navigation with progress and milestone tracking. |
| **Per-stage Q&A** | Questions stay attached to the stage you asked them in and feed the session's learning state instead of piling up in one endless thread. |
| **Dynamic Agent Mode** | **Off by default.** When on, the engine plans each step: whether to retrieve, which queries to run, whether to re-teach, add practice, ask a clarifying question, or push ahead. |
| **Retrieval & resources** | Web search/fetch runs inside the app (Tavily or Brave when keys exist, otherwise keyless fallbacks). The educational text never carries inline citations — sources appear in a separate "Sources used" panel. |
| **Providers** | OpenAI, OpenRouter, Anthropic, AbhiBots Opus Gateway, xAI, TokenRouter, OpenCode Zen, Zen, any local/OpenAI-compatible gateway, plus custom base URLs. Keys live server-side and are never returned to the browser (`.env` variables also work). |
| **Capability-aware UI** | Vision, reasoning, tools, streaming, voice and document support come from provider metadata. Controls that a model does not support are disabled, never faked — and no reasoning trace is ever invented. |
| **Files** | PDF, DOC/DOCX, Markdown, TXT and (with a vision model) images. Document-capable Messages routes also receive binary PDFs; audio-capable models accept pre-recorded clips. ZIP and JSON are rejected server-side with magic-number sniffing, not just by extension. |
| **GitHub skills** | Import a repository's skill/agent Markdown as *sanitised reference data*. Nothing is executed, and imported text cannot override the engine. |
| **Export** | Unlocked once the full sequence is complete: Markdown, Markdown + images bundle (`.zip`), DOCX, PDF (print), HTML, TXT — all free of prompts, provider names and runtime metadata. |
| **Persistence** | Projects, sessions, stages, Q&A, learning state, methodologies, provider configuration and cached models live in a local SQLite file (`.data/studio.db`) and survive refreshes, restarts and weeks away. No database server required. |

## Running it

The easiest path on Windows is to double-click **`setup.bat`** once, then **`start.bat`** whenever you want to use the studio.

Or from a terminal:

```bash
npm install
npm run dev            # or: npm run build && npm run start
```

The database is an embedded SQLite file created automatically on first run at `.data/studio.db` (Node's built-in `node:sqlite`, no native build step). Delete that file to reset the studio.

Open `/` for the landing page, `/studio` to learn, `/settings` for providers, methodologies, learner profile and skills.

### Providers

The **Studio demo engine** is active out of the box: an offline, deterministic scaffold (explicitly not a language
model) so the whole workflow — stages, Q&A, agent retrieval, exports — can be explored before any key exists.

For real teaching, open **Settings → Providers**, paste a key (or set `OPENAI_API_KEY`, `OPENROUTER_API_KEY`,
`ANTHROPIC_API_KEY`, `XAI_API_KEY`, … in `.env`), press **Test & discover**, then pick a model in the top bar.
Optional retrieval keys: `TAVILY_API_KEY`, `BRAVE_API_KEY`.

### AbhiBots Opus Gateway

A built-in provider card is seeded automatically with `https://opus.abhibots.com/v1` and
`ABHIBOTS_API_KEY`. It starts **disabled**, not active; the offline demo remains the default.
In **Settings → Providers & models**, save a key (or set `ABHIBOTS_API_KEY` in `.env`),
choose **Test & discover**, then **Use this provider** and select a model.

The catalog registers the OpenAI-compatible protocol, but each request selects its actual
endpoint and authentication headers by model and attachments:

| AbhiBots family | Default route | Vision | Binary PDF | Audio clips | Provider tools | Thinking |
| --- | --- | --- | --- | --- | --- | --- |
| Claude | `/messages` | Yes, ≤5 MB/image | Yes | Yes | Yes | Yes |
| Gemini | `/messages` | Yes, ≤20 MB/image; URL sources supported by the gateway adapter | Yes | Yes | Yes | Yes |
| Grok | `/messages` | No | No | Yes | Yes | Model-dependent |
| GPT-4.1 | `/chat/completions` | No | No | Yes | Yes; native OpenAI tool loop not implemented | No |
| GPT-4.1-mini / o4-mini | `/chat/completions` | No | No | Yes | No | o4-mini only |

All listed families support streaming according to the integration plan. Capabilities are
provider-scoped: the same model name on OpenAI, Anthropic or xAI retains its existing metadata.

- **Discovery fallback:** if `/models` is unavailable or empty, a clearly labelled static
  list is cached with no invented pricing. Fallback leaves connection status **unknown**;
  it does not verify credentials or model availability. Missing keys and authentication
  failures remain errors. Unconfirmed Grok/Gemini aliases are not fabricated.
- **Attachments:** the existing 15 MB upload limit still applies. Oversized images are
  omitted with a note. PDFs retain extracted text for fallback; supported Messages routes
  receive the actual document instead of duplicated inline text. PDFs uploaded before this
  feature may need re-uploading to retain their binary content.
- **Audio:** attach MP3, WAV, M4A, OGG, WebM or FLAC clips using the audio button; there is no
  live microphone or speech-output endpoint. Audio always forces `/chat/completions` on
  AbhiBots, including Claude/Gemini/Grok. A PDF in the same request falls back to extracted
  text; scanned PDFs without text are explicitly reported as unreadable on that route.
- **Native web tools:** opt in under **Settings → Learner & generation → Native web tools**.
  Requires web retrieval, a tools-capable model and a Messages route (also works with official
  Anthropic). Default **off** preserves the existing Dynamic Agent JSON-planner path.
  Up to three tool rounds reuse the app's search/page tools, followed by a tool-free final
  turn if necessary. Opaque thinking signatures and exact tool IDs are preserved; sources
  stay in the separate Sources used panel. Text from tool rounds is buffered until the
  final answer is identified; genuine thinking deltas can still stream.
- **Security:** keys remain server-side. Tool page reads validate public addresses, pin DNS
  resolution and revalidate redirects; binary attachments remain untrusted learner data.

The capability table implements the supplied provider plan, not independent live verification.
See [integration verification and live smoke checklist](docs/ABHIBOTS-VERIFICATION.md).

### Verification

```bash
npm run typecheck
npm run lint
npm run lint:css
npm run test:contracts   # server-free mocked gateway/engine/ingest/SQLite contracts
npm run build
npm run test:e2e         # offline demo flows, keyboard, responsive and accessibility tests
```

No real provider key is required by the automated tests.

## Shape of the code

```
src/lib/defaults.ts        core engine instruction, output contract, methodology presets, context levels
src/lib/engine/harness.ts  prompt hierarchy compiler, learning-state trailer parsing, context budgeting
src/lib/engine/run.ts      agent planning, retrieval, streaming generation, persistence
src/lib/providers/         provider catalog, capability registry, normalised gateway (OpenAI + Anthropic + demo)
src/lib/tools/             the app's internal retrieval tools (never exposed as user configuration)
src/lib/export/document.ts canonical study document → md / zip / docx / html / txt / pdf
src/app/api/               state, providers, models, configs, projects, sessions, generate, qa, attachments, export, skills
src/components/            studio shell, stage deck, settings workspace
.agent/skills/             agent capability index (frontend, backend, core & planning skills) — single-responsibility triggers, see index.md
```
