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
| **Providers** | OpenAI, OpenRouter, Anthropic, xAI, TokenRouter, OpenCode Zen, Zen, any local/OpenAI-compatible gateway, plus custom base URLs. Keys live server-side and are never returned to the browser (`.env` variables also work). |
| **Capability-aware UI** | Vision, reasoning, tools, streaming, voice and document support come from provider metadata. Controls that a model does not support are disabled, never faked — and no reasoning trace is ever invented. |
| **Files** | PDF, DOC/DOCX, Markdown, TXT and (with a vision model) images. ZIP and JSON are rejected server-side with magic-number sniffing, not just by extension. |
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
```
