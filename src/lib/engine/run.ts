import { t } from "@/lib/i18n";
import { nativeToolChat, nativeToolsEnabled } from "./native-tools";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  attachments as attachmentsTable,
  learningConfigs,
  messages as messagesTable,
  models as modelsTable,
  providers as providersTable,
  sessions as sessionsTable,
  settings as settingsTable,
  skills as skillsTable,
  stages as stagesTable,
  type Attachment,
  type LearningState,
  type LearningStep,
  type ModelCapabilities,
  type ModelRow,
  type Provider,
  type ResourceRef,
  type SettingsRow,
  type Session,
  type Skill,
  type Stage,
} from "@/db/schema";
import { capabilitiesForModelId } from "@/lib/providers/catalog";
import {
  completeChat,
  mergeCapabilities,
  ProviderError,
  streamChat,
  type ChatMessage,
} from "@/lib/providers/gateway";
import { budgetText, dedupeResources, fetchUrl, webSearch } from "@/lib/tools";
import {
  BodySplitter,
  buildMessages,
  clampOutputTokens,
  contextCharBudget,
  mergeState,
  parseStateTrailer,
  scrubBody,
  type Modifier,
} from "./harness";

export type RunEvent =
  | { type: "status"; message: string }
  | { type: "delta"; text: string }
  | { type: "reasoning"; text: string }
  | { type: "resources"; resources: ResourceRef[] }
  | { type: "done"; stageId?: string; messageId?: string }
  | { type: "error"; message: string };

export type Runtime = {
  session: Session;
  settings: SettingsRow;
  provider: Provider;
  model: ModelRow | null;
  modelId: string;
  capabilities: ModelCapabilities;
  contextLength: number;
  maxOutput: number;
  steps: LearningStep[];
  stages: Stage[];
  attachments: Attachment[];
  skills: Skill[];
};

export class EngineError extends Error {}

export async function getSettings(): Promise<SettingsRow> {
  const rows = await db.select().from(settingsTable).where(eq(settingsTable.id, "global")).limit(1);
  if (!rows.length) throw new EngineError("Application settings are not initialised yet.");
  return rows[0];
}

export async function loadRuntime(sessionId: string): Promise<Runtime> {
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId)).limit(1);
  if (!session) throw new EngineError("Session not found.");
  const settings = await getSettings();

  if (!settings.activeProviderId) {
    throw new EngineError("No AI provider is active. Open Settings → Providers and connect one.");
  }
  const [provider] = await db
    .select()
    .from(providersTable)
    .where(eq(providersTable.id, settings.activeProviderId))
    .limit(1);
  if (!provider) throw new EngineError("The active provider no longer exists. Choose one in Settings.");
  if (!settings.activeModelId) throw new EngineError("No model is selected. Pick a model in the top bar.");

  const [model] = await db
    .select()
    .from(modelsTable)
    .where(and(eq(modelsTable.providerId, provider.id), eq(modelsTable.modelId, settings.activeModelId)))
    .limit(1);

  const fallback = capabilitiesForModelId(settings.activeModelId, {}, provider.kind);
  const capabilities = mergeCapabilities(model?.capabilities ?? null, settings.activeModelId, provider.kind);

  const [stages, attachments, skills] = await Promise.all([
    db.select().from(stagesTable).where(eq(stagesTable.sessionId, sessionId)).orderBy(asc(stagesTable.index)),
    db.select().from(attachmentsTable).where(eq(attachmentsTable.sessionId, sessionId)),
    db.select().from(skillsTable).where(eq(skillsTable.enabled, true)),
  ]);

  return {
    session,
    settings,
    provider,
    model: model ?? null,
    modelId: settings.activeModelId,
    capabilities,
    contextLength: model?.contextLength ?? fallback.context,
    maxOutput: model?.maxOutput ?? fallback.output,
    steps: session.configSteps,
    stages,
    attachments,
    skills,
  };
}

/* ------------------------------------------------------------------ */
/* Dynamic agent planning                                               */
/* ------------------------------------------------------------------ */

export type AgentPlan = {
  needsRetrieval: boolean;
  queries: string[];
  urls: string[];
  action: "teach" | "repeat" | "practice" | "advance" | "clarify";
  clarification: string;
  assessment: string;
  rationale: string;
};

const EMPTY_PLAN: AgentPlan = {
  needsRetrieval: false,
  queries: [],
  urls: [],
  action: "teach",
  clarification: "",
  assessment: "",
  rationale: "",
};

function parsePlan(raw: string): AgentPlan {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return EMPTY_PLAN;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
    const strings = (value: unknown, limit: number) =>
      Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean).slice(0, limit) : [];
    const action = String(parsed.action ?? "teach");
    return {
      needsRetrieval: Boolean(parsed.needsRetrieval),
      queries: strings(parsed.queries, 2),
      urls: strings(parsed.urls, 2),
      action: (["teach", "repeat", "practice", "advance", "clarify"] as const).includes(
        action as AgentPlan["action"],
      )
        ? (action as AgentPlan["action"])
        : "teach",
      clarification: String(parsed.clarification ?? "").slice(0, 300),
      assessment: String(parsed.assessment ?? "").slice(0, 400),
      rationale: String(parsed.rationale ?? "").slice(0, 300),
    };
  } catch {
    return EMPTY_PLAN;
  }
}

async function planWithAgent(
  runtime: Runtime,
  stageIndex: number,
  question: string | null,
  recentQa: string,
): Promise<AgentPlan> {
  const step = runtime.steps[stageIndex];
  const state = runtime.session.learningState;
  const planner: ChatMessage[] = [
    {
      role: "system",
      content: [
        "You are the execution planner of a learning engine. You decide what should happen before the teaching model writes.",
        "Answer with ONE minified JSON object and nothing else:",
        '{"needsRetrieval":false,"queries":[],"urls":[],"action":"teach|repeat|practice|advance|clarify","clarification":"","assessment":"","rationale":""}',
        "Rules:",
        "- needsRetrieval true only for genuinely current, changing, local, statistical, versioned or news-dependent material, or when a specific URL must be read. Stable textbook knowledge needs no retrieval.",
        "- queries: at most 2 precise web search queries. urls: at most 2 explicit URLs mentioned by the learner.",
        "- action 'repeat' if the learner clearly has not understood the current step; 'practice' if they need more exercises; 'clarify' if a single blocking question must be asked first; 'advance' if they are clearly ready to move on; otherwise 'teach'.",
        "- assessment: one short sentence about the learner's current grasp. rationale: one short sentence.",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        `Topic: ${runtime.session.topic}`,
        `Methodology: ${runtime.session.configName}`,
        `Current step ${stageIndex + 1}/${runtime.steps.length}: ${step?.title ?? ""} — ${step?.instructions ?? ""}`,
        `Learning state: ${JSON.stringify(state).slice(0, 1200)}`,
        recentQa ? `Recent Q&A:\n${recentQa.slice(0, 1500)}` : "No Q&A yet.",
        question ? `The learner just asked: ${question}` : "No pending learner question.",
        `Today's date: ${new Date().toISOString().slice(0, 10)}`,
      ].join("\n"),
    },
  ];

  try {
    const result = await completeChat(runtime.provider, {
      model: runtime.modelId,
      messages: planner,
      maxTokens: 400,
      temperature: 0.1,
      stream: false,
      reasoning: false,
    });
    return parsePlan(result.content);
  } catch {
    return EMPTY_PLAN;
  }
}

async function runRetrieval(
  plan: AgentPlan,
  budget: number,
): Promise<{ resources: ResourceRef[]; text: string; notes: string[] }> {
  const resources: ResourceRef[] = [];
  const chunks: string[] = [];
  const notes: string[] = [];

  for (const query of plan.queries) {
    const result = await webSearch(query);
    if (result.resources.length) {
      resources.push(...result.resources);
      chunks.push(`Search: ${query}\n${result.text}`);
      notes.push(`Searched the web for "${query}"`);
    }
  }
  for (const url of plan.urls) {
    const result = await fetchUrl(url, Math.floor(budget / 2));
    if (result.text) {
      resources.push(...result.resources);
      chunks.push(result.text);
      notes.push(`Read ${result.resources[0]?.source ?? url}`);
    }
  }
  // Deepen the strongest search hit so the model gets real substance, not only snippets.
  const primary = resources.find((resource) => resource.type === "web" && resource.snippet !== undefined);
  if (primary && chunks.join("").length < budget / 2) {
    const page = await fetchUrl(primary.url, Math.floor(budget / 2));
    if (page.text) chunks.push(page.text);
  }

  return {
    resources: dedupeResources(resources),
    text: budgetText(chunks.join("\n\n---\n\n"), budget),
    notes,
  };
}

/* ------------------------------------------------------------------ */
/* Generation                                                           */
/* ------------------------------------------------------------------ */

type GenerateArgs = {
  runtime: Runtime;
  mode: "stage" | "qa";
  stageIndex: number;
  modifier: Modifier;
  question?: string;
  stageContent?: string;
  qa: (typeof messagesTable.$inferSelect)[];
};

async function* generate(args: GenerateArgs): AsyncGenerator<
  RunEvent | { type: "result"; body: string; reasoning: string; state: Partial<LearningState>; resources: ResourceRef[]; notes: string[] }
> {
  const { runtime, mode, stageIndex, modifier, question, stageContent, qa } = args;
  const { settings, capabilities } = runtime;

  const maxTokens = clampOutputTokens(
    modifier === "longer" ? Math.floor(settings.maxOutputTokens * 1.6) : settings.maxOutputTokens,
    runtime.maxOutput,
  );
  let { budget } = contextCharBudget(settings.contextLevel, runtime.contextLength, maxTokens);
  const reasoningOn = settings.reasoningEnabled && capabilities.reasoning;
  const useStreaming = settings.streaming && capabilities.streaming;

  let retrievedContext = "";
  let resources: ResourceRef[] = [];
  let agentNotes: string[] = [];
  let planNote: string | undefined;

  const makeMessages = () => buildMessages(
    {
      settings,
      session: runtime.session,
      steps: runtime.steps,
      stageIndex,
      priorStages: runtime.stages.filter((stage) => stage.index < stageIndex && stage.content.trim().length > 0),
      qa,
      attachments: runtime.attachments,
      skills: runtime.skills,
      retrievedContext,
      modifier,
      agentPlanNote: planNote,
      question,
      stageContent,
      supportsVision: capabilities.vision,
      supportsDocuments: capabilities.documents,
      supportsAudio: capabilities.voice,
      providerKind: runtime.provider.kind,
      modelId: runtime.modelId,
      contextCharBudget: budget,
    },
    mode,
  );
  const useNative = nativeToolsEnabled(settings, capabilities.tools, runtime.provider, {
    model: runtime.modelId, messages: makeMessages(),
  });
  if (useNative) {
    // Reserve the continuation headroom before filling the context window.
    const toolOutput = Math.min(runtime.maxOutput, Math.max(maxTokens, 4096));
    budget = contextCharBudget(settings.contextLevel, runtime.contextLength, toolOutput).budget;
  }

  if (runtime.session.dynamicAgent && !useNative) {
    yield { type: "status", message: "Agent is planning this step…" };
    const recentQa = qa
      .slice(-6)
      .map((message) => `${message.role === "user" ? "Learner" : "Engine"}: ${message.content.slice(0, 300)}`)
      .join("\n");
    const plan = await planWithAgent(runtime, stageIndex, question ?? null, recentQa);

    if (plan.needsRetrieval && settings.webRetrieval && (plan.queries.length || plan.urls.length)) {
      yield { type: "status", message: "Retrieving current material…" };
      const retrieval = await runRetrieval(plan, Math.min(budget, 9000));
      retrievedContext = retrieval.text;
      resources = retrieval.resources;
      agentNotes = retrieval.notes;
      if (resources.length) {
        yield { type: "status", message: `Read ${resources.length} source${resources.length === 1 ? "" : "s"}` };
        yield { type: "resources", resources };
      }
    }

    const directives: string[] = [];
    if (plan.assessment) directives.push(`Assessment of the learner right now: ${plan.assessment}`);
    switch (plan.action) {
      case "repeat":
        directives.push(
          "The learner has not yet understood this step. Re-teach it from a different angle with a simpler entry point before moving on.",
        );
        agentNotes.push("Agent chose to re-teach this step");
        break;
      case "practice":
        directives.push("Weight this response towards additional guided practice rather than new exposition.");
        agentNotes.push("Agent added extra practice");
        break;
      case "clarify":
        if (plan.clarification) {
          directives.push(
            `Open with this single clarifying question and keep the rest of the response short until it is answered: "${plan.clarification}"`,
          );
          agentNotes.push("Agent asked a clarifying question");
        }
        break;
      case "advance":
        directives.push("The learner is ready to move quickly: keep this stage tight and push towards the next one.");
        agentNotes.push("Agent accelerated the pace");
        break;
      default:
        break;
    }
    if (directives.length) planNote = directives.join("\n");
  }

  const messages = makeMessages();

  yield { type: "status", message: mode === "stage" ? "Composing the stage…" : "Answering…" };

  const splitter = new BodySplitter();
  let body = "";
  let reasoning = "";

  if (useNative) {
    yield { type: "status", message: t("engine.tools.running") };
    for await (const event of nativeToolChat(runtime.provider, {
      model: runtime.modelId, messages, maxTokens, temperature: settings.temperature,
      stream: useStreaming, reasoning: reasoningOn,
    }, runtime.maxOutput, budget)) {
      if (event.type === "resources") {
        resources = dedupeResources([...resources, ...event.resources]);
        yield { type: "resources", resources };
      } else if (event.type === "reasoning") {
        reasoning += event.text;
        yield event;
      } else if (event.type === "content") {
        const visible = splitter.push(event.text);
        body += visible;
        if (visible) yield { type: "delta", text: visible };
      }
    }
    const tail = splitter.flush();
    body += tail;
    if (tail) yield { type: "delta", text: tail };
    if (resources.length) agentNotes.push(t("engine.tools.used"));
  } else if (useStreaming) {
    for await (const event of streamChat(runtime.provider, {
      model: runtime.modelId,
      messages,
      maxTokens,
      temperature: settings.temperature,
      stream: true,
      reasoning: reasoningOn,
    })) {
      if (event.type === "reasoning") {
        reasoning += event.text;
        yield { type: "reasoning", text: event.text };
        continue;
      }
      if (event.type !== "content") continue;
      const visible = splitter.push(event.text);
      if (visible) {
        body += visible;
        yield { type: "delta", text: visible };
      }
    }
    const tail = splitter.flush();
    if (tail) {
      body += tail;
      yield { type: "delta", text: tail };
    }
  } else {
    const result = await completeChat(runtime.provider, {
      model: runtime.modelId,
      messages,
      maxTokens,
      temperature: settings.temperature,
      stream: false,
      reasoning: reasoningOn,
    });
    reasoning = result.reasoning;
    const visible = splitter.push(result.content) + splitter.flush();
    body = visible;
    if (visible) yield { type: "delta", text: visible };
  }

  const state = parseStateTrailer(splitter.getTrailer());
  yield {
    type: "result",
    body: scrubBody(body),
    reasoning: reasoning.trim(),
    state,
    resources,
    notes: agentNotes,
  };
}

/* ------------------------------------------------------------------ */
/* Public operations                                                    */
/* ------------------------------------------------------------------ */

export async function* runStage(
  sessionId: string,
  stageIndex: number,
  modifier: Modifier = "none",
): AsyncGenerator<RunEvent> {
  let runtime: Runtime;
  try {
    runtime = await loadRuntime(sessionId);
  } catch (error) {
    yield { type: "error", message: error instanceof Error ? error.message : "Engine failed to start." };
    return;
  }

  if (stageIndex < 0 || stageIndex >= runtime.steps.length) {
    yield { type: "error", message: "That stage is outside the configured learning sequence." };
    return;
  }

  const qa = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.sessionId, sessionId))
    .orderBy(asc(messagesTable.createdAt));

  try {
    let final: { body: string; reasoning: string; state: Partial<LearningState>; resources: ResourceRef[]; notes: string[] } | null =
      null;
    for await (const event of generate({ runtime, mode: "stage", stageIndex, modifier, qa })) {
      if (event.type === "result") {
        final = event;
        continue;
      }
      yield event;
    }
    if (!final || !final.body.trim()) {
      yield { type: "error", message: "The model returned an empty response. Try again or pick another model." };
      return;
    }

    const step = runtime.steps[stageIndex];
    const existing = runtime.stages.find((stage) => stage.index === stageIndex);
    let stageId: string;
    if (existing) {
      await db
        .update(stagesTable)
        .set({
          title: step.title,
          instructions: step.instructions,
          content: final.body,
          reasoning: final.reasoning || null,
          resources: final.resources,
          status: "ready",
          updatedAt: new Date(),
        })
        .where(eq(stagesTable.id, existing.id));
      stageId = existing.id;
    } else {
      const [inserted] = await db
        .insert(stagesTable)
        .values({
          sessionId,
          index: stageIndex,
          title: step.title,
          instructions: step.instructions,
          content: final.body,
          reasoning: final.reasoning || null,
          resources: final.resources,
          status: "ready",
        })
        .returning({ id: stagesTable.id });
      stageId = inserted.id;
    }

    const nextState = mergeState(runtime.session.learningState, final.state, final.notes);
    const allStages = await db.select().from(stagesTable).where(eq(stagesTable.sessionId, sessionId));
    const completed =
      allStages.filter((stage) => stage.content.trim().length > 0).length >= runtime.steps.length;
    await db
      .update(sessionsTable)
      .set({
        learningState: nextState,
        currentStage: stageIndex,
        status: completed ? "completed" : "active",
        completedAt: completed ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(sessionsTable.id, sessionId));

    yield { type: "done", stageId };
  } catch (error) {
    yield {
      type: "error",
      message:
        error instanceof ProviderError
          ? `Provider error — ${error.message}`
          : error instanceof Error
            ? error.message
            : "Generation failed.",
    };
  }
}

export async function* runQa(sessionId: string, stageId: string, question: string): AsyncGenerator<RunEvent> {
  let runtime: Runtime;
  try {
    runtime = await loadRuntime(sessionId);
  } catch (error) {
    yield { type: "error", message: error instanceof Error ? error.message : "Engine failed to start." };
    return;
  }

  const stage = runtime.stages.find((entry) => entry.id === stageId);
  if (!stage) {
    yield { type: "error", message: "Stage not found." };
    return;
  }

  const qa = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.stageId, stageId))
    .orderBy(asc(messagesTable.createdAt));

  await db.insert(messagesTable).values({ sessionId, stageId, role: "user", content: question });

  try {
    let final: { body: string; reasoning: string; state: Partial<LearningState>; resources: ResourceRef[]; notes: string[] } | null =
      null;
    for await (const event of generate({
      runtime,
      mode: "qa",
      stageIndex: stage.index,
      modifier: "none",
      question,
      stageContent: stage.content,
      qa,
    })) {
      if (event.type === "result") {
        final = event;
        continue;
      }
      yield event;
    }
    if (!final || !final.body.trim()) {
      yield { type: "error", message: "The model returned an empty answer." };
      return;
    }

    const [inserted] = await db
      .insert(messagesTable)
      .values({
        sessionId,
        stageId,
        role: "assistant",
        content: final.body,
        reasoning: final.reasoning || null,
        resources: final.resources,
      })
      .returning({ id: messagesTable.id });

    if (final.resources.length) {
      await db
        .update(stagesTable)
        .set({ resources: dedupeResources([...stage.resources, ...final.resources]), updatedAt: new Date() })
        .where(eq(stagesTable.id, stageId));
    }

    await db
      .update(sessionsTable)
      .set({
        learningState: mergeState(runtime.session.learningState, final.state, final.notes),
        updatedAt: new Date(),
      })
      .where(eq(sessionsTable.id, sessionId));

    yield { type: "done", messageId: inserted.id };
  } catch (error) {
    yield {
      type: "error",
      message:
        error instanceof ProviderError
          ? `Provider error — ${error.message}`
          : error instanceof Error
            ? error.message
            : "Generation failed.",
    };
  }
}

export async function resolveStepsForConfig(configId: string | null): Promise<{ name: string; steps: LearningStep[] } | null> {
  if (!configId) return null;
  const [config] = await db.select().from(learningConfigs).where(eq(learningConfigs.id, configId)).limit(1);
  if (!config) return null;
  return { name: config.name, steps: config.steps };
}
