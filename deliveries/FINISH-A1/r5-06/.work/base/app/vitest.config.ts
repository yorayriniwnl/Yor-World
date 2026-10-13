import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "server-only": path.resolve(import.meta.dirname, "tests/fixtures/server-only.ts"),
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  test: { include: ["tests/unit/**/*.test.ts"], environment: "node" },
});
