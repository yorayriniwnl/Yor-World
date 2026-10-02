import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname ?? process.cwd(), "src"),
    },
  },
  test: { include: ["tests/integration/**/*.test.ts"], environment: "node", passWithNoTests: false },
});
