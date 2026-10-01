import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    passWithNoTests: false,
    testTimeout: 60_000,
    hookTimeout: 90_000,
  },
});
