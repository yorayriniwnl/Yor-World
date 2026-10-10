import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { Client } from "pg";
import { readFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { QueryableDb } from "../../../src/server/contact/quota";
import type { GitHubMetadata } from "../../../src/server/integrations/github";
import { createDatabaseBackup,restoreDatabaseFromBackup } from "../../../src/server/operations/backup-restore";

const repo = "yorayriniwnl/helios";
const t0 = new Date("2026-10-05T00:00:00.000Z");
const hour = 3_600_000;
const migration = "20261005000000_github_refresh_state.sql";
type Integration = typeof import("../../../src/server/integrations/github");
const success = (name = "last-good") => new Response(JSON.stringify({ name, stargazers_count: 7 }), { status: 200 });

async function instance(handle: QueryableDb): Promise<Integration> {
  vi.resetModules();
  const database = await import("../../../src/server/database");
  database.setPlatformDbForTests(handle);
  return import("../../../src/server/integrations/github");
}

// Default: real PostgreSQL SQL in one embedded PGlite backend, with distinct
// wrappers, NOT independent sessions. An explicitly supplied disposable local
// URL runs this same suite through two genuinely independent pg.Client sessions.
describe("SCP-07 durable GitHub attempt coordination", () => {
  let embedded: PGlite | undefined;
  let clients: Client[] = [];
  let admin: QueryableDb;
  let handles: QueryableDb[];
  let modules: Integration[];
  let claims: number;

  beforeAll(async () => {
    const testUrl = process.env.YOR_GITHUB_TEST_DATABASE_URL;
    if (testUrl) {
      clients = [new Client({ connectionString: testUrl }), new Client({ connectionString: testUrl })];
      await Promise.all(clients.map((client) => client.connect()));
      admin = { query: async (sql, params = []) => ({ rows: (await clients[0]!.query(sql, params)).rows }) };
    } else {
      embedded = new PGlite();
      admin = embedded;
    }
    for (const file of ["20261001000000_a3_owner_auth_rls.sql", "20261001000001_a4_publication_media.sql", migration]) {
      const sql = await readFile(`supabase/migrations/${file}`, "utf8");
      if (embedded) await embedded.exec(sql);
      else await clients[0]!.query(sql);
    }
    handles = [0,1].map((index) => ({ query: async (sql, params = []) => {
      if (sql.includes("INSERT INTO public.github_refresh_state")) claims++;
      return embedded ? embedded.query(sql,params) : { rows: (await clients[index]!.query(sql,params)).rows };
    } }));
  });
  beforeEach(async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("VITEST", "true");
    await admin.query("TRUNCATE public.github_refresh_state,public.github_snapshots");
    claims = 0;
    modules = [await instance(handles[0]!),await instance(handles[1]!)];
  });
  afterEach(() => { modules.forEach((module) => module.clearSnapshotCache()); vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.resetModules(); });
  afterAll(async () => {
    if (embedded) await embedded.close();
    await Promise.all(clients.map((client) => client.end()));
  });

  it("cold SQL plus ten independent module Maps and two handles permits exactly one upstream attempt", async () => {
    const independent: Integration[] = [];
    for (let index = 0; index < 10; index++) independent.push(await instance(handles[index % 2]!));
    let release!: () => void;
    let entered!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const began = new Promise<void>((resolve) => { entered = resolve; });
    let winner = -1;
    const upstream = vi.fn(async (index: number) => { winner = index; entered(); await gate; return new Response("secret body", { status: 403 }); });
    const work = independent.map((module,index) => module.getRepositoryMetadata(repo,{ now: t0,customFetch: (() => upstream(index)) as typeof fetch }));
    await began;
    // Wait for nine SQL losers before allowing the winner to finish.
    const losers = await Promise.all(work.filter((_, index) => index !== winner));
    expect(losers.every((result) => result.status === 503 && !result.success)).toBe(true);
    release();
    expect((await Promise.all(work)).every((result) => !result.success)).toBe(true);
    expect(upstream).toHaveBeenCalledTimes(1);
    expect(claims).toBe(10);
    expect((await admin.query("SELECT last_status FROM public.github_refresh_state")).rows).toEqual([{ last_status: "rate_limited" }]);
  });

  it.each([403,429,503,"network","json"] as const)("failure %s survives all Maps clearing and independently initialized modules until exact hour", async (failure) => {
    const upstream = vi.fn(async () => {
      if (failure === "network") throw new Error("TOP_SECRET Authorization: Bearer TOP_SECRET");
      return failure === "json" ? new Response("TOP_SECRET not json", { status: 200 }) : new Response("TOP_SECRET raw upstream body", { status: failure });
    });
    const first = await modules[0]!.getRepositoryMetadata(repo,{ now: t0,customFetch: upstream as typeof fetch,githubToken: "TOP_SECRET" });
    modules.forEach((module) => module.clearSnapshotCache());
    const restarted = await instance(handles[1]!);
    for (const delta of [0,1,59 * 60_000 + 59_000]) {
      expect((await restarted.getRepositoryMetadata(repo,{ now: new Date(t0.getTime() + delta),customFetch: upstream as typeof fetch })).status).toBe(503);
      restarted.clearSnapshotCache();
    }
    expect(upstream).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(first)).not.toContain("TOP_SECRET");
    const rows = (await admin.query("SELECT * FROM public.github_refresh_state")).rows;
    expect(JSON.stringify(rows)).not.toContain("TOP_SECRET");
    expect(rows[0]?.last_status).toBe(failure === "json" ? "invalid_response" : failure === "network" ? "network_error" : failure === 503 ? "upstream_error" : "rate_limited");
    const recover = vi.fn(async () => success("recovered"));
    const next = await Promise.all(modules.map((module) => module.getRepositoryMetadata(repo,{ now: new Date(t0.getTime() + hour),customFetch: recover as typeof fetch })));
    expect(recover).toHaveBeenCalledTimes(1);
    expect(next.some((result) => result.data?.name === "recovered")).toBe(true);
    expect((await admin.query("SELECT last_attempt_at,last_status FROM public.github_refresh_state")).rows[0]?.last_status).toBe("ok");
  });

  it.each([403,429,503,"network","json"] as const)("last-good SQL payload and last-success timestamp survive %s and restart", async (failure) => {
    await modules[0]!.getRepositoryMetadata(repo,{ now: t0,customFetch: (async () => success()) as typeof fetch });
    const before = (await admin.query("SELECT payload,fetched_at FROM public.github_snapshots")).rows;
    modules.forEach((module) => module.clearSnapshotCache());
    const upstream = vi.fn(async () => {
      if (failure === "network") throw new Error("TOP_SECRET");
      return failure === "json" ? new Response("TOP_SECRET", { status: 200 }) : new Response("TOP_SECRET", { status: failure });
    });
    const time = new Date(t0.getTime() + 24 * hour + 1);
    const winner = await modules[0]!.getRepositoryMetadata(repo,{ now: time,customFetch: upstream as typeof fetch });
    modules[0]!.clearSnapshotCache();
    const loser = await modules[1]!.getRepositoryMetadata(repo,{ now: time,customFetch: upstream as typeof fetch });
    for (const result of [winner,loser]) {
      expect(result.data?.name).toBe("last-good");
      expect(result.data?.fetchedAt).toBe(t0.toISOString());
      expect(result.data?.stale).toBe(true);
      if (failure === 403 || failure === 429) expect(result.data?.rateLimited).toBe(true);
      expect(JSON.stringify(result)).not.toContain("TOP_SECRET");
    }
    expect(upstream).toHaveBeenCalledTimes(1);
    expect((await admin.query("SELECT payload,fetched_at FROM public.github_snapshots")).rows).toEqual(before);
  });

  it("successful SQL snapshot loads after module restart and exact next hour has one new winner", async () => {
    const upstream = vi.fn(async () => success());
    await modules[0]!.getRepositoryMetadata(repo,{ now: t0,customFetch: upstream as typeof fetch });
    modules[0]!.clearSnapshotCache();
    expect((await modules[1]!.getRepositoryMetadata(repo,{ now: new Date(t0.getTime() + hour - 1),customFetch: upstream as typeof fetch })).data?.fetchedAt).toBe(t0.toISOString());
    expect(upstream).toHaveBeenCalledTimes(1);
    await Promise.all(modules.map((module) => module.getRepositoryMetadata(repo,{ now: new Date(t0.getTime() + hour),customFetch: upstream as typeof fetch })));
    expect(upstream).toHaveBeenCalledTimes(2);
    expect(new Date(String((await admin.query("SELECT fetched_at FROM public.github_snapshots")).rows[0]?.fetched_at)).toISOString()).toBe(new Date(t0.getTime() + hour).toISOString());
  });

  it.each(["success","failure"] as const)("late %s cannot overwrite a next-hour claim or its last-good snapshot", async (outcome) => {
    let release!: () => void;
    let entered!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const began = new Promise<void>((resolve) => { entered = resolve; });
    const oldFetch = vi.fn(async () => { entered(); await gate; return outcome === "success" ? success("obsolete") : new Response("{}", { status: 429 }); });
    const old = modules[0]!.getRepositoryMetadata(repo,{ now: t0,customFetch: oldFetch as typeof fetch });
    await began;
    const replacement = await modules[1]!.getRepositoryMetadata(repo,{ now: new Date(t0.getTime() + hour),customFetch: (async () => success("current")) as typeof fetch });
    expect(replacement.data?.name).toBe("current");
    const before = (await admin.query("SELECT * FROM public.github_refresh_state")).rows;
    release();
    expect((await old).data?.name).toBe("current");
    expect((await admin.query("SELECT * FROM public.github_refresh_state")).rows).toEqual(before);
    expect(((await admin.query("SELECT payload FROM public.github_snapshots")).rows[0]?.payload as GitHubMetadata).name).toBe("current");
  });

  it("configured SQL read/claim errors fail closed, with cached fallback and no upstream", async () => {
    const upstream = vi.fn(async () => success());
    const broken = await instance({ query: async () => { throw new Error("TOP_SECRET db connection"); } });
    expect((await broken.getRepositoryMetadata(repo,{ now: t0,customFetch: upstream as typeof fetch })).status).toBe(503);
    const payload = { repo,name: "cached",fetchedAt: t0.toISOString(),stale: false } as GitHubMetadata;
    broken.setCachedSnapshot(repo,{ repo,payload,fetchedAt: t0,isStale: false });
    expect((await broken.getRepositoryMetadata(repo,{ now: new Date(t0.getTime() + 25 * hour),customFetch: upstream as typeof fetch })).data?.stale).toBe(true);
    const claimFailure = await instance({ query: async (sql, params) => {
      if (sql.includes("INSERT INTO public.github_refresh_state")) throw new Error("TOP_SECRET claim write");
      return admin.query(sql,params);
    } });
    expect((await claimFailure.getRepositoryMetadata(repo,{ now: t0,customFetch: upstream as typeof fetch })).status).toBe(503);
    expect(upstream).not.toHaveBeenCalled();
    expect((await admin.query("SELECT * FROM public.github_refresh_state")).rows).toEqual([]);
  });

  it("production ignores injected host clocks and uses the database statement clock with full precision", async () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("VITEST", "false");
    const upstream = vi.fn(async () => new Response("{}", { status: 403 }));
    const before = (await admin.query("SELECT statement_timestamp() AS at")).rows[0]?.at;
    await modules[0]!.getRepositoryMetadata(repo,{ now: new Date("2099-01-01T00:00:00Z"),customFetch: upstream as typeof fetch });
    const row = (await admin.query("SELECT last_attempt_at,last_status FROM public.github_refresh_state")).rows[0]!;
    expect(new Date(String(row.last_attempt_at)).getTime()).toBeGreaterThanOrEqual(new Date(String(before)).getTime());
    expect(new Date(String(row.last_attempt_at)).getFullYear()).not.toBe(2099);
    expect(row.last_status).toBe("rate_limited");
    modules[0]!.clearSnapshotCache();
    await modules[1]!.getRepositoryMetadata(repo,{ now: new Date("2100-01-01T00:00:00Z"),customFetch: upstream as typeof fetch });
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it.each([false,true])("native fetch timeout retains durable cadence and last-good snapshot (warm=%s)", async (warm) => {
    let server: Server | undefined;
    let requests = 0;
    try {
      if (warm) await modules[0]!.getRepositoryMetadata(repo,{ now: t0,customFetch: (async () => success()) as typeof fetch });
      const before = (await admin.query("SELECT payload,fetched_at FROM public.github_snapshots")).rows;
      const time = warm ? new Date(t0.getTime() + 25 * hour) : t0;
      server = createServer((_request,response) => { requests++; response.writeHead(200,{ "content-type": "application/json" }); response.write("{"); });
      await new Promise<void>((resolve) => server!.listen(0,"127.0.0.1",resolve));
      const address = server.address() as AddressInfo;
      const nativeFetch = ((_url,options) => fetch(`http://127.0.0.1:${address.port}`,options)) as typeof fetch;
      const began = performance.now();
      const result = await modules[0]!.getRepositoryMetadata(repo,{ now: time,customFetch: nativeFetch });
      const duration = performance.now() - began;
      expect(result.status).toBe(warm ? 200 : 504);
      if (warm) { expect(result.data?.stale).toBe(true); expect(result.data?.fetchedAt).toBe(t0.toISOString()); }
      expect(duration).toBeGreaterThanOrEqual(3_900);
      expect(duration).toBeLessThan(6_000);
      expect((await admin.query("SELECT last_status FROM public.github_refresh_state")).rows).toEqual([{ last_status: "timeout" }]);
      modules[0]!.clearSnapshotCache();
      expect((await modules[1]!.getRepositoryMetadata(repo,{ now: time,customFetch: nativeFetch })).status).toBe(warm ? 200 : 503);
      expect(requests).toBe(1);
      expect((await admin.query("SELECT payload,fetched_at FROM public.github_snapshots")).rows).toEqual(before);
    } finally {
      server?.closeAllConnections();
      if (server) await new Promise<void>((resolve,reject) => server!.close((error) => error ? reject(error) : resolve()));
    }
  });

  it.each(["status","snapshot"] as const)("a %s completion-storage failure leaves the committed attempt authoritative", async (kind) => {
    const brokenCompletion = await instance({ query: async (sql,params) => {
      if (kind === "status" ? sql.trimStart().startsWith("UPDATE public.github_refresh_state") : sql.startsWith("WITH completed"))
        throw new Error("TOP_SECRET completion storage unavailable");
      return admin.query(sql,params);
    } });
    const upstream = vi.fn(async () => kind === "status" ? new Response("TOP_SECRET",{ status: 503 }) : success());
    await brokenCompletion.getRepositoryMetadata(repo,{ now: t0,customFetch: upstream as typeof fetch });
    brokenCompletion.clearSnapshotCache();
    expect((await modules[1]!.getRepositoryMetadata(repo,{ now: t0,customFetch: upstream as typeof fetch })).status).toBe(503);
    expect(upstream).toHaveBeenCalledTimes(1);
    expect((await admin.query("SELECT last_status FROM public.github_refresh_state")).rows).toEqual([{ last_status: "pending" }]);
    expect((await admin.query("SELECT * FROM public.github_snapshots")).rows).toEqual([]);
  });

  it("logical backup intentionally omits operational coordination and an in-place restore retains its claimed hour", async () => {
    const upstream = vi.fn(async () => new Response("{}",{ status: 429 }));
    await modules[0]!.getRepositoryMetadata(repo,{ now: t0,customFetch: upstream as typeof fetch });
    const before = (await admin.query("SELECT * FROM public.github_refresh_state")).rows;
    const backup = await createDatabaseBackup(admin,"synthetic-github-restore");
    expect(Object.keys(backup.tables)).not.toContain("github_refresh_state");
    expect((await restoreDatabaseFromBackup(admin,backup)).success).toBe(true);
    expect((await admin.query("SELECT * FROM public.github_refresh_state")).rows).toEqual(before);
    modules[0]!.clearSnapshotCache();
    expect((await modules[1]!.getRepositoryMetadata(repo,{ now: t0,customFetch: upstream as typeof fetch })).status).toBe(503);
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it("migration bounds repositories/statuses and denies PUBLIC/anon/authenticated SELECT and DML", async () => {
    for (const role of ["anon","authenticated"]) {
      for (const privilege of ["SELECT","INSERT","UPDATE","DELETE","TRUNCATE","REFERENCES","TRIGGER"]) {
        expect((await admin.query("SELECT has_table_privilege($1,'public.github_refresh_state',$2) AS allowed",[role,privilege])).rows).toEqual([{ allowed: false }]);
      }
    }
    expect((await admin.query("SELECT relrowsecurity FROM pg_class WHERE oid='public.github_refresh_state'::regclass")).rows).toEqual([{ relrowsecurity: true }]);
    await expect(admin.query("INSERT INTO public.github_refresh_state VALUES('unlisted/repo',statement_timestamp(),'pending',statement_timestamp())")).rejects.toThrow();
    await expect(admin.query("INSERT INTO public.github_refresh_state VALUES($1,statement_timestamp(),'secret-error-text',statement_timestamp())",[repo])).rejects.toThrow();
    for (const role of ["anon","authenticated"]) {
      await admin.query(`SET ROLE ${role}`);
      try {
        await expect(admin.query("SELECT * FROM public.github_refresh_state")).rejects.toThrow();
        await expect(admin.query("INSERT INTO public.github_refresh_state VALUES($1,statement_timestamp(),'pending',statement_timestamp())",[repo])).rejects.toThrow();
        await expect(admin.query("UPDATE public.github_refresh_state SET last_status='ok'")).rejects.toThrow();
        await expect(admin.query("DELETE FROM public.github_refresh_state")).rejects.toThrow();
      } finally { await admin.query("RESET ROLE"); }
    }
    for (const privilege of ["SELECT","INSERT","UPDATE","DELETE"]) {
      expect((await admin.query("SELECT has_table_privilege('service_role','public.github_refresh_state',$1) AS allowed",[privilege])).rows).toEqual([{ allowed: true }]);
    }
  });

  it("an unallowlisted request performs neither SQL nor upstream work", async () => {
    const sql = vi.fn(async () => ({ rows: [] }));
    const upstream = vi.fn(async () => success());
    const integration = await instance({ query: sql });
    expect((await integration.getRepositoryMetadata("unlisted/repo",{ customFetch: upstream as typeof fetch })).status).toBe(403);
    expect(sql).not.toHaveBeenCalled(); expect(upstream).not.toHaveBeenCalled();
  });

  it("unconfigured database mode remains explicitly process-local and never writes coordination SQL", async () => {
    vi.resetModules(); vi.stubEnv("DATABASE_URL", ""); vi.stubEnv("YOR_E2E_FIXTURE", "0");
    const integration = await import("../../../src/server/integrations/github");
    const upstream = vi.fn(async () => new Response("{}", { status: 429 }));
    await Promise.all(Array.from({ length: 10 }, () => integration.getRepositoryMetadata(repo,{ now: t0,customFetch: upstream as typeof fetch })));
    expect(upstream).toHaveBeenCalledTimes(1);
    integration.clearSnapshotCache();
    await integration.getRepositoryMetadata(repo,{ now: t0,customFetch: upstream as typeof fetch });
    expect(upstream).toHaveBeenCalledTimes(2); // Offline mode does not claim distributed durability.
    expect((await admin.query("SELECT * FROM public.github_refresh_state")).rows).toEqual([]);
  });
});
