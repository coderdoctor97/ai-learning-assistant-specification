import { t } from "@/lib/i18n";

export default function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-6" aria-busy="true" aria-label={t("studio.loading")}>
      <div className="card w-full max-w-md space-y-3 p-6" role="status" aria-live="polite">
        <span className="sr-only">{t("studio.loading")}</span>
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-5/6" />
        <div className="skeleton h-24 w-full" />
      </div>
    </div>
  );
}
