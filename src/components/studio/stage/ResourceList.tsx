"use client";

import { Icon } from "@/components/ui/Icon";
import { t, formatDateTime } from "@/lib/i18n";
import type { ResourceRef } from "@/lib/client/api";

export function ResourceList({ resources }: { resources: ResourceRef[] }) {
  if (!resources.length) {
    return (
      <div className="empty-state" role="status">
        <span className="empty-state-icon">
          <Icon name="file" />
        </span>
        <p className="max-w-prose text-sm leading-relaxed">{t("stage.sources.empty")}</p>
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {resources.map((resource) => (
        <li key={resource.id} className="min-w-0 text-sm leading-relaxed">
          <a
            href={resource.url}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-accent underline underline-offset-2"
            title={resource.title}
          >
            {resource.title}
          </a>
          <div className="font-mono text-micro tabular-nums text-muted">
            {resource.source} · {resource.type}
            {resource.retrievedAt
              ? ` · ${t("stage.sources.retrieved", { date: formatDateTime(resource.retrievedAt) })}`
              : ""}
          </div>
          {resource.snippet ? (
            <p className="mt-1 line-clamp-2 max-w-prose text-muted" title={resource.snippet}>
              {resource.snippet}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
