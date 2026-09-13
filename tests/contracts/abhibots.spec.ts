import { expect, test } from "@playwright/test";
import type { Attachment, Provider } from "@/db/schema";
import { capabilitiesForModelId, catalogEntry, PROVIDER_CATALOG } from "@/lib/providers/catalog";
import {
  anthropicBody, completeChat, listModels, mergeCapabilities, openAiBody, routeFor, streamChat,
  type ChatOptions, type ContentBlock,
} from "@/lib/providers/gateway";
import { ABHIBOTS_SEED_MODELS } from "@/lib/providers/abhibots";
import { buildMessages, EMPTY_STATE, type HarnessInput } from "@/lib/engine/harness";
import { nativeToolChat, nativeToolsEnabled, NATIVE_TOOLS } from "@/lib/engine/native-tools";
import { ingestFile, MAX_FILE_BYTES } from "@/lib/files";
import { safeUrl } from "@/lib/tools";
import { demoResponse } from "@/lib/providers/demo";

const provider: Provider = {
  id: "test", kind: "abhibots", name: "AbhiBots Opus Gateway", baseUrl: "https://opus.abhibots.com/v1",
  apiKey: "test-only-not-a-real-key", apiKeyEnv: "ABHIBOTS_API_KEY", enabled: false, builtIn: true,
  status: "unknown", statusMessage: null, lastCheckedAt: null, createdAt: new Date(0), updatedAt: new Date(0),
};
const options: ChatOptions = {
  model: "claude-opus-4-7", messages: [{ role: "system", content: "Protected instruction" }, { role: "user", content: "Explain this" }],
  maxTokens: 1400, temperature: 0.4, reasoning: false, stream: false,
};
const audio = [{ dataBase64: "Y2xpcA==", format: "mp3" as const }];
const caps = (model: string, kind = "abhibots") => capabilitiesForModelId(model, {}, kind).caps;
let originalFetch: typeof fetch;
test.beforeEach(() => { originalFetch = globalThis.fetch; });
test.afterEach(() => { globalThis.fetch = originalFetch; });

function mockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  globalThis.fetch = async (url, init) => handler(String(url), init);
}
function fixture(attachments: Attachment[] = []): HarnessInput {
  return {
    settings: { id: "global", activeProviderId: "test", activeModelId: options.model, activeConfigId: null,
      theme: "editorial", contextLevel: "minimal", maxOutputTokens: 1400, temperature: 0.4, dynamicAgent: false,
      reasoningEnabled: false, streaming: true, webRetrieval: true, toolUse: false,
      learnerProfile: { level: "", background: "", goals: "", preferences: "" }, updatedAt: new Date(0) },
    session: { id: "session", projectId: null, title: "Test", topic: "Physics", configId: null, configName: "Default",
      configSteps: [{ id: "step", title: "Basics", instructions: "Teach basics" }], status: "active", currentStage: 0,
      learningState: EMPTY_STATE, pinned: false, dynamicAgent: false, createdAt: new Date(0), updatedAt: new Date(0), completedAt: null },
    steps: [{ id: "step", title: "Basics", instructions: "Teach basics" }], stageIndex: 0, priorStages: [], qa: [],
    attachments, skills: [], supportsVision: true, supportsAudio: true, supportsDocuments: true,
    providerKind: "abhibots", modelId: options.model, contextCharBudget: 9000,
  };
}
function attachment(overrides: Partial<Attachment> = {}): Attachment {
  return { id: "pdf", sessionId: "session", name: "lesson.pdf", mime: "application/pdf", kind: "document",
    size: 10, extractedText: "Document text", dataUrl: "data:application/pdf;base64,cGRm", createdAt: new Date(0), ...overrides };
}
function sse(blocks: ContentBlock[], stop = "end_turn"): Response {
  const chunks: unknown[] = [];
  blocks.forEach((block, index) => {
    chunks.push({ type: "content_block_start", index, content_block: block.type === "tool_use" ? { ...block, input: {} } : block });
    if (block.type === "tool_use") {
      const json = JSON.stringify(block.input);
      chunks.push({ type: "content_block_delta", index, delta: { type: "input_json_delta", partial_json: json.slice(0, 5) } },
        { type: "content_block_delta", index, delta: { type: "input_json_delta", partial_json: json.slice(5) } });
    }
    chunks.push({ type: "content_block_stop", index });
  });
  chunks.push({ type: "message_delta", delta: { stop_reason: stop } });
  // Deliberately omit the last newline and split every seven bytes.
  const bytes = new TextEncoder().encode(chunks.map((chunk) => `data: ${JSON.stringify(chunk)}`).join("\r\n\r\n"));
  return new Response(new ReadableStream({ start(controller) {
    for (let i = 0; i < bytes.length; i += 7) controller.enqueue(bytes.slice(i, i + 7));
    controller.close();
  } }));
}

test("built-in catalog constants and family-scoped capability matrix", () => {
  expect(catalogEntry("abhibots")).toMatchObject({ baseUrl: provider.baseUrl, protocol: "openai", apiKeyEnv: "ABHIBOTS_API_KEY", supportsDiscovery: true });
  for (const model of ["claude-opus-4-8", "claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5", "gemini-3-flash-ag"]) {
    expect(caps(model)).toEqual({ vision: true, documents: true, voice: true, tools: true, reasoning: true, streaming: true });
  }
  for (const model of ["grok-4", "gpt-4.1", "gpt-4.1-mini", "o4-mini"]) {
    expect(caps(model)).toMatchObject({ vision: false, documents: false, voice: true, streaming: true,
      tools: !["gpt-4.1-mini", "o4-mini"].includes(model) });
  }
  expect(caps("grok-4", "xai").vision).toBe(true);
  expect(caps("gpt-4.1-mini", "openai").tools).toBe(true);
  expect(caps("claude-opus-4-7", "anthropic").voice).toBe(false);
  expect(mergeCapabilities({ voice: false }, "claude-opus-4-7", "abhibots")).toMatchObject({ voice: false, tools: true });
});

test("routing truth table: all families, audio override, all legacy kinds", () => {
  for (const model of ["claude-opus-4-7", "gemini-3-flash-ag", "grok-4", "gpt-4.1", "gpt-4.1-mini", "o4-mini"]) {
    expect(routeFor(provider, { ...options, model })).toBe(/^(gpt-|o)/.test(model) ? "openai-chat" : "anthropic-messages");
    expect(routeFor(provider, { model, messages: [{ role: "user", content: "Clip", audio }] })).toBe("openai-chat");
  }
  for (const entry of PROVIDER_CATALOG.filter((entry) => entry.kind !== "abhibots")) {
    expect(routeFor({ kind: entry.kind }, { ...options, messages: [{ role: "user", content: "", audio }] }))
      .toBe(entry.protocol === "anthropic" ? "anthropic-messages" : "openai-chat");
  }
});

test("auth and non-stream response parsing follow the selected route", async () => {
  mockFetch((url, init) => {
    const headers = new Headers(init?.headers);
    if (url.endsWith("/messages")) {
      expect(headers.get("x-api-key")).toBe(provider.apiKey);
      expect(headers.get("anthropic-version")).toBe("2023-06-01");
      expect(headers.has("authorization")).toBe(false);
      return Response.json({ content: [{ type: "text", text: "Messages answer" }], stop_reason: "end_turn" });
    }
    expect(url).toBe(`${provider.baseUrl}/chat/completions`);
    expect(headers.get("authorization")).toBe(`Bearer ${provider.apiKey}`);
    expect(headers.has("x-api-key")).toBe(false);
    return Response.json({ choices: [{ message: { content: "Audio answer" } }] });
  });
  expect((await completeChat(provider, options)).content).toBe("Messages answer");
  expect((await completeChat(provider, { ...options, messages: [{ role: "user", content: "", audio }] })).content).toBe("Audio answer");
});

test("discovery success uses provider caps; fallback handles empty, HTTP and network failures", async () => {
  mockFetch(() => Response.json({ data: [{ id: "grok-4" }, { id: "gpt-4.1-mini" }] }));
  const live = await listModels(provider);
  expect(live.usedFallback).toBeUndefined();
  expect(live.find((model) => model.modelId === "grok-4")?.capabilities.vision).toBe(false);
  for (const response of [() => Response.json({ data: [] }), () => new Response("missing", { status: 404 }), () => { throw new Error("offline"); }]) {
    mockFetch(response);
    const result = await listModels(provider);
    expect(result.usedFallback).toBe(true);
    expect(result.map((model) => model.modelId)).toEqual(ABHIBOTS_SEED_MODELS);
    expect(result.every((model) => model.pricing === null && !model.isFree)).toBe(true);
  }
});

test("discovery never masks bad/missing keys or changes other-provider errors", async () => {
  mockFetch(() => new Response("unauthorized", { status: 401 }));
  await expect(listModels(provider)).rejects.toThrow("401");
  await expect(listModels({ ...provider, apiKey: null, apiKeyEnv: null })).rejects.toThrow("API key");
  mockFetch(() => new Response("missing", { status: 404 }));
  await expect(listModels({ ...provider, kind: "openai" })).rejects.toThrow("404");
});

test("image, PDF and audio payload shapes; Gemini URLs only; family size limits", () => {
  const user = { role: "user" as const, content: "Material", images: [{ mime: "image/png", dataBase64: "cG5n" }],
    documents: [{ mime: "application/pdf" as const, dataBase64: "cGRm" }] };
  const body = anthropicBody({ ...options, messages: [user] }, provider);
  expect(body.messages).toEqual([{ role: "user", content: [
    { type: "image", source: { type: "base64", media_type: "image/png", data: "cG5n" } },
    { type: "document", source: { type: "base64", media_type: "application/pdf", data: "cGRm" } },
    { type: "text", text: "Material" },
  ] }]);
  const urls = { ...options, model: "gemini-3-flash-ag", messages: [{ role: "user" as const, content: "Image", images: [{ url: "https://example.com/photo.png" }] }] };
  expect(JSON.stringify(anthropicBody(urls, provider))).toContain('"source":{"type":"url"');
  expect(JSON.stringify(anthropicBody({ ...urls, model: options.model }, provider))).toContain("omitted");
  expect(JSON.stringify(anthropicBody({ ...urls, messages: [{ ...urls.messages[0], images: [{ url: "http://169.254.169.254/latest/meta-data" }] }] }, provider))).not.toContain('"type":"image"');
  const oversized = Buffer.alloc(5 * 1048576 + 1).toString("base64");
  const images = [{ mime: "image/jpeg", dataBase64: oversized }];
  expect(JSON.stringify(anthropicBody({ ...options, messages: [{ role: "user", content: "Image", images }] }, provider))).toContain("exceeds size limit");
  expect(JSON.stringify(anthropicBody({ ...options, model: "gemini-3-flash-ag", messages: [{ role: "user", content: "Image", images }] }, provider))).not.toContain("omitted");
  const audioBody = openAiBody({ ...options, messages: [{ role: "user", content: "Clip", audio }] }, provider);
  expect(audioBody.messages).toEqual([{ role: "user", content: [{ type: "text", text: "Clip" }, { type: "input_audio", input_audio: { data: "Y2xpcA==", format: "mp3" } }] }]);
});

test("harness uses binary PDF instead of inline text; audio forces extracted-text fallback", () => {
  const input = fixture([attachment()]);
  const messages = buildMessages(input, "qa");
  expect(messages[0].content).not.toContain("Document text");
  expect(messages[1].documents).toEqual([{ mime: "application/pdf", dataBase64: "cGRm" }]);
  expect(messages[1].content).toContain("untrusted data");
  expect(messages[1].content).toContain("quote");
  const textOnly = buildMessages({ ...input, supportsDocuments: false }, "qa");
  expect(textOnly[0].content).toContain("Document text");
  expect(textOnly[1].documents).toBeUndefined();
  const withAudio = buildMessages({ ...input, attachments: [...input.attachments,
    attachment({ id: "clip", name: "clip.mp3", kind: "audio", mime: "audio/mpeg", extractedText: "", dataUrl: "data:audio/mpeg;base64,Y2xpcA==" })] }, "qa");
  expect(withAudio[1].audio).toEqual(audio);
  expect(withAudio[1].documents).toBeUndefined();
  expect(withAudio[0].content).toContain("Document text");
  const legacy = buildMessages({ ...input, providerKind: "demo", supportsDocuments: undefined, supportsAudio: undefined }, "stage");
  const demo = buildMessages({ ...input, providerKind: "demo" }, "stage");
  expect(demo).toEqual(legacy);
  expect(demoResponse(demo)).toBe(demoResponse(legacy));
});

test("audio sniffing: WAV is not WebP; six formats, caps, ZIP/JSON and size gates", async () => {
  for (const [name, bytes, mime] of [
    ["clip.wav", "RIFF0000WAVEdata", "audio/wav"], ["clip.mp3", "ID3clip", "audio/mpeg"],
    ["clip.m4a", "0000ftypM4A clip", "audio/mp4"], ["clip.ogg", "OggSclip", "audio/ogg"],
    ["clip.flac", "fLaCclip", "audio/flac"], ["clip.webm", "\x1a\x45\xdf\xa3clip", "audio/webm"],
  ]) {
    const buffer = Uint8Array.from(Buffer.from(bytes, "latin1")).buffer;
    const result = await ingestFile(name, "application/octet-stream", buffer, { visionAvailable: false, audioAvailable: true });
    expect(result).toMatchObject({ ok: true, kind: "audio", mime, extractedText: "" });
    expect(await ingestFile(name, "audio/mpeg", buffer, { visionAvailable: true })).toMatchObject({ ok: false, status: 415 });
  }
  const zip = Uint8Array.from([0x50, 0x4b, 0x03, 0x04]).buffer;
  expect(await ingestFile("fake.mp3", "audio/mpeg", zip, { visionAvailable: true, audioAvailable: true })).toMatchObject({ ok: false });
  expect(await ingestFile("fake.json", "audio/mpeg", zip, { visionAvailable: true, audioAvailable: true })).toMatchObject({ ok: false });
  expect(await ingestFile("big.wav", "audio/wav", new ArrayBuffer(MAX_FILE_BYTES + 1), { visionAvailable: true, audioAvailable: true })).toMatchObject({ ok: false, status: 413 });
  expect(await ingestFile("fake.mp3", "audio/mpeg", new TextEncoder().encode("not audio").buffer, { visionAvailable: true, audioAvailable: true })).toMatchObject({ ok: false });
});

test("public URL guard rejects private IPv4/IPv6, metadata, encoded and credential URLs", () => {
  for (const url of ["http://localhost", "http://127.1", "http://2130706433", "http://10.0.0.1", "http://172.16.1.1",
    "http://192.168.1.2", "http://169.254.169.254", "http://100.64.0.1", "http://[::1]", "http://[::ffff:7f00:1]",
    "http://[fc00::1]", "http://[fe80::1]", "http://metadata.google.internal", "file:///etc/passwd", "http://u:p@example.com"]) {
    expect(safeUrl(url), url).toBeNull();
  }
  expect(safeUrl("https://example.com/path")).not.toBeNull();
  expect(safeUrl("https://[2606:4700:4700::1111]/")).not.toBeNull();
});

test("native tool feature gate and schema restrictions", () => {
  const enabled = { toolUse: true, webRetrieval: true };
  expect(nativeToolsEnabled(enabled, true, provider, options)).toBe(true);
  expect(nativeToolsEnabled({ ...enabled, toolUse: false }, true, provider, options)).toBe(false);
  expect(nativeToolsEnabled({ ...enabled, webRetrieval: false }, true, provider, options)).toBe(false);
  expect(nativeToolsEnabled(enabled, false, provider, options)).toBe(false);
  expect(nativeToolsEnabled(enabled, true, provider, { ...options, messages: [{ role: "user", content: "", audio }] })).toBe(false);
  expect(NATIVE_TOOLS.every((tool) => /^[A-Za-z0-9_]{1,64}$/.test(tool.name))).toBe(true);
  for (const model of ["gpt-4.1-mini", "o4-mini"]) {
    expect(openAiBody({ ...options, model, tools: NATIVE_TOOLS }, provider)).not.toHaveProperty("tools");
    expect(anthropicBody({ ...options, model, tools: NATIVE_TOOLS }, provider)).not.toHaveProperty("tools");
  }
  expect(() => anthropicBody({ ...options, tools: [{ ...NATIVE_TOOLS[0], name: "bad-name" }] }, provider)).toThrow("Invalid tool name");
});

for (const streaming of [true, false]) {
  test(`native loop preserves exact IDs/signatures and separate resources (stream=${streaming})`, async () => {
    let requests = 0;
    const blocks: ContentBlock[] = [
      { type: "thinking", thinking: "Need fresh facts", signature: "opaque-thinking-signature" },
      { type: "tool_use", id: "call_2013", name: "web_search", input: { query: "Durgapur population" }, thought_signature: "opaque-gemini-signature" },
    ];
    mockFetch((_url, init) => {
      const body = JSON.parse(String(init?.body)) as { messages: { content: unknown }[]; max_tokens: number };
      requests++;
      expect(body.max_tokens).toBe(4096);
      if (requests === 1) return streaming ? sse(blocks, "tool_use") : Response.json({ content: blocks, stop_reason: "tool_use" });
      expect(body.messages.at(-2)?.content).toEqual(blocks);
      expect(body.messages.at(-1)?.content).toEqual([expect.objectContaining({ type: "tool_result", tool_use_id: "call_2013" })]);
      const final = [{ type: "text", text: "Answer grounded in reference data." }];
      return streaming ? sse(final) : Response.json({ content: final, stop_reason: "end_turn" });
    });
    const events = [];
    for await (const event of nativeToolChat(provider, { ...options, stream: streaming }, 8192, 9000, async (name, input) => {
      expect(name).toBe("web_search"); expect(input.query).toBe("Durgapur population");
      return { text: "Population facts", resources: [{ id: "source", title: "Census", url: "https://example.com/census", source: "example.com", type: "web" }] };
    })) events.push(event);
    expect(requests).toBe(2);
    expect(events).toContainEqual(expect.objectContaining({ type: "resources", resources: [expect.objectContaining({ title: "Census" })] }));
    expect(events).toContainEqual({ type: "content", text: "Answer grounded in reference data." });
  });
}

test("native loop is bounded to three rounds then sends no tools", async () => {
  let requests = 0;
  let executed = 0;
  mockFetch((_url, init) => {
    requests++;
    const body = JSON.parse(String(init?.body)) as { tools?: unknown };
    if (requests === 4) {
      expect(body.tools).toBeUndefined();
      return Response.json({ content: [{ type: "text", text: "Final answer" }], stop_reason: "end_turn" });
    }
    expect(body.tools).toBeDefined();
    return Response.json({ content: [{ type: "tool_use", id: `id${requests}`, name: "web_search", input: { query: "facts" } }], stop_reason: "tool_use" });
  });
  for await (const event of nativeToolChat(provider, options, 8192, 9000, async () => { executed++; return { text: "facts", resources: [] }; })) void event;
  expect(requests).toBe(4); expect(executed).toBe(3);
});

test("truncated, duplicate-ID and malformed tool calls never execute", async () => {
  let executed = 0;
  const consume = async () => {
    for await (const event of nativeToolChat(provider, options, 8192, 9000, async () => { executed++; return { resources: [], text: "" }; })) void event;
  };
  const call = { type: "tool_use", id: "id", name: "web_search", input: { query: "facts" } };
  for (const payload of [
    { content: [call], stop_reason: "max_tokens" },
    { content: [call, call], stop_reason: "tool_use" },
    { content: [{ type: "tool_use", name: "web_search" }], stop_reason: "tool_use" },
  ]) {
    mockFetch(() => Response.json(payload));
    await expect(consume()).rejects.toThrow();
  }
  expect(executed).toBe(0);
});

test("SSE reports tool JSON, thinking, opaque blocks and stop reason", async () => {
  const blocks = [{ type: "thinking", thinking: "Thinking", signature: "signature" },
    { type: "tool_use", id: "tool1", name: "web_search", input: { query: "facts" }, thought_signature: "gemini" }];
  mockFetch(() => sse(blocks, "tool_use"));
  const events = [];
  for await (const event of streamChat(provider, options)) events.push(event);
  expect(events).toContainEqual({ type: "tool_call", id: "tool1", name: "web_search", input: { query: "facts" } });
  expect(events).toContainEqual({ type: "assistant", blocks });
  expect(events).toContainEqual({ type: "stop", reason: "tool_use" });
});

test("real PDF ingest retains binary only with document capability and always keeps text fallback", async () => {
  const stream = "BT /F1 12 Tf 20 100 Td (Hello PDF) Tj ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  for (const documentsAvailable of [true, false]) {
    const result = await ingestFile("lesson.pdf", "application/pdf", new TextEncoder().encode(pdf).buffer,
      { visionAvailable: false, documentsAvailable });
    expect(result).toMatchObject({ ok: true, kind: "document", extractedText: "Hello PDF" });
    if (result.ok) {
      if (documentsAvailable) expect(result.dataUrl).toBe(`data:application/pdf;base64,${Buffer.from(pdf).toString("base64")}`);
      else expect(result.dataUrl).toBeNull();
    }
  }
});

test("failed tool execution replays an error with the exact tool-use ID", async () => {
  let requests = 0;
  mockFetch((_url, init) => {
    if (++requests === 1) return Response.json({ content: [{ type: "tool_use", id: "failed-call-id", name: "open_url", input: { url: "https://example.com" } }], stop_reason: "tool_use" });
    const body = JSON.parse(String(init?.body)) as { messages: { content: unknown }[] };
    expect(body.messages.at(-1)?.content).toEqual([{ type: "tool_result", tool_use_id: "failed-call-id", is_error: true, content: "Fetch failed" }]);
    return Response.json({ content: [{ type: "text", text: "Could not retrieve that source." }], stop_reason: "end_turn" });
  });
  for await (const event of nativeToolChat(provider, options, 8192, 9000, async () => { throw new Error("Fetch failed"); })) void event;
  expect(requests).toBe(2);
});

test("truncated SSE JSON and provider stream errors fail rather than dispatching a tool", async () => {
  for (const data of [
    'data: {"type":"error","error":{"message":"overloaded"}}',
    'data: {"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"x","name":"web_search","input":{}}}\n' +
    'data: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{invalid"}}\n' +
    'data: {"type":"content_block_stop","index":0}',
  ]) {
    mockFetch(() => new Response(data));
    await expect((async () => { for await (const event of streamChat(provider, options)) void event; })()).rejects.toThrow();
  }
});
