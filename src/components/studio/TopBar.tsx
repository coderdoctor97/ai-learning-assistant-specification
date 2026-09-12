"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AppState, Capabilities, ModelRow, ProviderRow, SessionRow } from "@/lib/client/api";

type Props = {
  state: AppState;
  activeModel: ModelRow | null;
  activeProvider: ProviderRow | null;
  capabilities: Capabilities;
  session: SessionRow | null;
  busy: boolean;
  onPatchSettings: (patch: Record<string, unknown>) => Promise<void>;
  onPatchSession: (patch: Record<string, unknown>) => Promise<void>;
  onDiscover: (providerId: string) => Promise<void>;
};

const THEMES: { key: "light" | "dark" | "editorial"; glyph: string; label: string }[] = [
  { key: "light", glyph: "☀", label: "Light" },
  { key: "dark", glyph: "☾", label: "Dark" },
  { key: "editorial", glyph: "◑", label: "Study" },
];

function CapabilityChips({ capabilities }: { capabilities: Capabilities }) {
  const items: [keyof Capabilities, string][] = [
    ["vision", "vision"],
    ["reasoning", "reasoning"],
    ["tools", "tools"],
    ["streaming", "stream"],
    ["voice", "voice"],
    ["documents", "docs"],
  ];
  return (
    <div className="flex flex-wrap gap-1">
      {items.map(([key, label]) => (
        <span key={key} className={`chip ${capabilities[key] ? "chip-on" : "opacity-45"}`} title={
          capabilities[key] ? `${label}: supported by the active model` : `${label}: not exposed by the active model`
        }>
          {label}
        </span>
      ))}
    </div>
  );
}

export function TopBar({
  state,
  activeModel,
  activeProvider,
  capabilities,
  session,
  busy,
  onPatchSettings,
  onPatchSession,
  onDiscover,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [freeOnly, setFreeOnly] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const connectedProviders = state.providers.filter((provider) => provider.enabled || provider.hasKey);

  const models = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return state.models
      .filter((model) => (freeOnly ? model.isFree : true))
      .filter((model) =>
        needle ? `${model.modelId} ${model.displayName}`.toLowerCase().includes(needle) : true,
      )
      .slice(0, 300);
  }, [state.models, query, freeOnly]);

  const agentOn = session ? session.dynamicAgent : state.settings.dynamicAgent;
  const contextClamped = Boolean(
    activeModel &&
      ((state.settings.contextLevel === "maximum" && activeModel.contextLength < 100000) ||
        (state.settings.contextLevel === "extended" && activeModel.contextLength < 40000) ||
        (state.settings.contextLevel === "balanced" && activeModel.contextLength < 16000)),
  );
  const statusTone =
    activeProvider?.status === "connected" ? "var(--good)" : activeProvider?.status === "error" ? "var(--warn)" : "var(--muted)";

  return (
    <header className="z-20 flex flex-wrap items-center gap-2 border-b border-line bg-surface px-4 py-2.5">
      <Link
        href="/settings"
        className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-xs transition hover:border-accent"
        title={activeProvider?.statusMessage ?? "Provider status"}
      >
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: statusTone }} />
        <span className="font-medium">{activeProvider?.name ?? "No provider"}</span>
        <span className="text-muted">{activeProvider?.status === "connected" ? "connected" : activeProvider?.status ?? "not set"}</span>
      </Link>

      <div className="relative" ref={panelRef}>
        <button className="btn" onClick={() => setOpen((value) => !value)} disabled={busy}>
          <span className="max-w-[15rem] truncate">
            {activeModel ? activeModel.displayName : state.settings.activeModelId ?? "Select a model"}
          </span>
          <span className="text-muted">▾</span>
        </button>
        {open ? (
          <div className="card absolute left-0 top-11 z-40 w-[26rem] max-w-[90vw] p-3">
            <div className="flex items-center gap-2">
              <input
                className="input"
                autoFocus
                placeholder="Search models…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <label className="flex items-center gap-1 whitespace-nowrap text-xs text-muted">
                <input type="checkbox" checked={freeOnly} onChange={(event) => setFreeOnly(event.target.checked)} />
                free
              </label>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1">
              {connectedProviders.map((provider) => (
                <button
                  key={provider.id}
                  className="chip hover:border-accent"
                  disabled={discovering}
                  onClick={async () => {
                    setDiscovering(true);
                    try {
                      await onDiscover(provider.id);
                    } finally {
                      setDiscovering(false);
                    }
                  }}
                  title={`Refresh models from ${provider.name}`}
                >
                  ⟳ {provider.name}
                </button>
              ))}
              <Link href="/settings" className="chip hover:border-accent">
                + add provider
              </Link>
            </div>

            <div className="mt-2 max-h-[22rem] overflow-y-auto">
              {models.length ? (
                models.map((model) => {
                  const provider = state.providers.find((entry) => entry.id === model.providerId);
                  const active =
                    model.modelId === state.settings.activeModelId && model.providerId === state.settings.activeProviderId;
                  return (
                    <button
                      key={model.id}
                      className="sidebar-item"
                      data-active={active}
                      onClick={async () => {
                        await onPatchSettings({ activeProviderId: model.providerId, activeModelId: model.modelId });
                        setOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{model.displayName}</span>
                        {model.isFree ? <span className="chip chip-on">free</span> : null}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.68rem] text-muted">
                        <span>{provider?.name ?? "provider"}</span>
                        <span>· {(model.contextLength / 1000).toFixed(0)}k ctx</span>
                        <span>· {(model.maxOutput / 1000).toFixed(1)}k out</span>
                        {model.capabilities.vision ? <span>· vision</span> : null}
                        {model.capabilities.reasoning ? <span>· reasoning</span> : null}
                        {model.capabilities.tools ? <span>· tools</span> : null}
                      </div>
                    </button>
                  );
                })
              ) : (
                <p className="px-1 py-6 text-center text-xs leading-relaxed text-muted">
                  No models cached yet. Add a provider key in Settings, then refresh a provider above.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <select
        className="select w-auto text-xs"
        value={state.settings.contextLevel}
        onChange={(event) => onPatchSettings({ contextLevel: event.target.value })}
        title="How much prior session context is sent to the model"
      >
        {state.contextLevels.map((level) => (
          <option key={level.key} value={level.key}>
            Context: {level.label}
          </option>
        ))}
      </select>
      {contextClamped ? (
        <span className="chip" style={{ color: "var(--warn)", borderColor: "var(--warn)" }} title={
          `This model exposes a ${(activeModel!.contextLength / 1000).toFixed(0)}k window, so the context level is clamped to what it can actually accept.`
        }>
          clamped to {(activeModel!.contextLength / 1000).toFixed(0)}k
        </span>
      ) : null}

      <button
        className={`btn ${agentOn ? "btn-primary" : ""}`}
        onClick={() => (session ? onPatchSession({ dynamicAgent: !agentOn }) : onPatchSettings({ dynamicAgent: !agentOn }))}
        title="Dynamic Agent Mode: let the engine decide about retrieval, tools, assessment, repetition and pacing"
      >
        ⚡ Agent {agentOn ? "on" : "off"}
      </button>

      <button
        className={`btn ${state.settings.reasoningEnabled && capabilities.reasoning ? "btn-primary" : ""}`}
        disabled={!capabilities.reasoning}
        onClick={() => onPatchSettings({ reasoningEnabled: !state.settings.reasoningEnabled })}
        title={
          capabilities.reasoning
            ? "Request provider-exposed reasoning for this model"
            : "The active model does not expose reasoning"
        }
      >
        ✦ Reasoning
      </button>

      <div className="ml-auto flex items-center gap-3">
        <CapabilityChips capabilities={capabilities} />
        <div className="flex overflow-hidden rounded-lg border border-line">
          {THEMES.map((theme) => (
            <button
              key={theme.key}
              className="px-2 py-1.5 text-xs transition"
              style={{
                background: state.settings.theme === theme.key ? "var(--accent-soft)" : "transparent",
                color: state.settings.theme === theme.key ? "var(--accent)" : "var(--muted)",
              }}
              onClick={() => onPatchSettings({ theme: theme.key })}
              title={`${theme.label} theme`}
              aria-label={`${theme.label} theme`}
            >
              {theme.glyph}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
