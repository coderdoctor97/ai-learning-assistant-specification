"use client";

import { useId, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";

/*
 * Disclosure primitive with full ARIA wiring: the trigger carries
 * aria-expanded + aria-controls, the panel is a labelled region.
 */
export function Collapsible({
  title,
  count,
  tone = "muted",
  children,
}: {
  title: string;
  count?: number;
  tone?: "muted" | "accent";
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <div className="fold">
      <button
        type="button"
        className="fold-head"
        data-tone={tone}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="fold-chevron" aria-hidden="true">
          <Icon name="chevronDown" className={open ? undefined : "-rotate-90"} />
        </span>
        <span>{title}</span>
        {typeof count === "number" ? <span className="chip ml-auto">{count}</span> : null}
      </button>
      {open ? (
        <div className="fold-body" id={panelId} role="region" aria-label={title}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
