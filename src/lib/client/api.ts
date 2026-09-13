"use client";

export type Capabilities = {
  vision: boolean;
  voice: boolean;
  reasoning: boolean;
  tools: boolean;
  streaming: boolean;
  documents: boolean;
};

export type ModelRow = {
  id: string;
  providerId: string;
  modelId: string;
  displayName: string;
  contextLength: number;
  maxOutput: number;
  capabilities: Capabilities;
  pricing: { prompt?: string | null; completion?: string | null } | null;
  isFree: boolean;
};

export type ProviderRow = {
  id: string;
  name: string;
  kind: string;
  baseUrl: string;
  builtIn: boolean;
  enabled: boolean;
  status: string;
  statusMessage: string | null;
  lastCheckedAt: string | null;
  hasKey: boolean;
  keySource: "stored" | "env" | "none";
  apiKeyEnv: string | null;
  keyHint: string | null;
  protocol: "openai" | "anthropic";
  supportsDiscovery: boolean;
  blurb: string;
  requiresKey: boolean;
};

export type LearnerProfile = { level: string; background: string; goals: string; preferences: string };

export type SettingsRow = {
  id: string;
  activeProviderId: string | null;
  activeModelId: string | null;
  activeConfigId: string | null;
  theme: "light" | "dark" | "editorial";
  contextLevel: string;
  maxOutputTokens: number;
  temperature: number;
  dynamicAgent: boolean;
  reasoningEnabled: boolean;
  streaming: boolean;
  webRetrieval: boolean;
  toolUse: boolean;
  learnerProfile: LearnerProfile;
};

export type LearningStep = { id: string; title: string; instructions: string };

export type ConfigRow = {
  id: string;
  name: string;
  description: string;
  kind: string;
  presetKey: string | null;
  steps: LearningStep[];
  builtIn: boolean;
};

export type ProjectRow = { id: string; name: string; description: string; accent: string };

export type SessionSummary = {
  id: string;
  projectId: string | null;
  title: string;
  topic: string;
  status: string;
  pinned: boolean;
  currentStage: number;
  stageCount: number;
  configName: string;
  updatedAt: string;
  createdAt: string;
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
  type: string;
  snippet?: string;
  retrievedAt?: string;
  query?: string;
};

export type SessionRow = {
  id: string;
  projectId: string | null;
  title: string;
  topic: string;
  configId: string | null;
  configName: string;
  configSteps: LearningStep[];
  status: string;
  currentStage: number;
  learningState: LearningState;
  pinned: boolean;
  dynamicAgent: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type StageRow = {
  id: string;
  sessionId: string;
  index: number;
  title: string;
  instructions: string;
  content: string;
  reasoning: string | null;
  resources: ResourceRef[];
  status: string;
};

export type MessageRow = {
  id: string;
  sessionId: string;
  stageId: string;
  role: "user" | "assistant";
  content: string;
  reasoning: string | null;
  resources: ResourceRef[];
  createdAt: string;
};

export type AttachmentRow = {
  id: string;
  name: string;
  mime: string;
  size: number;
  kind: string;
  hasText: boolean;
  hasBinary?: boolean;
  createdAt: string;
};

export type SkillRow = {
  id: string;
  name: string;
  repoUrl: string;
  description: string;
  instructions: string;
  sourceFile: string;
  enabled: boolean;
};

export type ContextLevel = { key: string; label: string; description: string };

export type AppState = {
  settings: SettingsRow;
  providers: ProviderRow[];
  models: ModelRow[];
  configs: ConfigRow[];
  projects: ProjectRow[];
  sessions: SessionSummary[];
  skills: SkillRow[];
  contextLevels: ContextLevel[];
};

export type SessionDetail = {
  session: SessionRow;
  stages: StageRow[];
  messages: MessageRow[];
  attachments: AttachmentRow[];
};

export type RunEvent =
  | { type: "status"; message: string }
  | { type: "delta"; text: string }
  | { type: "reasoning"; text: string }
  | { type: "resources"; resources: ResourceRef[] }
  | { type: "done"; stageId?: string; messageId?: string }
  | { type: "error"; message: string };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.body instanceof FormData ? init?.headers : { "content-type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const text = await response.text();
  const payload = text ? (JSON.parse(text) as T & { error?: string }) : ({} as T & { error?: string });
  if (!response.ok) throw new Error(payload.error ?? `Request failed (${response.status})`);
  return payload;
}

export const api = {
  state: () => request<AppState>("/api/state"),
  patchSettings: (patch: Partial<SettingsRow> | Record<string, unknown>) =>
    request<{ settings: SettingsRow; warnings: string[] }>("/api/state", {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  createProvider: (body: { name: string; kind: string; baseUrl: string; apiKey?: string }) =>
    request<{ provider: ProviderRow }>("/api/providers", { method: "POST", body: JSON.stringify(body) }),
  patchProvider: (body: { id: string; name?: string; baseUrl?: string; apiKey?: string | null; enabled?: boolean }) =>
    request<{ provider: ProviderRow }>("/api/providers", { method: "PATCH", body: JSON.stringify(body) }),
  deleteProvider: (id: string) =>
    request<{ deleted?: boolean; cleared?: boolean }>(`/api/providers?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  discoverModels: (providerId: string) =>
    request<{ provider: ProviderRow; models: ModelRow[] }>("/api/providers/models", {
      method: "POST",
      body: JSON.stringify({ providerId }),
    }),

  createConfig: (body: { name: string; description?: string; steps: LearningStep[]; activate?: boolean }) =>
    request<{ config: ConfigRow }>("/api/configs", { method: "POST", body: JSON.stringify(body) }),
  patchConfig: (body: { id: string; name?: string; description?: string; steps?: LearningStep[] }) =>
    request<{ config: ConfigRow }>("/api/configs", { method: "PATCH", body: JSON.stringify(body) }),
  deleteConfig: (id: string) =>
    request<{ deleted: boolean }>(`/api/configs?id=${encodeURIComponent(id)}`, { method: "DELETE" }),

  createProject: (body: { name: string; description?: string }) =>
    request<{ project: ProjectRow }>("/api/projects", { method: "POST", body: JSON.stringify(body) }),
  patchProject: (body: { id: string; name?: string; description?: string }) =>
    request<{ project: ProjectRow }>("/api/projects", { method: "PATCH", body: JSON.stringify(body) }),
  deleteProject: (id: string) =>
    request<{ deleted: boolean }>(`/api/projects?id=${encodeURIComponent(id)}`, { method: "DELETE" }),

  createSession: (body: { topic: string; title?: string; configId?: string | null; projectId?: string | null; dynamicAgent?: boolean }) =>
    request<{ session: SessionRow }>("/api/sessions", { method: "POST", body: JSON.stringify(body) }),
  session: (id: string) => request<SessionDetail>(`/api/sessions/${id}`),
  patchSession: (
    id: string,
    body: { title?: string; pinned?: boolean; projectId?: string | null; currentStage?: number; dynamicAgent?: boolean },
  ) => request<{ session: SessionRow }>(`/api/sessions/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteSession: (id: string) => request<{ deleted: boolean }>(`/api/sessions/${id}`, { method: "DELETE" }),

  uploadAttachment: (sessionId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{ attachment: AttachmentRow; note: string | null }>(`/api/sessions/${sessionId}/attachments`, {
      method: "POST",
      body: form,
    });
  },
  deleteAttachment: (sessionId: string, attachmentId: string) =>
    request<{ deleted: boolean }>(
      `/api/sessions/${sessionId}/attachments?attachmentId=${encodeURIComponent(attachmentId)}`,
      { method: "DELETE" },
    ),

  skills: () => request<{ skills: SkillRow[] }>("/api/skills"),
  previewSkill: (url: string) =>
    request<{ preview: { name: string; description: string; sourceFile: string; instructions: string; length: number } }>(
      "/api/skills",
      { method: "POST", body: JSON.stringify({ url, preview: true }) },
    ),
  importSkill: (url: string, name?: string) =>
    request<{ skill: SkillRow }>("/api/skills", { method: "POST", body: JSON.stringify({ url, name }) }),
  patchSkill: (body: { id: string; enabled?: boolean; name?: string }) =>
    request<{ skill: SkillRow }>("/api/skills", { method: "PATCH", body: JSON.stringify(body) }),
  deleteSkill: (id: string) =>
    request<{ deleted: boolean }>(`/api/skills?id=${encodeURIComponent(id)}`, { method: "DELETE" }),
};

/** Consume an NDJSON run stream. */
export async function streamRun(
  url: string,
  body: unknown,
  onEvent: (event: RunEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok || !response.body) {
    let message = `Request failed (${response.status})`;
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) message = payload.error;
    } catch {
      /* ignore */
    }
    onEvent({ type: "error", message });
    return;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        onEvent(JSON.parse(line) as RunEvent);
      } catch {
        /* ignore malformed line */
      }
    }
  }
  if (buffer.trim()) {
    try {
      onEvent(JSON.parse(buffer) as RunEvent);
    } catch {
      /* ignore */
    }
  }
}
