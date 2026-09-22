"use client";

import { Markdown } from "@/components/Markdown";
import { Icon } from "@/components/ui/Icon";
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
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  disabled={busy}
                  onClick={() => onEditQuestion(message.content)}
                  title={t("stage.qa.editTitle")}
                >
                  <Icon name="pencil" />
                  {t("stage.qa.edit")}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div key={message.id} className="msg msg-assistant">
            <div className="msg-head">{t("app.brandSecond")}</div>
            <Markdown className="prose-compact">{message.content}</Markdown>
            <div className="msg-actions">
              <button type="button" className="btn btn-ghost btn-xs" onClick={() => onCopy(message.content)}>
                <Icon name="copy" />
                {t("stage.copy")}
              </button>
              {(() => {
                const asked = [...live.slice(0, position)].reverse().find((entry) => entry.role === "user");
                if (!asked) return null;
                return (
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    disabled={busy}
                    onClick={() => onAsk(stageId, asked.content)}
                    title={t("stage.qa.regenerateTitle")}
                  >
                    <Icon name="refresh" />
                    {t("stage.regenerate")}
                  </button>
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
