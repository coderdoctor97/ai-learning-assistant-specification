import { defineConfig } from "@playwright/test";

/** Server-free, deterministic provider and engine contracts. No live keys needed. */
export default defineConfig({
  testDir: "./tests/contracts",
  testMatch: "**/*.spec.ts",
  workers: 1,
  reporter: "list",
});
