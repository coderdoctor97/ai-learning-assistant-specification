import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { AppState, SessionDetail } from "@/lib/client/api";
import { cleanupSessions, openSession, seedSession } from "../support/seed";

test.afterEach(async ({ request }) => { await cleanupSessions(request); });

// Mock browser-facing state only: never change the shared demo provider or use
// live credentials. Server-side protocol/ingest behavior has separate contracts.
test("audio attachment is keyboard accessible, PDF chip is honest, and controls pass axe", async ({ page, request }) => {
  const topic = `Multimodal controls ${Date.now()}`;
  const id = await seedSession(request, topic);
  const state = await (await request.get("/api/state")).json() as AppState;
  const provider = state.providers.find((entry) => entry.kind === "abhibots")!;
  state.settings.activeProviderId = provider.id;
  state.settings.activeModelId = "claude-opus-4-7";
  state.models.push({ id: "mock-claude", providerId: provider.id, modelId: "claude-opus-4-7", displayName: "Claude contract model",
    contextLength: 200000, maxOutput: 8192, capabilities: { vision: true, documents: true, voice: true, tools: true, reasoning: true, streaming: true },
    pricing: null, isFree: false });
  const detail = await (await request.get(`/api/sessions/${id}`)).json() as SessionDetail;
  detail.attachments.push({ id: "pdf-contract", name: "notes.pdf", kind: "document", mime: "application/pdf", size: 24,
    hasText: true, hasBinary: true, createdAt: new Date(0).toISOString() });
  await page.route("**/api/state", (route) => route.fulfill({ json: state }));
  await page.route(`**/api/sessions/${id}`, (route) => route.fulfill({ json: detail }));
  await openSession(page, topic);
  const audio = page.getByRole("button", { name: "Attach audio clip", exact: true });
  await expect(audio).toBeVisible();
  const box = await audio.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(24); expect(box!.height).toBeGreaterThanOrEqual(24);
  await expect(page.getByText("Sent as document", { exact: true })).toBeVisible();
  await audio.focus();
  const chooserPromise = page.waitForEvent("filechooser");
  await page.keyboard.press("Enter");
  const chooser = await chooserPromise;
  await chooser.setFiles([]); // Cancel the native file picker; no recording UI.
  await page.keyboard.press("Escape");
  await expect(audio).toBeFocused();
  const violations = (await new AxeBuilder({ page }).include(".attach-row").withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze()).violations;
  expect(violations).toEqual([]);

  // Re-select a text-only family through the mocked active state, not the DB.
  state.settings.activeModelId = "gpt-4.1-mini";
  state.models.push({ ...state.models.at(-1)!, id: "mock-mini", modelId: "gpt-4.1-mini", displayName: "Mini contract model",
    capabilities: { vision: false, documents: false, voice: true, tools: false, reasoning: false, streaming: true } });
  await page.reload();
  await page.getByRole("button", { name: topic, exact: false }).first().click();
  await expect(page.getByText("Sent as document", { exact: true })).toHaveCount(0);
  await expect(page.locator('.attach-row input[type="file"]').first()).not.toHaveAttribute("accept", /image/);
  await page.goto("/settings");
  await page.getByRole("tab", { name: "Learner & generation", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: /Native web tools/ })).toBeDisabled();
});

test("built-in provider card and native-tools default are visible without a key", async ({ page }) => {
  await page.goto("/settings");
  const heading = page.getByRole("heading", { name: "AbhiBots Opus Gateway", exact: true });
  await expect(heading).toBeVisible();
  const card = page.locator(".card").filter({ has: heading });
  await expect(card.getByRole("textbox", { name: "Base URL", exact: true })).toHaveValue("https://opus.abhibots.com/v1");
  await expect(card.getByText(/Multi-family gateway/)).toBeVisible();
  await page.getByRole("tab", { name: "Learner & generation", exact: true }).click();
  const tools = page.getByRole("checkbox", { name: /Native web tools/ });
  await expect(tools).not.toBeChecked();
  await expect(tools).toBeDisabled(); // demo engine has no native tools
});
