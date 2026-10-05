import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { NextRequest } from "next/server";
import * as database from "../../../src/server/database";
import { POST } from "../../../src/app/api/events/route";
import { ALLOWLISTED_EVENTS, ALLOWLISTED_PROJECT_IDS, QUALITY_TIERS, clearAggregateEvents, getAggregateEvents, recordTelemetryEvent, TELEMETRY_MEMORY_MAX_KEYS, TELEMETRY_MEMORY_TTL_MS } from "../../../src/server/telemetry/events";
import { CACHE_TTL_MS, STALE_THRESHOLD_MS, clearSnapshotCache, getRepositoryMetadata } from "../../../src/server/integrations/github";

const repo = "yorayriniwnl/helios";
const t0 = new Date("2026-10-04T00:00:00Z");
const post = (body: string, length?: string) => POST(new NextRequest("http://localhost/api/events", { method: "POST", body, headers: length ? { "content-length": length } : {} }));

beforeEach(() => { clearAggregateEvents(); clearSnapshotCache(); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("SCP-05 durable accepted SQL telemetry dimensions", () => {
  let db: PGlite;
  beforeAll(async () => {
    db = new PGlite();
    for (const file of ["20261001000000_a3_owner_auth_rls.sql", "20261001000001_a4_publication_media.sql", "20261005000000_github_refresh_state.sql"])
      await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
  });
  beforeEach(async () => {
    await db.exec("TRUNCATE public.aggregate_events,public.github_snapshots");
    database.setPlatformDbForTests(db);
    vi.spyOn(database, "isTestRuntime").mockReturnValue(false);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    database.setPlatformDbForTests(null);
  });
  afterAll(async () => { await db.close(); });

  it("increments same/different/omitted codes including every nullable dimensional combination", async () => {
    for (const dims of [{ projectId: "helios", tier: "low" }, { projectId: "helios" }, { tier: "low" }, {}]) {
      for (const code of ["error_a", "error_a", "error_b", undefined]) {
        expect((await post(JSON.stringify({ event: "renderer_failed", ...dims, code }))).status).toBe(202);
      }
    }
    const rows = (await db.query<{ project_id: string | null; tier: string | null; count: number }>("SELECT project_id,tier,count FROM public.aggregate_events")).rows;
    expect(rows).toHaveLength(4);
    expect(rows.every((row) => row.count === 4)).toBe(true);
    expect(getAggregateEvents().every((row) => row.code === null)).toBe(true);
    // Preserve the schema's ordinary NULL uniqueness: arbitrary IDs remain distinct.
    await db.exec("INSERT INTO public.aggregate_events(date,event,count) VALUES(current_date,'renderer_failed',9)");
    expect((await db.query<{ n: number }>("SELECT count(*)::int AS n FROM public.aggregate_events")).rows[0]?.n).toBe(5);
  });

  it("persists only successful GitHub fetch timestamps and loads the last good SQL snapshot after cache reset", async () => {
    const success = vi.fn(async () => new Response('{"name":"durable-good"}', { status: 200 }));
    await getRepositoryMetadata(repo, { now: t0, customFetch: success as typeof fetch });
    const before = (await db.query("SELECT payload,fetched_at FROM public.github_snapshots")).rows;
    expect(before).toHaveLength(1);
    clearSnapshotCache();
    const failing = vi.fn(async () => new Response("{}", { status: 503 }));
    const now = new Date(t0.getTime() + STALE_THRESHOLD_MS + 1);
    const results = await Promise.all(Array.from({ length: 12 }, () => getRepositoryMetadata(repo, { now, customFetch: failing as typeof fetch })));
    expect(failing).toHaveBeenCalledTimes(1);
    expect(results.every((r) => r.data?.name === "durable-good" && r.data.stale && r.data.fetchedAt === t0.toISOString())).toBe(true);
    for (let i = 0; i < 10; i++) await getRepositoryMetadata(repo, { now, customFetch: failing as typeof fetch });
    expect(failing).toHaveBeenCalledTimes(1);
    expect((await db.query("SELECT payload,fetched_at FROM public.github_snapshots")).rows).toEqual(before);
  });

  it("increments a pre-correction code-dependent ID without replacing its count or identity", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const legacyKey = `${today}_renderer_failed_helios_low_error_a`;
    await db.query("INSERT INTO public.aggregate_events(id,date,event,project_id,tier,count) VALUES(md5($1)::uuid,$2,'renderer_failed','helios','low',7)", [legacyKey, today]);
    const id = (await db.query<{ id: string }>("SELECT id FROM public.aggregate_events")).rows[0]?.id;
    for (const code of ["error_a", "error_b", undefined])
      expect((await post(JSON.stringify({ event: "renderer_failed", projectId: "helios", tier: "low", code }))).status).toBe(202);
    expect((await db.query("SELECT id,count FROM public.aggregate_events")).rows).toEqual([{ id, count: 10 }]);
  });
});

describe("SCP-06 actual UTF-8 ceiling", () => {
  it("rejects recorded 6037 bytes without header and with misleading header before ingestion", async () => {
    const body = JSON.stringify({ event: "studio_ready", ignored: "\u754c".repeat(2000) });
    expect(body.length).toBe(2037);
    expect(Buffer.byteLength(body)).toBe(6037);
    for (const length of [undefined, "1", "invalid"]) expect((await post(body, length)).status).toBe(413);
    expect(getAggregateEvents()).toEqual([]);
  });
  it.each(["x", "\u754c"])("accepts exactly 4096 bytes and rejects 4097 for %s", async (character) => {
    const prefix = '{"event":"studio_ready","ignored":"';
    const suffix = '"}';
    const remaining = 4096 - Buffer.byteLength(prefix + suffix);
    const bytes = Buffer.byteLength(character);
    const body = prefix + character.repeat(Math.floor(remaining / bytes)) + "x".repeat(remaining % bytes) + suffix;
    expect(Buffer.byteLength(body)).toBe(4096);
    expect((await post(body)).status).toBe(202);
    expect((await post(body.slice(0, -2) + "x" + suffix, "1")).status).toBe(413);
    expect(getAggregateEvents()[0]?.count).toBe(1);
  });
  it("retains malformed JSON and validation responses", async () => {
    expect((await post("{")).status).toBe(400);
    expect((await post('{"event":"private_event"}')).status).toBe(400);
  });
});

describe("bounded telemetry memory inspection cache", () => {
  it("evicts oldest inserted dimensions at the cap and expires idle records at TTL", async () => {
    vi.useFakeTimers(); vi.setSystemTime(t0);
    for (const event of ALLOWLISTED_EVENTS) for (const projectId of ALLOWLISTED_PROJECT_IDS) for (const tier of QUALITY_TIERS)
      expect((await recordTelemetryEvent({ event, projectId, tier, code: "ignored" }, 100)).status).toBe(202);
    const records = getAggregateEvents();
    expect(records).toHaveLength(TELEMETRY_MEMORY_MAX_KEYS);
    expect(records.some((r) => r.event === "studio_entry_requested" && r.projectId === "candidatex" && r.tier === "high")).toBe(false);
    for (let i = 0; i < 1000; i++) await recordTelemetryEvent({ event: "renderer_failed", code: `error_${i}` }, 100);
    expect(getAggregateEvents()).toHaveLength(TELEMETRY_MEMORY_MAX_KEYS);
    expect(getAggregateEvents().find((r) => r.event === "renderer_failed" && r.projectId === null)?.count).toBe(1000);
    vi.setSystemTime(t0.getTime() + TELEMETRY_MEMORY_TTL_MS);
    expect(getAggregateEvents()).toEqual([]);
    await recordTelemetryEvent({ event: "studio_ready" }, 100);
    expect(getAggregateEvents()).toHaveLength(1);
  });
});

describe("SCP-07 process-local hourly attempts and single flight", () => {
  it.each([503, 429, "throw"] as const)("throttles cold outage %s, overlapping and frequent requests, then recovers next hour", async (failure) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const upstream = vi.fn(async () => {
      await gate;
      if (failure === "throw") throw new Error("secret-token internal auth detail");
      return new Response("{}", { status: failure });
    });
    const options = { now: t0, customFetch: upstream as typeof fetch, githubToken: "secret-token" };
    const work = Array.from({ length: 12 }, () => getRepositoryMetadata(repo, options));
    expect(upstream).toHaveBeenCalledTimes(1);
    release();
    const results = await Promise.all(work);
    expect(results.every((result) => !result.success)).toBe(true);
    expect(JSON.stringify(results)).not.toContain("secret-token");
    for (let i = 1; i < 60; i++) await getRepositoryMetadata(repo, { ...options, now: new Date(t0.getTime() + i * 60000) });
    expect(upstream).toHaveBeenCalledTimes(1);
    const recovery = vi.fn(async () => new Response('{"name":"recovered"}', { status: 200 }));
    const recovered = await Promise.all(Array.from({ length: 12 }, () => getRepositoryMetadata(repo, { now: new Date(t0.getTime() + CACHE_TTL_MS), customFetch: recovery as typeof fetch })));
    expect(recovery).toHaveBeenCalledTimes(1);
    expect(recovered.every((result) => result.data?.name === "recovered")).toBe(true);
    expect(recovered.every((result) => result.data?.fetchedAt === new Date(t0.getTime() + CACHE_TTL_MS).toISOString())).toBe(true);
  });
  it("preserves last success timestamp and recalculates stale while failures are throttled", async () => {
    const good = vi.fn(async () => new Response('{"name":"last-good"}', { status: 200 }));
    await getRepositoryMetadata(repo, { now: t0, customFetch: good as typeof fetch });
    const failing = vi.fn(async () => new Response("{}", { status: 429 }));
    const time = t0.getTime() + STALE_THRESHOLD_MS - 1000;
    const result = await getRepositoryMetadata(repo, { now: new Date(time), customFetch: failing as typeof fetch });
    expect(result.data?.stale).toBe(false);
    const later = await getRepositoryMetadata(repo, { now: new Date(time + 2000), customFetch: failing as typeof fetch });
    expect(failing).toHaveBeenCalledTimes(1);
    expect(later.data?.stale).toBe(true);
    expect(later.data?.rateLimited).toBe(true);
    expect(later.data?.fetchedAt).toBe(t0.toISOString());
    expect(later.data?.name).toBe("last-good");
  });
});
