"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Markdown } from "@/components/Markdown";
import type { Capabilities, ResourceRef, SessionDetail, StageRow } from "@/lib/client/api";

export type RunState = {
  mode: "stage" | "qa";
  stageIndex: number;
  status: string;
  text: string;
  reasoning: string;
  resources: ResourceRef[];
};

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

function Collapsible({
  title,
  count,
  children,
  tone = "muted",
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
  tone?: "muted" | "accent";
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-line bg-surface2/60">
      <button
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium"
        onClick={() => setOpen((value) => !value)}
        style={{ color: tone === "accent" ? "var(--accent)" : "var(--muted)" }}
      >
        <span>{open ? "▾" : "▸"}</span>
        <span>{title}</span>
        {typeof count === "number" ? <span className="chip">{count}</span> : null}
      </button>
      {open ? <div className="border-t border-line px-3 py-2.5">{children}</div> : null}
    </div>
  );
}

function ResourceList({ resources }: { resources: ResourceRef[] }) {
  if (!resources.length) return <p className="text-xs text-muted">No external sources were used for this stage.</p>;
  return (
    <ul className="space-y-2">
      {resources.map((resource) => (
        <li key={resource.id} className="text-xs leading-relaxed">
          <a href={resource.url} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline underline-offset-2">
            {resource.title}
          </a>
          <div className="text-muted">
            {resource.source} · {resource.type}
            {resource.retrievedAt ? ` · retrieved ${new Date(resource.retrievedAt).toLocaleString()}` : ""}
          </div>
          {resource.snippet ? <p className="mt-1 line-clamp-3 text-muted">{resource.snippet}</p> : null}
        </li>
      ))}
    </ul>
  );
}

function ExportBar({ sessionId }: { sessionId: string }) {
  const formats: [string, string][] = [
    ["md", "Markdown"],
    ["zip", "Markdown + images"],
    ["docx", "Word (.docx)"],
    ["pdf", "PDF (print)"],
    ["html", "HTML"],
    ["txt", "Plain text"],
  ];
  return (
    <div className="card animate-rise mt-6 p-4">
      <div className="flex items-center gap-2">
        <span className="chip chip-on">sequence complete</span>
        <h3 className="font-serif text-base">Export your study document</h3>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-muted">
        Every stage, plus the questions you asked along the way, compiled into one clean document. Internal prompts,
        provider details and runtime metadata are never included.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {formats.map(([format, label]) => (
          <a
            key={format}
            className="btn btn-xs"
            href={`/api/sessions/${sessionId}/export?format=${format}`}
            target={format === "pdf" ? "_blank" : undefined}
            rel="noreferrer"
          >
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}

export function StageDeck({
  detail,
  stageIndex,
  onStageIndex,
  run,
  capabilities,
  reasoningEnabled,
  agentOn,
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
  const qaStreaming = run?.mode === "qa" && run.stageIndex === stageIndex;
  const busy = run !== null;

  const [question, setQuestion] = useState("");
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(step?.title ?? "");
  const [draftInstructions, setDraftInstructions] = useState(step?.instructions ?? "");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDraftTitle(step?.title ?? "");
    setDraftInstructions(step?.instructions ?? "");
    setEditing(false);
  }, [step?.title, step?.instructions, stageIndex]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [stageIndex]);

  const stageMessages = useMemo(
    () => (stage ? messages.filter((message) => message.stageId === stage.id) : []),
    [messages, stage],
  );

  const generatedCount = stages.filter((entry) => entry.content.trim().length > 0).length;
  const progress = Math.round((generatedCount / steps.length) * 100);
  const canGoNext = stageIndex < steps.length - 1;
  const nextIsGenerated = stages.some((entry) => entry.index === stageIndex + 1 && entry.content.trim().length > 0);
  const deeperAvailable = capabilities.reasoning && reasoningEnabled;

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      notify("info", "Copied to clipboard.");
    } catch {
      notify("error", "Clipboard is not available in this browser.");
    }
  }

  const stageBody = streamingHere ? run.text : (stage?.content ?? "");
  const stageResources = streamingHere && run.resources.length ? run.resources : (stage?.resources ?? []);
  const stageReasoning = streamingHere ? run.reasoning : (stage?.reasoning ?? "");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Session header --------------------------------------------------- */}
      <div className="border-b border-line bg-surface px-6 py-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="font-serif text-xl leading-tight">{session.title}</h1>
          <span className="chip">{session.configName}</span>
          {agentOn ? <span className="chip chip-on">⚡ dynamic agent</span> : null}
          {session.status === "completed" ? <span className="chip chip-on">complete</span> : null}
        </div>

        <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1">
          {steps.map((entry, index) => {
            const generated = stages.some((row) => row.index === index && row.content.trim().length > 0);
            const reachable = generated || index === generatedCount || index <= session.currentStage + 1;
            const active = index === stageIndex;
            return (
              <button
                key={entry.id + index}
                disabled={!reachable || busy}
                onClick={() => onStageIndex(index)}
                className="group flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.7rem] transition disabled:opacity-40"
                style={{
                  borderColor: active ? "var(--accent)" : "var(--border)",
                  background: active ? "var(--accent-soft)" : generated ? "var(--surface2)" : "transparent",
                  color: active ? "var(--accent)" : generated ? "var(--text)" : "var(--muted)",
                }}
                title={entry.instructions}
              >
                <span
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[0.6rem]"
                  style={{
                    background: generated ? "var(--accent)" : "var(--border)",
                    color: generated ? "#fff" : "var(--muted)",
                  }}
                >
                  {generated ? "✓" : index + 1}
                </span>
                <span className="max-w-[9rem] truncate">{entry.title}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-1.5 flex items-center gap-3">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface2">
            <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-[0.7rem] text-muted">
            {generatedCount}/{steps.length} stages
          </span>
        </div>
      </div>

      {/* Stage body ------------------------------------------------------- */}
      <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-3xl">
          <div className="card animate-rise overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface2/50 px-5 py-2.5">
              <span className="label">
                Stage {stageIndex + 1} / {steps.length}
              </span>
              <h2 className="font-serif text-base">{step?.title}</h2>
              <div className="ml-auto flex items-center gap-1">
                <button className="btn btn-ghost btn-xs" onClick={() => setEditing((value) => !value)} disabled={busy}>
                  ✎ Edit prompt
                </button>
              </div>
            </div>

            {editing ? (
              <div className="space-y-2 border-b border-line bg-surface2/30 px-5 py-3">
                <input className="input" value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} />
                <textarea
                  className="textarea"
                  rows={4}
                  value={draftInstructions}
                  onChange={(event) => setDraftInstructions(event.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    className="btn btn-primary btn-xs"
                    onClick={async () => {
                      await onEditStep(stageIndex, draftTitle, draftInstructions);
                      setEditing(false);
                      await onGenerate(stageIndex, "none");
                    }}
                  >
                    Save &amp; regenerate
                  </button>
                  <button
                    className="btn btn-xs"
                    onClick={async () => {
                      await onEditStep(stageIndex, draftTitle, draftInstructions);
                      setEditing(false);
                    }}
                  >
                    Save only
                  </button>
                  <button className="btn btn-ghost btn-xs" onClick={() => setEditing(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            <div className="px-5 py-5 sm:px-7 sm:py-6">
              {streamingHere && !run.text ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span className="dot-pulse flex gap-1">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
                    </span>
                    {run.status || "Working…"}
                  </div>
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-4 w-full" />
                  <div className="skeleton h-4 w-5/6" />
                  <div className="skeleton h-24 w-full" />
                </div>
              ) : stageBody ? (
                <>
                  {streamingHere ? (
                    <div className="mb-3 flex items-center gap-2 text-[0.7rem] text-muted">
                      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                      {run.status || "Composing…"}
                    </div>
                  ) : null}
                  <Markdown>{stageBody}</Markdown>
                  {streamingHere ? <span className="caret" /> : null}
                </>
              ) : (
                <div className="py-10 text-center">
                  <p className="mx-auto max-w-md text-sm leading-relaxed text-muted">
                    {stageIndex === 0
                      ? "Ready when you are. The engine will open the session with this stage — nothing is generated in advance."
                      : "This stage has not been generated yet. Stages are produced on demand, one at a time."}
                  </p>
                  <button className="btn btn-primary mt-4" disabled={busy} onClick={() => onGenerate(stageIndex, "none")}>
                    {stageIndex === 0 ? "Begin stage 1" : `Generate stage ${stageIndex + 1}`}
                  </button>
                </div>
              )}
            </div>

            {stage && !streamingHere ? (
              <div className="flex flex-wrap items-center gap-1.5 border-t border-line bg-surface2/40 px-5 py-2.5">
                <button className="btn btn-xs" onClick={() => copy(stage.content)}>
                  ⧉ Copy
                </button>
                <button className="btn btn-xs" disabled={busy} onClick={() => onGenerate(stageIndex, "none")}>
                  ↻ Regenerate
                </button>
                <button className="btn btn-xs" disabled={busy} onClick={() => onGenerate(stageIndex, "longer")}>
                  ＋ Longer
                </button>
                <button className="btn btn-xs" disabled={busy} onClick={() => onGenerate(stageIndex, "shorter")}>
                  − Shorter
                </button>
                <button
                  className="btn btn-xs"
                  disabled={busy || !deeperAvailable}
                  title={
                    deeperAvailable
                      ? "Regenerate with deeper reasoning"
                      : "Deeper needs a reasoning-capable model with reasoning switched on"
                  }
                  onClick={() => onGenerate(stageIndex, "deeper")}
                >
                  ⌄ Deeper
                </button>
              </div>
            ) : null}
          </div>

          {/* Reasoning + resources ------------------------------------------ */}
          <div className="mt-3 space-y-2">
            {reasoningEnabled ? (
              <Collapsible title="Model reasoning" tone="accent">
                {stageReasoning ? (
                  <pre className="max-h-72 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-muted">
                    {stageReasoning}
                  </pre>
                ) : (
                  <p className="text-xs leading-relaxed text-muted">
                    This model did not return a reasoning trace for this stage. Nothing is invented here — if the
                    provider does not expose reasoning, none is shown.
                  </p>
                )}
              </Collapsible>
            ) : null}

            <Collapsible title="Sources used" count={stageResources.length}>
              <ResourceList resources={stageResources} />
            </Collapsible>

            <Collapsible title="Learning state" tone="muted">
              <div className="grid gap-3 text-xs sm:grid-cols-2">
                <div>
                  <div className="label">Understanding</div>
                  <p className="mt-1 text-muted">{session.learningState.understanding || "Not assessed yet."}</p>
                  {session.learningState.nextFocus ? (
                    <>
                      <div className="label mt-3">Next focus</div>
                      <p className="mt-1 text-muted">{session.learningState.nextFocus}</p>
                    </>
                  ) : null}
                </div>
                <div className="space-y-3">
                  {(
                    [
                      ["Mastered", session.learningState.mastered],
                      ["Open gaps", session.learningState.gaps],
                      ["Misconceptions", session.learningState.misconceptions],
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
                      <div className="label">Milestones</div>
                      <ul className="mt-1 space-y-0.5 text-muted">
                        {session.learningState.checkpoints.map((checkpoint) => (
                          <li key={checkpoint.label}>
                            <span className="text-accent">{checkpoint.done ? "✓" : "○"}</span> {checkpoint.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {session.learningState.agentNotes.length ? (
                    <div>
                      <div className="label">Agent actions</div>
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
            <section className="mt-6">
              <div className="mb-2 flex items-center gap-2">
                <h3 className="font-serif text-base">Ask about this stage</h3>
                <span className="chip">{stageMessages.filter((message) => message.role === "user").length} asked</span>
              </div>

              <div className="space-y-3">
                {stageMessages.map((message, position) =>
                  message.role === "user" ? (
                    <div key={message.id} className="group flex items-center justify-end gap-1.5">
                      <button
                        className="btn btn-ghost btn-xs opacity-0 transition group-hover:opacity-100"
                        disabled={busy}
                        onClick={() => setQuestion(message.content)}
                        title="Edit this question and ask again"
                      >
                        ✎ Edit
                      </button>
                      <div className="max-w-[85%] rounded-2xl rounded-br-sm border border-line bg-surface2 px-3.5 py-2 text-sm">
                        {message.content}
                      </div>
                    </div>
                  ) : (
                    <div key={message.id} className="card px-4 py-3">
                      <Markdown className="prose-compact">{message.content}</Markdown>
                      <div className="mt-2 flex items-center gap-1.5">
                        <button className="btn btn-ghost btn-xs" onClick={() => copy(message.content)}>
                          ⧉ Copy
                        </button>
                        {(() => {
                          const asked = [...stageMessages.slice(0, position)].reverse().find((entry) => entry.role === "user");
                          if (!asked) return null;
                          return (
                            <button
                              className="btn btn-ghost btn-xs"
                              disabled={busy}
                              onClick={() => onAsk(stage!.id, asked.content)}
                              title="Ask the same question again"
                            >
                              ↻ Regenerate
                            </button>
                          );
                        })()}
                        {message.resources.length ? (
                          <span className="chip">{message.resources.length} sources</span>
                        ) : null}
                      </div>
                    </div>
                  ),
                )}

                {qaStreaming ? (
                  <div className="card px-4 py-3">
                    {run.text ? (
                      <>
                        <Markdown className="prose-compact">{run.text}</Markdown>
                        <span className="caret" />
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <span className="dot-pulse flex gap-1">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
                        </span>
                        {run.status || "Thinking…"}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              <form
                className="mt-3 flex items-end gap-2"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const value = question.trim();
                  if (!value || busy) return;
                  setQuestion("");
                  await onAsk(stage.id, value);
                }}
              >
                <textarea
                  className="textarea min-h-[3rem]"
                  rows={2}
                  placeholder="Ask anything about this stage — it stays attached to this stage, not a giant chat thread."
                  value={question}
                  disabled={busy}
                  onChange={(event) => setQuestion(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
                <button className="btn btn-primary" type="submit" disabled={busy || !question.trim()}>
                  Ask
                </button>
              </form>

              {/* Attachments */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.md,.markdown,.txt,image/png,image/jpeg,image/webp,image/gif"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) await onUpload(file);
                  }}
                />
                <button className="btn btn-xs" onClick={() => fileRef.current?.click()} disabled={busy}>
                  📎 Attach material
                </button>
                <span className="text-[0.68rem] text-muted">
                  PDF, DOC/DOCX, Markdown, TXT{capabilities.vision ? " and images" : " (images need a vision model)"} · ZIP and JSON are rejected
                </span>
                {attachments.map((attachment) => (
                  <span key={attachment.id} className="chip">
                    {attachment.kind === "image" ? "🖼" : "📄"} {attachment.name}
                    <button
                      className="ml-1 text-muted hover:text-[var(--warn)]"
                      onClick={() => onDeleteAttachment(attachment.id)}
                      aria-label={`Remove ${attachment.name}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {session.status === "completed" ? <ExportBar sessionId={session.id} /> : null}

          <div className="h-10" />
        </div>
      </div>

      {/* Navigation ------------------------------------------------------- */}
      <div className="flex items-center gap-2 border-t border-line bg-surface px-6 py-3">
        <button
          className="btn"
          disabled={stageIndex === 0 || busy}
          onClick={() => onStageIndex(Math.max(0, stageIndex - 1))}
        >
          ← Previous
        </button>
        <div className="mx-auto text-center text-xs text-muted">
          {step?.title}
          {session.status === "completed" ? " · sequence complete" : ""}
        </div>
        {canGoNext ? (
          <button
            className="btn btn-primary"
            disabled={busy || !stage}
            onClick={async () => {
              const next = stageIndex + 1;
              onStageIndex(next);
              if (!nextIsGenerated) await onGenerate(next, "none");
            }}
          >
            {nextIsGenerated ? "Next →" : "Generate next stage →"}
          </button>
        ) : (
          <span className="chip chip-on">final stage</span>
        )}
      </div>
    </div>
  );
}

export type { StageRow };
