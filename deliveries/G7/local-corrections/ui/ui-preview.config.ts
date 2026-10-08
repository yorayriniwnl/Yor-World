import base from "../../../../app/playwright.config";
import path from "node:path";
const root = (file: string) => path.resolve(__dirname, file);
export default {
  ...base,
  testDir: root("../../../../app/tests/e2e"),
  testMatch: "local-studio-usability.spec.ts",
  outputDir: root(`${process.env.UI_RUN_DIR ?? "./raw"}/playwright`),
  reporter: [["list"], ["json", { outputFile: root(`${process.env.UI_RUN_DIR ?? "./raw"}/browser-results.json`) }]],
  use: { ...base.use, baseURL: process.env.UI_PREVIEW_URL ?? "http://127.0.0.1:3140" },
  projects: base.projects?.filter((project) => project.name === "chrome"),
  webServer: undefined,
};
