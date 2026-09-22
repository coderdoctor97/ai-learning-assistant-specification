"use client";

import { t } from "@/lib/i18n";
import { Icon } from "@/components/ui/Icon";
import { Tooltip } from "@/components/ui/Tooltip";

type Props = {
  value: string;
  onValueChange: (value: string) => void;
  busy: boolean;
  placeholder: string;
  onSubmit: (question: string) => Promise<void>;
};

/*
 * Text entry, submission trigger and keyboard shortcuts for the stage Q&A.
 * ⌘/Ctrl+Enter submits; Enter stays a newline (behavior preserved).
 */
export function Composer({ value, onValueChange, busy, placeholder, onSubmit }: Props) {
  return (
    <div className="composer">
      <textarea
        className="composer-input"
        rows={2}
        placeholder={placeholder}
        aria-label={t("stage.qa.send")}
        value={value}
        disabled={busy}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.currentTarget.form?.requestSubmit();
          }
        }}
      />
      <div className="composer-actions">
        <span className="composer-hint">{t("stage.qa.shortcut")}</span>
        {/* [A11y & SVG Enhancement] Submit button with paper plane icon and shortcut tooltip */}
        <Tooltip content="Send question (⌘+Enter)" side="top">
          <button
            className="btn btn-primary ml-auto inline-flex items-center gap-1.5"
            type="submit"
            disabled={busy || !value.trim()}
            aria-busy={busy}
          >
            <Icon name="send" className="shrink-0" />
            {t("stage.qa.send")}
          </button>
        </Tooltip>
      </div>
    </div>
  );
}

/** The wrapping form lives here so Composer owns the submit contract. */
export function ComposerForm({
  value,
  onValueChange,
  busy,
  placeholder,
  onSubmit,
}: Props) {
  return (
    <form
      className="composer-form mt-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const trimmed = value.trim();
        if (!trimmed || busy) return;
        onValueChange("");
        await onSubmit(trimmed);
      }}
    >
      <Composer value={value} onValueChange={onValueChange} busy={busy} placeholder={placeholder} onSubmit={onSubmit} />
    </form>
  );
}
