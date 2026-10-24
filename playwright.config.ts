import { defineConfig } from "@playwright/test";

// The runner creates its own database schema, credentials and upload directory.
if (process.env.E2E_ISOLATED !== "1") {
  throw new Error("Execute npm run test:e2e para usar o ambiente isolado.");
}

export default defineConfig({
  testDir: "tests/e2e", testMatch: "**/*.spec.ts",
  outputDir: "test-results/playwright",
  fullyParallel: false, workers: 1, retries: 0, timeout: 120_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["json", { outputFile: "test-results/e2e.json" }], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3100", browserName: "chromium",
    viewport: { width: 1366, height: 900 }, locale: "pt-BR", colorScheme: "light",
    // Login cookies and password fields must never be stored in traces or videos.
    trace: "off", video: "off", screenshot: "off"
  },
  webServer: {
    command: "node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3100",
    url: "http://127.0.0.1:3100/login", reuseExistingServer: false, timeout: 90_000
  }
});
