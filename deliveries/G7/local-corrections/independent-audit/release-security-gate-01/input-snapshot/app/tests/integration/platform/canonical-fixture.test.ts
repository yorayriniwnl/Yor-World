import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { QueryableDb } from "@/server/contact/quota";

describe("Explicit browser fixture connection ownership across Next route bundles", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

  it("initializes the same file database once across independently loaded route modules", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "yor-rc3-fixture-"));
    vi.stubEnv("YOR_E2E_FIXTURE", "1");
    vi.stubEnv("YOR_TEST_DATABASE_PATH", directory);
    const firstModule = await import("@/server/database");
    const firstPending = firstModule.getPlatformDb();
    vi.resetModules();
    const secondModule = await import("@/server/database");
    const [first, second] = await Promise.all([firstPending, secondModule.getPlatformDb()]);
    try {
      expect(first).toBe(second);
      expect((await second.query("SELECT COUNT(*)::int AS count FROM public.published_content")).rows).toEqual([{ count: 1 }]);
      await first.query("UPDATE public.published_content SET revision=17");
      expect((await second.query("SELECT revision FROM public.published_content")).rows).toEqual([{ revision: 17 }]);
    } finally {
      await (first as QueryableDb & { close(): Promise<void> }).close();
      (globalThis as typeof globalThis & { __yorRc3FixtureDatabases?: Map<string, Promise<QueryableDb>> }).__yorRc3FixtureDatabases?.delete(directory);
    }
  });
});
