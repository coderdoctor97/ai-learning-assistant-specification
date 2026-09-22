"use client";

import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { t, tPlural } from "@/lib/i18n";
import { Icon } from "@/components/ui/Icon";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/cn";
import type { AppState } from "@/lib/client/api";

type Props = {
  state: AppState;
  busy: boolean;
  onCreate: (input: { topic: string; configId: string | null; projectId: string | null; dynamicAgent: boolean }) => Promise<void>;
};

const EXAMPLES = [
  "Renal physiology: how the loop of Henle concentrates urine",
  "Kalman filters, from the intuition to the equations",
  "Why the Bretton Woods system collapsed",
  "Spaced repetition for medical pharmacology",
];

const newSessionSchema = z.object({
  topic: z.string().trim().min(1, t("newsession.topic.required")),
  configId: z.string().nullable(),
  projectId: z.string().nullable(),
  dynamicAgent: z.boolean(),
});

type NewSessionValues = z.infer<typeof newSessionSchema>;

/*
 * New-session form: React Hook Form + Zod schema with dirty-state tracking
 * and inline field-level errors. The submission contract (onCreate payload)
 * is unchanged.
 */
export function NewSession({ state, busy, onCreate }: Props) {
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isValid },
  } = useForm<NewSessionValues>({
    resolver: zodResolver(newSessionSchema),
    mode: "onTouched",
    defaultValues: {
      topic: "",
      configId: state.settings.activeConfigId,
      projectId: null,
      dynamicAgent: state.settings.dynamicAgent,
    },
  });

  const watched = useWatch({ control });
  const topic = watched.topic ?? "";
  const configId = watched.configId ?? null;
  const projectId = watched.projectId ?? null;
  const agent = Boolean(watched.dynamicAgent);

  const selected = state.configs.find((config) => config.id === configId) ?? state.configs[0];
  const modelReady = Boolean(state.settings.activeModelId && state.settings.activeProviderId);

  const onSubmit = handleSubmit(async (values) => {
    if (busy) return;
    await onCreate({
      topic: values.topic.trim(),
      configId: values.configId,
      projectId: values.projectId,
      dynamicAgent: values.dynamicAgent,
    });
  });

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="animate-rise">
          <span className="chip chip-on">{t("newsession.badge")}</span>
          <h1 className="title-page mt-3 font-serif">{t("newsession.title")}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">{t("newsession.lede")}</p>
        </div>

        <form className="mt-6 space-y-5" onSubmit={onSubmit} noValidate>
          <div className="card p-4">
            <label className="label sr-only" htmlFor="new-session-topic">
              {t("newsession.topic.label")}
            </label>
            <textarea
              id="new-session-topic"
              className="textarea min-h-20 border-0 bg-transparent p-0 text-base focus:shadow-none"
              placeholder={t("newsession.topic.placeholder")}
              autoFocus
              aria-invalid={errors.topic ? true : undefined}
              aria-describedby={errors.topic ? "new-session-topic-error" : undefined}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              {...register("topic")}
            />
            {errors.topic ? (
              <span id="new-session-topic-error" className="field-error" role="alert">
                {errors.topic.message}
              </span>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
              <select
                className="select w-auto text-xs"
                value={projectId ?? ""}
                onChange={(event) => setValue("projectId", event.target.value || null, { shouldDirty: true })}
                aria-label={t("newsession.project.label")}
              >
                <option value="">{t("newsession.project.none")}</option>
                {state.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <Tooltip content="Toggle dynamic AI agent stage planning" side="top">
                <button
                  type="button"
                  className={cn("btn btn-xs inline-flex items-center gap-1.5", agent && "btn-primary")}
                  aria-pressed={agent}
                  onClick={() => setValue("dynamicAgent", !agent, { shouldDirty: true })}
                >
                  <Icon name="bot" className="shrink-0" />
                  {t("newsession.agent.label", { state: agent ? t("newsession.agent.on") : t("newsession.agent.off") })}
                </button>
              </Tooltip>
              <button
                className="btn btn-primary btn-xs ml-auto"
                type="submit"
                disabled={!isValid || !topic.trim() || busy}
                aria-busy={busy}
              >
                {busy ? t("newsession.submitting") : t("newsession.submit")}
              </button>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="label">{t("newsession.methodology.label")}</span>
              <Link
                href="/settings#methodologies"
                className="text-micro text-accent underline underline-offset-2"
              >
                {t("newsession.methodology.edit")}
              </Link>
            </div>
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={t("newsession.methodology.label")}>
              {state.configs.map((config) => {
                const active = config.id === selected?.id;
                return (
                  /* [A11y & SVG Enhancement] Methodology card with visual selection checkmark and tooltip */
                  <Tooltip key={config.id} content={`Select ${config.name} learning methodology`} side="top">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setValue("configId", config.id, { shouldDirty: true })}
                      className="config-card p-3 w-full text-left"
                      data-active={active}
                    >
                      <div className="flex items-center gap-2">
                        <Icon name={active ? "checkCircle2" : "circle"} className={cn("w-4 h-4 shrink-0", active ? "text-accent" : "text-muted")} />
                        <span className="font-medium text-sm">{config.name}</span>
                        <span className="chip ml-auto">{tPlural("newsession.methodology.steps", config.steps.length, { count: config.steps.length })}</span>
                        {config.builtIn ? null : <span className="chip chip-on">{t("newsession.methodology.custom")}</span>}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-muted">{config.description}</p>
                      <p className="mt-1.5 truncate text-micro text-muted">
                        {config.steps.map((step) => step.title).join(" → ")}
                      </p>
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          </div>

          {!modelReady ? (
            /* [A11y & SVG Enhancement] Model warning alert banner with icon */
            <div className="card card-warn p-3 text-xs leading-relaxed flex items-start gap-2">
              <Icon name="alertTriangle" className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
              <div>
                {t("newsession.modelWarning")}{" "}
                <Link href="/settings" className="text-accent underline underline-offset-2">
                  {t("newsession.modelWarningLink")}
                </Link>
                {t("newsession.modelWarningSuffix")}
              </div>
            </div>
          ) : null}

          <div>
            <div className="label mb-2">{t("newsession.examples.label")}</div>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  className="chip hover:border-accent"
                  onClick={() => setValue("topic", example, { shouldDirty: true, shouldValidate: true })}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
