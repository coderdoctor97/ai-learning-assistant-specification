"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { Icon } from "@/components/ui/Icon";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { api, type ProviderRow } from "@/lib/client/api";

type Notify = (kind: "error" | "info", message: string) => void;

const credentialsSchema = z.object({
  baseUrl: z
    .string()
    .trim()
    .refine(
      (value) => {
        try {
          const url = new URL(value);
          return url.protocol === "http:" || url.protocol === "https:";
        } catch {
          return false;
        }
      },
      t("settings.provider.baseUrlInvalid"),
    ),
  apiKey: z.string(),
});

type CredentialsValues = z.infer<typeof credentialsSchema>;

/*
 * One provider card. The credential fields are a real validated form
 * (React Hook Form + Zod) with field-level feedback: the base URL commits
 * on blur once it parses as an http(s) endpoint, and the API key commits
 * through Save with inline validation. Save/Clear/Remove semantics are the
 * original ones, and "Use this provider" still activates the provider's
 * first cached model via `firstModelId`.
 */
export function ProviderCard({
  provider,
  modelsCount,
  firstModelId,
  isActive,
  guard,
  notify,
}: {
  provider: ProviderRow;
  modelsCount: number;
  firstModelId: string | null;
  isActive: boolean;
  guard: (action: () => Promise<unknown>, message?: string) => Promise<void>;
  notify: Notify;
}) {
  const {
    register,
    setError,
    clearErrors,
    setValue,
    control,
    formState: { errors },
  } = useForm<CredentialsValues>({
    resolver: zodResolver(credentialsSchema),
    mode: "onTouched",
    defaultValues: { baseUrl: provider.baseUrl, apiKey: "" },
  });

  const watched = useWatch({ control });
  const baseUrl = watched.baseUrl ?? "";
  const apiKey = watched.apiKey ?? "";
  const [confirmRemove, setConfirmRemove] = useState(false);

  function keyDetail(): string {
    if (provider.keySource === "env") return t("settings.provider.keyUsingEnv", { name: provider.apiKeyEnv ?? "" });
    if (provider.keyHint) return t("settings.provider.keyHint", { hint: provider.keyHint });
    return "";
  }

  async function commitBaseUrl() {
    const value = baseUrl.trim();
    const parsed = credentialsSchema.shape.baseUrl.safeParse(value);
    if (!parsed.success) {
      setError("baseUrl", { message: t("settings.provider.baseUrlInvalid") }, { shouldFocus: true });
      return;
    }
    clearErrors("baseUrl");
    if (value && value !== provider.baseUrl) {
      await guard(() => api.patchProvider({ id: provider.id, baseUrl: value }), t("settings.provider.baseUrlSaved"));
    }
  }

  async function saveKey() {
    const value = apiKey.trim();
    if (!value) {
      setError("apiKey", { message: t("settings.provider.keyRequired") }, { shouldFocus: true });
      return;
    }
    clearErrors("apiKey");
    await guard(async () => {
      await api.patchProvider({ id: provider.id, apiKey: value });
      setValue("apiKey", "");
    }, t("settings.provider.keySaved"));
  }

  return (
    <div className="card provider-card min-w-0 p-5" data-active={isActive}>
      <div className="provider-card-head">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span
              className="status-led"
              data-tone={provider.status === "connected" ? "good" : provider.status === "error" ? "warn" : "muted"}
              aria-hidden="true"
            />
            <h3 className="title-card">{provider.name}</h3>
            <span className="chip">
              {provider.protocol === "anthropic"
                ? t("settings.provider.protocolAnthropic")
                : t("settings.provider.protocolOpenai")}
            </span>
            {isActive ? <span className="chip chip-on">{t("settings.provider.active")}</span> : null}
            {modelsCount ? (
              <span className="chip font-mono tabular-nums">{t("settings.provider.models", { count: modelsCount })}</span>
            ) : null}
          </div>
          <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted">{provider.blurb}</p>
          {provider.statusMessage ? (
            <p className={cn("mt-1 text-sm leading-relaxed", provider.status === "error" ? "text-warn" : "text-muted")}>
              {provider.statusMessage}
            </p>
          ) : null}
        </div>
      </div>

      {provider.kind === "demo" ? (
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted">{t("settings.provider.demoNote")}</p>
      ) : (
        <div className="provider-fields mt-4">
          <label className="block min-w-0">
            <span className="label">{t("settings.provider.baseUrl")}</span>
            <input
              className="input mt-1"
              type="url"
              aria-invalid={errors.baseUrl ? true : undefined}
              aria-describedby={errors.baseUrl ? `baseurl-error-${provider.id}` : undefined}
              {...register("baseUrl")}
              onBlur={() => void commitBaseUrl()}
            />
            {errors.baseUrl ? (
              <span id={`baseurl-error-${provider.id}`} className="field-error" role="alert">
                {errors.baseUrl.message}
              </span>
            ) : null}
          </label>
          <label className="block min-w-0">
            <span className="label">{t("settings.provider.apiKey", { detail: keyDetail() })}</span>
            <div className="mt-1 flex min-w-0 flex-wrap gap-1.5">
              <input
                className="input min-w-0 flex-1"
                type="password"
                autoComplete="off"
                placeholder={
                  provider.hasKey
                    ? t("settings.provider.keyStored")
                    : t("settings.provider.keyPlaceholder", { env: provider.apiKeyEnv ?? "" })
                }
                aria-invalid={errors.apiKey ? true : undefined}
                aria-describedby={errors.apiKey ? `apikey-error-${provider.id}` : undefined}
                {...register("apiKey")}
              />
              <button type="button" className="btn btn-xs" disabled={!apiKey.trim()} onClick={() => void saveKey()}>
                {t("settings.provider.keySave")}
              </button>
              {provider.keySource === "stored" ? (
                /* [A11y & SVG Enhancement] Clear API key button with keyRound icon and tooltip */
                <Tooltip content="Clear saved API key from storage" side="top">
                  <button
                    type="button"
                    className="btn btn-xs inline-flex items-center gap-1.5"
                    onClick={() =>
                      guard(() => api.patchProvider({ id: provider.id, apiKey: null }), t("settings.provider.keyCleared"))
                    }
                  >
                    <Icon name="keyRound" className="shrink-0" />
                    {t("settings.provider.keyClear")}
                  </button>
                </Tooltip>
              ) : null}
            </div>
            {errors.apiKey ? (
              <span id={`apikey-error-${provider.id}`} className="field-error" role="alert">
                {errors.apiKey.message}
              </span>
            ) : null}
          </label>
        </div>
      )}

      <div className="provider-actions">
        <DiscoverButton provider={provider} guard={guard} notify={notify} />
        <button
          type="button"
          className="btn btn-xs"
          disabled={!modelsCount}
          onClick={() =>
            guard(
              () =>
                api.patchSettings({
                  activeProviderId: provider.id,
                  activeModelId: firstModelId,
                }),
              t("settings.provider.nowActive", { name: provider.name }),
            )
          }
        >
          {t("settings.provider.use")}
        </button>
        {!provider.builtIn ? (
          /* [A11y & SVG Enhancement] Remove provider button with trash icon and tooltip */
          <Tooltip content="Remove provider configuration" side="top">
            <button type="button" className="btn btn-xs text-warn inline-flex items-center gap-1.5" onClick={() => setConfirmRemove(true)}>
              <Icon name="trash2" className="shrink-0" />
              {t("settings.provider.remove")}
            </button>
          </Tooltip>
        ) : null}
      </div>

      <ConfirmSheet
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title={t("settings.provider.remove")}
        body={t("settings.provider.removeConfirm", { name: provider.name })}
        confirmLabel={t("settings.provider.remove")}
        onConfirm={async () => {
          await guard(() => api.deleteProvider(provider.id));
        }}
      />
    </div>
  );
}

/*
 * "Test & discover" runs discovery and reports through the guard channel.
 * Isolated so its pending state survives parent re-renders.
 */
function DiscoverButton({ provider, guard, notify }: { provider: ProviderRow; guard: (action: () => Promise<unknown>, message?: string) => Promise<void>; notify: Notify }) {
  const [busy, setBusy] = useState(false);
  return (
    /* [A11y & SVG Enhancement] Discover models button with spin icon and tooltip */
    <Tooltip content="Ping provider API and discover available model IDs" side="top">
      <button
        type="button"
        className="btn btn-xs inline-flex items-center gap-1.5"
        disabled={busy}
        aria-busy={busy}
        onClick={async () => {
          setBusy(true);
          await guard(async () => {
            const result = await api.discoverModels(provider.id);
            notify("info", t("settings.provider.discoveredFrom", { count: result.models.length, name: provider.name }));
          });
          setBusy(false);
        }}
      >
        <Icon name="refreshCw" className={cn("shrink-0", busy && "animate-spin")} />
        {busy ? t("settings.provider.checking") : t("settings.provider.testDiscover")}
      </button>
    </Tooltip>
  );
}
