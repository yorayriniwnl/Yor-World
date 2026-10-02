import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "server-only": path.resolve(import.meta.dirname, "tests/fixtures/server-only.ts"),
      "@": path.resolve(import.meta.dirname ?? process.cwd(), "src"),
    },
  },
  test: { include: ["tests/integration/**/*.test.ts"], environment: "node", passWithNoTests: false, testTimeout: 60_000, hookTimeout: 90_000 },
});
