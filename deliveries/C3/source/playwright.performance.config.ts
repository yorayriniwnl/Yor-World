import { defineConfig } from "@playwright/test";
import path from "node:path";

const port = Number(process.env.PORT ?? 3198);
const evidenceDir = process.env.C3_EVIDENCE_DIR || "test-results";

export default defineConfig({
  testDir: "./tests/performance",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000, // Allow sustained runs
  reporter: [
    ["list"],
    ["json", { outputFile: path.join(evidenceDir, "performance-results.json") }],
  ],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    trace: "off",
    video: "off",
    headless: true,
  },
  projects: process.env.CI
    ? [{ name: "chromium", use: { browserName: "chromium" } }]
    : [{ name: "chrome", use: { browserName: "chromium", channel: "chrome" } }],
  webServer: {
    command: `node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: { NEXT_TELEMETRY_DISABLED: "1" },
    stdout: "ignore",
    stderr: "pipe",
  },
});
