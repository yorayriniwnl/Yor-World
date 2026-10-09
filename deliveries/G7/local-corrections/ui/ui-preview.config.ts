import base from "../../../../app/playwright.config";
import path from "node:path";
import { mkdirSync, existsSync } from "node:fs";
const root = (file: string) => path.resolve(__dirname, file);
if (!process.env.UI_RUN_DIR) throw new Error("UI_RUN_DIR must name a new, unique attempt directory; historical raw output is immutable.");
const attemptRoot = root(process.env.UI_RUN_DIR);
if (!attemptRoot.startsWith(root(".") + path.sep) || attemptRoot === root("raw")) throw new Error("UI_RUN_DIR must be a distinct child of the UI evidence root.");
if (existsSync(attemptRoot)) throw new Error("UI attempt directory already exists; preserve it and select a fresh attempt.");
mkdirSync(attemptRoot);
export default {
  ...base,
  testDir: root("../../../../app/tests/e2e"),
  testMatch: process.env.TEST_MATCH ? process.env.TEST_MATCH : "local-studio-usability.spec.ts",
  outputDir: path.join(attemptRoot, "playwright"),
  reporter: [["list"], ["json", { outputFile: path.join(attemptRoot, "browser-results.json") }]],
  use: { ...base.use, baseURL: process.env.UI_PREVIEW_URL ?? "http://127.0.0.1:3140" },
  projects: base.projects?.filter((project) => project.name === "chrome"),
  webServer: undefined,
};
