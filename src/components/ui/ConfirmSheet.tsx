"use client";

import { useState } from "react";
import { t } from "@/lib/i18n";
import { Dialog, DialogActions, DialogBody, DialogTitle } from "./Dialog";

type ConfirmSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  body: string;
  confirmLabel: string;
  /** Runs the frozen handler logic; the sheet closes after it resolves. */
  onConfirm: () => Promise<void> | void;
};

/*
 * Destructive confirmation in the app's own surface language (replaces
 * window.confirm). The caller's handler logic is passed through untouched —
 * only the prompt surface moves. The body remounts on every open, so its
 * local state starts fresh without any effect.
 */
export function ConfirmSheet(props: ConfirmSheetProps) {
  if (!props.open) return null;
  return <ConfirmSheetBody {...props} />;
}

function ConfirmSheetBody({ onClose, title, body, confirmLabel, onConfirm }: ConfirmSheetProps) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onClose={busy ? () => undefined : onClose} label={title} tone="danger">
      <DialogTitle>{title}</DialogTitle>
      <DialogBody>{body}</DialogBody>
      <DialogActions>
        <button type="button" className="btn btn-xs" disabled={busy} onClick={onClose}>
          {t("stage.cancel")}
        </button>
        <button
          type="button"
          className="btn btn-xs btn-warn"
          disabled={busy}
          aria-busy={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
              onClose();
            } finally {
              setBusy(false);
            }
          }}
        >
          {confirmLabel}
        </button>
      </DialogActions>
    </Dialog>
  );
}

type RenameSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  initial: string;
  /** Runs the frozen handler logic with the trimmed value. */
  onRename: (value: string) => Promise<void> | void;
};

/*
 * Rename flow in the app's own surface language (replaces window.prompt).
 * Empty input closes without saving — the original prompt semantics.
 */
export function RenameSheet(props: RenameSheetProps) {
  if (!props.open) return null;
  return <RenameSheetBody key={props.initial} {...props} />;
}

function RenameSheetBody({ onClose, title, initial, onRename }: RenameSheetProps) {
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open onClose={busy ? () => undefined : onClose} label={title}>
      <DialogTitle>{title}</DialogTitle>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!value.trim()) {
            onClose();
            return;
          }
          setBusy(true);
          try {
            await onRename(value.trim());
            onClose();
          } finally {
            setBusy(false);
          }
        }}
      >
        <input
          className="input"
          value={value}
          disabled={busy}
          aria-label={title}
          onChange={(event) => setValue(event.target.value)}
        />
        <DialogActions>
          <button type="button" className="btn btn-xs" disabled={busy} onClick={onClose}>
            {t("stage.cancel")}
          </button>
          <button type="submit" className="btn btn-xs btn-primary" disabled={busy || !value.trim()} aria-busy={busy}>
            {t("stage.saveOnly")}
          </button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
