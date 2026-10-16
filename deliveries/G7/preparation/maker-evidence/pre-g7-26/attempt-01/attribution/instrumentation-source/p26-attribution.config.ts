import { defineConfig } from "@playwright/test";

const port = Number(process.env.PORT ?? 3181);
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:" + port,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    trace: "off",
    screenshot: "off",
    video: "off",
    headless: true,
  },
  projects: [
    { name: "chrome", use: { browserName: "chromium" as const, channel: "chrome" } },
    { name: "edge", use: { browserName: "chromium" as const, channel: "msedge" } },
  ],
  webServer: {
    command: "node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port " + port,
    url: "http://127.0.0.1:" + port,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_TELEMETRY_DISABLED: "1",
      NEXT_PUBLIC_PRE_G7_13_EVIDENCE: "1",
    },
    stdout: "pipe",
    stderr: "pipe",
  },
});

