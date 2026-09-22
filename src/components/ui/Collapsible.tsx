"use client";

import { useId, useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

/*
 * Disclosure primitive with full ARIA wiring: the trigger carries
 * aria-expanded + aria-controls, the panel is a labelled region.
 */
export function Collapsible({
  title,
  count,
  tone = "muted",
  icon,
  children,
}: {
  title: string;
  count?: number;
  tone?: "muted" | "accent";
  icon?: IconName;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const categoryIcon: IconName =
    icon ??
    (tone === "accent" ? "brain" : typeof count === "number" ? "bookOpen" : "activity");

  return (
    <div className="fold">
      {/* [A11y & SVG Enhancement] Collapsible header with category icon and rotating chevron */}
      <button
        type="button"
        className="fold-head flex items-center gap-2"
        data-tone={tone}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="fold-chevron" aria-hidden="true">
          <Icon name="chevronDown" className={cn("transition-transform duration-200", open ? "rotate-0" : "-rotate-90")} />
        </span>
        <Icon name={categoryIcon} className="w-4 h-4 shrink-0 text-muted" />
        <span className="font-medium">{title}</span>
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
