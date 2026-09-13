"use client";

import { useRef } from "react";
import { t } from "@/lib/i18n";
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
      <button
        type="button"
        className="btn btn-xs"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        aria-busy={busy}
      >
        {t("stage.attach.button")}
      </button>
      <span className="text-micro text-muted">
        {visionAvailable ? t("stage.attach.hintImages") : t("stage.attach.hintNoImages")}
      </span>
      {attachments.map((attachment) => (
        <span key={attachment.id} className="chip">
          <span aria-hidden="true">{attachment.kind === "image" ? "🖼" : "📄"}</span> {attachment.name}
          <button
            type="button"
            className="icon-btn"
            onClick={() => onDeleteAttachment(attachment.id)}
            aria-label={t("stage.attach.remove", { name: attachment.name })}
          >
            <span aria-hidden="true">×</span>
          </button>
        </span>
      ))}
    </div>
  );
}
