"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
    <div className="card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="status-led"
          data-tone={provider.status === "connected" ? "good" : provider.status === "error" ? "warn" : "muted"}
          aria-hidden="true"
        />
        <h3 className="font-medium">{provider.name}</h3>
        <span className="chip">
          {provider.protocol === "anthropic"
            ? t("settings.provider.protocolAnthropic")
            : t("settings.provider.protocolOpenai")}
        </span>
        {isActive ? <span className="chip chip-on">{t("settings.provider.active")}</span> : null}
        {modelsCount ? <span className="chip">{t("settings.provider.models", { count: modelsCount })}</span> : null}
        <div className="ml-auto flex gap-1.5">
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
        </div>
      </div>

      <p className="mt-1.5 text-xs leading-relaxed text-muted">{provider.blurb}</p>
      {provider.kind === "abhibots" ? <p className="mt-1 text-xs text-muted">{t("stage.attach.imageLimits")}</p> : null}
      {provider.statusMessage ? (
        <p className={`mt-1 text-xs ${provider.status === "error" ? "text-warn" : "text-muted"}`}>
          {provider.statusMessage}
        </p>
      ) : null}

      {provider.kind === "demo" ? (
        <p className="mt-2 text-xs leading-relaxed text-muted">{t("settings.provider.demoNote")}</p>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="label">{t("settings.provider.baseUrl")}</span>
            <input
              className="input mt-1 text-xs"
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
          <label className="block">
            <span className="label">{t("settings.provider.apiKey", { detail: keyDetail() })}</span>
            <div className="mt-1 flex gap-1.5">
              <input
                className="input text-xs"
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
                <button
                  type="button"
                  className="btn btn-xs"
                  onClick={() =>
                    guard(() => api.patchProvider({ id: provider.id, apiKey: null }), t("settings.provider.keyCleared"))
                  }
                >
                  {t("settings.provider.keyClear")}
                </button>
              ) : null}
              {!provider.builtIn ? (
                <button
                  type="button"
                  className="btn btn-xs"
                  onClick={() => {
                    if (window.confirm(t("settings.provider.removeConfirm", { name: provider.name })))
                      void guard(() => api.deleteProvider(provider.id));
                  }}
                >
                  {t("settings.provider.remove")}
                </button>
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
    <button
      type="button"
      className="btn btn-xs"
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
      {busy ? t("settings.provider.checking") : t("settings.provider.testDiscover")}
    </button>
  );
}
