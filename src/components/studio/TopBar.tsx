"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Popover, handleMenuItemKeys, usePopover } from "@/components/ui/Popover";
import { t, type MessageKey } from "@/lib/i18n";
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

const THEMES: { key: "light" | "dark" | "editorial"; glyph: string; labelKey: MessageKey }[] = [
  { key: "light", glyph: "☀", labelKey: "topbar.theme.light" },
  { key: "dark", glyph: "☾", labelKey: "topbar.theme.dark" },
  { key: "editorial", glyph: "◑", labelKey: "topbar.theme.editorial" },
];

const CAPABILITY_KEYS: [keyof Capabilities, MessageKey][] = [
  ["vision", "topbar.capability.vision"],
  ["reasoning", "topbar.capability.reasoning"],
  ["tools", "topbar.capability.tools"],
  ["streaming", "topbar.capability.streaming"],
  ["voice", "topbar.capability.voice"],
  ["documents", "topbar.capability.documents"],
];

function CapabilityChips({ capabilities }: { capabilities: Capabilities }) {
  return (
    <div className="flex flex-wrap gap-1">
      {CAPABILITY_KEYS.map(([key, labelKey]) => {
        const supported = capabilities[key];
        const label = t(labelKey);
        return (
          <span
            key={key}
            className={`chip ${supported ? "chip-on" : "chip-off"}`}
            title={
              supported
                ? t("topbar.capability.supported", { capability: label })
                : t("topbar.capability.unsupported", { capability: label })
            }
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}

/*
 * Model listbox: roving tabindex (`tabIndex={isActive ? 0 : -1}`) with
 * Arrow/Home/End navigation. Focus is the cursor; selection is Enter/Space
 * (native button activation) or click. Escape closes via Popover.Root and
 * restores focus to the trigger.
 */
function ModelList({
  models,
  state,
  onSelect,
  focusCursorSignal = 0,
}: {
  models: ModelRow[];
  state: AppState;
  onSelect: (model: ModelRow) => Promise<void>;
  /** Increment to move keyboard focus onto the roving cursor option. */
  focusCursorSignal?: number;
}) {
  const { dismiss } = usePopover();
  const [activeIndex, setActiveIndex] = useState(0);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const selectedIndex = models.findIndex(
    (model) =>
      model.modelId === state.settings.activeModelId && model.providerId === state.settings.activeProviderId,
  );
  const cursor = models.length ? Math.min(activeIndex, models.length - 1) : 0;

  useEffect(() => {
    if (focusCursorSignal > 0) optionRefs.current[cursor]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusCursorSignal]);

  if (!models.length) {
    return <p className="px-1 py-6 text-center text-xs leading-relaxed text-muted">{t("topbar.model.empty")}</p>;
  }

  return (
    <div
      className="mt-2 max-h-[22rem] overflow-y-auto"
      role="listbox"
      aria-label={t("topbar.model.select")}
      onKeyDown={handleMenuItemKeys}
    >
      {models.map((model, index) => {
        const provider = state.providers.find((entry) => entry.id === model.providerId);
        const active = index === selectedIndex;
        return (
          <button
            key={model.id}
            ref={(element) => {
              optionRefs.current[index] = element;
            }}
            type="button"
            role="option"
            aria-selected={active}
            tabIndex={index === cursor ? 0 : -1}
            className="sidebar-item"
            data-active={active}
            onClick={async () => {
              await onSelect(model);
              dismiss();
            }}
            onFocus={() => setActiveIndex(index)}
          >
            <div className="flex items-center gap-2">
              <span className="truncate font-medium">{model.displayName}</span>
              {model.isFree ? <span className="chip chip-on">{t("topbar.model.free")}</span> : null}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-micro text-muted">
              <span>{provider?.name ?? t("topbar.model.providerFallback")}</span>
              <span>
                · {(model.contextLength / 1000).toFixed(0)}k {t("topbar.model.contextSuffix")}
              </span>
              <span>
                · {(model.maxOutput / 1000).toFixed(1)}k {t("topbar.model.outputSuffix")}
              </span>
              {model.capabilities.vision ? <span>· {t("topbar.capability.vision")}</span> : null}
              {model.capabilities.reasoning ? <span>· {t("topbar.capability.reasoning")}</span> : null}
              {model.capabilities.tools ? <span>· {t("topbar.capability.tools")}</span> : null}
            </div>
          </button>
        );
      })}
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
  const [query, setQuery] = useState("");
  const [freeOnly, setFreeOnly] = useState(false);
  const [discovering, setDiscovering] = useState<string | null>(null);
  const [cursorFocusSignal, setCursorFocusSignal] = useState(0);

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
    activeProvider?.status === "connected" ? "good" : activeProvider?.status === "error" ? "warn" : "muted";

  async function selectModel(model: ModelRow) {
    await onPatchSettings({ activeProviderId: model.providerId, activeModelId: model.modelId });
  }

  async function refreshProvider(providerId: string) {
    setDiscovering(providerId);
    try {
      await onDiscover(providerId);
    } finally {
      setDiscovering(null);
    }
  }

  return (
    <header
      className="z-20 flex flex-wrap items-center gap-2 border-b border-line bg-surface px-4 py-2.5"
      aria-label="Studio controls"
    >
      <Link
        href="/settings"
        className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-xs transition hover:border-accent"
        title={activeProvider?.statusMessage ?? t("topbar.provider.statusTitle")}
      >
        <span className="status-led" data-tone={statusTone} aria-hidden="true" />
        <span className="font-medium">{activeProvider?.name ?? t("topbar.provider.none")}</span>
        <span className="text-muted">
          {activeProvider
            ? activeProvider.status === "connected"
              ? t("topbar.provider.connected")
              : activeProvider.status
            : t("topbar.provider.notSet")}
        </span>
      </Link>

      {/* Model picker — listbox popover ---------------------------------- */}
      <Popover.Root>
        <Popover.Trigger
          className="btn"
          hasPopup="listbox"
          disabled={busy}
          onKeyDown={(event) => {
            // ArrowDown/ArrowUp open the listbox and move the cursor into it.
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              if (event.currentTarget.getAttribute("aria-expanded") === "false") {
                event.currentTarget.click();
                setCursorFocusSignal((tick) => tick + 1);
              }
            }
          }}
        >
          <span className="max-w-[15rem] truncate">
            {activeModel ? activeModel.displayName : state.settings.activeModelId ?? t("topbar.model.select")}
          </span>
          <span className="text-muted" aria-hidden="true">
            ▾
          </span>
        </Popover.Trigger>
        <Popover.Content className="popover-surface card left-0 top-11 w-[26rem] max-w-[90vw] p-3">
          <div className="flex items-center gap-2">
            <input
              className="input"
              autoFocus
              placeholder={t("topbar.model.search")}
              aria-label={t("topbar.model.search")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <label className="flex items-center gap-1 whitespace-nowrap text-xs text-muted">
              <input type="checkbox" checked={freeOnly} onChange={(event) => setFreeOnly(event.target.checked)} />
              {t("topbar.model.free")}
            </label>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1">
            {connectedProviders.map((provider) => (
              <button
                key={provider.id}
                type="button"
                className="chip hover:border-accent"
                disabled={discovering !== null}
                aria-busy={discovering === provider.id}
                onClick={() => refreshProvider(provider.id)}
                title={t("topbar.model.refreshTitle", { name: provider.name })}
              >
                ⟳ {provider.name}
              </button>
            ))}
            <Link href="/settings" className="chip hover:border-accent">
              {t("topbar.model.addProvider")}
            </Link>
          </div>

          <ModelList models={models} state={state} onSelect={selectModel} focusCursorSignal={cursorFocusSignal} />
        </Popover.Content>
      </Popover.Root>

      <select
        className="select w-auto text-xs"
        value={state.settings.contextLevel}
        onChange={(event) => onPatchSettings({ contextLevel: event.target.value })}
        title={t("topbar.context.title")}
        aria-label={t("topbar.context.title")}
      >
        {state.contextLevels.map((level) => (
          <option key={level.key} value={level.key}>
            {t("topbar.context.label", { label: level.label })}
          </option>
        ))}
      </select>
      {contextClamped ? (
        <span
          className="chip chip-warn"
          title={t("topbar.context.clampedTitle", {
            limit: (activeModel!.contextLength / 1000).toFixed(0),
          })}
        >
          {t("topbar.context.clamped", { limit: (activeModel!.contextLength / 1000).toFixed(0) })}
        </span>
      ) : null}

      <button
        type="button"
        className={`btn ${agentOn ? "btn-primary" : ""}`}
        aria-pressed={agentOn}
        onClick={() =>
          session ? onPatchSession({ dynamicAgent: !agentOn }) : onPatchSettings({ dynamicAgent: !agentOn })
        }
        title={t("topbar.agent.title")}
      >
        {t("topbar.agent.label", { state: agentOn ? t("topbar.agent.on") : t("topbar.agent.off") })}
      </button>

      <button
        type="button"
        className={`btn ${state.settings.reasoningEnabled && capabilities.reasoning ? "btn-primary" : ""}`}
        aria-pressed={state.settings.reasoningEnabled && capabilities.reasoning}
        disabled={!capabilities.reasoning}
        onClick={() => onPatchSettings({ reasoningEnabled: !state.settings.reasoningEnabled })}
        title={capabilities.reasoning ? t("topbar.reasoning.titleOn") : t("topbar.reasoning.titleOff")}
      >
        {t("topbar.reasoning.label")}
      </button>

      <div className="ml-auto flex items-center gap-3">
        <CapabilityChips capabilities={capabilities} />
        <div className="theme-switch" role="radiogroup" aria-label={t("topbar.theme.groupLabel")}>
          {THEMES.map((theme) => (
            <button
              key={theme.key}
              type="button"
              role="radio"
              aria-checked={state.settings.theme === theme.key}
              className="theme-option"
              data-active={state.settings.theme === theme.key}
              onClick={() => onPatchSettings({ theme: theme.key })}
              title={t("topbar.theme.title", { name: t(theme.labelKey) })}
              aria-label={t("topbar.theme.title", { name: t(theme.labelKey) })}
            >
              <span aria-hidden="true">{theme.glyph}</span>
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
