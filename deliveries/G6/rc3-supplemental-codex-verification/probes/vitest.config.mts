import path from "node:path";
import { defineConfig } from "../../../../app/node_modules/vitest/dist/config.js";

const repository = path.resolve(import.meta.dirname, "../../../..");
const application = path.join(repository, "app");

export default defineConfig({
  root: application,
  resolve: {
    alias: {
      "@": path.join(application, "src"),
      "server-only": path.join(application, "tests/fixtures/server-only.ts"),
      vitest: path.join(application, "node_modules/vitest/dist/index.js"),
      "@electric-sql/pglite": path.join(application, "node_modules/@electric-sql/pglite/dist/index.js"),
    },
  },
  test: {
    include: [path.join(import.meta.dirname, "*-probe.test.ts").replaceAll("\\", "/")],
    environment: "node",
    passWithNoTests: false,
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 90_000,
  },
});
