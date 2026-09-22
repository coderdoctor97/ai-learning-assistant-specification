"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Popover, handleMenuItemKeys, usePopover } from "@/components/ui/Popover";
import { MiniProgressBar } from "@/components/ui/ProgressBar";
import { Icon } from "@/components/ui/Icon";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { formatDate, t, tPlural } from "@/lib/i18n";
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
  /** Mobile drawer state (below md the expanded sidebar is an overlay). */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  /** Opens the mobile drawer from the rail trigger. */
  onMobileOpen?: () => void;
};

type Act = (action: () => Promise<unknown>, message?: string) => Promise<void>;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return t("sidebar.time.justNow");
  if (minutes < 60) return t("sidebar.time.minutes", { count: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return t("sidebar.time.hours", { count: hours });
  const days = Math.round(hours / 24);
  if (days < 30) return t("sidebar.time.days", { count: days });
  return formatDate(iso);
}

function SessionMenuItems({
  session,
  state,
  act,
}: {
  session: SessionSummary;
  state: AppState;
  act: Act;
}) {
  const { dismiss } = usePopover();
  return (
    <Popover.Content
      className="menu-surface absolute right-1 top-8 text-xs"
      role="menu"
      ariaLabel={t("sidebar.session.actions")}
      onKeyDown={handleMenuItemKeys}
    >
      <button
        type="button"
        role="menuitem"
        className="menu-item"
        onClick={async () => {
          await act(() => api.patchSession(session.id, { pinned: !session.pinned }));
          dismiss();
        }}
      >
        {session.pinned ? t("sidebar.session.unpin") : t("sidebar.session.pin")}
      </button>
      <button
        type="button"
        role="menuitem"
        className="menu-item"
        onClick={async () => {
          const title = window.prompt(t("sidebar.session.renamePrompt"), session.title);
          if (title?.trim()) {
            await act(() => api.patchSession(session.id, { title: title.trim() }));
            dismiss();
          } else {
            dismiss();
          }
        }}
      >
        {t("sidebar.session.rename")}
      </button>
      {state.projects.length ? (
        <div className="px-2 py-1" role="none">
          <div className="label mb-1">{t("sidebar.session.move")}</div>
          <select
            className="select text-xs"
            aria-label={t("sidebar.session.move")}
            value={session.projectId ?? ""}
            onChange={(event) =>
              act(() => api.patchSession(session.id, { projectId: event.target.value || null }))
            }
          >
            <option value="">{t("sidebar.session.noProject")}</option>
            {state.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <button
        type="button"
        role="menuitem"
        className="menu-item"
        data-danger="true"
        onClick={async () => {
          if (window.confirm(t("sidebar.session.deleteConfirm", { title: session.title }))) {
            await act(() => api.deleteSession(session.id), t("sidebar.session.deleted"));
          }
          dismiss();
        }}
      >
        {t("sidebar.session.delete")}
      </button>
    </Popover.Content>
  );
}

function SessionMenu({
  session,
  state,
  act,
}: {
  session: SessionSummary;
  state: AppState;
  act: Act;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger
        className="icon-btn row-action absolute right-1 top-1 z-20"
        hasPopup="menu"
        title={t("sidebar.session.actions")}
        aria-label={t("sidebar.session.actions")}
        onClick={(event) => event.stopPropagation()}
      >
        <Icon name="more" />
      </Popover.Trigger>
      <SessionMenuItems session={session} state={state} act={act} />
    </Popover.Root>
  );
}

function SessionRow({
  session,
  state,
  activeId,
  onSelect,
  act,
}: {
  session: SessionSummary;
  state: AppState;
  activeId: string | null;
  onSelect: (id: string) => void;
  act: Act;
}) {
  const progress = session.stageCount ? Math.round(((session.currentStage + 1) / session.stageCount) * 100) : 0;
  const done = session.status === "completed";
  return (
    <div className="group relative">
      <button
        type="button"
        className="sidebar-item sidebar-item-session"
        data-active={session.id === activeId}
        onClick={() => onSelect(session.id)}
        title={session.topic}
      >
        <div className="flex items-center gap-1.5">
          {session.pinned ? (
            <span className="text-accent" aria-label={t("sidebar.pinned")}>
              <Icon name="star" />
            </span>
          ) : null}
          <span className="truncate">{session.title}</span>
        </div>
        <div className="mt-1 flex items-center gap-2 font-mono text-micro tabular-nums text-muted">
          <MiniProgressBar ratio={(done ? 100 : progress) / 100} />
          <span>{done ? t("sidebar.session.complete") : `${session.currentStage + 1}/${session.stageCount}`}</span>
          <span className="ml-auto">{timeAgo(session.updatedAt)}</span>
        </div>
      </button>
      <SessionMenu session={session} state={state} act={act} />
    </div>
  );
}

export function Sidebar({
  state,
  activeId,
  collapsed,
  onToggleCollapse,
  onSelect,
  onNew,
  onRefresh,
  notify,
  mobileOpen = false,
  onMobileClose,
  onMobileOpen,
}: Props) {
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [creatingProject, setCreatingProject] = useState(false);
  const [projectName, setProjectName] = useState("");
  const isMobile = useMediaQuery("(max-width: 767px)");
  const panelRef = useRef<HTMLElement | null>(null);

  const drawerMode = isMobile && mobileOpen;

  // Escape closes the mobile drawer; opening moves focus into the panel.
  useEffect(() => {
    if (!drawerMode) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      onMobileClose?.();
    }
    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerMode, onMobileClose]);

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
      notify("error", error instanceof Error ? error.message : t("settings.toast.actionFailed"));
    }
  }

  function handleSelect(id: string) {
    onSelect(id);
    onMobileClose?.();
  }

  function handleNew() {
    onNew();
    onMobileClose?.();
  }

  const showRail = isMobile ? !drawerMode : collapsed;

  if (showRail) {
    return (
      <aside className="sidebar-rail flex w-14 shrink-0 flex-col items-center gap-3 border-r border-line bg-surface py-4">
        <button
          type="button"
          className="icon-btn"
          onClick={isMobile ? () => onMobileOpen?.() : onToggleCollapse}
          title={t("sidebar.expand")}
          aria-label={t("sidebar.expand")}
          aria-expanded={isMobile ? true : !collapsed}
        >
          <Icon name="menu" />
        </button>
        <button
          type="button"
          className="icon-btn bg-accent text-on-accent"
          onClick={handleNew}
          title={t("sidebar.newSessionShort")}
          aria-label={t("sidebar.newSessionShort")}
        >
          <Icon name="plus" />
        </button>
        <div className="mt-auto">
          <Link href="/settings" className="icon-btn" title={t("sidebar.settings")}>
            <Icon name="settings" />
          </Link>
        </div>
      </aside>
    );
  }

  return (
    <>
      <aside
        ref={panelRef}
        className="sidebar-panel flex w-72 shrink-0 flex-col border-r border-line bg-surface outline-none"
        data-drawer-open={drawerMode}
        tabIndex={-1}
      >
        <div className="flex items-center gap-2 px-3 py-3">
          <Link href="/" className="brand min-w-0" aria-label="Learning Studio">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-light.png" alt="" width={384} height={128} className="brand-logo brand-logo-sm" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-dark.png" alt="" width={384} height={128} className="brand-logo brand-logo-sm brand-logo-dark" />
          </Link>
          <button
            type="button"
            className="icon-btn ml-auto"
            onClick={isMobile ? onMobileClose : onToggleCollapse}
            title={t("sidebar.collapse")}
            aria-label={t("sidebar.collapse")}
          >
            <Icon name="chevronLeft" />
          </button>
        </div>

        <div className="space-y-2 px-3 pb-3">
          <button type="button" className="btn btn-primary w-full" onClick={handleNew}>
            <Icon name="plus" /> {t("sidebar.newSession")}
          </button>
          <input
            className="input"
            type="search"
            placeholder={t("sidebar.search")}
            aria-label={t("sidebar.search")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="label">{t("sidebar.projects")}</span>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setCreatingProject((value) => !value)}
              aria-expanded={creatingProject}
              aria-label={t("sidebar.projects.add")}
              title={t("sidebar.projects.add")}
            >
              <Icon name="plus" />
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
                placeholder={t("sidebar.projects.placeholder")}
                aria-label={t("sidebar.projects.placeholder")}
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
              />
              <button className="btn btn-xs" type="submit">
                {t("sidebar.projects.add")}
              </button>
            </form>
          ) : null}
          <div className="sidebar-section mb-3 space-y-0.5">
            <button
              type="button"
              className="sidebar-item"
              data-active={projectFilter === null}
              onClick={() => setProjectFilter(null)}
            >
              {t("sidebar.projects.all")} <span className="font-mono text-micro tabular-nums text-muted">({state.sessions.length})</span>
            </button>
            {state.projects.map((project) => {
              const count = state.sessions.filter((session) => session.projectId === project.id).length;
              return (
                <div key={project.id} className="group relative">
                  <button
                    type="button"
                    className="sidebar-item sidebar-item-session"
                    data-active={projectFilter === project.id}
                    onClick={() => setProjectFilter(projectFilter === project.id ? null : project.id)}
                  >
                    {project.name} <span className="font-mono text-micro tabular-nums text-muted">({count})</span>
                  </button>
                  <button
                    type="button"
                    className="icon-btn row-action absolute right-1 top-1"
                    onClick={async () => {
                      if (window.confirm(t("sidebar.project.deleteConfirm", { name: project.name }))) {
                        await act(() => api.deleteProject(project.id));
                        setProjectFilter(null);
                      }
                    }}
                    aria-label={`${t("sidebar.session.delete")}: ${project.name}`}
                  >
                    <Icon name="close" />
                  </button>
                </div>
              );
            })}
          </div>

          {pinned.length ? (
            <>
              <div className="sidebar-divider" />
              <div className="label mb-1">{t("sidebar.pinned")}</div>
              <div className="mb-3 space-y-0.5">
                {pinned.map((session) => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    state={state}
                    activeId={activeId}
                    onSelect={handleSelect}
                    act={act}
                  />
                ))}
              </div>
            </>
          ) : null}

          <div className="sidebar-divider" />
          <div className="label mb-1">{t("sidebar.history")}</div>
          <div className="space-y-0.5">
            {rest.length ? (
              rest.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  state={state}
                  activeId={activeId}
                  onSelect={handleSelect}
                  act={act}
                />
              ))
            ) : (
              <p className="px-1 py-4 text-xs leading-relaxed text-muted">
                {state.sessions.length ? t("sidebar.history.noMatch") : t("sidebar.history.empty")}
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-line p-3">
          <Link href="/settings" className="btn w-full justify-start" onClick={() => onMobileClose?.()}>
            <Icon name="settings" className="text-muted" />
            {t("sidebar.settings")}
          </Link>
          <p className="mt-2 px-1 text-micro leading-relaxed text-muted">
            {tPlural("sidebar.storedLocally", state.sessions.length)}
          </p>
        </div>
      </aside>
      {drawerMode ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label={t("sidebar.collapse")}
          onClick={() => onMobileClose?.()}
        />
      ) : null}
    </>
  );
}
