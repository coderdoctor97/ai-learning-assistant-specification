"use client";

import { useState } from "react";
import { Markdown } from "@/components/Markdown";
import { Icon } from "@/components/ui/Icon";
import { Tooltip } from "@/components/ui/Tooltip";
import { useGhostExits } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { t, tPlural } from "@/lib/i18n";
import type { RunState } from "@/components/studio/StageDeck";
import type { MessageRow } from "@/lib/client/api";

type Props = {
  stageId: string;
  stageIndex: number;
  stageMessages: MessageRow[];
  run: RunState | null;
  busy: boolean;
  onCopy: (text: string) => void;
  onAsk: (stageId: string, question: string) => Promise<void>;
  onEditQuestion: (content: string) => void;
};

/*
 * Conversation display for one stage. Assistant bubbles carry
 * content-visibility so long threads skip offscreen paint; removals and
 * regenerations exit through a short ghost cross-fade instead of popping.
 */
export function QaThread({ stageId, stageIndex, stageMessages, run, busy, onCopy, onAsk, onEditQuestion }: Props) {
  const qaStreaming = run?.mode === "qa" && run.stageIndex === stageIndex;
  const { live, ghosts } = useGhostExits(stageMessages);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyMessage = (id: string, text: string) => {
    onCopy(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!live.length && !qaStreaming) {
    return (
      <div className="thread">
        <div className="empty-state" role="status">
          <span className="empty-state-icon">
            <Icon name="send" />
          </span>
          <p className="max-w-prose text-sm leading-relaxed">{t("stage.qa.empty")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="thread">
      {live.map((message, position) =>
        message.role === "user" ? (
          <div key={message.id} className="msg-row msg-row-user">
            <div className="msg msg-user">
              <div className="msg-head">{t("stage.qa.you")}</div>
              {message.content}
              <div className="msg-actions">
                {/* [A11y & SVG Enhancement] Edit user question button with pencil icon and tooltip */}
                <Tooltip content="Edit question and replace response" side="top">
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs inline-flex items-center gap-1.5"
                    disabled={busy}
                    onClick={() => onEditQuestion(message.content)}
                  >
                    <Icon name="pencil" className="shrink-0" />
                    {t("stage.qa.edit")}
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>
        ) : (
          <div key={message.id} className="msg msg-assistant">
            <div className="msg-head">{t("app.brandSecond")}</div>
            <Markdown className="prose-compact">{message.content}</Markdown>
            <div className="msg-actions flex items-center gap-2">
              {/* [A11y & SVG Enhancement] Assistant answer copy button with 2s checkmark state */}
              <Tooltip content={copiedId === message.id ? "Copied!" : "Copy answer to clipboard"} side="top">
                <button
                  type="button"
                  className="btn btn-ghost btn-xs inline-flex items-center gap-1.5"
                  onClick={() => handleCopyMessage(message.id, message.content)}
                >
                  <Icon name={copiedId === message.id ? "check" : "copy"} className={cn("shrink-0", copiedId === message.id && "text-emerald-500")} />
                  {copiedId === message.id ? "Copied" : t("stage.copy")}
                </button>
              </Tooltip>

              {(() => {
                const asked = [...live.slice(0, position)].reverse().find((entry) => entry.role === "user");
                if (!asked) return null;
                return (
                  /* [A11y & SVG Enhancement] Regenerate answer button with rotateCw icon and tooltip */
                  <Tooltip content="Re-send question to generate a new answer" side="top">
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs inline-flex items-center gap-1.5"
                      disabled={busy}
                      onClick={() => onAsk(stageId, asked.content)}
                    >
                      <Icon name="rotateCw" className={cn("shrink-0", busy && "animate-spin")} />
                      {t("stage.regenerate")}
                    </button>
                  </Tooltip>
                );
              })()}
              {message.resources.length ? (
                <span className="chip">{tPlural("stage.qa.sources", message.resources.length, { count: message.resources.length })}</span>
              ) : null}
            </div>
          </div>
        ),
      )}

      {/* Exit ghosts: removed/regenerated messages fade out in place. */}
      {ghosts.map((message) => (
        <div key={`ghost-${message.id}`} className={cn("msg msg-exit", message.role === "user" ? "msg-user ml-auto" : "msg-assistant")} aria-hidden="true">
          {message.role === "user" ? (
            message.content
          ) : (
            <>
              <div className="msg-head">{t("app.brandSecond")}</div>
              <Markdown className="prose-compact">{message.content}</Markdown>
            </>
          )}
        </div>
      ))}

      {qaStreaming && run ? (
        <div className="msg msg-assistant msg-status">
          {run.text ? (
            <>
              <div className="msg-head">{t("app.brandSecond")}</div>
              <Markdown className="prose-compact">{run.text}</Markdown>
              <span className="caret" />
            </>
          ) : (
            <div className="msg-thinking" role="status" aria-live="polite">
              <span className="dot-pulse flex gap-1" aria-hidden="true">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
              </span>
              {run.status || t("studio.status.thinking")}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
