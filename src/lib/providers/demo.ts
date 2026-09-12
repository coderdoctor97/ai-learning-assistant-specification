import { STATE_SENTINEL } from "@/lib/defaults";
import type { ChatMessage } from "./gateway";

/**
 * Local demo engine. It is NOT a language model: it deterministically renders a
 * study scaffold from the active learning step so the studio is fully usable
 * (stages, Q&A, export) before any provider key is configured. It never claims
 * to be a model and never produces a reasoning trace.
 */

function extract(pattern: RegExp, haystack: string, fallback = ""): string {
  const match = pattern.exec(haystack);
  return match ? match[1].trim() : fallback;
}

function bullets(topic: string, step: string, seedWords: string[]): string {
  return seedWords
    .map((word, index) => `- **${word}** — how it shapes ${topic.toLowerCase()} at the "${step}" stage (${index + 1}/${seedWords.length}).`)
    .join("\n");
}

export function demoResponse(messages: ChatMessage[]): string {
  const system = messages.find((message) => message.role === "system")?.content ?? "";
  const user = messages.filter((message) => message.role === "user").pop()?.content ?? "";

  if (/ONE minified JSON object/i.test(system)) {
    // Planner branch. The demo engine still exercises the real retrieval
    // pipeline so the agent, resources and sources UI can be evaluated
    // without a provider key.
    const plannerTopic = extract(/Topic:\s*(.+)/, user, "");
    const step = extract(/Current step \d+\/\d+:\s*([^—\n]+)/, user, "").trim();
    const query = [plannerTopic, step].filter(Boolean).join(" ").slice(0, 160);
    return JSON.stringify({
      needsRetrieval: Boolean(query),
      queries: query ? [query] : [],
      urls: [],
      action: "teach",
      clarification: "",
      assessment: "Demo engine: no live learner assessment is available offline.",
      rationale: "Demo engine retrieves so the resource pipeline can be inspected.",
    });
  }

  const topic = extract(/Topic of this session:\s*(.+)/, system, "your topic");
  const stepTitle = extract(/CURRENT STEP INSTRUCTION — "([^"]+)"/, system, "Stage");
  const stepInstructions = extract(/CURRENT STEP INSTRUCTION — "[^"]+":\n([\s\S]*?)\n\n/, system, "");
  const isQa = /MODE: STAGE Q&A/.test(system);
  const question = extract(/Learner's question:\s*([\s\S]*)$/, user, "");

  const body = isQa
    ? [
        `**On your question:** _${question || "(no question captured)"}_`,
        "",
        `Working inside the **${stepTitle}** stage of *${topic}*, the short answer is that the idea you are asking about connects back to the core mechanism of this stage.`,
        "",
        "1. Restate the question in your own words — it usually halves the difficulty.",
        "2. Identify which single variable changes between the case you understand and the case you are asking about.",
        "3. Apply the stage's rule to that one variable only, then re-expand.",
        "",
        "> Demo engine output. Connect a provider in Settings to get a real, model-generated answer.",
      ].join("\n")
    : [
        `## ${stepTitle}: ${topic}`,
        "",
        stepInstructions ? `_Stage goal: ${stepInstructions.split(".")[0].slice(0, 160)}._` : "",
        "",
        "### Core idea",
        `${topic} becomes tractable once you hold one organising question in mind at this stage: *what changes, and what stays fixed?* Everything below hangs off that.`,
        "",
        "### Build the model",
        bullets(topic, stepTitle, ["Definition", "Mechanism", "Boundary case"]),
        "",
        "### Worked example",
        "```text",
        `Given   : a typical scenario in ${topic}`,
        "Step 1  : identify the governing principle",
        "Step 2  : apply it to the specific numbers / facts",
        "Step 3  : sanity-check the result against a limiting case",
        "```",
        "",
        "### Check yourself",
        "1. State the central principle in one sentence without looking back.",
        "2. Name one situation where it does **not** apply, and say why.",
        "3. Predict what happens if the main variable doubles.",
        "",
        "> Demo engine output — a deterministic scaffold, not a language model. Add a provider key in Settings to run this stage against a real model.",
      ]
        .filter(Boolean)
        .join("\n");

  const state = {
    understanding: `Demo scaffold delivered for the "${stepTitle}" stage.`,
    mastered: [`${stepTitle} scaffold reviewed`],
    gaps: ["Real model output not yet generated"],
    misconceptions: [],
    nextFocus: "Connect a provider to generate genuine teaching content.",
    checkpoints: [{ label: `${stepTitle} viewed`, done: true }],
  };

  return `${body}\n${STATE_SENTINEL}\n${JSON.stringify(state)}`;
}

export async function* demoStream(messages: ChatMessage[]): AsyncGenerator<{ type: "content"; text: string }> {
  const full = demoResponse(messages);
  const chunks = full.match(/[\s\S]{1,24}/g) ?? [];
  for (const chunk of chunks) {
    await new Promise((resolve) => setTimeout(resolve, 12));
    yield { type: "content", text: chunk };
  }
}
