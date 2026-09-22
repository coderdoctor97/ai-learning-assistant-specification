"use client";

import { t } from "@/lib/i18n";
import { Icon } from "@/components/ui/Icon";

const FORMATS: [string, "stage.export.formatMd" | "stage.export.formatZip" | "stage.export.formatDocx" | "stage.export.formatPdf" | "stage.export.formatHtml" | "stage.export.formatTxt"][] = [
  ["md", "stage.export.formatMd"],
  ["zip", "stage.export.formatZip"],
  ["docx", "stage.export.formatDocx"],
  ["pdf", "stage.export.formatPdf"],
  ["html", "stage.export.formatHtml"],
  ["txt", "stage.export.formatTxt"],
];

/* Post-completion export panel. Hidden from print output via .export-bar. */
export function ExportBar({ sessionId }: { sessionId: string }) {
  return (
    <div className="export-bar card animate-rise mt-6 p-5">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="chip chip-on">{t("stage.export.complete")}</span>
        <h3 className="text-lg font-medium tracking-tight sm:text-xl">{t("stage.export.title")}</h3>
      </div>
      <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted">{t("stage.export.body")}</p>
      <div className="export-actions mt-3">
        {FORMATS.map(([format, labelKey]) => (
          <a
            key={format}
            className="btn btn-xs"
            href={`/api/sessions/${sessionId}/export?format=${format}`}
            target={format === "pdf" ? "_blank" : undefined}
            rel="noreferrer"
          >
            <Icon name="download" />
            {t(labelKey)}
          </a>
        ))}
      </div>
    </div>
  );
}
