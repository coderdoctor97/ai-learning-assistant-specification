"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { t } from "@/lib/i18n";
import { Icon } from "./Icon";
import { Tooltip } from "./Tooltip";

export type ToastItem = { id: number; kind: "error" | "info"; message: string };

const MAX_STACKED = 3;

/*
 * Shared feedback state — replaces the two duplicated single-toast layers.
 * The `notify(kind, message)` contract (signature, call sites, semantics) is
 * unchanged; only how feedback is held and rendered moves. Auto-dismiss
 * durations are configurable so each app keeps its current timings.
 */
export function useToastStack(durations: { error: number; info: number }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  /*
   * Callers pass the timings as an inline object, which would give `notify`
   * a new identity on every render and restart any effect that depends on
   * it (the studio's initial hydration spun forever on this). Key the
   * lookup by the primitive values so identity stays stable.
   */
  const timeouts = useMemo(
    () => ({ error: durations.error, info: durations.info }),
    [durations.error, durations.info],
  );

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (kind: ToastItem["kind"], message: string) => {
      const id = ++idRef.current;
      setToasts((current) => [...current.slice(-(MAX_STACKED - 1)), { id, kind, message }]);
      timers.current.set(id, setTimeout(() => dismiss(id), timeouts[kind]));
    },
    [timeouts, dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((timer) => clearTimeout(timer));
  }, []);

  return { toasts, notify, dismiss };
}

/*
 * The stacked presentation (Sonner geometry): bottom-centre column, spring
 * entrance, per-tone borders via the existing .toast[data-tone] tokens.
 */
export function ToastStack({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast card px-4 py-3 text-sm" data-tone={toast.kind}>
          <div className="flex items-start gap-3">
            <span className="toast-icon" aria-hidden="true">
              {toast.kind === "error" ? <Icon name="warn" /> : <Icon name="check" />}
            </span>
            <span className="leading-relaxed">{toast.message}</span>
            {/* [A11y & SVG Enhancement] Toast dismiss button with tooltip */}
            <Tooltip content="Dismiss notification" side="left">
              <button
                type="button"
                className="icon-btn ml-2"
                onClick={() => onDismiss(toast.id)}
                aria-label={t("studio.toast.dismiss")}
              >
                <Icon name="x" />
              </button>
            </Tooltip>
          </div>
        </div>
      ))}
    </div>
  );
}
