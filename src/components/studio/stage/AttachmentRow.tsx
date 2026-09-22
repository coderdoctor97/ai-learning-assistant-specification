"use client";

import { useRef } from "react";
import { t } from "@/lib/i18n";
import { Icon } from "@/components/ui/Icon";
import { Tooltip } from "@/components/ui/Tooltip";
import type { AttachmentRow } from "@/lib/client/api";

type Props = {
  attachments: AttachmentRow[];
  busy: boolean;
  visionAvailable: boolean;
  onUpload: (file: File) => Promise<void>;
  onDeleteAttachment: (id: string) => Promise<void>;
};

/* File chips and the attach trigger. Removal × is an icon-only control, so
   it rides the .icon-btn minimum target size (WCAG 2.2 AA, 2.5.8). */
export function AttachmentRow({ attachments, busy, visionAvailable, onUpload, onDeleteAttachment }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="attach-row mt-3">
      <label className="sr-only" htmlFor="stage-attach-file">
        {t("stage.attach.input")}
      </label>
      <input
        id="stage-attach-file"
        ref={fileRef}
        type="file"
        className="sr-only"
        accept=".pdf,.doc,.docx,.md,.markdown,.txt,image/png,image/jpeg,image/webp,image/gif"
        aria-label={t("stage.attach.input")}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) await onUpload(file);
        }}
      />
      {/* [A11y & SVG Enhancement] Attach button with paperclip icon and supported formats tooltip */}
      <Tooltip content="Attach documents or images (.pdf, .docx, .md, .png, .jpg)" side="top">
        <button
          type="button"
          className="btn btn-xs inline-flex items-center gap-1.5"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          aria-busy={busy}
        >
          <Icon name="paperclip" className="shrink-0" />
          {t("stage.attach.button")}
        </button>
      </Tooltip>
      <span className="text-micro leading-relaxed text-muted">
        {visionAvailable ? t("stage.attach.hintImages") : t("stage.attach.hintNoImages")}
      </span>
      <ul className="attach-list" aria-label={t("stage.attach.list")} aria-live="polite">
        {attachments.map((attachment) => (
          <li key={attachment.id} className="attach-chip">
            <span className="attach-chip-icon" aria-hidden="true">
              <Icon name={attachment.kind === "image" ? "image" : "file"} />
            </span>
            <span className="attach-chip-body">
              <span className="attach-chip-name" title={attachment.name}>
                {attachment.name}
              </span>
              <span className="attach-chip-meta font-mono tabular-nums">
                {t("stage.attach.size", { size: Math.max(1, Math.round(attachment.size / 1024)) })}
              </span>
            </span>
            {/* [A11y & SVG Enhancement] Remove attachment button with trash icon and portal tooltip */}
            <Tooltip content={`Remove attachment ${attachment.name}`} side="top">
              <button
                type="button"
                className="icon-btn"
                onClick={() => onDeleteAttachment(attachment.id)}
                aria-label={t("stage.attach.remove", { name: attachment.name })}
              >
                <Icon name="trash2" />
              </button>
            </Tooltip>
          </li>
        ))}
      </ul>
    </div>
  );
}
