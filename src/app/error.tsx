"use client";

import { t } from "@/lib/i18n";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main-content" className="flex min-h-dvh items-center justify-center px-6" tabIndex={-1}>
      <div className="card card-warn w-full max-w-md p-6 text-center">
        <h1 className="title-section text-warn mb-2">{t("app.error.title")}</h1>
        <p className="mb-4 text-sm leading-relaxed text-muted">{error.message || t("app.error.hint")}</p>
        <p className="mb-4 text-sm leading-relaxed text-muted">{t("app.error.hint")}</p>
        <button type="button" className="btn btn-primary" onClick={() => reset()}>
          {t("app.error.retry")}
        </button>
      </div>
    </main>
  );
}
