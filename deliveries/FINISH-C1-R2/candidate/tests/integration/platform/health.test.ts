import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { NextRequest } from "next/server";
import { GET, HEAD } from "@/app/api/health/route";
import { HEALTH_PROBE_TIMEOUT_MS } from "@/server/health";
import { createServer, type Socket } from "node:net";

const adapter = vi.hoisted(() => ({ query: vi.fn(), end: vi.fn(), native: false }));
vi.mock("pg", async (importOriginal) => {
  const postgres = await importOriginal<typeof import("pg")>();
  return { Client: class {
    constructor(config: import("pg").ClientConfig) {
      if (adapter.native) return new postgres.Client(config) as unknown as this;
    }
    on() { return this; }
    async connect() {}
    query(sql: string) { return adapter.query(sql); }
    end() { return adapter.end(); }
  } };
});

describe("Health route with explicit local embedded-SQL test adapter", () => {
  let database: PGlite;
  beforeAll(async () => {
    database = new PGlite();
    await database.exec("CREATE TABLE health_write_sentinel (value integer); INSERT INTO health_write_sentinel VALUES (42)");
  });
  beforeEach(() => {
    for (const name of ["DATABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_URL",
      "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_KEY", "YOR_E2E_FIXTURE", "YOR_TEST_DATABASE_PATH"]) vi.stubEnv(name, "");
    vi.stubEnv("DATABASE_URL", "postgresql://synthetic:synthetic@health-test.example/health");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://health-auth-test.example");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "synthetic-anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "synthetic-service-role-key");
    adapter.query.mockReset().mockImplementation((sql: string) => database.query(sql));
    adapter.end.mockReset().mockResolvedValue(undefined);
    adapter.native = false;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => Response.json({ name: "GoTrue" })));
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
  afterAll(async () => { await database.close(); });
  const request = (suffix = "") => new NextRequest("http://localhost/api/health" + suffix);

  it("default readiness 200 executes a real SELECT without mutating local SQL data", async () => {
    const result = await GET(request());
    expect(result.status).toBe(200);
    expect(await result.json()).toMatchObject({ probe: "readiness", readiness: "ready",
      checks: { database: "reachable", authentication: "reachable" } });
    expect(adapter.query).toHaveBeenCalledExactlyOnceWith("SELECT 1::integer AS health");
    expect((await database.query("SELECT value FROM health_write_sentinel")).rows).toEqual([{ value: 42 }]);
    expect(result.headers.get("cache-control")).toContain("no-store");
  });

  it("missing DB/Auth config gives readiness 503, while explicit liveness is process-only 200", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const readiness = await GET(request());
    expect(readiness.status).toBe(503);
    expect(await readiness.json()).toMatchObject({ liveness: "alive", readiness: "not_ready",
      checks: { database: "missing_configuration", authentication: "missing_configuration" } });
    const liveness = await GET(request("?probe=liveness"));
    expect(liveness.status).toBe(200);
    expect(await liveness.json()).toMatchObject({ probe: "liveness", readiness: "not_checked" });
    expect(adapter.query).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("dependency outages give safe noncacheable 503 without provider data", async () => {
    adapter.query.mockRejectedValue(new Error("secret connection token=synthetic-private-value"));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("provider stack secret", { status: 503 })));
    const result = await GET(request());
    expect(result.status).toBe(503);
    expect(result.headers.get("cache-control")).toContain("no-store");
    const body = await result.json();
    expect(body.checks).toEqual({ database: "unavailable", authentication: "unavailable" });
    expect(JSON.stringify(body)).not.toMatch(/secret|synthetic|stack|token/);
  });

  it("production-mode fixture configuration remains unready without initializing a fixture", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("YOR_E2E_FIXTURE", "1");
    vi.stubEnv("YOR_TEST_DATABASE_PATH", "private-synthetic-path");
    const result = await GET(request());
    expect(result.status).toBe(503);
    expect(await result.json()).toMatchObject({ checks: { database: "fixture_rejected", authentication: "fixture_rejected" } });
    expect(adapter.query).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("invalid probe is rejected before dependency checks and HEAD preserves health status without a body", async () => {
    const invalid = await GET(request("?probe=misleading-secret-value"));
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({ error: "invalid_probe" });
    expect(adapter.query).not.toHaveBeenCalled();
    const head = await HEAD(request("?probe=liveness"));
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
    expect(head.headers.get("cache-control")).toContain("no-store");
  });

  it("native pg transport times out and closes an unresponsive local TCP peer", async () => {
    // This is a network cancellation test, not a successful production PostgreSQL check.
    const sockets = new Set<Socket>();
    let accepted = 0;
    const server = createServer((socket) => {
      accepted++;
      sockets.add(socket);
      socket.on("error", () => undefined);
      socket.on("close", () => sockets.delete(socket));
      socket.resume(); // Accept startup bytes without responding with a PostgreSQL handshake.
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Local test peer address unavailable");
    adapter.native = true;
    vi.stubEnv("DATABASE_URL", `postgresql://synthetic:synthetic@127.0.0.1:${address.port}/health`);
    const started = performance.now();
    try {
      const result = await GET(request());
      expect(result.status).toBe(503);
      expect((await result.json()).checks.database).toBe("timed_out");
      expect(performance.now() - started).toBeLessThan(HEALTH_PROBE_TIMEOUT_MS + 800);
      expect(accepted).toBe(1);
      await vi.waitFor(() => expect(sockets.size).toBe(0), { timeout: 500 });
      expect(adapter.query).not.toHaveBeenCalled();
    } finally {
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
