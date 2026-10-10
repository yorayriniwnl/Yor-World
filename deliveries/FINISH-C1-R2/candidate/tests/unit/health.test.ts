import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkHealth, HEALTH_PROBE_TIMEOUT_MS } from "@/server/health";
import type { Socket } from "node:net";

const postgres = vi.hoisted(() => ({
  configs: [] as Array<Record<string, unknown>>, sockets: [] as Socket[], connect: vi.fn(), query: vi.fn(), end: vi.fn(),
}));
vi.mock("pg", () => ({ Client: class {
  constructor(config: Record<string, unknown>) {
    postgres.configs.push(config);
    postgres.sockets.push((config.stream as () => Socket)());
  }
  on() { return this; }
  connect() { return postgres.connect(); }
  query(sql: string) { return postgres.query(sql); }
  end() { return postgres.end(); }
} }));

const databaseUrl = "postgresql://synthetic-db-user:synthetic-db-secret@health-db.example/health";
const anonKey = "synthetic-anon-key";
const serviceKey = "synthetic-service-secret";
const configuration = ["DATABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_URL",
  "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_KEY", "YOR_E2E_FIXTURE", "YOR_TEST_DATABASE_PATH"];
let authFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  for (const name of configuration) vi.stubEnv(name, "");
  vi.stubEnv("DATABASE_URL", databaseUrl);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://health-auth.example");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", anonKey);
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", serviceKey);
  postgres.configs = [];
  postgres.sockets = [];
  postgres.connect.mockReset().mockResolvedValue(undefined);
  postgres.query.mockReset().mockResolvedValue({ rows: [{ health: 1 }] });
  postgres.end.mockReset().mockResolvedValue(undefined);
  authFetch = vi.fn().mockImplementation(async () => Response.json({ name: "GoTrue", version: "synthetic" }));
  vi.stubGlobal("fetch", authFetch);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("Health dependency reachability contract", () => {
  it("liveness makes no dependency call and never asserts readiness", async () => {
    for (const name of configuration) vi.stubEnv(name, "");
    const result = await checkHealth("liveness");
    expect(result).toMatchObject({ probe: "liveness", liveness: "alive", readiness: "not_checked",
      checks: { database: "not_checked", authentication: "not_checked" } });
    expect(postgres.connect).not.toHaveBeenCalled();
    expect(authFetch).not.toHaveBeenCalled();
  });

  it("requires actual read-only PostgreSQL result and Auth health identity", async () => {
    const result = await checkHealth("readiness");
    expect(result.readiness).toBe("ready");
    expect(result.checks).toEqual({ database: "reachable", authentication: "reachable" });
    expect(postgres.query).toHaveBeenCalledExactlyOnceWith("SELECT 1::integer AS health");
    expect(postgres.end).toHaveBeenCalledTimes(1);
    expect(postgres.sockets[0]?.destroyed).toBe(true);
    expect(postgres.configs[0]).toMatchObject({ connectionString: databaseUrl,
      connectionTimeoutMillis: HEALTH_PROBE_TIMEOUT_MS, query_timeout: HEALTH_PROBE_TIMEOUT_MS,
      statement_timeout: HEALTH_PROBE_TIMEOUT_MS });
    const [url, options] = authFetch.mock.calls[0]!;
    expect(String(url)).toBe("https://health-auth.example/auth/v1/health");
    expect(options).toMatchObject({ method: "GET", headers: { apikey: anonKey }, redirect: "error", cache: "no-store" });
    expect(result.scope).toContain("MFA, RLS, mail");
    for (const value of [databaseUrl, anonKey, serviceKey, "health-auth.example", "synthetic"]) {
      expect(JSON.stringify(result)).not.toContain(value);
    }
  });

  it.each(["DATABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"])(
    "missing core %s cannot claim ready", async (name) => {
      vi.stubEnv(name, "");
      const result = await checkHealth("readiness");
      expect(result.readiness).toBe("not_ready");
      expect(Object.values(result.checks)).toContain("missing_configuration");
    },
  );

  it("uses existing server-only environment aliases", async () => {
    for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) vi.stubEnv(name, "");
    vi.stubEnv("SUPABASE_URL", "https://alias-auth.example");
    vi.stubEnv("SUPABASE_ANON_KEY", anonKey);
    vi.stubEnv("SUPABASE_SERVICE_KEY", serviceKey);
    expect((await checkHealth("readiness")).readiness).toBe("ready");
    expect(String(authFetch.mock.calls[0]![0])).toBe("https://alias-auth.example/auth/v1/health");
  });

  it.each(["YOR_E2E_FIXTURE", "YOR_TEST_DATABASE_PATH"])("rejects production fixture configuration %s before opening dependencies", async (name) => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv(name, name === "YOR_E2E_FIXTURE" ? "1" : "synthetic-private-path");
    const result = await checkHealth("readiness");
    expect(result.checks).toEqual({ database: "fixture_rejected", authentication: "fixture_rejected" });
    expect(result.readiness).toBe("not_ready");
    expect(postgres.connect).not.toHaveBeenCalled();
    expect(authFetch).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain("synthetic-private-path");
  });

  it("rejects malformed database and unsafe Auth URLs without opening those dependencies", async () => {
    vi.stubEnv("DATABASE_URL", "https://db-connection-secret.example");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://user:password@auth.example/private?token=secret");
    const result = await checkHealth("readiness");
    expect(result.checks).toEqual({ database: "invalid_configuration", authentication: "invalid_configuration" });
    expect(postgres.connect).not.toHaveBeenCalled();
    expect(authFetch).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toMatch(/password|secret|auth\.example/);
  });

  it("provider failures are unavailable without leaking error bodies or connection values", async () => {
    postgres.connect.mockRejectedValue(new Error(`connect failed ${databaseUrl} ${serviceKey}`));
    authFetch.mockResolvedValue(new Response(`provider denied ${anonKey} ${serviceKey}`, { status: 401 }));
    const result = await checkHealth("readiness");
    expect(result.checks).toEqual({ database: "unavailable", authentication: "unavailable" });
    expect(JSON.stringify(result)).not.toMatch(/connect failed|provider denied|synthetic/);
    expect(postgres.end).toHaveBeenCalledTimes(1);
  });

  it("a fake successful DB result or generic HTTP 200 page cannot mark dependencies reachable", async () => {
    postgres.query.mockResolvedValue({ rows: [] });
    authFetch.mockResolvedValue(new Response("<html>generic landing page</html>", { status: 200 }));
    const result = await checkHealth("readiness");
    expect(result.checks).toEqual({ database: "unavailable", authentication: "unavailable" });
  });

  it("bounds the Auth response body and cancels oversized provider streams", async () => {
    let cancelled = false;
    authFetch.mockResolvedValue(new Response(new ReadableStream({
      start(controller) { controller.enqueue(new Uint8Array(4097)); }, cancel() { cancelled = true; },
    })));
    const result = await checkHealth("readiness");
    expect(result.checks.authentication).toBe("unavailable");
    expect(cancelled).toBe(true);
  });

  it("one deadline cancels hung connection/fetch probes and releases single-flight state", async () => {
    vi.useFakeTimers();
    postgres.connect.mockImplementation(() => new Promise(() => undefined));
    authFetch.mockImplementation(() => new Promise(() => undefined));
    const result = checkHealth("readiness");
    await vi.advanceTimersByTimeAsync(HEALTH_PROBE_TIMEOUT_MS + 200);
    expect((await result).checks).toEqual({ database: "timed_out", authentication: "timed_out" });
    expect(postgres.end).toHaveBeenCalledTimes(1);
    expect((authFetch.mock.calls[0]![1] as RequestInit).signal?.aborted).toBe(true);
    expect(postgres.sockets[0]?.destroyed).toBe(true);
    postgres.connect.mockResolvedValue(undefined);
    authFetch.mockImplementation(async () => Response.json({ name: "GoTrue" }));
    expect((await checkHealth("readiness")).readiness).toBe("ready");
  });

  it("a hung query or Auth response body is cancelled and cleanup cannot block the response", async () => {
    vi.useFakeTimers();
    postgres.query.mockImplementation(() => new Promise(() => undefined));
    postgres.end.mockImplementation(() => new Promise(() => undefined));
    let cancelled = false;
    authFetch.mockResolvedValue(new Response(new ReadableStream({ cancel() { cancelled = true; } })));
    const result = checkHealth("readiness");
    await vi.advanceTimersByTimeAsync(HEALTH_PROBE_TIMEOUT_MS + 200);
    expect((await result).checks).toEqual({ database: "timed_out", authentication: "timed_out" });
    expect(cancelled).toBe(true);
    expect(postgres.end).toHaveBeenCalledTimes(1);
    expect(postgres.sockets[0]?.destroyed).toBe(true);
  });

  it("coalesces concurrent probes without caching completed dependency results", async () => {
    let release: (() => void) | undefined;
    postgres.connect.mockImplementation(() => new Promise<void>((resolve) => { release = resolve; }));
    const pending = Array.from({ length: 20 }, () => checkHealth("readiness"));
    await Promise.resolve();
    expect(postgres.connect).toHaveBeenCalledTimes(1);
    release!();
    const results = await Promise.all(pending);
    expect(results.every((result) => result.readiness === "ready")).toBe(true);
    expect(authFetch).toHaveBeenCalledTimes(1);
    postgres.connect.mockRejectedValue(new Error("synthetic later outage"));
    expect((await checkHealth("readiness")).checks.database).toBe("unavailable");
    expect(postgres.connect).toHaveBeenCalledTimes(2);
  });
});
