"use client";

/*
 * Progress ratio bar. The ratio is committed to the --progress custom
 * property in the ref callback (commit phase) so no inline style attribute
 * is ever rendered, and CSS owns the transition.
 */
export function ProgressBar({
  ratio,
  label,
}: {
  ratio: number;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(1, ratio));
  return (
    <div className="progress-track flex-1" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(clamped * 100)}>
      <span
        className="progress-ratio"
        ref={(element) => {
          element?.style.setProperty("--progress", String(clamped));
        }}
      />
    </div>
  );
}

/** Compact inline variant used inside list rows. */
export function MiniProgressBar({ ratio }: { ratio: number }) {
  const clamped = Math.max(0, Math.min(1, ratio));
  return (
    <span
      className="inline-block h-1 w-12 overflow-hidden rounded-full bg-surface2"
      aria-hidden="true"
    >
      <span
        className="progress-ratio"
        ref={(element) => {
          element?.style.setProperty("--progress", String(clamped));
        }}
      />
    </span>
  );
}
