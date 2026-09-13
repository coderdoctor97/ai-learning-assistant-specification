import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export type ModelCapabilities = {
  vision: boolean;
  voice: boolean;
  reasoning: boolean;
  tools: boolean;
  streaming: boolean;
  documents: boolean;
};

export type ModelPricing = {
  prompt?: string | null;
  completion?: string | null;
  currency?: string | null;
};

export type LearningStep = {
  id: string;
  title: string;
  instructions: string;
};

export type LearnerProfile = {
  level: string;
  background: string;
  goals: string;
  preferences: string;
};

export type LearningState = {
  understanding: string;
  mastered: string[];
  gaps: string[];
  misconceptions: string[];
  nextFocus: string;
  checkpoints: { label: string; done: boolean }[];
  agentNotes: string[];
};

export type ResourceRef = {
  id: string;
  title: string;
  url: string;
  source: string;
  type: "web" | "document" | "attachment" | "skill";
  snippet?: string;
  retrievedAt?: string;
  query?: string;
};

const newId = () => crypto.randomUUID();
const now = () => new Date();

const emptyLearnerProfile = (): LearnerProfile => ({ level: "", background: "", goals: "", preferences: "" });

const emptyLearningState = (): LearningState => ({
  understanding: "",
  mastered: [],
  gaps: [],
  misconceptions: [],
  nextFocus: "",
  checkpoints: [],
  agentNotes: [],
});

/* ------------------------------------------------------------------ */
/* Providers & models                                                   */
/* ------------------------------------------------------------------ */

export const providers = sqliteTable("providers", {
  id: text("id").primaryKey().$defaultFn(newId),
  name: text("name").notNull(),
  kind: text("kind").notNull(),
  baseUrl: text("base_url").notNull(),
  apiKey: text("api_key"),
  apiKeyEnv: text("api_key_env"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  builtIn: integer("built_in", { mode: "boolean" }).notNull().default(false),
  status: text("status").notNull().default("unknown"),
  statusMessage: text("status_message"),
  lastCheckedAt: integer("last_checked_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(now),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(now),
});

export const models = sqliteTable(
  "models",
  {
    id: text("id").primaryKey().$defaultFn(newId),
    providerId: text("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    modelId: text("model_id").notNull(),
    displayName: text("display_name").notNull(),
    contextLength: integer("context_length").notNull().default(8192),
    maxOutput: integer("max_output").notNull().default(2048),
    capabilities: text("capabilities", { mode: "json" }).$type<ModelCapabilities>().notNull(),
    pricing: text("pricing", { mode: "json" }).$type<ModelPricing>(),
    isFree: integer("is_free", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(now),
  },
  (table) => [index("models_provider_idx").on(table.providerId)],
);

/* ------------------------------------------------------------------ */
/* App settings (single local row)                                      */
/* ------------------------------------------------------------------ */

export const settings = sqliteTable("settings", {
  id: text("id").primaryKey().default("global"),
  activeProviderId: text("active_provider_id"),
  activeModelId: text("active_model_id"),
  activeConfigId: text("active_config_id"),
  theme: text("theme").notNull().default("editorial"),
  contextLevel: text("context_level").notNull().default("minimal"),
  maxOutputTokens: integer("max_output_tokens").notNull().default(1400),
  temperature: real("temperature").notNull().default(0.4),
  dynamicAgent: integer("dynamic_agent", { mode: "boolean" }).notNull().default(false),
  reasoningEnabled: integer("reasoning_enabled", { mode: "boolean" }).notNull().default(false),
  streaming: integer("streaming", { mode: "boolean" }).notNull().default(true),
  toolUse: integer("tool_use", { mode: "boolean" }).notNull().default(false),
  webRetrieval: integer("web_retrieval", { mode: "boolean" }).notNull().default(true),
  learnerProfile: text("learner_profile", { mode: "json" })
    .$type<LearnerProfile>()
    .notNull()
    .$defaultFn(emptyLearnerProfile),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(now),
});

/* ------------------------------------------------------------------ */
/* Learning configurations                                              */
/* ------------------------------------------------------------------ */

export const learningConfigs = sqliteTable("learning_configs", {
  id: text("id").primaryKey().$defaultFn(newId),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  kind: text("kind").notNull().default("custom"),
  presetKey: text("preset_key"),
  steps: text("steps", { mode: "json" }).$type<LearningStep[]>().notNull(),
  builtIn: integer("built_in", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(now),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(now),
});

/* ------------------------------------------------------------------ */
/* Projects, sessions, stages                                           */
/* ------------------------------------------------------------------ */

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey().$defaultFn(newId),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  accent: text("accent").notNull().default("rose"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(now),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(now),
});

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey().$defaultFn(newId),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    topic: text("topic").notNull(),
    configId: text("config_id"),
    configName: text("config_name").notNull().default("Default methodology"),
    configSteps: text("config_steps", { mode: "json" }).$type<LearningStep[]>().notNull(),
    status: text("status").notNull().default("active"),
    currentStage: integer("current_stage").notNull().default(0),
    learningState: text("learning_state", { mode: "json" })
      .$type<LearningState>()
      .notNull()
      .$defaultFn(emptyLearningState),
    pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
    dynamicAgent: integer("dynamic_agent", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(now),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(now),
    completedAt: integer("completed_at", { mode: "timestamp" }),
  },
  (table) => [index("sessions_project_idx").on(table.projectId)],
);

export const stages = sqliteTable(
  "stages",
  {
    id: text("id").primaryKey().$defaultFn(newId),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    index: integer("index").notNull(),
    title: text("title").notNull(),
    instructions: text("instructions").notNull().default(""),
    content: text("content").notNull().default(""),
    reasoning: text("reasoning"),
    resources: text("resources", { mode: "json" }).$type<ResourceRef[]>().notNull().$defaultFn(() => []),
    prompt: text("prompt").notNull().default(""),
    status: text("status").notNull().default("ready"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(now),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(now),
  },
  (table) => [index("stages_session_idx").on(table.sessionId)],
);

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey().$defaultFn(newId),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    stageId: text("stage_id")
      .notNull()
      .references(() => stages.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    reasoning: text("reasoning"),
    resources: text("resources", { mode: "json" }).$type<ResourceRef[]>().notNull().$defaultFn(() => []),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(now),
  },
  (table) => [index("messages_stage_idx").on(table.stageId)],
);

export const attachments = sqliteTable(
  "attachments",
  {
    id: text("id").primaryKey().$defaultFn(newId),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
    kind: text("kind").notNull(),
    extractedText: text("extracted_text").notNull().default(""),
    dataUrl: text("data_url"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(now),
  },
  (table) => [index("attachments_session_idx").on(table.sessionId)],
);

export const skills = sqliteTable("skills", {
  id: text("id").primaryKey().$defaultFn(newId),
  name: text("name").notNull(),
  repoUrl: text("repo_url").notNull(),
  description: text("description").notNull().default(""),
  instructions: text("instructions").notNull().default(""),
  sourceFile: text("source_file").notNull().default(""),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(now),
});

export type Provider = typeof providers.$inferSelect;
export type ModelRow = typeof models.$inferSelect;
export type SettingsRow = typeof settings.$inferSelect;
export type LearningConfig = typeof learningConfigs.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Stage = typeof stages.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
export type Skill = typeof skills.$inferSelect;
