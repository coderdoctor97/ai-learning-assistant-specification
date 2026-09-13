"use client";

import { t, formatDateTime } from "@/lib/i18n";
import type { ResourceRef } from "@/lib/client/api";

export function ResourceList({ resources }: { resources: ResourceRef[] }) {
  if (!resources.length) return <p className="text-xs text-muted">{t("stage.sources.empty")}</p>;
  return (
    <ul className="space-y-2">
      {resources.map((resource) => (
        <li key={resource.id} className="text-xs leading-relaxed">
          <a
            href={resource.url}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-accent underline underline-offset-2"
          >
            {resource.title}
          </a>
          <div className="text-muted">
            {resource.source} · {resource.type}
            {resource.retrievedAt
              ? ` · ${t("stage.sources.retrieved", { date: formatDateTime(resource.retrievedAt) })}`
              : ""}
          </div>
          {resource.snippet ? <p className="mt-1 line-clamp-3 text-muted">{resource.snippet}</p> : null}
        </li>
      ))}
    </ul>
  );
}
