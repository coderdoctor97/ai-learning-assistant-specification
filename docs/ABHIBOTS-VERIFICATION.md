# AbhiBots integration — implementation and verification

Date: 2026-09-13. Source: **AbhiBots Opus Gateway — Provider Integration Plan**.

## Implemented milestones

| Milestone | Implementation |
| --- | --- |
| M1 | Built-in `abhibots` catalog row, OpenAI base URL and env key. Bootstrap is unchanged: disabled/unknown gateway, active demo. |
| M2 | Request-level routing (including audio anywhere in message history), protocol-shaped auth/response parsing, isolated family capability overrides. Stored capability values take precedence. |
| M3 | Live discovery first; static fallback for unavailable/empty discovery. Missing/invalid credentials remain errors. Fallback caches models but reports **unknown**, not a falsely verified connection. |
| M4 | Base64 images, Gemini-only URL image sources with URL guards, Claude 5 MB / Gemini 20 MB payload limits and omission notes. Existing four-image harness limit retained. |
| M5 | PDF binary retained in existing `dataUrl`, real Messages document blocks, no duplicated inline text, quote guidance for Q&A, extracted-text fallback and route-aware chip. |
| M6 | Six pre-recorded audio formats, magic checks (including WAV vs WebP), voice gates in client/server, OpenAI `input_audio` serialization, keyboard-accessible file picker. |
| M7 | Default-off `toolUse` setting and additive migration. Tools require web retrieval + tools capability + Messages route. Three tool rounds, max eight calls per batch, bounded retrieval text, continuation token headroom, error results with matching IDs, raw signature-preserving replay, tool JSON/stop events in SSE. Sources persisted through the existing engine pipeline. |
| M8 | 19 deterministic contracts; two new browser tests; existing demo, visual, keyboard, responsive and axe suites retained. README and this report updated. |

## Automated results

- `npm run typecheck`: pass, no diagnostics.
- `npm run lint`: pass, no errors or warnings.
- `npm run lint:css`: pass, no errors or warnings.
- `npm run test:contracts`: **19 passed**.
- `npm run build`: pass.
- `npm run test:e2e -- --workers=2`: **40 passed, 2 skipped** (the existing single-demo-model picker skips).
- `src/lib/providers/demo.ts`, core defaults and preset instructions: no changes.
- No live gateway calls, real keys, model transcripts or binary test artifacts are committed.

The Node SQLite experimental notice is an existing runtime notice, not a lint/type error.
`npm ci` reported seven vulnerabilities in the existing locked dependency tree (four moderate,
two high, one critical). This integration does not change dependency versions; dependency
remediation needs separate compatibility review rather than an automatic force upgrade.

### Test setup corrections

The first browser run exposed Chromium's bundled `fonts.conf` pointing at Lambda's `/tmp/fonts`
instead of the sandbox extraction directory. Fixing that removed the SkFontMgr crash without
changing application typography or screenshot baselines. Two pre-existing parallel-test assumptions
("our seed is the newest/first row") and Chromium's retained focus-navigation starting point were
corrected without weakening assertions. A pre-existing 18px methodology link target now has a 24px
minimum height. Preview origins permit the sandbox host and loopback test hosts.

## Intentional boundaries and plan clarifications

- The hand-off contains a truncated Claude-only matrix/static list, followed by explicit family
  override instructions. The implementation follows those detailed overrides. The static list
  includes the four Claude IDs, `gemini-3-flash-ag`, `gpt-4.1`, `gpt-4.1-mini`, `o4-mini`.
  Other Gemini/Grok aliases remain live-discovery-only until confirmed.
- `routeFor()` examines `ChatMessage.audio`, not a redundant `ChatOptions.audio` field, so routing
  cannot disagree with the actual serialized attachment location.
- Binary PDFs cannot travel over this integration's OpenAI shape. Audio + PDF on AbhiBots therefore
  uses PDF extracted text, with an explicit note for scanned/unreadable files, never silent loss.
- URL images are supported by the gateway adapter, not a new arbitrary-URL upload UI. They are
  delegated to Gemini after syntactic public-URL validation, not fetched by the app. The upstream
  service remains responsible for its own DNS/redirect protections for those delegated images.
- Native tools ship on the Messages route only. GPT-4.1's provider tool capability does not mean
  the application implements an OpenAI native tool loop. Its native-tools control is disabled.
- Native tool-round text is buffered until the final answer is identified, preventing preliminary
  text or state trailers from polluting the stage. Actual thinking deltas stream; raw tool blocks
  and signatures remain server-side and are replayed only to the provider.
- No automatic activation, microphone capture, audio output, model pricing guesses, or reasoning
  traces fabricated by the app.

## Failure-mode controls

| Risk | Control / test |
| --- | --- |
| Error 2013, wrong `tool_use_id` | Validate the complete batch before execution; exact IDs on success and error results; reject duplicate/missing IDs. |
| Gemini signature stripping | Preserve raw content blocks and unknown fields; fragmented-SSE and nonstream replay tests. |
| Tools sent to GPT-mini/o4-mini | Family overrides, feature gate and payload tests; no OpenAI tools schemas emitted. |
| Audio sent to Messages | Route truth-table and authentication tests include audio for every supported family. |
| Tool truncated at output budget | Never execute malformed or `max_tokens`-terminated calls; bounded continuation headroom and actionable error. |
| Infinite tool loop / oversized retrieval | Three rounds then tool-free final request; eight calls/batch; shared text budget and provider-conversation deadline. |
| SSRF / DNS rebinding / redirects | Public IPv4/IPv6 validation, DNS-answer validation, address-pinned sockets, redirect revalidation, bounded response bytes. |
| Binary content mistaken for instructions | Harness untrusted-material framing, PDF quote guidance, no binary content in protected core instructions. |
| Local data loss during upgrade | Additive, locked, idempotent settings migration; existing preference and active-demo preservation tests. |

## Live smoke checklist — NOT RUN

No real `ABHIBOTS_API_KEY` was provided in the workspace. The automated tests verify the supplied
contract against mocks; they cannot verify the upstream service's current availability, exact IDs,
transcription quality, or model output quality. Run these in a local installation with your key
stored in Settings or `.env` (never paste keys into a test fixture or this report):

- [ ] Discover models, or confirm the fallback warning and select a seeded model.
- [ ] Confirm exact IDs for additional Gemini/Grok models from the live list.
- [ ] Select `claude-opus-4-7`; generate a stage with streaming and genuine thinking enabled.
- [ ] Upload a small image; ask a visual question. Try an over-5 MB Claude image and confirm omission.
- [ ] Upload a PDF; ask for a quoted passage and confirm the native-document chip.
- [ ] Upload MP3; ask about the clip. Confirm OpenAI routing, then verify PDF text fallback with both attached.
- [ ] Remove audio, enable web retrieval + Native web tools, and ask a current/local question such as
      “What is the latest published population of Durgapur?” Confirm separate Sources used entries.
- [ ] Switch to `gpt-4.1-mini`; verify no image input/native-tool control, but audio remains available.
- [ ] Return to demo; verify offline generation, on-demand stages, Q&A and clean exports.
