"use client";

import { t } from "@/lib/i18n";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Tooltip } from "@/components/ui/Tooltip";

const FORMATS: [string, "stage.export.formatMd" | "stage.export.formatZip" | "stage.export.formatDocx" | "stage.export.formatPdf" | "stage.export.formatHtml" | "stage.export.formatTxt", IconName][] = [
  ["md", "stage.export.formatMd", "fileText"],
  ["zip", "stage.export.formatZip", "archive"],
  ["docx", "stage.export.formatDocx", "fileSpreadsheet"],
  ["pdf", "stage.export.formatPdf", "fileDown"],
  ["html", "stage.export.formatHtml", "code2"],
  ["txt", "stage.export.formatTxt", "fileText"],
];

/* Post-completion export panel. Hidden from print output via .export-bar. */
export function ExportBar({ sessionId }: { sessionId: string }) {
  return (
    <div className="export-bar card animate-rise mt-6 p-5">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="chip chip-on">{t("stage.export.complete")}</span>
        <h3 className="title-section">{t("stage.export.title")}</h3>
      </div>
      <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted">{t("stage.export.body")}</p>
      <div className="export-actions mt-3 flex flex-wrap gap-2">
        {FORMATS.map(([format, labelKey, iconName]) => (
          /* [A11y & SVG Enhancement] Format-specific export button with custom icon and tooltip */
          <Tooltip key={format} content={`Export study session as ${format.toUpperCase()} file`} side="top">
            <a
              className="btn btn-xs inline-flex items-center gap-1.5"
              href={`/api/sessions/${sessionId}/export?format=${format}`}
              target={format === "pdf" ? "_blank" : undefined}
              rel="noreferrer"
            >
              <Icon name={iconName} className="shrink-0" />
              {t(labelKey)}
            </a>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
