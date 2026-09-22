"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ProviderCard } from "@/components/settings/ProviderCard";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { Icon } from "@/components/ui/Icon";
import { Tooltip } from "@/components/ui/Tooltip";
import { ToastStack, useToastStack } from "@/components/ui/ToastStack";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { applyTheme } from "@/lib/theme";
import { api, type AppState, type ConfigRow, type LearningStep } from "@/lib/client/api";

type Tab = "providers" | "methodologies" | "learner" | "skills" | "data";

const TABS: { key: Tab; labelKey: "settings.tab.providers" | "settings.tab.methodologies" | "settings.tab.learner" | "settings.tab.skills" | "settings.tab.data" }[] = [
  { key: "providers", labelKey: "settings.tab.providers" },
  { key: "methodologies", labelKey: "settings.tab.methodologies" },
  { key: "learner", labelKey: "settings.tab.learner" },
  { key: "skills", labelKey: "settings.tab.skills" },
  { key: "data", labelKey: "settings.tab.data" },
];

function newStep(): LearningStep {
  return { id: crypto.randomUUID(), title: t("settings.methodology.newStep"), instructions: "" };
}

/* Initial-load skeleton mirroring the settings geometry. */
function SettingsSkeleton() {
  return (
    <div className="settings-page mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8" aria-busy="true" aria-label={t("settings.loading")}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="skeleton h-8 w-24" />
        <div className="skeleton h-8 w-32" />
        <div className="skeleton h-6 w-72" />
      </div>
      <div className="mt-5 flex gap-2 border-b border-line pb-2">
        {TABS.map((entry) => (
          <div key={entry.key} className="skeleton h-8 w-36" />
        ))}
      </div>
      <div className="space-y-3 py-6" role="status" aria-live="polite">
        <span className="sr-only">{t("settings.loading")}</span>
        {[0, 1, 2].map((row) => (
          <div key={row} className="card space-y-3 p-4">
            <div className="skeleton-row">
              <div className="skeleton h-3 w-3 rounded-full" />
              <div className="skeleton h-5 w-40" />
              <div className="skeleton ml-auto h-8 w-28" />
            </div>
            <div className="skeleton h-3 w-2/3" />
            <div className="skeleton h-9 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function MethodologyEditor({
  config,
  draft,
  setDraft,
  setEditorId,
  guard,
  onRequestDelete,
}: {
  config: ConfigRow | null;
  draft: { name: string; description: string; steps: LearningStep[] };
  setDraft: React.Dispatch<React.SetStateAction<{ name: string; description: string; steps: LearningStep[] } | null>>;
  setEditorId: (id: string | null) => void;
  guard: (action: () => Promise<unknown>, message?: string) => Promise<void>;
  onRequestDelete: () => void;
}) {
  if (!draft) return null;
  const readOnly = Boolean(config?.builtIn);
  return (
    <div className="card methodology-editor min-w-0 p-5">
      <div className="methodology-editor-head">
        <div className="min-w-0 flex-1 space-y-2">
          <input
            className="input max-w-xs"
            value={draft.name}
            disabled={readOnly}
            aria-label={t("settings.methodology.newStep")}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="chip font-mono tabular-nums">{t("settings.methodology.steps", { count: draft.steps.length })}</span>
            {readOnly ? <span className="chip">{t("settings.methodology.readOnly")}</span> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {readOnly ? (
            <button
              type="button"
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
                }, t("settings.methodology.duplicated"))
              }
            >
              {t("settings.methodology.duplicate")}
            </button>
          ) : (
            <>
              <button
                type="button"
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
                    t("settings.methodology.saved"),
                  )
                }
              >
                {t("settings.methodology.save")}
              </button>
              <button
                type="button"
                className="btn btn-xs text-warn"
                onClick={onRequestDelete}
              >
                {t("settings.methodology.delete")}
              </button>
            </>
          )}
        </div>
      </div>

      <input
        className="input mt-3 text-sm"
        placeholder={t("settings.methodology.descriptionPlaceholder")}
        aria-label={t("settings.methodology.descriptionPlaceholder")}
        disabled={readOnly}
        value={draft.description}
        onChange={(event) => setDraft({ ...draft, description: event.target.value })}
      />

      <div className="mt-4 space-y-3">
        {draft.steps.map((step, index) => (
          <div key={step.id} className="step-editor">
            <div className="flex min-w-0 items-center gap-2">
              <span className="step-badge font-mono tabular-nums" aria-hidden="true">
                {index + 1}
              </span>
              <input
                className="input min-w-0 flex-1 text-sm"
                value={step.title}
                disabled={readOnly}
                aria-label={`${t("settings.methodology.newStep")} ${index + 1}`}
                onChange={(event) => {
                  const steps = [...draft.steps];
                  steps[index] = { ...step, title: event.target.value };
                  setDraft({ ...draft, steps });
                }}
              />
              {!readOnly ? (
                /* [A11y & SVG Enhancement] Move step up/down and remove step triggers with SVG icons and tooltips */
                <div className="flex shrink-0 gap-1">
                  <Tooltip content="Move step up in sequence" side="top">
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      disabled={index === 0}
                      onClick={() => {
                        const steps = [...draft.steps];
                        [steps[index - 1], steps[index]] = [steps[index], steps[index - 1]];
                        setDraft({ ...draft, steps });
                      }}
                      aria-label={t("settings.methodology.moveUp")}
                    >
                      <Icon name="arrowUp" className="shrink-0" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Move step down in sequence" side="top">
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      disabled={index === draft.steps.length - 1}
                      onClick={() => {
                        const steps = [...draft.steps];
                        [steps[index + 1], steps[index]] = [steps[index], steps[index + 1]];
                        setDraft({ ...draft, steps });
                      }}
                      aria-label={t("settings.methodology.moveDown")}
                    >
                      <Icon name="arrowDown" className="shrink-0" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Remove this step from methodology" side="top">
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs text-warn"
                      disabled={draft.steps.length <= 1}
                      onClick={() => setDraft({ ...draft, steps: draft.steps.filter((_, i) => i !== index) })}
                      aria-label={t("settings.methodology.removeStep")}
                    >
                      <Icon name="trash2" className="shrink-0" />
                    </button>
                  </Tooltip>
                </div>
              ) : null}
            </div>
            <textarea
              className="textarea mt-2 text-sm"
              rows={3}
              disabled={readOnly}
              placeholder={t("settings.methodology.stepPlaceholder")}
              aria-label={`${t("settings.methodology.stepPlaceholder")} ${index + 1}`}
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
        <button
          type="button"
          className="btn btn-xs mt-3 inline-flex items-center gap-1.5"
          onClick={() => setDraft({ ...draft, steps: [...draft.steps, newStep()] })}
        >
          <Icon name="plus" className="shrink-0" />
          {t("settings.methodology.addStep")}
        </button>
      ) : null}
    </div>
  );
}

export function SettingsApp() {
  const [state, setState] = useState<AppState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [tab, setTab] = useState<Tab>(() =>
    typeof window !== "undefined" && window.location.hash === "#methodologies" ? "methodologies" : "providers",
  );
  const [editorId, setEditorId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ name: string; description: string; steps: LearningStep[] } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [skillUrl, setSkillUrl] = useState("");
  const [skillPreview, setSkillPreview] = useState<{ name: string; description: string; sourceFile: string; instructions: string } | null>(null);
  const [customProvider, setCustomProvider] = useState({ name: "", baseUrl: "", apiKey: "" });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  /* Shared feedback stack — same notify(kind, message) contract and the
     same 7s/3s auto-dismiss timings the single toast used. */
  const { toasts, notify, dismiss: dismissToast } = useToastStack({ error: 7000, info: 3000 });

  const refresh = useCallback(async () => {
    const next = await api.state();
    setState(next);
    applyTheme(next.settings.theme, { crossfade: false });
    return next;
  }, []);

  // Initial hydration. State updates happen after awaits inside the async
  // IIFE (no synchronous cascading renders), mirroring the studio shell.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await api.state();
        if (cancelled) return;
        setState(next);
        applyTheme(next.settings.theme, { crossfade: false });
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : t("settings.toast.actionFailed");
        setLoadError(message);
        notify("error", message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notify, reloadKey]);

  async function guard(action: () => Promise<unknown>, message?: string) {
    try {
      await action();
      await refresh();
      if (message) notify("info", message);
    } catch (error) {
      notify("error", error instanceof Error ? error.message : t("settings.toast.actionFailed"));
    }
  }

  function handleTabKeys(event: React.KeyboardEvent<HTMLDivElement>) {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const current = TABS.findIndex((entry) => entry.key === tab);
    let next = current;
    if (event.key === "ArrowRight") next = (current + 1) % TABS.length;
    if (event.key === "ArrowLeft") next = (current - 1 + TABS.length) % TABS.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = TABS.length - 1;
    setTab(TABS[next].key);
    tabRefs.current[next]?.focus();
  }

  if (!state) {
    if (loadError) {
      return (
        <main id="main-content" className="flex min-h-dvh items-center justify-center px-6" tabIndex={-1}>
          <div className="card card-warn w-full max-w-md p-6 text-center">
            <div className="text-warn mb-2 text-lg font-medium tracking-tight">{t("settings.error.title")}</div>
            <p className="mb-4 text-sm leading-relaxed text-muted">{loadError}</p>
            <p className="mb-4 text-sm leading-relaxed text-muted">{t("settings.error.hint")}</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setLoadError(null);
                setReloadKey((value) => value + 1);
              }}
            >
              {t("settings.error.retry")}
            </button>
          </div>
        </main>
      );
    }
    /* Skeleton carries the same container geometry as the loaded branch so
       the first paint matches the settled layout (zero-CLS on hydrate). */
    return (
      <main id="main-content" className="settings-page mx-auto min-h-dvh min-w-0 max-w-5xl px-4 py-6 sm:px-6 sm:py-8" tabIndex={-1}>
        <SettingsSkeleton />
      </main>
    );
  }

  const settings = state.settings;

  /* ---------------------------------------------------------------- */

  /* ---------------------------------------------------------------- */

  return (
    <main id="main-content" className="settings-page mx-auto min-h-dvh min-w-0 max-w-5xl px-4 py-6 sm:px-6 sm:py-8" tabIndex={-1}>
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <Link href="/studio" className="btn btn-xs inline-flex items-center gap-1.5">
          <Icon name="chevronLeft" className="shrink-0" />
          {t("settings.back")}
        </Link>
        <h1 className="title-page">{t("settings.title")}</h1>
        <span className="chip">{t("settings.tagline")}</span>
      </div>

      <nav
        className="settings-tabs mt-6"
        role="tablist"
        aria-label={t("settings.title")}
        onKeyDown={handleTabKeys}
      >
        {TABS.map((entry, index) => {
          const selected = tab === entry.key;
          return (
            <button
              key={entry.key}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              id={`settings-tab-${entry.key}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`settings-panel-${entry.key}`}
              tabIndex={selected ? 0 : -1}
              className="settings-tab"
              onClick={() => setTab(entry.key)}
            >
              {t(entry.labelKey)}
            </button>
          );
        })}
      </nav>

      <div className="py-6">
        {tab === "providers" ? (
          <div
            id="settings-panel-providers"
            role="tabpanel"
            aria-labelledby="settings-tab-providers"
            tabIndex={0}
            className="space-y-4"
          >
            <h2 className="sr-only">{t("settings.tab.providers")}</h2>
            {state.providers.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                modelsCount={state.models.filter((model) => model.providerId === provider.id).length}
                firstModelId={
                  state.models.find((model) => model.providerId === provider.id)?.modelId ?? null
                }
                isActive={settings.activeProviderId === provider.id}
                guard={guard}
                notify={notify}
              />
            ))}

            <div className="card min-w-0 p-5">
              <h3 className="title-section">{t("settings.provider.custom.title")}</h3>
              <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted">{t("settings.provider.custom.body")}</p>
              <form
                className="settings-custom-form mt-4"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (!customProvider.name.trim() || !customProvider.baseUrl.trim()) return;
                  await guard(async () => {
                    await api.createProvider({
                      name: customProvider.name.trim(),
                      kind: "custom",
                      baseUrl: customProvider.baseUrl.trim(),
                      apiKey: customProvider.apiKey.trim() || undefined,
                    });
                    setCustomProvider({ name: "", baseUrl: "", apiKey: "" });
                  }, t("settings.provider.custom.added"));
                }}
              >
                <label className="block min-w-0">
                  <span className="label">{t("settings.provider.custom.name")}</span>
                  <input
                    className="input mt-1"
                    placeholder={t("settings.provider.custom.name")}
                    aria-label={t("settings.provider.custom.name")}
                    value={customProvider.name}
                    onChange={(event) => setCustomProvider({ ...customProvider, name: event.target.value })}
                  />
                </label>
                <label className="block min-w-0">
                  <span className="label">{t("settings.provider.baseUrl")}</span>
                  <input
                    className="input mt-1"
                    type="url"
                    placeholder={t("settings.provider.custom.baseUrl")}
                    aria-label={t("settings.provider.custom.baseUrl")}
                    value={customProvider.baseUrl}
                    onChange={(event) => setCustomProvider({ ...customProvider, baseUrl: event.target.value })}
                  />
                </label>
                <label className="block min-w-0 sm:col-span-2">
                  <span className="label">{t("settings.provider.custom.apiKey")}</span>
                  <input
                    className="input mt-1"
                    type="password"
                    placeholder={t("settings.provider.custom.apiKey")}
                    aria-label={t("settings.provider.custom.apiKey")}
                    value={customProvider.apiKey}
                    onChange={(event) => setCustomProvider({ ...customProvider, apiKey: event.target.value })}
                  />
                </label>
                <div className="flex min-w-0 flex-wrap gap-2 sm:col-span-2">
                  <button
                    className="btn btn-primary inline-flex items-center gap-1.5"
                    type="submit"
                    disabled={!customProvider.name.trim() || !customProvider.baseUrl.trim()}
                  >
                    <Icon name="plus" className="shrink-0" />
                    {t("settings.provider.custom.add")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {tab === "methodologies" ? (
          <div
            id="settings-panel-methodologies"
            role="tabpanel"
            aria-labelledby="settings-tab-methodologies"
            tabIndex={0}
            className="settings-split"
          >
            <h2 className="sr-only">{t("settings.tab.methodologies")}</h2>
            <div className="methodology-nav space-y-1">
              {state.configs.map((config) => (
                <button
                  key={config.id}
                  type="button"
                  className="sidebar-item"
                  data-active={editorId === config.id}
                  onClick={() => {
                    setEditorId(config.id);
                    setDraft({ name: config.name, description: config.description, steps: config.steps });
                  }}
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate">{config.name}</span>
                    {settings.activeConfigId === config.id ? (
                      <span className="chip chip-on">default</span>
                    ) : null}
                  </div>
                  <span className="font-mono text-micro tabular-nums text-muted">
                    {t("settings.methodology.steps", { count: config.steps.length })}
                  </span>
                </button>
              ))}
              <button
                type="button"
                className="btn btn-xs mt-2 w-full inline-flex items-center justify-center gap-1.5"
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
                <Icon name="plus" className="shrink-0" />
                {t("settings.methodology.create")}
              </button>
              {editorId ? (
                <button
                  type="button"
                  className="btn btn-xs w-full"
                  onClick={() => guard(() => api.patchSettings({ activeConfigId: editorId }), t("settings.methodology.setDefaultDone"))}
                >
                  {t("settings.methodology.setDefault")}
                </button>
              ) : null}
            </div>
            {draft ? (
              <MethodologyEditor
                config={state.configs.find((config) => config.id === editorId) ?? null}
                draft={draft}
                setDraft={setDraft}
                setEditorId={setEditorId}
                guard={guard}
                onRequestDelete={() => setConfirmDelete(true)}
              />
            ) : (
              <div className="card flex min-h-48 items-center justify-center p-10 text-center text-sm leading-relaxed text-muted">
                {t("settings.methodology.empty")}
              </div>
            )}
          </div>
        ) : null}

        {tab === "learner" ? (
          <div
            id="settings-panel-learner"
            role="tabpanel"
            aria-labelledby="settings-tab-learner"
            tabIndex={0}
            className="grid min-w-0 gap-4 md:grid-cols-2"
          >
            <h2 className="sr-only">{t("settings.tab.learner")}</h2>
            <div className="card min-w-0 p-5">
              <h3 className="title-section">{t("settings.learner.title")}</h3>
              <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted">{t("settings.learner.body")}</p>
              {(
                [
                  ["level", t("settings.learner.level"), t("settings.learner.levelPlaceholder")],
                  ["background", t("settings.learner.background"), t("settings.learner.backgroundPlaceholder")],
                  ["goals", t("settings.learner.goals"), t("settings.learner.goalsPlaceholder")],
                  ["preferences", t("settings.learner.preferences"), t("settings.learner.preferencesPlaceholder")],
                ] as const
              ).map(([key, label, placeholder]) => (
                <label key={key} className="mt-3 block min-w-0">
                  <span className="label">{label}</span>
                  <textarea
                    className="textarea mt-1 min-h-12 text-sm"
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

            <div className="card min-w-0 space-y-4 p-5">
              <h3 className="title-section">{t("settings.generation.title")}</h3>
              <label className="block min-w-0">
                <span className="label">{t("settings.generation.context")}</span>
                <select
                  className="select mt-1 text-sm"
                  value={settings.contextLevel}
                  onChange={(event) => guard(() => api.patchSettings({ contextLevel: event.target.value }))}
                >
                  {state.contextLevels.map((level) => (
                    <option key={level.key} value={level.key}>
                      {level.label} — {level.description}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-micro leading-relaxed text-muted">
                  {t("settings.generation.contextHint")}
                </span>
              </label>

              <label className="block min-w-0">
                <span className="label">{t("settings.generation.maxTokens")}</span>
                <input
                  className="input mt-1 font-mono tabular-nums"
                  type="number"
                  min={256}
                  step={128}
                  defaultValue={settings.maxOutputTokens}
                  onBlur={(event) => guard(() => api.patchSettings({ maxOutputTokens: Number(event.target.value) }))}
                />
              </label>

              <label className="block min-w-0">
                <span className="label font-mono tabular-nums">{t("settings.generation.temperature", { value: settings.temperature.toFixed(2) })}</span>
                <input
                  className="settings-range mt-2 w-full"
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
                  ["streaming", t("settings.generation.streaming"), t("settings.generation.streamingHint")],
                  ["dynamicAgent", t("settings.generation.agent"), t("settings.generation.agentHint")],
                  ["webRetrieval", t("settings.generation.retrieval"), t("settings.generation.retrievalHint")],
                  ["reasoningEnabled", t("settings.generation.reasoning"), t("settings.generation.reasoningHint")],
                ] as const
              ).map(([key, label, hint]) => (
                <label key={key} className="flex items-start gap-2 text-sm leading-relaxed">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={Boolean(settings[key])}
                    onChange={(event) => guard(() => api.patchSettings({ [key]: event.target.checked }))}
                  />
                  <span>
                    <span className="font-medium">{label}</span>
                    <span className="mt-0.5 block text-muted">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {tab === "skills" ? (
          <div
            id="settings-panel-skills"
            role="tabpanel"
            aria-labelledby="settings-tab-skills"
            tabIndex={0}
            className="space-y-4"
          >
            <h2 className="sr-only">{t("settings.tab.skills")}</h2>
            <div className="card min-w-0 p-5">
              <h3 className="title-section">{t("settings.skills.importTitle")}</h3>
              <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted">{t("settings.skills.importBody")}</p>
              <div className="mt-3 flex min-w-0 flex-wrap gap-2">
                <input
                  className="input min-w-0 text-sm sm:max-w-md"
                  placeholder={t("settings.skills.urlPlaceholder")}
                  aria-label={t("settings.skills.urlPlaceholder")}
                  value={skillUrl}
                  onChange={(event) => setSkillUrl(event.target.value)}
                />
                {/* [A11y & SVG Enhancement] Skill preview button with eye icon and tooltip */}
                <Tooltip content="Fetch skill metadata from URL" side="top">
                  <button
                    type="button"
                    className="btn btn-xs inline-flex items-center gap-1.5"
                    disabled={!skillUrl.trim()}
                    onClick={async () => {
                      try {
                        const result = await api.previewSkill(skillUrl.trim());
                        setSkillPreview(result.preview);
                      } catch (error) {
                        notify("error", error instanceof Error ? error.message : t("settings.toast.actionFailed"));
                      }
                    }}
                  >
                    <Icon name="eye" className="shrink-0" />
                    {t("settings.skills.preview")}
                  </button>
                </Tooltip>
                {/* [A11y & SVG Enhancement] Skill import button with fileDown icon and tooltip */}
                <Tooltip content="Install skill into workspace" side="top">
                  <button
                    type="button"
                    className="btn btn-xs btn-primary inline-flex items-center gap-1.5"
                    disabled={!skillPreview}
                    onClick={() =>
                      guard(async () => {
                        await api.importSkill(skillUrl.trim());
                        setSkillPreview(null);
                        setSkillUrl("");
                      }, t("settings.skills.imported"))
                    }
                  >
                    <Icon name="fileDown" className="shrink-0" />
                    {t("settings.skills.import")}
                  </button>
                </Tooltip>
              </div>
              {skillPreview ? (
                <div className="mt-3 rounded-xl border border-line bg-surface-muted p-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{skillPreview.name}</span>
                    <span className="chip">{skillPreview.sourceFile.split("/").pop()}</span>
                  </div>
                  <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap text-micro leading-relaxed text-muted">
                    {skillPreview.instructions.slice(0, 2000)}
                  </pre>
                </div>
              ) : null}
            </div>

            {state.skills.map((skill) => (
              <div key={skill.id} className="card min-w-0 p-5">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h4 className="text-base font-medium tracking-tight">{skill.name}</h4>
                  <span className={cn("chip", skill.enabled && "chip-on")}>
                    {skill.enabled ? t("settings.skills.active") : t("settings.skills.inactive")}
                  </span>
                  <a className="chip hover:border-accent" href={skill.repoUrl} target="_blank" rel="noreferrer">
                    {t("settings.skills.source")}
                  </a>
                  <div className="ml-auto flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      className="btn btn-xs"
                      onClick={() => guard(() => api.patchSkill({ id: skill.id, enabled: !skill.enabled }))}
                    >
                      {skill.enabled ? t("settings.skills.disable") : t("settings.skills.enable")}
                    </button>
                    <button type="button" className="btn btn-xs text-warn inline-flex items-center gap-1" onClick={() => guard(() => api.deleteSkill(skill.id))}>
                      <Icon name="trash2" className="shrink-0" />
                      {t("settings.skills.remove")}
                    </button>
                  </div>
                </div>
                <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted">{skill.description}</p>
              </div>
            ))}
            {!state.skills.length ? <p className="px-1 text-sm leading-relaxed text-muted">{t("settings.skills.empty")}</p> : null}
          </div>
        ) : null}

        {tab === "data" ? (
          <div
            id="settings-panel-data"
            role="tabpanel"
            aria-labelledby="settings-tab-data"
            tabIndex={0}
            className="card min-w-0 p-5"
          >
            <h2 className="sr-only">{t("settings.tab.data")}</h2>
            <h3 className="title-section">{t("settings.data.title")}</h3>
            <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted">{t("settings.data.body")}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {[
                [t("settings.data.projects"), state.projects.length],
                [t("settings.data.sessions"), state.sessions.length],
                [t("settings.data.methodologies"), state.configs.length],
                [t("settings.data.models"), state.models.length],
              ].map(([label, value]) => (
                <div key={String(label)} className="kpi min-w-0">
                  <dt className="label">{label}</dt>
                  <dd className="kpi-value tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </div>

      <ConfirmSheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t("settings.methodology.delete")}
        body={t("settings.methodology.deleteConfirm", { name: draft?.name ?? "" })}
        confirmLabel={t("settings.methodology.delete")}
        onConfirm={async () => {
          const config = state.configs.find((entry) => entry.id === editorId);
          if (!config) return;
          await guard(
            async () => {
              await api.deleteConfig(config.id);
              setEditorId(null);
              setDraft(null);
            },
            t("settings.methodology.deleted"),
          );
        }}
      />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </main>
  );
}
