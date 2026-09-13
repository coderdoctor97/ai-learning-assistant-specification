import { expect, test } from "@playwright/test";

/*
 * End-to-end behavioral regression gate (zero behavioral mutation):
 * create → generate → Q&A → disclosure → complete all stages → export.
 * Runs entirely on the offline demo engine, so no provider key is needed.
 */
test.describe.configure({ mode: "serial" });

const topic = `Behavioral flow ${Date.now()} — loop of Henle`;

test("full studio flow", async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto("/studio");
  await page.getByRole("heading", { level: 1 }).waitFor();

  // -- Create a session -------------------------------------------------
  await page.getByRole("button", { name: /New learning session/ }).click();
  await page.getByRole("heading", { level: 1, name: "What do you want to understand?" }).waitFor();

  const topicField = page.locator("#new-session-topic");
  await topicField.fill(topic);

  // Validation: clearing the topic must surface the inline Zod error.
  await topicField.fill("");
  await topicField.blur();
  await page.locator("#new-session-topic").clear();
  await page.keyboard.press("Tab");
  await page.locator("#new-session-topic-error").waitFor();
  await topicField.fill(topic);

  // Dirty-state: the submit gate unlocks only with a valid topic.
  const submit = page.getByRole("button", { name: /Start learning/ });
  await expect(submit).toBeEnabled();
  await submit.click();

  // -- Stage 1 streams in ------------------------------------------------
  await page.getByRole("heading", { level: 1, name: topic }).waitFor();
  const activePill = page.locator('.step-pill[data-active="true"]');
  await expect(activePill).toHaveAttribute("aria-current", "step");
  const stageCard = page.locator(".stage-card");
  await expect(stageCard).toBeVisible();
  await expect(stageCard).not.toHaveAttribute("aria-busy", "true", { timeout: 180_000 });

  const stageBody = page.locator(".stage-body");
  await expect(stageBody).toContainText(/./, { timeout: 180_000 });

  // -- Per-stage Q&A -----------------------------------------------------
  const composer = page.locator(".composer-input");
  await composer.fill("Why does the loop of Henle need two limbs?");
  await page.keyboard.press("Control+Enter");
  const thread = page.locator(".thread");
  await expect(thread.locator(".msg-user").last()).toContainText("two limbs");
  await expect(thread.locator(".msg-assistant").last()).toContainText("Demo engine", { timeout: 120_000 });

  // -- Disclosure contract ------------------------------------------------
  const sourcesFold = page.locator(".fold-head", { hasText: "Sources used" });
  await expect(sourcesFold).toHaveAttribute("aria-expanded", "false");
  await sourcesFold.click();
  await expect(sourcesFold).toHaveAttribute("aria-expanded", "true");
  const panelId = await sourcesFold.getAttribute("aria-controls");
  if (panelId) await expect(page.locator(`#${panelId}`)).toBeVisible();
  await sourcesFold.click();
  await expect(sourcesFold).toHaveAttribute("aria-expanded", "false");

  // -- Regeneration with modifier buttons ----------------------------------
  const regenerate = page.getByRole("button", { name: "↻ Regenerate" }).first();
  await regenerate.click();
  await expect(page.locator(".stage-card")).toHaveAttribute("aria-busy", "true", { timeout: 30_000 });
  await expect(page.locator(".stage-card")).not.toHaveAttribute("aria-busy", "true", { timeout: 180_000 });

  // -- Complete the sequence ------------------------------------------------
  for (let index = 0; index < 8; index += 1) {
    const next = page.getByRole("button", { name: /Generate next stage/ });
    if (!(await next.isVisible().catch(() => false))) break;
    await next.click();
    await expect(page.locator(".stage-card")).not.toHaveAttribute("aria-busy", "true", { timeout: 180_000 });
  }

  // Export unlocks once every stage is generated.
  const exportBar = page.locator(".export-bar");
  await expect(exportBar).toBeVisible({ timeout: 60_000 });
  const pdfLink = exportBar.locator('a[href*="format=pdf"]');
  await expect(pdfLink).toBeVisible();

  // Progress rail reflects completion.
  await expect(page.locator(".step-pill")).toHaveCount(6, { timeout: 30_000 });
});

test.afterAll(async ({ request }) => {
  // Remove sessions created by the flow.
  const state = (await (await request.get("/api/state")).json()) as {
    sessions: { id: string; title: string }[];
  };
  for (const session of state.sessions) {
    if (session.title.startsWith("Behavioral flow")) {
      await request.delete(`/api/sessions/${session.id}`).catch(() => undefined);
    }
  }
});
