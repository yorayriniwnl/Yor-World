import { defineConfig } from "@playwright/test";
import path from "node:path";

const port = Number(process.env.PORT ?? 3133);
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["json", { outputFile: path.join(process.env.G1_EVIDENCE_DIR ?? process.env.W3_EVIDENCE_DIR ?? "test-results", "browser-results.json") }]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    trace: "off",
    screenshot: "only-on-failure",
    video: "on",
    headless: true,
  },
  projects: [
    { name: "chrome", use: { browserName: "chromium", channel: "chrome" } },
    { name: "edge", use: { browserName: "chromium", channel: "msedge" } },
  ],
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
