"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ConfirmSheet, RenameSheet } from "@/components/ui/ConfirmSheet";
import { Popover, handleMenuItemKeys, usePopover } from "@/components/ui/Popover";
import { MiniProgressBar } from "@/components/ui/ProgressBar";
import { Icon } from "@/components/ui/Icon";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/cn";
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
  onRename,
  onDeleteRequest,
}: {
  session: SessionSummary;
  state: AppState;
  act: Act;
  onRename: (session: SessionSummary) => void;
  onDeleteRequest: (session: SessionSummary) => void;
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
        onClick={() => {
          dismiss();
          onRename(session);
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
        onClick={() => {
          dismiss();
          onDeleteRequest(session);
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
  onRename,
  onDeleteRequest,
}: {
  session: SessionSummary;
  state: AppState;
  act: Act;
  onRename: (session: SessionSummary) => void;
  onDeleteRequest: (session: SessionSummary) => void;
}) {
  return (
    <Popover.Root>
      {/* [A11y & SVG Enhancement] Session row options trigger with accessible portal tooltip */}
      <Tooltip content="Session options (Pin, Rename, Delete)" side="left">
        <Popover.Trigger
          className="icon-btn row-action absolute right-1 top-1 z-20"
          hasPopup="menu"
          ariaLabel={t("sidebar.session.actions")}
          onClick={(event) => event.stopPropagation()}
        >
          <Icon name="moreHorizontal" />
        </Popover.Trigger>
      </Tooltip>
      <SessionMenuItems session={session} state={state} act={act} onRename={onRename} onDeleteRequest={onDeleteRequest} />
    </Popover.Root>
  );
}

function SessionRow({
  session,
  state,
  activeId,
  onSelect,
  act,
  onRename,
  onDeleteRequest,
}: {
  session: SessionSummary;
  state: AppState;
  activeId: string | null;
  onSelect: (id: string) => void;
  act: Act;
  onRename: (session: SessionSummary) => void;
  onDeleteRequest: (session: SessionSummary) => void;
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
            /* [A11y & SVG Enhancement] Pinned status star indicator with tooltip */
            <Tooltip content="Pinned session" side="right">
              <span className="text-accent" aria-label={t("sidebar.pinned")}>
                <Icon name="star" />
              </span>
            </Tooltip>
          ) : null}
          <span className="truncate">{session.title}</span>
        </div>
        <div className="mt-1 flex items-center gap-2 font-mono text-micro tabular-nums text-muted">
          <MiniProgressBar ratio={(done ? 100 : progress) / 100} />
          <span>{done ? t("sidebar.session.complete") : `${session.currentStage + 1}/${session.stageCount}`}</span>
          <span className="ml-auto">{timeAgo(session.updatedAt)}</span>
        </div>
      </button>
      <SessionMenu session={session} state={state} act={act} onRename={onRename} onDeleteRequest={onDeleteRequest} />
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
  /* In-design overlays (replace window.prompt / window.confirm). */
  const [renameTarget, setRenameTarget] = useState<SessionSummary | null>(null);
  const [deleteSessionTarget, setDeleteSessionTarget] = useState<SessionSummary | null>(null);
  const [deleteProjectTarget, setDeleteProjectTarget] = useState<{ id: string; name: string } | null>(null);
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
        {/* [A11y & SVG Enhancement] Rail expand toggle with portal tooltip */}
        <Tooltip content="Expand sidebar (⌘B)" side="right">
          <button
            type="button"
            className="icon-btn sidebar-collapse-btn"
            onClick={isMobile ? () => onMobileOpen?.() : onToggleCollapse}
            aria-label={t("sidebar.expand")}
            aria-expanded={isMobile ? true : !collapsed}
          >
            <Icon name="panelLeftOpen" />
          </button>
        </Tooltip>

        {/* [A11y & SVG Enhancement] Rail new session trigger with portal tooltip */}
        <Tooltip content="Create new learning session (⌘N)" side="right">
          <button
            type="button"
            className="icon-btn bg-accent text-on-accent"
            onClick={handleNew}
            aria-label={t("sidebar.newSessionShort")}
          >
            <Icon name="plusSquare" />
          </button>
        </Tooltip>

        <div className="mt-auto">
          {/* [A11y & SVG Enhancement] Rail settings link with portal tooltip */}
          <Tooltip content="Open app settings (⌘,)" side="right">
            <Link href="/settings" className="icon-btn" aria-label={t("sidebar.settings")}>
              <Icon name="settings" />
            </Link>
          </Tooltip>
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
          {/* [A11y & SVG Enhancement] Sidebar collapse trigger with tooltip */}
          <Tooltip content="Collapse sidebar (⌘B)" side="left">
            <button
              type="button"
              className="icon-btn sidebar-collapse-btn ml-auto"
              onClick={isMobile ? onMobileClose : onToggleCollapse}
              aria-label={t("sidebar.collapse")}
            >
              <Icon name="panelLeftClose" />
            </button>
          </Tooltip>
        </div>

        <div className="space-y-2 px-3 pb-3">
          {/* [A11y & SVG Enhancement] Primary New Session button with leading SVG icon and tooltip */}
          <Tooltip content="Start new session with custom topic (⌘N)" side="bottom">
            <button type="button" className={cn("btn btn-primary w-full inline-flex items-center justify-center gap-2")} onClick={handleNew}>
              <Icon name="plus" className="shrink-0" /> {t("sidebar.newSession")}
            </button>
          </Tooltip>
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
            {/* [A11y & SVG Enhancement] Add project button with tooltip */}
            <Tooltip content="Create a new project folder" side="right">
              <button
                type="button"
                className="icon-btn"
                onClick={() => setCreatingProject((value) => !value)}
                aria-expanded={creatingProject}
                aria-label={t("sidebar.projects.add")}
              >
                <Icon name="folderPlus" />
              </button>
            </Tooltip>
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
                  {/* [A11y & SVG Enhancement] Delete project action with trash icon and tooltip */}
                  <Tooltip content={`Delete project ${project.name}`} side="left">
                    <button
                      type="button"
                      className="icon-btn row-action absolute right-1 top-1"
                      onClick={() => setDeleteProjectTarget({ id: project.id, name: project.name })}
                      aria-label={`${t("sidebar.session.delete")}: ${project.name}`}
                    >
                      <Icon name="trash2" />
                    </button>
                  </Tooltip>
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
                    onRename={setRenameTarget}
                    onDeleteRequest={setDeleteSessionTarget}
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
                  onRename={setRenameTarget}
                  onDeleteRequest={setDeleteSessionTarget}
                />
              ))
            ) : (
              <div className="empty-state" role="status">
                <span className="empty-state-icon">
                  <Icon name={state.sessions.length ? "search" : "study"} />
                </span>
                <p className="text-xs leading-relaxed">
                  {state.sessions.length ? t("sidebar.history.noMatch") : t("sidebar.history.empty")}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-line p-3">
          <Link href="/settings" className="btn w-full justify-start inline-flex items-center gap-2" onClick={() => onMobileClose?.()}>
            <Icon name="settings" className="text-muted shrink-0" />
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

      <RenameSheet
        open={renameTarget !== null}
        onClose={() => setRenameTarget(null)}
        title={t("sidebar.session.renamePrompt")}
        initial={renameTarget?.title ?? ""}
        onRename={async (value) => {
          if (!renameTarget) return;
          await act(() => api.patchSession(renameTarget.id, { title: value }));
        }}
      />
      <ConfirmSheet
        open={deleteSessionTarget !== null}
        onClose={() => setDeleteSessionTarget(null)}
        title={t("sidebar.session.delete")}
        body={t("sidebar.session.deleteConfirm", { title: deleteSessionTarget?.title ?? "" })}
        confirmLabel={t("sidebar.session.delete")}
        onConfirm={async () => {
          if (!deleteSessionTarget) return;
          await act(() => api.deleteSession(deleteSessionTarget.id), t("sidebar.session.deleted"));
        }}
      />
      <ConfirmSheet
        open={deleteProjectTarget !== null}
        onClose={() => setDeleteProjectTarget(null)}
        title={t("sidebar.session.delete")}
        body={t("sidebar.project.deleteConfirm", { name: deleteProjectTarget?.name ?? "" })}
        confirmLabel={t("sidebar.session.delete")}
        onConfirm={async () => {
          if (!deleteProjectTarget) return;
          await act(() => api.deleteProject(deleteProjectTarget.id));
          setProjectFilter(null);
        }}
      />
    </>
  );
}
