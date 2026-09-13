"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Markdown } from "@/components/Markdown";
import { Collapsible } from "@/components/ui/Collapsible";
import { t } from "@/lib/i18n";
import type { Capabilities, SessionDetail } from "@/lib/client/api";
import { AttachmentRow } from "./stage/AttachmentRow";
import { ComposerForm } from "./stage/Composer";
import { ExportBar } from "./stage/ExportBar";
import { QaThread } from "./stage/QaThread";
import { ResourceList } from "./stage/ResourceList";
import { StageMeta } from "./stage/StageMeta";
import { StageToolbar } from "./stage/StageToolbar";
import type { RunState } from "./stage/types";

export type { RunState } from "./stage/types";
export type { StageRow } from "@/lib/client/api";

type Props = {
  detail: SessionDetail;
  stageIndex: number;
  onStageIndex: (index: number) => void;
  run: RunState | null;
  capabilities: Capabilities;
  reasoningEnabled: boolean;
  agentOn: boolean;
  onGenerate: (index: number, modifier: "none" | "longer" | "shorter" | "deeper") => Promise<void>;
  onAsk: (stageId: string, question: string) => Promise<void>;
  onEditStep: (index: number, title: string, instructions: string) => Promise<void>;
  onUpload: (file: File) => Promise<void>;
  onDeleteAttachment: (id: string) => Promise<void>;
  notify: (kind: "error" | "info", message: string) => void;
};

/*
 * Stage deck orchestrator. Focused compound components live in ./stage/:
 *   StageToolbar — session metadata, progression rail, progress
 *   StageMeta    — stage toolbar + inline prompt editor
 *   QaThread     — conversation display with exit transitions
 *   Composer     — text entry, submission, shortcuts
 *   AttachmentRow— file chips
 *   ExportBar    — post-completion export panel
 * All props and callbacks are passed through verbatim.
 */
export function StageDeck({
  detail,
  stageIndex,
  onStageIndex,
  run,
  capabilities,
  reasoningEnabled,
  onGenerate,
  onAsk,
  onEditStep,
  onUpload,
  onDeleteAttachment,
  notify,
}: Props) {
  const { session, stages, messages, attachments } = detail;
  const steps = session.configSteps;
  const step = steps[stageIndex];
  const stage = stages.find((entry) => entry.index === stageIndex) ?? null;
  const streamingHere = run?.mode === "stage" && run.stageIndex === stageIndex;
  const busy = run !== null;

  const [question, setQuestion] = useState("");
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [stageIndex]);

  const stageMessages = useMemo(
    () => (stage ? messages.filter((message) => message.stageId === stage.id) : []),
    [messages, stage],
  );

  const generatedCount = stages.filter((entry) => entry.content.trim().length > 0).length;
  const canGoNext = stageIndex < steps.length - 1;
  const nextIsGenerated = stages.some((entry) => entry.index === stageIndex + 1 && entry.content.trim().length > 0);
  const deeperAvailable = capabilities.reasoning && reasoningEnabled;

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      notify("info", t("studio.toast.clipboard"));
    } catch {
      notify("error", t("studio.toast.clipboardUnavailable"));
    }
  }

  const stageBody = streamingHere ? run.text : (stage?.content ?? "");
  const stageResources = streamingHere && run.resources.length ? run.resources : (stage?.resources ?? []);
  const stageReasoning = streamingHere ? run.reasoning : (stage?.reasoning ?? "");
  const askedCount = stageMessages.filter((message) => message.role === "user").length;
  /* Prompt editor remounts (fresh drafts, closed panel) whenever the stage
     or its step definition changes — see StageMeta. */
  const promptKey = `${stageIndex}:${step?.title ?? ""}:${step?.instructions ?? ""}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Session header --------------------------------------------------- */}
      <StageToolbar detail={detail} stageIndex={stageIndex} onStageIndex={onStageIndex} busy={busy} />

      {/* Stage body ------------------------------------------------------- */}
      <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-3xl">
          <div key={stageIndex} className="stage-swap">
            <div className="card stage-card" aria-busy={streamingHere}>
              <StageMeta
                key={promptKey}
                step={step}
                stageIndex={stageIndex}
                stepsTotal={steps.length}
                busy={busy}
                onEditStep={onEditStep}
                onGenerate={onGenerate}
              />

              <div className="stage-body sm:p-8">
                {streamingHere && !run.text ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-muted" role="status" aria-live="polite">
                      <span className="dot-pulse flex gap-1" aria-hidden="true">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
                      </span>
                      {run.status || t("studio.status.working")}
                    </div>
                    <div className="skeleton h-4 w-3/4" />
                    <div className="skeleton h-4 w-full" />
                    <div className="skeleton h-4 w-5/6" />
                    <div className="skeleton h-24 w-full" />
                  </div>
                ) : stageBody ? (
                  <>
                    {streamingHere ? (
                      <div className="mb-3 flex items-center gap-2 text-micro text-muted" role="status" aria-live="polite">
                        <span className="status-dot" aria-hidden="true" />
                        {run.status || t("studio.status.composing")}
                      </div>
                    ) : null}
                    <Markdown>{stageBody}</Markdown>
                    {streamingHere ? <span className="caret" /> : null}
                  </>
                ) : (
                  <div className="py-12 text-center">
                    <p className="mx-auto max-w-md text-sm leading-relaxed text-muted text-pretty">
                      {stageIndex === 0 ? t("stage.emptyFirst") : t("stage.emptyRest")}
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary mt-4"
                      disabled={busy}
                      onClick={() => onGenerate(stageIndex, "none")}
                    >
                      {stageIndex === 0 ? t("stage.begin") : t("stage.generate", { index: stageIndex + 1 })}
                    </button>
                  </div>
                )}
              </div>

              {stage && !streamingHere ? (
                <div className="stage-footer">
                  <button type="button" className="btn btn-xs" onClick={() => copy(stage.content)}>
                    {t("stage.copy")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-xs"
                    disabled={busy}
                    onClick={() => onGenerate(stageIndex, "none")}
                  >
                    {t("stage.regenerate")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-xs"
                    disabled={busy}
                    onClick={() => onGenerate(stageIndex, "longer")}
                  >
                    {t("stage.longer")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-xs"
                    disabled={busy}
                    onClick={() => onGenerate(stageIndex, "shorter")}
                  >
                    {t("stage.shorter")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-xs"
                    disabled={busy || !deeperAvailable}
                    title={
                      deeperAvailable ? t("stage.deeperTitle") : t("stage.deeperUnavailableTitle")
                    }
                    onClick={() => onGenerate(stageIndex, "deeper")}
                  >
                    {t("stage.deeper")}
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {/* Reasoning + resources ------------------------------------------ */}
          <div className="mt-3 space-y-2">
            {reasoningEnabled ? (
              <Collapsible title={t("stage.reasoning.title")} tone="accent">
                {stageReasoning ? (
                  <pre className="max-h-72 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-muted">
                    {stageReasoning}
                  </pre>
                ) : (
                  <p className="text-xs leading-relaxed text-muted">{t("stage.reasoning.empty")}</p>
                )}
              </Collapsible>
            ) : null}

            <Collapsible title={t("stage.sources.title")} count={stageResources.length}>
              <ResourceList resources={stageResources} />
            </Collapsible>

            <Collapsible title={t("stage.state.title")} tone="muted">
              <div className="grid gap-3 text-xs sm:grid-cols-2">
                <div>
                  <div className="label">{t("stage.state.understanding")}</div>
                  <p className="mt-1 text-muted">
                    {session.learningState.understanding || t("stage.state.notAssessed")}
                  </p>
                  {session.learningState.nextFocus ? (
                    <>
                      <div className="label mt-3">{t("stage.state.nextFocus")}</div>
                      <p className="mt-1 text-muted">{session.learningState.nextFocus}</p>
                    </>
                  ) : null}
                </div>
                <div className="space-y-3">
                  {(
                    [
                      [t("stage.state.mastered"), session.learningState.mastered],
                      [t("stage.state.gaps"), session.learningState.gaps],
                      [t("stage.state.misconceptions"), session.learningState.misconceptions],
                    ] as [string, string[]][]
                  ).map(([label, values]) =>
                    values.length ? (
                      <div key={label}>
                        <div className="label">{label}</div>
                        <ul className="mt-1 list-disc pl-4 text-muted">
                          {values.map((value) => (
                            <li key={value}>{value}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null,
                  )}
                  {session.learningState.checkpoints.length ? (
                    <div>
                      <div className="label">{t("stage.state.milestones")}</div>
                      <ul className="mt-1 space-y-0.5 text-muted">
                        {session.learningState.checkpoints.map((checkpoint) => (
                          <li key={checkpoint.label}>
                            <span className="text-accent" aria-hidden="true">
                              {checkpoint.done ? "✓" : "○"}
                            </span>{" "}
                            {checkpoint.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {session.learningState.agentNotes.length ? (
                    <div>
                      <div className="label">{t("stage.state.agentActions")}</div>
                      <ul className="mt-1 list-disc pl-4 text-muted">
                        {session.learningState.agentNotes.slice(-5).map((note) => (
                          <li key={note}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
            </Collapsible>
          </div>

          {/* Stage Q&A -------------------------------------------------------- */}
          {stage ? (
            <section className="mt-8" aria-label={t("stage.qa.heading")}>
              <div className="mb-3 flex items-center gap-2">
                <h3 className="font-serif text-base tracking-tight">{t("stage.qa.heading")}</h3>
                <span className="chip">{t("stage.qa.asked", { count: askedCount })}</span>
              </div>

              <div aria-busy={qaStreamingActive(run, stageIndex)}>
                <QaThread
                  stageId={stage.id}
                  stageIndex={stageIndex}
                  stageMessages={stageMessages}
                  run={run}
                  busy={busy}
                  onCopy={(text) => void copy(text)}
                  onAsk={onAsk}
                  onEditQuestion={setQuestion}
                />
              </div>

              <ComposerForm
                value={question}
                onValueChange={setQuestion}
                busy={busy}
                placeholder={t("stage.qa.placeholder")}
                onSubmit={(value) => onAsk(stage.id, value)}
              />

              {/* Attachments */}
              <AttachmentRow
                attachments={attachments}
                busy={busy}
                visionAvailable={capabilities.vision}
                onUpload={onUpload}
                onDeleteAttachment={onDeleteAttachment}
              />
            </section>
          ) : null}

          {session.status === "completed" ? <ExportBar sessionId={session.id} /> : null}

          <div className="h-10" />
        </div>
      </div>

      {/* Navigation ------------------------------------------------------- */}
      <div className="nav-bar flex items-center gap-2 px-6 py-3.5">
        <button
          type="button"
          className="btn"
          disabled={stageIndex === 0 || busy}
          onClick={() => onStageIndex(Math.max(0, stageIndex - 1))}
        >
          {t("stage.nav.previous")}
        </button>
        <div className="mx-auto text-center text-xs text-muted">
          {step?.title}
          {session.status === "completed" ? t("stage.nav.completeSuffix") : ""}
        </div>
        {canGoNext ? (
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !stage}
            onClick={async () => {
              const next = stageIndex + 1;
              onStageIndex(next);
              if (!nextIsGenerated) await onGenerate(next, "none");
            }}
          >
            {nextIsGenerated ? t("stage.nav.next") : t("stage.nav.generateNext")}
          </button>
        ) : (
          <span className="chip chip-on">{t("stage.nav.final")}</span>
        )}
      </div>
    </div>
  );
}

function qaStreamingActive(run: RunState | null, stageIndex: number): boolean {
  return run?.mode === "qa" && run.stageIndex === stageIndex;
}
