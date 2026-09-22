"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  api,
  streamRun,
  type AppState,
  type Capabilities,
  type ResourceRef,
  type SessionDetail,
} from "@/lib/client/api";
import { Icon } from "@/components/ui/Icon";
import { t } from "@/lib/i18n";
import { applyTheme } from "@/lib/theme";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { NewSession } from "./NewSession";
import { Sidebar } from "./Sidebar";
import { StageDeck, type RunState } from "./StageDeck";
import { TopBar } from "./TopBar";

const LAST_SESSION_KEY = "studio-last-session";
const SIDEBAR_KEY = "studio-sidebar-collapsed";

const NO_CAPS: Capabilities = {
  vision: false,
  voice: false,
  reasoning: false,
  tools: false,
  streaming: false,
  documents: false,
};

/* Initial-load skeleton mirroring the studio shell geometry. */
function StudioSkeleton() {
  return (
    <div className="studio-shell flex min-h-dvh overflow-hidden" aria-busy="true">
      <div className="w-14 shrink-0 border-r border-line bg-surface px-2 py-4" aria-hidden="true">
        <div className="skeleton mx-auto h-8 w-8" />
        <div className="skeleton mx-auto mt-3 h-8 w-8" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="studio-header studio-topbar" aria-hidden="true">
          <div className="skeleton h-8 w-40" />
          <div className="skeleton h-8 w-56" />
          <div className="skeleton ml-auto h-8 w-24" />
        </div>
        <div className="px-6 py-3.5" aria-hidden="true">
          <div className="skeleton h-6 w-64" />
          <div className="skeleton mt-3 h-7 w-full max-w-2xl" />
          <div className="skeleton mt-3 h-1.5 w-full" />
        </div>
        <div className="mx-auto w-full max-w-3xl px-6" role="status" aria-live="polite">
          <span className="sr-only">{t("studio.loading")}</span>
          <div className="card space-y-3 p-8" aria-hidden="true">
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-5/6" />
            <div className="skeleton h-24 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function StudioApp() {
  const [state, setState] = useState<AppState | null>(null);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [stageIndex, setStageIndex] = useState(0);
  const [run, setRun] = useState<RunState | null>(null);
  const [toast, setToast] = useState<{ kind: "error" | "info"; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMobile = useMediaQuery("(max-width: 767px)");

  const notify = useCallback((kind: "error" | "info", message: string) => {
    setToast({ kind, message });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), kind === "error" ? 8000 : 3500);
  }, []);

  const refreshState = useCallback(async () => {
    const next = await api.state();
    setState(next);
    return next;
  }, []);

  const openSession = useCallback(
    async (id: string) => {
      try {
        const next = await api.session(id);
        setDetail(next);
        setShowNew(false);
        setStageIndex(Math.min(next.session.currentStage, next.session.configSteps.length - 1));
        window.localStorage.setItem(LAST_SESSION_KEY, id);
      } catch (error) {
        window.localStorage.removeItem(LAST_SESSION_KEY);
        notify("error", error instanceof Error ? error.message : t("studio.error.openFailed"));
      }
    },
    [notify],
  );

  /*
   * Stream state updates are coalesced per animation frame: SSE deltas can
   * arrive faster than frames, and every setRun otherwise costs a full
   * markdown re-render. Events accumulate and flush once per frame.
   */
  type RunUpdate = (current: RunState | null) => RunState | null;
  const pendingUpdates = useRef<RunUpdate[]>([]);
  const rafHandle = useRef<number | null>(null);

  const flushRunUpdates = useCallback(() => {
    if (rafHandle.current !== null) {
      cancelAnimationFrame(rafHandle.current);
      rafHandle.current = null;
    }
    const updates = pendingUpdates.current;
    pendingUpdates.current = [];
    if (!updates.length) return;
    setRun((current) => updates.reduce((acc, update) => update(acc), current));
  }, []);

  const scheduleRunUpdate = useCallback(
    (update: RunUpdate) => {
      pendingUpdates.current.push(update);
      if (rafHandle.current !== null) return;
      rafHandle.current = requestAnimationFrame(() => {
        rafHandle.current = null;
        const updates = pendingUpdates.current;
        pendingUpdates.current = [];
        if (!updates.length) return;
        setRun((current) => updates.reduce((acc, u) => u(acc), current));
      });
    },
    [],
  );

  useEffect(
    () => () => {
      if (rafHandle.current !== null) cancelAnimationFrame(rafHandle.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  // Initial hydration ---------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await api.state();
        if (cancelled) return;
        setState(next);
        setCollapsed(window.localStorage.getItem(SIDEBAR_KEY) === "1");
        const last = window.localStorage.getItem(LAST_SESSION_KEY);
        if (last && next.sessions.some((session) => session.id === last)) {
          await openSession(last);
        } else if (next.sessions.length) {
          await openSession(next.sessions[0].id);
        } else {
          setShowNew(true);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : t("studio.error.db");
        if (!cancelled) setLoadError(message);
        notify("error", message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notify, openSession, reloadKey]);

  // Theme (with 150ms token cross-fade) ----------------------------------
  useEffect(() => {
    if (!state) return;
    applyTheme(state.settings.theme);
    window.localStorage.setItem("studio-theme", state.settings.theme);
  }, [state]);

  const activeModel = useMemo(() => {
    if (!state?.settings.activeModelId) return null;
    return (
      state.models.find(
        (model) =>
          model.modelId === state.settings.activeModelId && model.providerId === state.settings.activeProviderId,
      ) ?? null
    );
  }, [state]);

  const activeProvider = useMemo(
    () => state?.providers.find((provider) => provider.id === state.settings.activeProviderId) ?? null,
    [state],
  );

  const capabilities = activeModel?.capabilities ?? NO_CAPS;

  const patchSettings = useCallback(
    async (patch: Record<string, unknown>) => {
      if (!state) return;
      try {
        const result = await api.patchSettings(patch);
        setState({ ...state, settings: result.settings });
        for (const warning of result.warnings ?? []) notify("info", warning);
      } catch (error) {
        notify("error", error instanceof Error ? error.message : t("studio.toast.settingsFailed"));
      }
    },
    [state, notify],
  );

  const patchSession = useCallback(
    async (patch: Record<string, unknown>) => {
      if (!detail) return;
      try {
        const result = await api.patchSession(detail.session.id, patch);
        setDetail({ ...detail, session: result.session });
        await refreshState();
      } catch (error) {
        notify("error", error instanceof Error ? error.message : t("studio.toast.sessionFailed"));
      }
    },
    [detail, notify, refreshState],
  );

  const discover = useCallback(
    async (providerId: string) => {
      try {
        const result = await api.discoverModels(providerId);
        await refreshState();
        notify("info", t("topbar.model.discovered", { count: result.models.length }));
      } catch (error) {
        notify("error", error instanceof Error ? error.message : t("studio.toast.discoveryFailed"));
      }
    },
    [notify, refreshState],
  );

  // Generation ----------------------------------------------------------
  const generate = useCallback(
    async (index: number, modifier: "none" | "longer" | "shorter" | "deeper", sessionOverride?: string) => {
      const sessionId = sessionOverride ?? detail?.session.id;
      if (!sessionId || run) return;
      setStageIndex(index);
      setRun({ mode: "stage", stageIndex: index, status: t("studio.status.starting"), text: "", reasoning: "", resources: [] });
      let failed = false;
      const resources: ResourceRef[] = [];
      await streamRun(`/api/sessions/${sessionId}/generate`, { stageIndex: index, modifier }, (event) => {
        scheduleRunUpdate((current) => {
          if (!current) return current;
          switch (event.type) {
            case "status":
              return { ...current, status: event.message };
            case "delta":
              return { ...current, text: current.text + event.text };
            case "reasoning":
              return { ...current, reasoning: current.reasoning + event.text };
            case "resources":
              resources.push(...event.resources);
              return { ...current, resources: [...resources] };
            default:
              return current;
          }
        });
        if (event.type === "error") {
          failed = true;
          notify("error", event.message);
        }
      }).catch((error: unknown) => {
        failed = true;
        notify("error", error instanceof Error ? error.message : t("studio.toast.generateFailed"));
      });
      flushRunUpdates();
      setRun(null);
      if (!failed) {
        await openSession(sessionId);
        setStageIndex(index);
        await refreshState();
      }
    },
    [detail, run, notify, openSession, refreshState, scheduleRunUpdate, flushRunUpdates],
  );

  const ask = useCallback(
    async (stageId: string, question: string) => {
      if (!detail || run) return;
      const sessionId = detail.session.id;
      const index = detail.stages.find((stage) => stage.id === stageId)?.index ?? stageIndex;
      setRun({ mode: "qa", stageIndex: index, status: t("studio.status.thinking"), text: "", reasoning: "", resources: [] });
      let failed = false;
      await streamRun(`/api/sessions/${sessionId}/qa`, { stageId, question }, (event) => {
        scheduleRunUpdate((current) => {
          if (!current) return current;
          if (event.type === "status") return { ...current, status: event.message };
          if (event.type === "delta") return { ...current, text: current.text + event.text };
          if (event.type === "reasoning") return { ...current, reasoning: current.reasoning + event.text };
          if (event.type === "resources") return { ...current, resources: [...current.resources, ...event.resources] };
          return current;
        });
        if (event.type === "error") {
          failed = true;
          notify("error", event.message);
        }
      }).catch((error: unknown) => {
        failed = true;
        notify("error", error instanceof Error ? error.message : t("studio.toast.qaFailed"));
      });
      flushRunUpdates();
      setRun(null);
      await openSession(sessionId);
      setStageIndex(index);
      if (!failed) await refreshState();
    },
    [detail, run, stageIndex, notify, openSession, refreshState, scheduleRunUpdate, flushRunUpdates],
  );

  const editStep = useCallback(
    async (index: number, title: string, instructions: string) => {
      if (!detail) return;
      const steps = detail.session.configSteps.map((step, position) =>
        position === index ? { ...step, title: title.trim() || step.title, instructions: instructions.trim() } : step,
      );
      try {
        const result = await api.patchSession(detail.session.id, { steps } as Record<string, unknown>);
        setDetail({ ...detail, session: result.session });
      } catch (error) {
        notify("error", error instanceof Error ? error.message : t("studio.toast.stepFailed"));
      }
    },
    [detail, notify],
  );

  const upload = useCallback(
    async (file: File) => {
      if (!detail) return;
      try {
        const result = await api.uploadAttachment(detail.session.id, file);
        notify("info", result.note ?? t("studio.toast.attached", { name: result.attachment.name }));
        await openSession(detail.session.id);
      } catch (error) {
        notify("error", error instanceof Error ? error.message : t("studio.toast.uploadRejected"));
      }
    },
    [detail, notify, openSession],
  );

  const removeAttachment = useCallback(
    async (attachmentId: string) => {
      if (!detail) return;
      try {
        await api.deleteAttachment(detail.session.id, attachmentId);
        await openSession(detail.session.id);
      } catch (error) {
        notify("error", error instanceof Error ? error.message : t("studio.toast.attachmentFailed"));
      }
    },
    [detail, notify, openSession],
  );

  const createSession = useCallback(
    async (input: { topic: string; configId: string | null; projectId: string | null; dynamicAgent: boolean }) => {
      setCreating(true);
      try {
        const result = await api.createSession(input);
        await refreshState();
        await openSession(result.session.id);
        setStageIndex(0);
        // The engine opens the session itself: stage 1 is generated immediately,
        // every later stage stays on demand.
        await generate(0, "none", result.session.id);
      } catch (error) {
        notify("error", error instanceof Error ? error.message : t("studio.toast.createFailed"));
      } finally {
        setCreating(false);
      }
    },
    [notify, openSession, refreshState, generate],
  );

  if (loading || !state) {
    if (!loading && loadError) {
      return (
        <main id="main-content" className="flex min-h-dvh items-center justify-center px-6" tabIndex={-1}>
          <div className="card card-warn w-full max-w-md p-6 text-center">
            <div className="text-warn mb-2 text-lg">{t("studio.error.title")}</div>
            <p className="mb-4 text-sm leading-relaxed text-muted">{loadError}</p>
            <p className="mb-4 text-xs leading-relaxed text-muted">{t("studio.error.hint")}</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setLoadError(null);
                setLoading(true);
                setReloadKey((value) => value + 1);
              }}
            >
              {t("studio.error.retry")}
            </button>
          </div>
        </main>
      );
    }
    return <StudioSkeleton />;
  }

  return (
    <main id="main-content" className="studio-shell flex min-h-dvh overflow-hidden" tabIndex={-1}>
      <Sidebar
        state={state}
        activeId={detail?.session.id ?? null}
        collapsed={collapsed}
        onToggleCollapse={() => {
          setCollapsed((value) => {
            window.localStorage.setItem(SIDEBAR_KEY, value ? "0" : "1");
            return !value;
          });
        }}
        onSelect={(id) => void openSession(id)}
        onNew={() => {
          setShowNew(true);
          setDetail(null);
          window.localStorage.removeItem(LAST_SESSION_KEY);
        }}
        onRefresh={async () => {
          const next = await refreshState();
          if (detail && !next.sessions.some((session) => session.id === detail.session.id)) {
            setDetail(null);
            setShowNew(true);
          } else if (detail) {
            await openSession(detail.session.id);
          }
        }}
        notify={notify}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
        onMobileOpen={() => setMobileNavOpen(true)}
      />

      <div className="studio-chrome flex min-w-0 flex-1 flex-col">
        <TopBar
          state={state}
          activeModel={activeModel}
          activeProvider={activeProvider}
          capabilities={capabilities}
          session={detail?.session ?? null}
          busy={run !== null}
          onPatchSettings={patchSettings}
          onPatchSession={patchSession}
          onDiscover={discover}
        />

        {detail && !showNew ? (
          <StageDeck
            detail={detail}
            stageIndex={stageIndex}
            onStageIndex={setStageIndex}
            run={run}
            capabilities={capabilities}
            reasoningEnabled={state.settings.reasoningEnabled}
            agentOn={detail.session.dynamicAgent}
            onGenerate={generate}
            onAsk={ask}
            onEditStep={editStep}
            onUpload={upload}
            onDeleteAttachment={removeAttachment}
            notify={notify}
          />
        ) : (
          <NewSession state={state} busy={creating} onCreate={createSession} />
        )}
      </div>

      {toast ? (
        <div className="toast-layer pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-5" role="status" aria-live="polite">
          <div className="toast card animate-rise pointer-events-auto w-full max-w-lg px-4 py-3 text-sm" data-tone={toast.kind}>
            <div className="flex items-start gap-3">
              <span className="toast-icon" aria-hidden="true">
                {toast.kind === "error" ? <Icon name="warn" /> : <Icon name="check" />}
              </span>
              <span className="leading-relaxed">{toast.message}</span>
              <button
                type="button"
                className="icon-btn ml-2"
                onClick={() => setToast(null)}
                aria-label={t("studio.toast.dismiss")}
              >
                <Icon name="close" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
