"use client";

import Link from "next/link";
import { useState } from "react";
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

export function NewSession({ state, busy, onCreate }: Props) {
  const [topic, setTopic] = useState("");
  const [configId, setConfigId] = useState<string | null>(state.settings.activeConfigId);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [agent, setAgent] = useState(state.settings.dynamicAgent);

  const selected = state.configs.find((config) => config.id === configId) ?? state.configs[0];
  const modelReady = Boolean(state.settings.activeModelId && state.settings.activeProviderId);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="animate-rise">
          <span className="chip chip-on">new session</span>
          <h1 className="mt-3 font-serif text-3xl leading-tight">What do you want to understand?</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Give the engine a topic, a question or a learning objective. It will run your chosen methodology one stage
            at a time — nothing is generated until you ask for it.
          </p>
        </div>

        <form
          className="mt-6 space-y-5"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!topic.trim() || busy) return;
            await onCreate({ topic: topic.trim(), configId, projectId, dynamicAgent: agent });
          }}
        >
          <div className="card p-4">
            <textarea
              className="textarea min-h-[5.5rem] border-0 bg-transparent p-0 text-base focus:shadow-none"
              placeholder="e.g. Acid–base balance for clinical finals: compensation, anion gap, and worked ABG interpretation"
              value={topic}
              autoFocus
              onChange={(event) => setTopic(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) event.currentTarget.form?.requestSubmit();
              }}
            />
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
              <select
                className="select w-auto text-xs"
                value={projectId ?? ""}
                onChange={(event) => setProjectId(event.target.value || null)}
              >
                <option value="">No project</option>
                {state.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={`btn btn-xs ${agent ? "btn-primary" : ""}`}
                onClick={() => setAgent((value) => !value)}
                title="Dynamic Agent Mode lets the engine decide about retrieval, assessment, repetition and pacing"
              >
                ⚡ Dynamic agent {agent ? "on" : "off"}
              </button>
              <button className="btn btn-primary btn-xs ml-auto" type="submit" disabled={!topic.trim() || busy}>
                {busy ? "Starting…" : "Start learning →"}
              </button>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="label">Methodology</span>
              <Link href="/settings#methodologies" className="text-[0.7rem] text-accent underline underline-offset-2">
                edit or create
              </Link>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {state.configs.map((config) => {
                const active = config.id === selected?.id;
                return (
                  <button
                    type="button"
                    key={config.id}
                    onClick={() => setConfigId(config.id)}
                    className="card p-3 text-left transition"
                    style={{
                      borderColor: active ? "var(--accent)" : "var(--border)",
                      background: active ? "var(--accent-soft)" : "var(--surface)",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{config.name}</span>
                      <span className="chip">{config.steps.length} steps</span>
                      {config.builtIn ? null : <span className="chip chip-on">custom</span>}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted">{config.description}</p>
                    <p className="mt-1.5 truncate text-[0.68rem] text-muted">
                      {config.steps.map((step) => step.title).join(" → ")}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {!modelReady ? (
            <div className="card border-[var(--warn)] p-3 text-xs leading-relaxed">
              No model is selected yet. Pick one in the top bar, or{" "}
              <Link href="/settings" className="text-accent underline underline-offset-2">
                connect a provider
              </Link>
              . The offline demo engine is available immediately if you just want to see the workflow.
            </div>
          ) : null}

          <div>
            <div className="label mb-2">Try one of these</div>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((example) => (
                <button key={example} type="button" className="chip hover:border-accent" onClick={() => setTopic(example)}>
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
