import { defineConfig } from "vitest/config";

// Reserved for A3–A6. No backend is implemented or required by this A1 proof.
// An empty suite intentionally fails instead of reporting a false pass.
export default defineConfig({
  test: { include: ["tests/integration/**/*.test.ts"], environment: "node", passWithNoTests: false },
});
