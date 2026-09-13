"use client";

import { useRef } from "react";
import { t } from "@/lib/i18n";
import type { AttachmentRow } from "@/lib/client/api";

type Props = {
  attachments: AttachmentRow[];
  busy: boolean;
  visionAvailable: boolean;
  audioAvailable?: boolean;
  documentsAvailable?: boolean;
  notify?: (kind: "error" | "info", message: string) => void;
  onUpload: (file: File) => Promise<void>;
  onDeleteAttachment: (id: string) => Promise<void>;
};

/* File chips and the attach trigger. Removal × is an icon-only control, so
   it rides the .icon-btn minimum target size (WCAG 2.2 AA, 2.5.8). */
export function AttachmentRow({ attachments, busy, visionAvailable, audioAvailable = false, documentsAvailable = false, notify, onUpload, onDeleteAttachment }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const audioRef = useRef<HTMLInputElement | null>(null);
  async function upload(file: File) {
    if (!visionAvailable && (file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(file.name))) {
      notify?.("error", t("stage.attach.imageUnavailable"));
      return;
    }
    if (!audioAvailable && (file.type.startsWith("audio/") || /\.(mp3|wav|m4a|ogg|webm|flac)$/i.test(file.name))) {
      notify?.("error", t("stage.attach.audioUnavailable"));
      return;
    }
    await onUpload(file);
  }

  return (
    <div className="attach-row mt-3">
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept={`.pdf,.doc,.docx,.md,.markdown,.txt${visionAvailable ? ",image/png,image/jpeg,image/webp,image/gif" : ""}`}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) await upload(file);
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
      {audioAvailable ? (
        <>
          <input ref={audioRef} type="file" className="hidden" accept=".mp3,.wav,.m4a,.ogg,.webm,.flac"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) await upload(file);
            }} />
          <button type="button" className="icon-btn" aria-label={t("stage.attach.audio")}
            disabled={busy} onClick={() => audioRef.current?.click()}>
            <span aria-hidden="true">♫</span>
          </button>
          <span className="text-micro text-muted">{t("stage.attach.audioHint")}</span>
        </>
      ) : null}
      <span className="text-micro text-muted">
        {visionAvailable ? t("stage.attach.hintImages") : t("stage.attach.hintNoImages")}
      </span>
      {attachments.map((attachment) => (
        <span key={attachment.id} className="chip">
          <span aria-hidden="true">{attachment.kind === "image" ? "🖼" : attachment.kind === "audio" ? "♫" : "📄"}</span> {attachment.name}
          {documentsAvailable && attachment.mime === "application/pdf" && attachment.hasBinary ? (
            <span className="text-micro text-muted">{t("stage.attach.document")}</span>
          ) : null}
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
