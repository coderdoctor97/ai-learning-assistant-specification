"use client";

import { useState } from "react";
import { t } from "@/lib/i18n";
import { Icon } from "@/components/ui/Icon";
import type { LearningStep } from "@/lib/client/api";

type Props = {
  step: LearningStep | undefined;
  stageIndex: number;
  stepsTotal: number;
  busy: boolean;
  onEditStep: (index: number, title: string, instructions: string) => Promise<void>;
  onGenerate: (index: number, modifier: "none" | "longer" | "shorter" | "deeper") => Promise<void>;
};

/*
 * Stage-card toolbar (metadata + ✎ Edit prompt) and the inline prompt
 * editor. The parent keys this component on
 * `${stageIndex}:${title}:${instructions}`, so a stage or step change
 * remounts with fresh draft state and a closed editor — the exact reset
 * semantics the previous sync-effect provided, with no cascading render.
 */
export function StageMeta({ step, stageIndex, stepsTotal, busy, onEditStep, onGenerate }: Props) {
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(step?.title ?? "");
  const [draftInstructions, setDraftInstructions] = useState(step?.instructions ?? "");

  return (
    <>
      <div className="stage-toolbar">
        <span className="label">{t("stage.label", { index: stageIndex + 1, total: stepsTotal })}</span>
        <h2 className="min-w-0 truncate text-lg font-medium tracking-tight sm:text-xl" title={step?.title}>
          {step?.title}
        </h2>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            aria-expanded={editing}
            onClick={() => setEditing((value) => !value)}
            disabled={busy}
          >
            <Icon name="pencil" />
            {t("stage.editPrompt")}
          </button>
        </div>
      </div>

      {editing ? (
        <div className="stage-editor">
          <label className="label block" htmlFor={`step-title-${stageIndex}`}>
            {t("stage.editTitle")}
          </label>
          <input
            id={`step-title-${stageIndex}`}
            className="input"
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
          />
          <label className="label block" htmlFor={`step-instructions-${stageIndex}`}>
            {t("stage.editInstructions")}
          </label>
          <textarea
            id={`step-instructions-${stageIndex}`}
            className="textarea"
            rows={4}
            value={draftInstructions}
            onChange={(event) => setDraftInstructions(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary btn-xs"
              onClick={async () => {
                await onEditStep(stageIndex, draftTitle, draftInstructions);
                setEditing(false);
                await onGenerate(stageIndex, "none");
              }}
            >
              {t("stage.saveRegenerate")}
            </button>
            <button
              type="button"
              className="btn btn-xs"
              onClick={async () => {
                await onEditStep(stageIndex, draftTitle, draftInstructions);
                setEditing(false);
              }}
            >
              {t("stage.saveOnly")}
            </button>
            <button type="button" className="btn btn-ghost btn-xs" onClick={() => setEditing(false)}>
              {t("stage.cancel")}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
