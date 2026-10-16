import { defineConfig } from "@playwright/test";

const port = Number(process.env.P28_SERVER_PORT || "3291");
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "p28-render-attribution.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  reporter: "line",
  outputDir: process.env.P28_PLAYWRIGHT_OUTPUT_DIR || "../deliveries/G7/preparation/maker-evidence/pre-g7-28/attempt-01/commands/playwright-output",
  use: {
    baseURL,
    headless: true,
    trace: "off",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    { name: "chrome", use: { channel: "chrome" } },
    { name: "edge", use: { channel: "msedge" } },
  ],
  webServer: {
    command: `pnpm exec next start --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    timeout: 60_000,
    reuseExistingServer: false,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      NEXT_PUBLIC_PRE_G7_13_EVIDENCE: "1",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
