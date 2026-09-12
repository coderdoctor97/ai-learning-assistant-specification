"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, type AppState, type ConfigRow, type LearningStep, type ProviderRow } from "@/lib/client/api";

type Tab = "providers" | "methodologies" | "learner" | "skills" | "data";

const TABS: { key: Tab; label: string }[] = [
  { key: "providers", label: "Providers & models" },
  { key: "methodologies", label: "Methodologies" },
  { key: "learner", label: "Learner & generation" },
  { key: "skills", label: "Skills" },
  { key: "data", label: "Local data" },
];

function newStep(): LearningStep {
  return { id: crypto.randomUUID(), title: "New step", instructions: "" };
}

export function SettingsApp() {
  const [state, setState] = useState<AppState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [tab, setTab] = useState<Tab>("providers");
  const [toast, setToast] = useState<{ kind: "error" | "info"; message: string } | null>(null);
  const [keyDrafts, setKeyDrafts] = useState<Record<string, string>>({});
  const [urlDrafts, setUrlDrafts] = useState<Record<string, string>>({});
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [editorId, setEditorId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ name: string; description: string; steps: LearningStep[] } | null>(null);
  const [skillUrl, setSkillUrl] = useState("");
  const [skillPreview, setSkillPreview] = useState<{ name: string; description: string; sourceFile: string; instructions: string } | null>(null);
  const [customProvider, setCustomProvider] = useState({ name: "", baseUrl: "", apiKey: "" });

  const notify = useCallback((kind: "error" | "info", message: string) => {
    setToast({ kind, message });
    setTimeout(() => setToast(null), kind === "error" ? 7000 : 3000);
  }, []);

  const refresh = useCallback(async () => {
    const next = await api.state();
    setState(next);
    document.documentElement.setAttribute("data-theme", next.settings.theme);
    return next;
  }, []);

  useEffect(() => {
    void refresh().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Could not load settings.";
      setLoadError(message);
      notify("error", message);
    });
    if (window.location.hash === "#methodologies") setTab("methodologies");
  }, [refresh, notify, reloadKey]);

  async function guard(action: () => Promise<unknown>, message?: string) {
    try {
      await action();
      await refresh();
      if (message) notify("info", message);
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Action failed.");
    }
  }

  if (!state) {
    if (loadError) {
      return (
        <div className="flex h-screen items-center justify-center px-6">
          <div className="card w-full max-w-md p-6 text-center" style={{ borderColor: "var(--warn)" }}>
            <div className="mb-2 text-lg" style={{ color: "var(--warn)" }}>
              Settings could not load
            </div>
            <p className="mb-4 text-sm leading-relaxed text-muted">{loadError}</p>
            <p className="mb-4 text-xs leading-relaxed text-muted">
              Check the terminal running the server for details, then try again.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => {
                setLoadError(null);
                setReloadKey((value) => value + 1);
              }}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted">Loading settings…</div>
    );
  }

  const settings = state.settings;

  /* ---------------------------------------------------------------- */

  function ProviderCard({ provider }: { provider: ProviderRow }) {
    const models = state!.models.filter((model) => model.providerId === provider.id);
    const isActive = settings.activeProviderId === provider.id;
    const busy = busyProvider === provider.id;
    return (
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{
              background:
                provider.status === "connected" ? "var(--good)" : provider.status === "error" ? "var(--warn)" : "var(--muted)",
            }}
          />
          <h3 className="font-medium">{provider.name}</h3>
          <span className="chip">{provider.protocol === "anthropic" ? "Anthropic API" : "OpenAI-compatible"}</span>
          {isActive ? <span className="chip chip-on">active</span> : null}
          {models.length ? <span className="chip">{models.length} models</span> : null}
          <div className="ml-auto flex gap-1.5">
            <button
              className="btn btn-xs"
              disabled={busy}
              onClick={async () => {
                setBusyProvider(provider.id);
                await guard(async () => {
                  const result = await api.discoverModels(provider.id);
                  notify("info", `${result.models.length} models discovered from ${provider.name}.`);
                });
                setBusyProvider(null);
              }}
            >
              {busy ? "Checking…" : "Test & discover"}
            </button>
            <button
              className="btn btn-xs"
              disabled={!models.length}
              onClick={() =>
                guard(
                  () =>
                    api.patchSettings({
                      activeProviderId: provider.id,
                      activeModelId: models[0]?.modelId ?? null,
                    }),
                  `${provider.name} is now the active provider.`,
                )
              }
            >
              Use this provider
            </button>
          </div>
        </div>

        <p className="mt-1.5 text-xs leading-relaxed text-muted">{provider.blurb}</p>
        {provider.statusMessage ? (
          <p className="mt-1 text-xs" style={{ color: provider.status === "error" ? "var(--warn)" : "var(--muted)" }}>
            {provider.statusMessage}
          </p>
        ) : null}

        {provider.kind === "demo" ? (
          <p className="mt-2 text-xs leading-relaxed text-muted">
            No key required. This engine renders deterministic study scaffolds offline so you can explore the workflow —
            it is not a language model.
          </p>
        ) : (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="label">Base URL</span>
              <input
                className="input mt-1 text-xs"
                value={urlDrafts[provider.id] ?? provider.baseUrl}
                onChange={(event) => setUrlDrafts({ ...urlDrafts, [provider.id]: event.target.value })}
                onBlur={(event) => {
                  const value = event.target.value.trim();
                  if (value && value !== provider.baseUrl) {
                    void guard(() => api.patchProvider({ id: provider.id, baseUrl: value }), "Base URL saved.");
                  }
                }}
              />
            </label>
            <label className="block">
              <span className="label">
                API key {provider.keySource === "env" ? `· using ${provider.apiKeyEnv}` : provider.keyHint ? `· ${provider.keyHint}` : ""}
              </span>
              <div className="mt-1 flex gap-1.5">
                <input
                  className="input text-xs"
                  type="password"
                  autoComplete="off"
                  placeholder={provider.hasKey ? "Key stored — enter a new one to replace" : `Paste your key, or set ${provider.apiKeyEnv} in .env`}
                  value={keyDrafts[provider.id] ?? ""}
                  onChange={(event) => setKeyDrafts({ ...keyDrafts, [provider.id]: event.target.value })}
                />
                <button
                  className="btn btn-xs"
                  disabled={!keyDrafts[provider.id]?.trim()}
                  onClick={() =>
                    guard(async () => {
                      await api.patchProvider({ id: provider.id, apiKey: keyDrafts[provider.id].trim() });
                      setKeyDrafts({ ...keyDrafts, [provider.id]: "" });
                    }, "Key saved locally.")
                  }
                >
                  Save
                </button>
                {provider.keySource === "stored" ? (
                  <button
                    className="btn btn-xs"
                    onClick={() => guard(() => api.patchProvider({ id: provider.id, apiKey: null }), "Key cleared.")}
                  >
                    Clear
                  </button>
                ) : null}
                {!provider.builtIn ? (
                  <button
                    className="btn btn-xs"
                    onClick={() => {
                      if (window.confirm(`Remove ${provider.name}?`)) void guard(() => api.deleteProvider(provider.id));
                    }}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </label>
          </div>
        )}
      </div>
    );
  }

  /* ---------------------------------------------------------------- */

  function MethodologyEditor({ config }: { config: ConfigRow | null }) {
    if (!draft) return null;
    const readOnly = Boolean(config?.builtIn);
    return (
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="input max-w-xs"
            value={draft.name}
            disabled={readOnly}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
          <span className="chip">{draft.steps.length} steps</span>
          {readOnly ? <span className="chip">built-in · read only</span> : null}
          <div className="ml-auto flex gap-1.5">
            {readOnly ? (
              <button
                className="btn btn-xs btn-primary"
                onClick={() =>
                  guard(async () => {
                    const created = await api.createConfig({
                      name: `${draft.name} (copy)`,
                      description: draft.description,
                      steps: draft.steps.map((step) => ({ ...step, id: crypto.randomUUID() })),
                    });
                    setEditorId(created.config.id);
                    setDraft({
                      name: created.config.name,
                      description: created.config.description,
                      steps: created.config.steps,
                    });
                  }, "Duplicated — the copy is fully editable.")
                }
              >
                Duplicate to edit
              </button>
            ) : (
              <>
                <button
                  className="btn btn-xs btn-primary"
                  onClick={() =>
                    guard(
                      () =>
                        api.patchConfig({
                          id: config!.id,
                          name: draft.name,
                          description: draft.description,
                          steps: draft.steps,
                        }),
                      "Methodology saved.",
                    )
                  }
                >
                  Save
                </button>
                <button
                  className="btn btn-xs"
                  onClick={() => {
                    if (window.confirm(`Delete "${draft.name}"?`)) {
                      void guard(async () => {
                        await api.deleteConfig(config!.id);
                        setEditorId(null);
                        setDraft(null);
                      }, "Methodology deleted.");
                    }
                  }}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        <input
          className="input mt-2 text-xs"
          placeholder="Short description"
          disabled={readOnly}
          value={draft.description}
          onChange={(event) => setDraft({ ...draft, description: event.target.value })}
        />

        <div className="mt-4 space-y-3">
          {draft.steps.map((step, index) => (
            <div key={step.id} className="rounded-xl border border-line bg-surface2/40 p-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[0.7rem] text-white">
                  {index + 1}
                </span>
                <input
                  className="input text-sm"
                  value={step.title}
                  disabled={readOnly}
                  onChange={(event) => {
                    const steps = [...draft.steps];
                    steps[index] = { ...step, title: event.target.value };
                    setDraft({ ...draft, steps });
                  }}
                />
                {!readOnly ? (
                  <div className="flex gap-1">
                    <button
                      className="btn btn-ghost btn-xs"
                      disabled={index === 0}
                      onClick={() => {
                        const steps = [...draft.steps];
                        [steps[index - 1], steps[index]] = [steps[index], steps[index - 1]];
                        setDraft({ ...draft, steps });
                      }}
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      className="btn btn-ghost btn-xs"
                      disabled={index === draft.steps.length - 1}
                      onClick={() => {
                        const steps = [...draft.steps];
                        [steps[index + 1], steps[index]] = [steps[index], steps[index + 1]];
                        setDraft({ ...draft, steps });
                      }}
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                    <button
                      className="btn btn-ghost btn-xs"
                      disabled={draft.steps.length <= 1}
                      onClick={() => setDraft({ ...draft, steps: draft.steps.filter((_, i) => i !== index) })}
                      aria-label="Remove step"
                    >
                      ×
                    </button>
                  </div>
                ) : null}
              </div>
              <textarea
                className="textarea mt-2 text-xs"
                rows={3}
                disabled={readOnly}
                placeholder="What should the engine do at this step?"
                value={step.instructions}
                onChange={(event) => {
                  const steps = [...draft.steps];
                  steps[index] = { ...step, instructions: event.target.value };
                  setDraft({ ...draft, steps });
                }}
              />
            </div>
          ))}
        </div>

        {!readOnly ? (
          <button className="btn btn-xs mt-3" onClick={() => setDraft({ ...draft, steps: [...draft.steps, newStep()] })}>
            ＋ Add step
          </button>
        ) : null}
      </div>
    );
  }

  /* ---------------------------------------------------------------- */

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/studio" className="btn btn-xs">
          ← Studio
        </Link>
        <h1 className="font-serif text-2xl">Settings</h1>
        <span className="chip">local-first · nothing leaves this machine except model requests</span>
      </div>

      <nav className="mt-5 flex flex-wrap gap-1 border-b border-line">
        {TABS.map((entry) => (
          <button
            key={entry.key}
            onClick={() => setTab(entry.key)}
            className="rounded-t-lg px-3 py-2 text-sm transition"
            style={{
              background: tab === entry.key ? "var(--surface)" : "transparent",
              color: tab === entry.key ? "var(--accent)" : "var(--muted)",
              borderBottom: tab === entry.key ? "2px solid var(--accent)" : "2px solid transparent",
            }}
          >
            {entry.label}
          </button>
        ))}
      </nav>

      <div className="py-6">
        {tab === "providers" ? (
          <div className="space-y-3">
            {state.providers.map((provider) => (
              <div key={provider.id}>{ProviderCard({ provider })}</div>
            ))}

            <div className="card p-4">
              <h3 className="font-medium">Add a custom OpenAI-compatible provider</h3>
              <p className="mt-1 text-xs text-muted">
                Any endpoint that speaks the OpenAI chat-completions specification — a local runtime, a gateway, a
                private deployment.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <input
                  className="input text-xs"
                  placeholder="Name"
                  value={customProvider.name}
                  onChange={(event) => setCustomProvider({ ...customProvider, name: event.target.value })}
                />
                <input
                  className="input text-xs"
                  placeholder="https://host/v1"
                  value={customProvider.baseUrl}
                  onChange={(event) => setCustomProvider({ ...customProvider, baseUrl: event.target.value })}
                />
                <div className="flex gap-1.5">
                  <input
                    className="input text-xs"
                    type="password"
                    placeholder="API key (optional)"
                    value={customProvider.apiKey}
                    onChange={(event) => setCustomProvider({ ...customProvider, apiKey: event.target.value })}
                  />
                  <button
                    className="btn btn-xs"
                    disabled={!customProvider.name.trim() || !customProvider.baseUrl.trim()}
                    onClick={() =>
                      guard(async () => {
                        await api.createProvider({
                          name: customProvider.name.trim(),
                          kind: "custom",
                          baseUrl: customProvider.baseUrl.trim(),
                          apiKey: customProvider.apiKey.trim() || undefined,
                        });
                        setCustomProvider({ name: "", baseUrl: "", apiKey: "" });
                      }, "Custom provider added.")
                    }
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {tab === "methodologies" ? (
          <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
            <div className="space-y-1">
              {state.configs.map((config) => (
                <button
                  key={config.id}
                  className="sidebar-item"
                  data-active={editorId === config.id}
                  onClick={() => {
                    setEditorId(config.id);
                    setDraft({ name: config.name, description: config.description, steps: config.steps });
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="truncate">{config.name}</span>
                    {settings.activeConfigId === config.id ? <span className="chip chip-on">default</span> : null}
                  </div>
                  <span className="text-[0.68rem] text-muted">{config.steps.length} steps</span>
                </button>
              ))}
              <button
                className="btn btn-xs mt-2 w-full"
                onClick={() =>
                  guard(async () => {
                    const created = await api.createConfig({
                      name: "My methodology",
                      description: "Custom learning sequence",
                      steps: [
                        { id: crypto.randomUUID(), title: "Orient", instructions: "Frame the topic and check prior knowledge." },
                        { id: crypto.randomUUID(), title: "Teach", instructions: "Build the core understanding with a worked example." },
                        { id: crypto.randomUUID(), title: "Consolidate", instructions: "Summarise, test recall and set a next step." },
                      ],
                    });
                    setEditorId(created.config.id);
                    setDraft({
                      name: created.config.name,
                      description: created.config.description,
                      steps: created.config.steps,
                    });
                  })
                }
              >
                ＋ New methodology
              </button>
              {editorId ? (
                <button
                  className="btn btn-xs w-full"
                  onClick={() => guard(() => api.patchSettings({ activeConfigId: editorId }), "Set as default methodology.")}
                >
                  Set as default
                </button>
              ) : null}
            </div>
            {draft ? (
              MethodologyEditor({ config: state.configs.find((config) => config.id === editorId) ?? null })
            ) : (
              <div className="card flex items-center justify-center p-10 text-sm text-muted">
                Choose a methodology to inspect or edit. Built-in presets are read-only; duplicate one to make it yours.
              </div>
            )}
          </div>
        ) : null}

        {tab === "learner" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card p-4">
              <h3 className="font-medium">Learner profile</h3>
              <p className="mt-1 text-xs text-muted">
                Optional. Leave it blank and the engine will calibrate from your questions instead.
              </p>
              {(
                [
                  ["level", "Level", "e.g. second-year medical student"],
                  ["background", "Background", "What you already know well"],
                  ["goals", "Goals", "What you are working towards"],
                  ["preferences", "Preferences", "How you like to be taught"],
                ] as const
              ).map(([key, label, placeholder]) => (
                <label key={key} className="mt-3 block">
                  <span className="label">{label}</span>
                  <textarea
                    className="textarea mt-1 min-h-[3rem] text-xs"
                    rows={2}
                    placeholder={placeholder}
                    defaultValue={settings.learnerProfile?.[key] ?? ""}
                    onBlur={(event) =>
                      guard(() =>
                        api.patchSettings({
                          learnerProfile: { ...settings.learnerProfile, [key]: event.target.value },
                        }),
                      )
                    }
                  />
                </label>
              ))}
            </div>

            <div className="card space-y-4 p-4">
              <h3 className="font-medium">Generation</h3>
              <label className="block">
                <span className="label">Context level</span>
                <select
                  className="select mt-1 text-xs"
                  value={settings.contextLevel}
                  onChange={(event) => guard(() => api.patchSettings({ contextLevel: event.target.value }))}
                >
                  {state.contextLevels.map((level) => (
                    <option key={level.key} value={level.key}>
                      {level.label} — {level.description}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-[0.68rem] text-muted">
                  Defaults to the minimum useful context and is always clamped to the active model&apos;s window.
                </span>
              </label>

              <label className="block">
                <span className="label">Max output tokens</span>
                <input
                  className="input mt-1 text-xs"
                  type="number"
                  min={256}
                  step={128}
                  defaultValue={settings.maxOutputTokens}
                  onBlur={(event) => guard(() => api.patchSettings({ maxOutputTokens: Number(event.target.value) }))}
                />
              </label>

              <label className="block">
                <span className="label">Temperature · {settings.temperature.toFixed(2)}</span>
                <input
                  className="mt-2 w-full"
                  type="range"
                  min={0}
                  max={1.2}
                  step={0.05}
                  defaultValue={settings.temperature}
                  onMouseUp={(event) =>
                    guard(() => api.patchSettings({ temperature: Number((event.target as HTMLInputElement).value) }))
                  }
                  onTouchEnd={(event) =>
                    guard(() => api.patchSettings({ temperature: Number((event.target as HTMLInputElement).value) }))
                  }
                />
              </label>

              {(
                [
                  ["streaming", "Stream responses", "Render stages token by token when the model supports it."],
                  ["dynamicAgent", "Dynamic agent by default", "New sessions start with autonomous agent mode on."],
                  ["webRetrieval", "Allow web retrieval", "Lets the agent search and read pages when it decides it needs to."],
                  ["reasoningEnabled", "Request reasoning", "Only takes effect on models that expose a reasoning trace."],
                ] as const
              ).map(([key, label, hint]) => (
                <label key={key} className="flex items-start gap-2 text-xs">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={Boolean(settings[key])}
                    onChange={(event) => guard(() => api.patchSettings({ [key]: event.target.checked }))}
                  />
                  <span>
                    <span className="font-medium">{label}</span>
                    <span className="block text-muted">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {tab === "skills" ? (
          <div className="space-y-3">
            <div className="card p-4">
              <h3 className="font-medium">Import a skill from GitHub</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                The repository is treated as untrusted input. Only a single Markdown definition (SKILL.md, AGENT.md or
                README.md) is read, sanitised and stored as reference guidance — nothing is ever executed, and imported
                text can never override the engine&apos;s own instructions.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  className="input text-xs sm:max-w-md"
                  placeholder="https://github.com/owner/repo"
                  value={skillUrl}
                  onChange={(event) => setSkillUrl(event.target.value)}
                />
                <button
                  className="btn btn-xs"
                  disabled={!skillUrl.trim()}
                  onClick={async () => {
                    try {
                      const result = await api.previewSkill(skillUrl.trim());
                      setSkillPreview(result.preview);
                    } catch (error) {
                      notify("error", error instanceof Error ? error.message : "Preview failed.");
                    }
                  }}
                >
                  Preview
                </button>
                <button
                  className="btn btn-xs btn-primary"
                  disabled={!skillPreview}
                  onClick={() =>
                    guard(async () => {
                      await api.importSkill(skillUrl.trim());
                      setSkillPreview(null);
                      setSkillUrl("");
                    }, "Skill imported (disabled by default).")
                  }
                >
                  Import
                </button>
              </div>
              {skillPreview ? (
                <div className="mt-3 rounded-xl border border-line bg-surface2/50 p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{skillPreview.name}</span>
                    <span className="chip">{skillPreview.sourceFile.split("/").pop()}</span>
                  </div>
                  <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap text-[0.7rem] leading-relaxed text-muted">
                    {skillPreview.instructions.slice(0, 2000)}
                  </pre>
                </div>
              ) : null}
            </div>

            {state.skills.map((skill) => (
              <div key={skill.id} className="card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-medium">{skill.name}</h4>
                  <span className={`chip ${skill.enabled ? "chip-on" : ""}`}>{skill.enabled ? "active" : "inactive"}</span>
                  <a className="chip hover:border-accent" href={skill.repoUrl} target="_blank" rel="noreferrer">
                    source
                  </a>
                  <div className="ml-auto flex gap-1.5">
                    <button
                      className="btn btn-xs"
                      onClick={() => guard(() => api.patchSkill({ id: skill.id, enabled: !skill.enabled }))}
                    >
                      {skill.enabled ? "Disable" : "Enable"}
                    </button>
                    <button className="btn btn-xs" onClick={() => guard(() => api.deleteSkill(skill.id))}>
                      Remove
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted">{skill.description}</p>
              </div>
            ))}
            {!state.skills.length ? (
              <p className="px-1 text-xs text-muted">No skills imported yet.</p>
            ) : null}
          </div>
        ) : null}

        {tab === "data" ? (
          <div className="card p-5">
            <h3 className="font-medium">Local data</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Everything you create is stored in the studio&apos;s local database on this machine. Refresh the page,
              restart the browser or come back in a week — your projects, sessions, learning state, methodologies and
              provider configuration will still be here. API keys stay server-side and are never returned to the
              browser.
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                ["Projects", state.projects.length],
                ["Sessions", state.sessions.length],
                ["Methodologies", state.configs.length],
                ["Cached models", state.models.length],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <dt className="label">{label}</dt>
                  <dd className="font-serif text-2xl">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </div>

      {toast ? (
        <div
          className="card animate-rise fixed bottom-5 left-1/2 z-50 max-w-lg -translate-x-1/2 px-4 py-2.5 text-sm"
          style={{ borderColor: toast.kind === "error" ? "var(--warn)" : "var(--accent)" }}
          role="status"
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}
