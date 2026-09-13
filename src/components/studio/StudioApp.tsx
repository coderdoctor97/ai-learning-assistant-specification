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
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        notify("error", error instanceof Error ? error.message : "Could not open that session.");
      }
    },
    [notify],
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
        const message = error instanceof Error ? error.message : "Could not reach the local database.";
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

  // Theme ---------------------------------------------------------------
  useEffect(() => {
    if (!state) return;
    document.documentElement.setAttribute("data-theme", state.settings.theme);
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
        notify("error", error instanceof Error ? error.message : "Could not save settings.");
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
        notify("error", error instanceof Error ? error.message : "Could not update the session.");
      }
    },
    [detail, notify, refreshState],
  );

  const discover = useCallback(
    async (providerId: string) => {
      try {
        const result = await api.discoverModels(providerId);
        await refreshState();
        notify("info", `${result.models.length} models discovered.`);
      } catch (error) {
        notify("error", error instanceof Error ? error.message : "Model discovery failed.");
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
      setRun({ mode: "stage", stageIndex: index, status: "Starting…", text: "", reasoning: "", resources: [] });
      let failed = false;
      const resources: ResourceRef[] = [];
      await streamRun(`/api/sessions/${sessionId}/generate`, { stageIndex: index, modifier }, (event) => {
        setRun((current) => {
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
        notify("error", error instanceof Error ? error.message : "Generation failed.");
      });
      setRun(null);
      if (!failed) {
        await openSession(sessionId);
        setStageIndex(index);
        await refreshState();
      }
    },
    [detail, run, notify, openSession, refreshState],
  );

  const ask = useCallback(
    async (stageId: string, question: string) => {
      if (!detail || run) return;
      const sessionId = detail.session.id;
      const index = detail.stages.find((stage) => stage.id === stageId)?.index ?? stageIndex;
      setRun({ mode: "qa", stageIndex: index, status: "Thinking…", text: "", reasoning: "", resources: [] });
      let failed = false;
      await streamRun(`/api/sessions/${sessionId}/qa`, { stageId, question }, (event) => {
        setRun((current) => {
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
        notify("error", error instanceof Error ? error.message : "The question could not be answered.");
      });
      setRun(null);
      await openSession(sessionId);
      setStageIndex(index);
      if (!failed) await refreshState();
    },
    [detail, run, stageIndex, notify, openSession, refreshState],
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
        notify("error", error instanceof Error ? error.message : "Could not update this step.");
      }
    },
    [detail, notify],
  );

  const upload = useCallback(
    async (file: File) => {
      if (!detail) return;
      try {
        const result = await api.uploadAttachment(detail.session.id, file);
        notify("info", result.note ?? `${result.attachment.name} attached.`);
        await openSession(detail.session.id);
      } catch (error) {
        notify("error", error instanceof Error ? error.message : "Upload rejected.");
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
        notify("error", error instanceof Error ? error.message : "Could not remove that file.");
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
        notify("error", error instanceof Error ? error.message : "Could not create the session.");
      } finally {
        setCreating(false);
      }
    },
    [notify, openSession, refreshState, generate],
  );

  if (loading || !state) {
    if (!loading && loadError) {
      return (
        <div className="flex h-screen items-center justify-center px-6">
          <div className="card w-full max-w-md p-6 text-center" style={{ borderColor: "var(--warn)" }}>
            <div className="mb-2 text-lg" style={{ color: "var(--warn)" }}>
              Studio could not load
            </div>
            <p className="mb-4 text-sm leading-relaxed text-muted">{loadError}</p>
            <p className="mb-4 text-xs leading-relaxed text-muted">
              The studio could not read its local data file. Check the terminal running the server for details, then try
              again.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => {
                setLoadError(null);
                setLoading(true);
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
      <div className="flex h-screen items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-muted">
          <span className="dot-pulse flex gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-accent" />
            <span className="inline-block h-2 w-2 rounded-full bg-accent" />
            <span className="inline-block h-2 w-2 rounded-full bg-accent" />
          </span>
          Loading your local studio…
        </div>
      </div>
    );
  }

  return (
    <div className="studio-shell flex h-screen overflow-hidden">
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
      />

      <div className="flex min-w-0 flex-1 flex-col">
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
        <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-5" role="status">
          <div
            className="card animate-rise pointer-events-auto w-full max-w-lg px-4 py-3 text-sm"
            style={{ borderColor: toast.kind === "error" ? "var(--warn)" : "var(--accent)" }}
          >
            <div className="flex items-start gap-3">
              <span style={{ color: toast.kind === "error" ? "var(--warn)" : "var(--accent)" }}>
                {toast.kind === "error" ? "⚠" : "✓"}
              </span>
              <span className="leading-relaxed">{toast.message}</span>
              <button className="ml-2 text-muted hover:text-ink" onClick={() => setToast(null)} aria-label="Dismiss">
                ×
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
