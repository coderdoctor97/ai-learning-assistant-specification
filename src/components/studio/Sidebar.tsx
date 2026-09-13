"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { api, type AppState, type SessionSummary } from "@/lib/client/api";

type Props = {
  state: AppState;
  activeId: string | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRefresh: () => Promise<void>;
  notify: (kind: "error" | "info", message: string) => void;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function Sidebar({ state, activeId, collapsed, onToggleCollapse, onSelect, onNew, onRefresh, notify }: Props) {
  const [query, setQuery] = useState("");
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [creatingProject, setCreatingProject] = useState(false);
  const [projectName, setProjectName] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return state.sessions.filter((session) => {
      if (projectFilter && session.projectId !== projectFilter) return false;
      if (!needle) return true;
      return (
        session.title.toLowerCase().includes(needle) ||
        session.topic.toLowerCase().includes(needle) ||
        session.configName.toLowerCase().includes(needle)
      );
    });
  }, [state.sessions, query, projectFilter]);

  const pinned = filtered.filter((session) => session.pinned);
  const rest = filtered.filter((session) => !session.pinned);

  async function act(action: () => Promise<unknown>, message?: string) {
    try {
      await action();
      await onRefresh();
      if (message) notify("info", message);
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Action failed.");
    } finally {
      setMenuFor(null);
    }
  }

  if (collapsed) {
    return (
      <aside className="flex w-14 shrink-0 flex-col items-center gap-3 border-r border-line bg-surface py-4">
        <button className="btn btn-ghost px-2" onClick={onToggleCollapse} title="Expand sidebar" aria-label="Expand sidebar">
          ☰
        </button>
        <button className="btn btn-primary px-2" onClick={onNew} title="New learning session" aria-label="New session">
          +
        </button>
        <div className="mt-auto">
          <Link href="/settings" className="btn btn-ghost px-2" title="Settings">
            ⚙
          </Link>
        </div>
      </aside>
    );
  }

  const SessionRow = ({ session }: { session: SessionSummary }) => {
    const progress = session.stageCount ? Math.round(((session.currentStage + 1) / session.stageCount) * 100) : 0;
    const done = session.status === "completed";
    return (
      <div className="group relative">
        <button
          className="sidebar-item"
          data-active={session.id === activeId}
          onClick={() => onSelect(session.id)}
          title={session.topic}
        >
          <div className="flex items-center gap-1.5">
            {session.pinned ? <span className="text-[0.65rem] text-accent">★</span> : null}
            <span className="truncate">{session.title}</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[0.68rem] text-muted">
            <span className="inline-block h-1 w-12 overflow-hidden rounded-full bg-surface2">
              <span className="progress-bar" style={{ transform: `scaleX(${(done ? 100 : progress) / 100})` }} />
            </span>
            <span>{done ? "complete" : `${session.currentStage + 1}/${session.stageCount}`}</span>
            <span className="ml-auto">{timeAgo(session.updatedAt)}</span>
          </div>
        </button>
        <button
          className="absolute right-1 top-1 rounded px-1.5 py-0.5 text-xs text-muted opacity-0 transition group-hover:opacity-100 hover:bg-surface2"
          onClick={(event) => {
            event.stopPropagation();
            setMenuFor(menuFor === session.id ? null : session.id);
          }}
          aria-label="Session actions"
        >
          ⋯
        </button>
        {menuFor === session.id ? (
          <div className="card absolute right-1 top-7 z-30 w-48 p-1 text-xs">
            <button
              className="sidebar-item"
              onClick={() => act(() => api.patchSession(session.id, { pinned: !session.pinned }))}
            >
              {session.pinned ? "Unpin" : "Pin to top"}
            </button>
            <button
              className="sidebar-item"
              onClick={() => {
                const title = window.prompt("Rename session", session.title);
                if (title?.trim()) void act(() => api.patchSession(session.id, { title: title.trim() }));
                else setMenuFor(null);
              }}
            >
              Rename
            </button>
            {state.projects.length ? (
              <div className="px-2 py-1">
                <div className="label mb-1">Move to project</div>
                <select
                  className="select text-xs"
                  value={session.projectId ?? ""}
                  onChange={(event) =>
                    act(() => api.patchSession(session.id, { projectId: event.target.value || null }))
                  }
                >
                  <option value="">No project</option>
                  {state.projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <button
              className="sidebar-item text-[var(--warn)]"
              onClick={() => {
                if (window.confirm(`Delete "${session.title}"? This cannot be undone.`)) {
                  void act(() => api.deleteSession(session.id), "Session deleted.");
                } else setMenuFor(null);
              }}
            >
              Delete
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-line bg-surface">
      <div className="flex items-center gap-2 px-3 py-3">
        <Link href="/" className="font-serif text-[0.95rem] font-semibold tracking-tight">
          Learning<span className="text-accent">Studio</span>
        </Link>
        <button
          className="btn btn-ghost btn-xs ml-auto"
          onClick={onToggleCollapse}
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
        >
          ⟨
        </button>
      </div>

      <div className="space-y-2 px-3 pb-3">
        <button className="btn btn-primary w-full" onClick={onNew}>
          + New learning session
        </button>
        <input
          className="input"
          placeholder="Search sessions…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="label">Projects</span>
          <button className="btn btn-ghost btn-xs" onClick={() => setCreatingProject((value) => !value)}>
            +
          </button>
        </div>
        {creatingProject ? (
          <form
            className="mb-2 flex gap-1"
            onSubmit={(event) => {
              event.preventDefault();
              if (!projectName.trim()) return;
              void act(() => api.createProject({ name: projectName.trim() }));
              setProjectName("");
              setCreatingProject(false);
            }}
          >
            <input
              className="input text-xs"
              autoFocus
              placeholder="Project name"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
            />
            <button className="btn btn-xs" type="submit">
              Add
            </button>
          </form>
        ) : null}
        <div className="mb-3 space-y-0.5">
          <button className="sidebar-item" data-active={projectFilter === null} onClick={() => setProjectFilter(null)}>
            All sessions <span className="text-[0.68rem] text-muted">({state.sessions.length})</span>
          </button>
          {state.projects.map((project) => {
            const count = state.sessions.filter((session) => session.projectId === project.id).length;
            return (
              <div key={project.id} className="group relative">
                <button
                  className="sidebar-item"
                  data-active={projectFilter === project.id}
                  onClick={() => setProjectFilter(projectFilter === project.id ? null : project.id)}
                >
                  {project.name} <span className="text-[0.68rem] text-muted">({count})</span>
                </button>
                <button
                  className="absolute right-1 top-1.5 rounded px-1 text-[0.7rem] text-muted opacity-0 transition group-hover:opacity-100"
                  onClick={() => {
                    if (window.confirm(`Delete project "${project.name}"? Sessions are kept.`)) {
                      void act(() => api.deleteProject(project.id));
                      setProjectFilter(null);
                    }
                  }}
                  aria-label="Delete project"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>

        {pinned.length ? (
          <>
            <div className="label mb-1">Pinned</div>
            <div className="mb-3 space-y-0.5">
              {pinned.map((session) => (
                <div key={session.id}>{SessionRow({ session })}</div>
              ))}
            </div>
          </>
        ) : null}

        <div className="label mb-1">History</div>
        <div className="space-y-0.5">
          {rest.length ? (
            rest.map((session) => <div key={session.id}>{SessionRow({ session })}</div>)
          ) : (
            <p className="px-1 py-4 text-xs leading-relaxed text-muted">
              {state.sessions.length ? "No sessions match that search." : "No sessions yet. Start one above."}
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-line p-3">
        <Link href="/settings" className="btn w-full justify-start">
          <span className="text-muted">⚙</span> Settings &amp; providers
        </Link>
        <p className="mt-2 px-1 text-[0.68rem] leading-relaxed text-muted">
          Stored locally · {state.sessions.length} session{state.sessions.length === 1 ? "" : "s"} kept on this machine
        </p>
      </div>
    </aside>
  );
}
