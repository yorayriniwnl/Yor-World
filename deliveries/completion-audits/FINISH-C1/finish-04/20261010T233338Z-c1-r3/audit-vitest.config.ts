import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  root: import.meta.dirname,
  resolve: { alias: {
    "server-only": path.resolve(import.meta.dirname, "assembly/app/tests/fixtures/server-only.ts"),
    "@": path.resolve(import.meta.dirname, "assembly/app/src"),
  } },
  test: { include: ["audit-contract.test.ts"], environment: "node", testTimeout: 10_000, hookTimeout: 10_000, maxWorkers: 1 },
});

