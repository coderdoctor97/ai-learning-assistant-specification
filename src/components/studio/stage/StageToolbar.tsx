"use client";

import { t } from "@/lib/i18n";
import { Icon } from "@/components/ui/Icon";
import { Tooltip } from "@/components/ui/Tooltip";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { SessionDetail } from "@/lib/client/api";

/*
 * Stage metadata, progression rail and progress controls. Roving keyboard
 * support: exactly one step pill is a Tab stop (the active one — with
 * aria-current="step"); ←/→/Home/End move focus across reachable pills
 * without switching stages, Enter/Space activates.
 */
export function StageToolbar({
  detail,
  stageIndex,
  onStageIndex,
  busy,
}: {
  detail: SessionDetail;
  stageIndex: number;
  onStageIndex: (index: number) => void;
  busy: boolean;
}) {
  const { session, stages } = detail;
  const steps = session.configSteps;
  const generatedCount = stages.filter((entry) => entry.content.trim().length > 0).length;
  const progress = steps.length ? generatedCount / steps.length : 0;

  function handleRailKeys(event: React.KeyboardEvent<HTMLDivElement>) {
    const pills = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(".step-pill:not(:disabled)"),
    );
    if (!pills.length) return;
    const current = pills.indexOf(document.activeElement as HTMLButtonElement);
    let next: number;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = current === -1 ? 0 : (current + 1) % pills.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = current <= 0 ? pills.length - 1 : current - 1;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = pills.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    pills[next]?.focus();
  }

  return (
    <div className="studio-header px-4 py-3 sm:px-6 sm:py-3.5">
      <div className="header-meta min-w-0">
        <h1 className="header-title title-page min-w-0 truncate sm:whitespace-normal" title={session.title}>
          {session.title}
        </h1>
        <span className="chip">{session.configName}</span>
        {session.dynamicAgent ? <span className="chip chip-on">{t("stage.agentChip")}</span> : null}
        {session.status === "completed" ? <span className="chip chip-on">{t("stage.completeChip")}</span> : null}
      </div>

      <div
        className="stage-rail mt-3"
        role="group"
        aria-label={t("stage.rail.label")}
        onKeyDown={handleRailKeys}
      >
        {steps.map((entry, index) => {
          const generated = stages.some((row) => row.index === index && row.content.trim().length > 0);
          const reachable = generated || index === generatedCount || index <= session.currentStage + 1;
          const active = index === stageIndex;
          return (
            /* [A11y & SVG Enhancement] Step pill wrapped in Portal Tooltip with SVG check icon */
            <Tooltip
              key={entry.id + index}
              content={`Stage ${index + 1}: ${entry.title} — ${entry.instructions}`}
              side="bottom"
              strategy="portal"
            >
              <button
                type="button"
                disabled={!reachable || busy}
                onClick={() => onStageIndex(index)}
                className="step-pill disabled:opacity-disabled"
                data-active={active}
                data-generated={generated}
                aria-current={active ? "step" : undefined}
                tabIndex={active ? 0 : -1}
              >
                <span className="step-dot inline-flex items-center justify-center" data-generated={generated} aria-hidden="true">
                  {generated ? <Icon name="check" className="w-3 h-3" /> : index + 1}
                </span>
                <span className="step-pill-label">{entry.title}</span>
              </button>
            </Tooltip>
          );
        })}
      </div>

      <div className="mt-2 flex min-w-0 items-center gap-3">
        <ProgressBar
          ratio={progress}
          label={t("stage.progress", { done: generatedCount, total: steps.length })}
        />
        <span className="font-mono text-micro tabular-nums text-muted" aria-hidden="true">
          {t("stage.progress", { done: generatedCount, total: steps.length })}
        </span>
      </div>
    </div>
  );
}
