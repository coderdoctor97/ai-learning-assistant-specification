"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

/*
 * Modal dialog / mobile bottom-sheet primitive (W3C ARIA APG dialog pattern):
 *   • renders nothing while closed (SSR-safe, mirrors the Popover family)
 *   • focus moves in on open, is trapped with Tab/Shift+Tab, Escape closes
 *   • focus returns to the invoking element on close
 *   • body scroll is locked while open
 *   • ≤767px it presents as a bottom sheet (Vaul geometry in globals.css)
 *
 * Usage:
 *   <Dialog open={open} onClose={close} label="Rename session" tone="danger">
 *     <DialogTitle>Rename session</DialogTitle>
 *     <DialogBody>…</DialogBody>
 *     <DialogActions>…</DialogActions>
 *   </Dialog>
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type DialogProps = {
  open: boolean;
  onClose: () => void;
  /** Accessible name when no DialogTitle is registered. */
  label: string;
  /** "danger" renders role="alertdialog" for confirmations. */
  tone?: "default" | "danger";
  children: ReactNode;
};

type DialogContextValue = { titleId: string; registerTitle: (present: boolean) => void };

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialogContext(): DialogContextValue {
  const context = useContext(DialogContext);
  if (!context) throw new Error("DialogTitle/Body/Actions must be used inside <Dialog>");
  return context;
}

export function Dialog({ open, onClose, label, tone = "default", children }: DialogProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const [hasTitle, setHasTitle] = useState(false);
  const previousFocus = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const registerTitle = useCallback((present: boolean) => setHasTitle(present), []);

  // On open: remember the invoker, move focus in, lock body scroll.
  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    if (panel) {
      const first = panel.querySelector<HTMLElement>("input, textarea, select");
      (first ?? panel).focus();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus.current?.focus();
    };
  }, [open]);

  // While open: Escape closes, Tab cycles inside the panel (focus trap).
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open]);

  if (!open) return null;

  return (
    <>
      <button type="button" className="dialog-backdrop" aria-hidden="true" tabIndex={-1} onClick={onClose} />
      <div className="dialog-viewport">
        <div
          ref={panelRef}
          className={cn("dialog-surface")}
          role={tone === "danger" ? "alertdialog" : "dialog"}
          aria-modal="true"
          aria-labelledby={hasTitle ? titleId : undefined}
          aria-label={hasTitle ? undefined : label}
          tabIndex={-1}
        >
          <span className="dialog-handle" aria-hidden="true" />
          <DialogContext.Provider value={{ titleId, registerTitle }}>{children}</DialogContext.Provider>
        </div>
      </div>
    </>
  );
}

export function DialogTitle({ children }: { children: ReactNode }) {
  const { titleId, registerTitle } = useDialogContext();
  useEffect(() => {
    registerTitle(true);
    return () => registerTitle(false);
  }, [registerTitle]);
  return (
    <h2 id={titleId} className="dialog-title">
      {children}
    </h2>
  );
}

export function DialogBody({ children }: { children: ReactNode }) {
  return <div className="dialog-body">{children}</div>;
}

export function DialogActions({ children }: { children: ReactNode }) {
  return <div className="dialog-actions">{children}</div>;
}
