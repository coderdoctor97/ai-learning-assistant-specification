# Agent capability index

This directory is the project's **agent-facing skill dictionary**: one file per capability, each bound to a
single responsibility. Every skill declares a `track` (`frontend` | `backend` | `core` | `planning`) and
a `phase`. This
is *not* the app's runtime "GitHub skills" feature (that one is DB-backed and imported via `/api/skills` —
unrelated to this index).

## Routing rules

1. **One owner per task.** When a request could match several skills, route it to the single skill whose
   *trigger* matches most specifically. Never merge two skills' responsibilities into one pass — split the
   work and invoke skills sequentially instead.
2. **Track decides by deliverable.** Client code/UI → `frontend`; server/data/infra code → `backend`;
   *process and tooling applied to code of any kind* (loops, transforms, diagnosis, measurement, git
   mechanics, scanning, auditing) → `core`; *planning artifacts about the work itself* (WBS, timelines,
   risk registers, scope boundaries, capacity models) → `planning`. Core skills act **on** code that a
   track skill owns, and planning skills plan **the work** those skills will do — so "build Y" routes to
   a track skill, "do X to the code" to a core skill, and "plan/assess X" to a planning skill.
3. **Break ties by phase** within a track: `pre-code` → `build` → `test` → `review`. The `infra` phase
   (backend) is orthogonal: it provisions environments rather than competing with feature code.
4. **Handoffs are explicit.** Every skill file lists a `not_for` boundary. When a task crosses that
   boundary, stop and hand off to the owning skill rather than drifting.

## Trigger ownership map

### Frontend

| Trigger / request shape | Owner | Do NOT route to |
| --- | --- | --- |
| "design a look / typography / layout plan" (no code yet) | `frontend-design` | `web-design-reviewer`, `design-token-extractor` |
| "pull tokens from a reference / build tokens.json" | `design-token-extractor` | `frontend-design` |
| "build a form / RHF + Zod validation / form state" | `form-management` | `accessibility-a11y` (labels, error announcements), `motion-and-animation` (transitions) |
| "kill prop drilling / compound or slot API" | `component-composition` | `frontend-design`, `playwright-component-testing` |
| "animate / GSAP / Framer Motion / scroll physics" | `motion-and-animation` | `frontend-design`, `accessibility-a11y` |
| "MCP widget / UI for an MCP protocol app" | `mcp-ui-widgets` | `component-composition`, `browser-use-qa` |
| "write a component test / mount in isolation" | `playwright-component-testing` | `browser-use-qa` |
| "verify in a real headless browser / DOM interaction" | `browser-use-qa` | `playwright-component-testing`, `web-design-reviewer` |
| "review UI/CSS / lint styles / UX code review" | `web-design-reviewer` | `accessibility-a11y`, `browser-use-qa` |
| "WCAG audit / focus order / ARIA contract" | `accessibility-a11y` | `web-design-reviewer`, `frontend-design` |

### Backend

| Trigger / request shape | Owner | Do NOT route to |
| --- | --- | --- |
| "schema change / add column / migration / avoid table locks" | `db-migrations` | `query-optimization` (plans), `iac-provisioning` (service) |
| "OpenAPI / spec-first / spec drift test / route shape" | `openapi-contract` | `auth-security` (who may call), `form-management` (frontend client), `api-fuzz-tester` (fuzzing) |
| "EXPLAIN / slow query / N+1 / index plan" | `query-optimization` | `db-migrations` (ships the DDL), `resiliency-rate-limiting` |
| "OAuth2 / JWT / session rotation / RBAC" | `auth-security` | `iac-provisioning` (secrets), `resiliency-rate-limiting` (login throttling) |
| "background job / queue / idempotency / DLQ" | `queue-workers` | `iac-provisioning` (broker), `resiliency-rate-limiting` (breakers) |
| "Dockerfile / multi-stage / non-root / compose" | `docker-containerization` | `iac-provisioning` (where it runs), `testcontainers-integration` (test runtimes) |
| "tracing / spans / propagation / structured logs" | `otel-observability` | `auth-security` (policy), `browser-use-qa` (browser evidence) |
| "rate limit / sliding window / circuit breaker / 429" | `resiliency-rate-limiting` | `queue-workers` (job retries), `iac-provisioning` (Redis instance) |
| "testcontainers / integration suite / DB fixtures" | `testcontainers-integration` | `db-migrations` (designs migrations), `playwright-component-testing` (frontend) |
| "provision / IaC module / secret management / environments" | `iac-provisioning` | `docker-containerization` (image), `auth-security` (usage) |

### Core (cross-cutting engineering)

| Trigger / request shape | Owner | Do NOT route to |
| --- | --- | --- |
| "TDD / red-green-refactor / test-first / edge cases" | `tdd-test-runner` | domain test skills (spec content), `browser-use-qa` (verify-after) |
| "codemod / AST transform / bulk rename / modernize deprecated API" | `ast-codemods` | `lint-formatting` (style rules), `component-composition` (target API design) |
| "stack trace / reproduce the issue / git bisect / regression hunt" | `debug-regression-bisect` | `performance-benchmarking` (measurement), `git-workflow-hygiene` (rebase mechanics), `incident-postmortem-rca` (incidents) |
| "lint / autofix / code style / formatting / CI lint gate" | `lint-formatting` | `ast-codemods` (semantic transforms), `strict-typing-contracts` (type errors) |
| "find the symbol / who calls this / dependency map / impact analysis" | `codebase-semantic-search` | any skill that *changes* code (this one is read-only) |
| "commit message / conventional commits / atomic commit / rebase conflict" | `git-workflow-hygiene` | `debug-regression-bisect` (which commit broke it), `pr-code-reviewer` (content) |
| "type error / strict typing / interface contract / any leak" | `strict-typing-contracts` | `openapi-contract` / `form-management` (runtime zod), `ast-codemods` (bulk execution) |
| "CVE / vulnerability scan / lockfile check / supply chain" | `security-cve-audit` | `auth-security` (application auth), `lint-formatting` (source rules) |
| "profile / benchmark / memory allocation / hot path" | `performance-benchmarking` | `query-optimization` (SQL), `debug-regression-bisect` (where/when) |
| "PR review / diff audit / cyclomatic complexity / code hygiene" | `pr-code-reviewer` | `lint-formatting` (mechanical fixes), domain skills (domain judgment) |
| "architecture diagram / C4 / sequence diagram / system flow" | `arch-diagram-generator` | `codebase-semantic-search` (current-state map), `adr-author` (the decision) |
| "ADR / architecture decision / MADR / decision record" | `adr-author` | `arch-diagram-generator` (structure), `threat-model-sast` (threats in options) |
| "threat model / STRIDE / OWASP / security assessment" | `threat-model-sast` | `security-cve-audit` (dependencies), `auth-security` (implementation) |
| "CI/CD / GitHub Actions / pipeline / workflow" | `cicd-pipeline-author` | `git-workflow-hygiene` (git mechanics), `load-stress-testing` (the scripts it runs) |
| "secret scan / credential leak / token audit / secret detection" | `secret-credential-scanner` | `iac-provisioning` (where secrets live), `env-config-validator` (runtime config) |
| "API fuzz / contract test / schema fuzzing / property-based test" | `api-fuzz-tester` | `openapi-contract` (deterministic spec drift), `schema-compatibility` (evolution) |
| "semver / release / changelog / version bump" | `semver-release-manager` | `git-workflow-hygiene` (day-to-day commits), `cicd-pipeline-author` (shipping) |
| "flaky test / race condition / test isolation / fixture sandbox" | `flaky-test-isolator` | `tdd-test-runner` (fixture design), `debug-regression-bisect` (app regressions) |
| "i18n / localization / ICU / hardcoded string / pluralization" | `i18n-localization` | `frontend-design` (locale-aware layout) |
| "load test / stress test / k6 / SLA / performance test" | `load-stress-testing` | `performance-benchmarking` (micro-profiling), `query-optimization` (SQL fixes) |
| "schema compatibility / protobuf / wire format / event contract" | `schema-compatibility` | `openapi-contract` (OpenAPI), `db-migrations` (DB schema) |
| "MCP server / MCP tool / Model Context Protocol / agent tool / tool endpoint" | `mcp-tool-builder` | `mcp-ui-widgets` (client widgets, frontend) |
| "postmortem / incident review / 5-Whys / RCA / root cause" | `incident-postmortem-rca` | `debug-regression-bisect` (code regressions), `risk-fmea-premortem` (prospective) |
| "license audit / copyleft / dependency license / attribution" | `license-compliance-audit` | `security-cve-audit` (vulnerabilities) |
| "12-factor / env validation / configuration audit / missing env var" | `env-config-validator` | `iac-provisioning` (config sourcing), `secret-credential-scanner` (leaks) |

### Planning (project & architecture)

| Trigger / request shape | Owner | Do NOT route to |
| --- | --- | --- |
| "WBS / task breakdown / work packages / 100% rule" | `wbs-decomposition` | `critical-path-mapping` (dates), `scope-dod-enforcer` (boundaries) |
| "critical path / dependency graph / timeline / float / slack" | `critical-path-mapping` | `wbs-decomposition` (defines the nodes), `capacity-leveling` (who) |
| "risk register / FMEA / premortem / RPN / mitigation playbook" | `risk-fmea-premortem` | `critical-path-mapping` (applies buffers), `debug-regression-bisect` (post-hoc) |
| "scope / in-out of scope / DoD / acceptance criteria / scope creep" | `scope-dod-enforcer` | `wbs-decomposition` (decomposes approved scope), `pr-code-reviewer` (code-level gates) |
| "capacity / who can do this / workload / resource bottleneck / WIP" | `capacity-leveling` | `critical-path-mapping` (sequence), `performance-benchmarking` (system bottlenecks) |

## Non-collision matrix

### Frontend (adjacent pairs)

- **`frontend-design` ↔ `web-design-reviewer`** — design *decides* before code exists; the reviewer
  *inspects* after code exists. Never both in one pass.
- **`frontend-design` ↔ `design-token-extractor`** — design owns new aesthetic direction; the extractor
  only *parses existing* reference CSS variables into a starter `tokens.json`.
- **`playwright-component-testing` ↔ `browser-use-qa`** — isolated unit-level mounting vs. e2e against the
  running app. For a bare "test this", decide by whether a live app/server is involved.
- **`web-design-reviewer` ↔ `accessibility-a11y`** — static design/UX review vs. conformance (WCAG 2.2,
  ARIA contracts, focus management).
- **`form-management` ↔ `accessibility-a11y`** — form state and schema validation vs. the a11y contract
  (labels, error announcement, focus on first error).
- **`motion-and-animation` ↔ `accessibility-a11y`** — animation implementation vs. conformance audit
  (including `prefers-reduced-motion` policy).
- **`component-composition` ↔ `playwright-component-testing`** — refactor the component API vs. write/mount
  the spec that pins the new API.

### Backend (adjacent pairs)

- **`db-migrations` ↔ `query-optimization`** — query-optimization *plans* the indexes/rewrites;
  db-migrations *ships* the DDL safely (expand–contract, backfills, down-migrations).
- **`db-migrations` ↔ `testcontainers-integration`** — the test suite *applies* migrations to ephemeral
  databases; it never designs them.
- **`openapi-contract` ↔ `auth-security`** — the contract owns *what* the endpoint accepts; auth owns *who*
  may call it.
- **`openapi-contract` ↔ `resiliency-rate-limiting`** — limits are a layer *around* contract routes, never
  part of their shape.
- **`queue-workers` ↔ `resiliency-rate-limiting`** — job retries are job semantics; breakers protect
  dependency calls. A job calling a failing dependency uses both, for different reasons.
- **`auth-security` ↔ `iac-provisioning`** — auth *uses* keys and secrets; iac decides where they live,
  how they rotate, and how they're injected.
- **`docker-containerization` ↔ `testcontainers-integration`** — production images vs. ephemeral test
  runtimes. Same technology, opposite lifetimes.
- **`docker-containerization` ↔ `iac-provisioning`** — build the artifact vs. provide where it runs.
- **`resiliency-rate-limiting` ↔ `iac-provisioning`** — limiter/breaker logic vs. the Redis instance it runs on.
- **`otel-observability` ↔ any skill** — it *instruments*; it never owns the behavior it measures. When a
  task says "add tracing to X", X's skill implements the behavior and otel-observability owns the signal.

### Core (adjacent pairs)

- **`tdd-test-runner` ↔ domain test skills** (`playwright-component-testing`, `testcontainers-integration`,
  `openapi-contract`) — TDD owns the *loop, fixtures, edge-case discipline*; each domain skill owns the
  spec *content/environment* for its layer.
- **`tdd-test-runner` ↔ `browser-use-qa`** — test-first loop (write failing test, make it pass) vs.
  verify-after in the live app.
- **`ast-codemods` ↔ `component-composition`** — composition *designs* the target API; codemods *execute*
  the bulk call-site migration for it.
- **`ast-codemods` ↔ `lint-formatting`** — semantic/bulk transforms (intent changes) vs. mechanical style
  rule auto-fixes (intent preserved).
- **`ast-codemods` ↔ `strict-typing-contracts`** — contracts are *designed* by typing; codemods *execute*
  bulk type-signature migrations across many files.
- **`debug-regression-bisect` ↔ `performance-benchmarking`** — locate the cause (why/where/when) vs.
  measure magnitude (how much); benchmark numbers double as the bisect oracle.
- **`debug-regression-bisect` ↔ `git-workflow-hygiene`** — bisect *analysis* (which commit broke it) vs.
  rebase/commit *mechanics* (landing the fix cleanly).
- **`lint-formatting` ↔ `pr-code-reviewer`** — machine-verdict rule remediation (fixes) vs. judgment-based
  audit (reports). The reviewer flags; the linter fixes what is rule-based.
- **`pr-code-reviewer` ↔ `security-cve-audit`** — source-code hygiene in the diff vs. dependency/supply-chain
  risk in the manifest.
- **`security-cve-audit` ↔ `auth-security`** — both named "security": supply chain (packages, lockfile) vs.
  application identity/authorization (tokens, sessions, RBAC).
- **`codebase-semantic-search` ↔ any skill** — strictly read-only orientation; it changes nothing and feeds
  every other skill with context.
- **`arch-diagram-generator` ↔ `codebase-semantic-search`** — a diagram communicates *intended* design;
  search maps what the code *actually* does.
- **`arch-diagram-generator` ↔ `adr-author`** — diagram = structure (what), ADR = decision (why); the ADR
  may embed the diagram.
- **`threat-model-sast` ↔ `security-cve-audit` ↔ `auth-security`** — three meanings of "security":
  design-time threats (STRIDE/OWASP), supply chain (CVEs), and application auth implementation.
- **`cicd-pipeline-author` ↔ `git-workflow-hygiene`** — "workflow" splits: CI pipeline workflows vs. git
  commit/rebase workflows.
- **`secret-credential-scanner` ↔ `iac-provisioning`** — detects secrets leaked *in code* vs. manages where
  secrets live and rotate.
- **`api-fuzz-tester` ↔ `openapi-contract`** — property-based/fuzz payloads that *break* the contract vs.
  deterministic spec↔implementation assertions that *pin* it; the trigger "contract test" routes to the
  fuzzer.
- **`semver-release-manager` ↔ `git-workflow-hygiene`** — release/tag/changelog mechanics vs. day-to-day
  commit mechanics.
- **`flaky-test-isolator` ↔ `tdd-test-runner`** — designing fixtures (what they are) vs. sandboxing them
  (making them race-free and isolated).
- **`load-stress-testing` ↔ `performance-benchmarking`** — "performance" splits: system under concurrency
  (SLA, k6) vs. micro-level measurement (profiling, allocations, no load).
- **`schema-compatibility` ↔ `openapi-contract`** — the OpenAPI REST contract belongs to openapi-contract;
  protobuf/event/wire-format evolution belongs to schema-compatibility.
- **`incident-postmortem-rca` ↔ `debug-regression-bisect`** — "root cause" splits: production incident,
  blameless process, post-hoc (postmortem) vs. code-level regression, find the breaking commit (bisect).
- **`license-compliance-audit` ↔ `security-cve-audit`** — legal license risk vs. vulnerability risk over the
  same dependency graph.
- **`env-config-validator` ↔ `iac-provisioning`** — the app *guards and validates* its configuration;
  infrastructure *sources and injects* it.

### Planning (adjacent pairs)

- **`wbs-decomposition` ↔ `critical-path-mapping`** — WBS defines *what* (work packages, no dates); CPM
  orders and times them (no new work). One has no calendar, the other no content.
- **`wbs-decomposition` ↔ `scope-dod-enforcer`** — WBS decomposes *approved* scope; the enforcer decides
  what is approved. A new package appearing without a boundary decision goes to the enforcer first.
- **`critical-path-mapping` ↔ `capacity-leveling`** — CPM is calendar feasibility (sequence, durations);
  leveling is resource feasibility (who, how much). The leveled schedule needs both; the graph is CP's,
  the per-resource constraints are leveling's.
- **`risk-fmea-premortem` ↔ `critical-path-mapping`** — risk *proposes* the buffer and its rationale; CPM
  *applies* it to the timeline. Scoring is risk's, the calendar is CPM's.
- **`risk-fmea-premortem` ↔ `scope-dod-enforcer`** — a "kill/descope" mitigation is a boundary change: risk
  proposes it, the enforcer decides, CPM re-baselines afterward.
- **`scope-dod-enforcer` ↔ `pr-code-reviewer` (core)** — project-level "is this in scope / is it done per
  the criteria" vs. code-level "is this code good". The enforcer owns the DoD criteria list; core skills
  execute its code items.

### Cross-track boundaries (including core and planning)

- **`openapi-contract` (backend) ↔ `form-management` (frontend)** — the spec owns the wire shape; RHF + Zod
  owns client behavior; the shared zod schema is the single source of truth for both.
- **`auth-security` (backend) ↔ all frontend skills** — token issuance, session rotation, and RBAC are
  backend-only. Frontend skills consume auth state; they never implement session mechanics.
- **Test layers never merge** — `testcontainers-integration` (backend: service containers) vs.
  `playwright-component-testing` (frontend: isolated mounting) vs. `browser-use-qa` (frontend: live app).
  "Test this" routes by layer.
- **`strict-typing-contracts` (core) ↔ `openapi-contract` / `form-management`** — compile-time types vs.
  runtime zod validation; derive one from the other, never maintain both by hand.
- **`lint-formatting` (core) ↔ `web-design-reviewer` (frontend)** — mechanical style/lint rules vs. UX and
  design judgment on the same CSS/JSX.
- **`pr-code-reviewer` (core) ↔ `web-design-reviewer` / `accessibility-a11y` (frontend)** — the generalist
  audit defers all UI/UX and conformance judgment to those two; it audits scope, complexity, hygiene.
- **`performance-benchmarking` (core) ↔ `motion-and-animation` (frontend)** — general runtime profiling vs.
  motion-specific performance constraints (transform/opacity-only, layout cost).
- **`git-workflow-hygiene` (core) ↔ all** — landing mechanics and history discipline; it never judges
  content (that is `pr-code-reviewer` and the domain skills).
- **`risk-fmea-premortem` (planning) ↔ `security-cve-audit` (core)** — CVE/supply-chain findings are an
  *input* to the risk register; the register process and scoring belong to risk.
- **`risk-fmea-premortem` (planning) ↔ `debug-regression-bisect` (core)** — prospective failure modes vs.
  retrospective root causes; actual incidents update the register.
- **`capacity-leveling` (planning) ↔ `performance-benchmarking` / `query-optimization`** — "bottleneck"
  routes by what is constrained: people/WIP (leveling) vs. CPU/query/heap (the performance skills).
- **`wbs-decomposition` (planning) ↔ `tdd-test-runner` / `pr-code-reviewer` (core)** — WBS work packages
  are planning units with an owner and a deliverable; they are not code units or test units.
- **`mcp-tool-builder` (core) ↔ `mcp-ui-widgets` (frontend)** — "MCP" routes by noun: server / tool /
  endpoint → mcp-tool-builder (protocol side); widget / UI / client rendering → mcp-ui-widgets
  (frontend side).

## Inventory

| Skill | Track | Phase | Single responsibility |
| --- | --- | --- | --- |
| [`frontend-design`](./frontend-design.md) | frontend | pre-code | Aesthetic direction, typography, layout planning |
| [`design-token-extractor`](./design-token-extractor.md) | frontend | pre-code | Reference CSS variable parsing, starter `tokens.json` |
| [`form-management`](./form-management.md) | frontend | build | React Hook Form + Zod schema-based validation |
| [`component-composition`](./component-composition.md) | frontend | build | Refactoring prop drilling into compound/slot patterns |
| [`motion-and-animation`](./motion-and-animation.md) | frontend | build | GSAP/Framer Motion vocabulary, scroll-triggered physics |
| [`mcp-ui-widgets`](./mcp-ui-widgets.md) | frontend | build | Interactive UI widgets targeting MCP protocol apps |
| [`playwright-component-testing`](./playwright-component-testing.md) | frontend | test | Isolated component-level test specs and mounting |
| [`browser-use-qa`](./browser-use-qa.md) | frontend | test | Headless real-browser verification and DOM interaction |
| [`web-design-reviewer`](./web-design-reviewer.md) | frontend | review | Static UI inspection, CSS linting, UX code review |
| [`accessibility-a11y`](./accessibility-a11y.md) | frontend | review | WCAG 2.2 audits, focus management, ARIA contracts |
| [`db-migrations`](./db-migrations.md) | backend | build | Schema changes, safe down-migrations, locking prevention |
| [`openapi-contract`](./openapi-contract.md) | backend | build | Spec-first API scaffolding, route validation, contract tests |
| [`query-optimization`](./query-optimization.md) | backend | review | EXPLAIN analysis, N+1 elimination, index planning |
| [`auth-security`](./auth-security.md) | backend | build | OAuth2/JWT middleware, session rotation, RBAC |
| [`queue-workers`](./queue-workers.md) | backend | build | Background task idempotency, retry policies, DLQ management |
| [`docker-containerization`](./docker-containerization.md) | backend | infra | Multi-stage lean builds, non-root runtimes, local compose |
| [`otel-observability`](./otel-observability.md) | backend | build | OpenTelemetry tracing, span propagation, structured logs |
| [`resiliency-rate-limiting`](./resiliency-rate-limiting.md) | backend | build | Redis sliding-window limiters, circuit breakers |
| [`testcontainers-integration`](./testcontainers-integration.md) | backend | test | Ephemeral containerized test suites, DB fixtures |
| [`iac-provisioning`](./iac-provisioning.md) | backend | infra | Declarative infrastructure modules, secret management |
| [`tdd-test-runner`](./tdd-test-runner.md) | core | test | TDD loops, unit/integration fixtures, edge-case testing |
| [`ast-codemods`](./ast-codemods.md) | core | build | AST-based refactoring, bulk syntax transforms, API modernizations |
| [`debug-regression-bisect`](./debug-regression-bisect.md) | core | review | Stack trace debugging, issue reproduction, git bisect analysis |
| [`lint-formatting`](./lint-formatting.md) | core | review | Linter auto-fixes, style enforcement, static analysis remediation |
| [`codebase-semantic-search`](./codebase-semantic-search.md) | core | pre-code | Symbol search, AST/ripgrep queries, dependency mapping |
| [`git-workflow-hygiene`](./git-workflow-hygiene.md) | core | build | Atomic commits, conventional commit syntax, rebase resolution |
| [`strict-typing-contracts`](./strict-typing-contracts.md) | core | build | Type inference, strict interfaces, type error resolution |
| [`security-cve-audit`](./security-cve-audit.md) | core | review | Dependency vulnerability scanning, lockfile checks, supply chain |
| [`performance-benchmarking`](./performance-benchmarking.md) | core | test | Execution profiling, memory allocation checks, micro-benchmarks |
| [`pr-code-reviewer`](./pr-code-reviewer.md) | core | review | PR change audits, cyclomatic complexity, code hygiene |
| [`arch-diagram-generator`](./arch-diagram-generator.md) | core | pre-code | Mermaid/Excalidraw sequence, C4, architecture flowcharts |
| [`adr-author`](./adr-author.md) | core | pre-code | MADR-format architecture decision records |
| [`threat-model-sast`](./threat-model-sast.md) | core | pre-code | STRIDE/OWASP threat assessment, secure design validation |
| [`cicd-pipeline-author`](./cicd-pipeline-author.md) | core | build | Hardened GitHub Actions workflows, caching, security |
| [`secret-credential-scanner`](./secret-credential-scanner.md) | core | review | High-entropy key / credential / token leak audit |
| [`api-fuzz-tester`](./api-fuzz-tester.md) | core | test | Property-based API contract tests, schema fuzzing |
| [`semver-release-manager`](./semver-release-manager.md) | core | build | Semver bumps, changelog generation, git tags |
| [`flaky-test-isolator`](./flaky-test-isolator.md) | core | test | Flaky test detection, race elimination, fixture sandboxing |
| [`i18n-localization`](./i18n-localization.md) | core | build | String extraction, ICU validation, pluralization audit |
| [`load-stress-testing`](./load-stress-testing.md) | core | test | k6 scripts, SLA validation, concurrency stress tests |
| [`schema-compatibility`](./schema-compatibility.md) | core | review | Wire-format, protobuf, event contract compatibility |
| [`mcp-tool-builder`](./mcp-tool-builder.md) | core | build | MCP servers and agent tool endpoints |
| [`incident-postmortem-rca`](./incident-postmortem-rca.md) | core | review | Blameless postmortems, 5-Whys RCA, preventive actions |
| [`license-compliance-audit`](./license-compliance-audit.md) | core | review | Dependency license, copyleft, attribution audit |
| [`env-config-validator`](./env-config-validator.md) | core | review | 12-factor audit, missing env var guards, config types |
| [`wbs-decomposition`](./wbs-decomposition.md) | planning | pre-code | Hierarchical task breakdown, deliverable scoping, 100% rule |
| [`critical-path-mapping`](./critical-path-mapping.md) | planning | pre-code | Dependency graphs, timeline estimation, float/slack tracking |
| [`risk-fmea-premortem`](./risk-fmea-premortem.md) | planning | pre-code | Failure mode identification, impact scoring, mitigation playbooks |
| [`scope-dod-enforcer`](./scope-dod-enforcer.md) | planning | pre-code | Boundary definition, acceptance criteria, anti-scope-creep validation |
| [`capacity-leveling`](./capacity-leveling.md) | planning | pre-code | Resource constraints, workload distribution, bottleneck elimination |
