import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import { processOutbox } from "@/server/jobs/outbox-worker";
import { setPlatformDbForTests } from "@/server/database";
import { clearAggregateEvents } from "@/server/telemetry/events";
import { POST as eventPost } from "@/app/api/events/route";
import { clearSnapshotCache, getRepositoryMetadata, setCachedSnapshot } from "@/server/integrations/github";
import type { QueryableDb } from "@/server/contact/quota";

// These assertions establish defective behavior, not product acceptance.
const observations: Record<string, unknown>[] = [];
const appRoot = process.cwd();
const resultPath = path.resolve(appRoot, "../deliveries/G6/rc3-platform-corrections/evidence/probe-copy-contact-ops-result.json");
describe("Supplemental canonical contact/operations defect reproductions", () => {
  let db: PGlite;
  beforeAll(async () => {
    db = new PGlite();
    for (const file of ["20261001000000_a3_owner_auth_rls.sql", "20261001000001_a4_publication_media.sql"])
      await db.exec(await readFile(path.join(appRoot, "supabase/migrations", file), "utf8"));
  });
  beforeEach(async () => {
    await db.exec("TRUNCATE public.contact_messages,public.email_outbox,public.aggregate_events CASCADE");
    clearAggregateEvents();
    clearSnapshotCache();
  });
  afterAll(async () => {
    setPlatformDbForTests(null);
    clearAggregateEvents();
    clearSnapshotCache();
    await db.close();
    await writeFile(resultPath, JSON.stringify({ meaning: "PASS means defective outcome reproduced", boundary: "Actual accepted SQL in one local embedded PGlite instance; controlled worker clocks/provider responses; no hosted sessions, credentials or upstream calls", observations }, null, 2));
  });
  async function seed(attempts = 0) {
    await db.exec(`INSERT INTO public.contact_messages(id,receipt_id,name,email,body,received_at)
      VALUES('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','rcpt_synthetic','Synthetic','synthetic@example.invalid','Synthetic bounded defect probe','2026-10-03T00:00:00Z');
      INSERT INTO public.email_outbox(id,message_id,attempts,next_attempt_at)
      VALUES('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',${attempts},'2026-10-03T00:00:00Z');`);
  }
  it("stale worker overwrites sent state after another worker reclaims expired lease", async () => {
    await seed();
    let unblock!: () => void;
    let entered!: () => void;
    const waiting = new Promise<void>((resolve) => { unblock = resolve; });
    const enteredSend = new Promise<void>((resolve) => { entered = resolve; });
    const first = processOutbox(new Date("2026-10-03T00:00:00Z"), 1, { db, leaseDurationSeconds: 1, emailAdapter: { send: async () => {
      entered(); await waiting; return { success: false, retryable: true, error: "Synthetic stale failure" };
    } } });
    await enteredSend;
    const second = await processOutbox(new Date("2026-10-03T00:00:02Z"), 1, { db, emailAdapter: { send: async () => ({ success: true, providerId: "synthetic-provider-b" }) } });
    const before = (await db.query("SELECT status,provider_id,attempts FROM public.email_outbox")).rows;
    unblock();
    const firstResult = await first;
    const after = (await db.query("SELECT status,provider_id,attempts,lease_until FROM public.email_outbox")).rows;
    expect(second.sent).toBe(1);
    expect(before).toEqual([{ status: "sent", provider_id: "synthetic-provider-b", attempts: 0 }]);
    expect(after).toEqual([{ status: "retrying", provider_id: "synthetic-provider-b", attempts: 1, lease_until: null }]);
    observations.push({ id: "stale-lease-overwrite", firstResult, second, before, after });
  });
  it("fifth unexpected provider exception strands a retrying row outside future claims", async () => {
    await seed(4);
    const first = await processOutbox(new Date("2026-10-03T00:00:00Z"), 1, { db, emailAdapter: { send: async () => { throw new Error("Synthetic exception"); } } });
    const row = (await db.query("SELECT status,attempts FROM public.email_outbox")).rows;
    let subsequentCalls = 0;
    const second = await processOutbox(new Date("2026-10-04T00:00:00Z"), 1, { db, emailAdapter: { send: async () => { subsequentCalls++; return { success: true, providerId: "synthetic" }; } } });
    expect(row).toEqual([{ status: "retrying", attempts: 5 }]);
    expect(second).toEqual({ sent: 0, retried: 0, failed: 0 });
    expect(subsequentCalls).toBe(0);
    observations.push({ id: "exception-retry-ceiling", first, row, second, subsequentCalls });
  });
  it("different valid telemetry codes collide with accepted dimension uniqueness in production branch", async () => {
    let sqlError: Record<string, unknown> | null = null;
    const provider: QueryableDb = { query: async (sql, params) => {
      try { return await db.query(sql, params); }
      catch (error) { const value = error as { code?: string; message?: string }; sqlError = { code: value.code, message: value.message }; throw error; }
    } };
    setPlatformDbForTests(provider);
    const saved = { node: process.env.NODE_ENV, vitest: process.env.VITEST };
    try {
      process.env.NODE_ENV = "production";
      process.env.VITEST = "false";
      const post = (code: string) => eventPost(new NextRequest("http://localhost/api/events", { method: "POST", body: JSON.stringify({ event: "renderer_failed", projectId: "helios", tier: "low", code }) }));
      const first = await post("error_a");
      const second = await post("error_b");
      const secondBody = await second.json();
      const rows = (await db.query("SELECT event,project_id,tier,count FROM public.aggregate_events")).rows;
      expect(first.status).toBe(202);
      expect(second.status).toBe(503);
      expect(sqlError?.code).toBe("23505");
      expect(rows).toEqual([{ event: "renderer_failed", project_id: "helios", tier: "low", count: 1 }]);
      observations.push({ id: "telemetry-dimension-conflict", firstStatus: first.status, secondStatus: second.status, secondBody, sqlError, rows });
    } finally {
      if (saved.node === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = saved.node;
      if (saved.vitest === undefined) delete process.env.VITEST; else process.env.VITEST = saved.vitest;
      setPlatformDbForTests(null);
    }
  });
  it("Unicode body above byte ceiling is accepted without Content-Length", async () => {
    const body = JSON.stringify({ event: "studio_ready", ignored: "界".repeat(2000) });
    const response = await eventPost(new NextRequest("http://localhost/api/events", { method: "POST", body }));
    expect(body.length).toBeLessThan(4096);
    expect(Buffer.byteLength(body)).toBeGreaterThan(4096);
    expect(response.status).toBe(202);
    observations.push({ id: "telemetry-byte-ceiling", characters: body.length, utf8Bytes: Buffer.byteLength(body), status: response.status });
  });
  it("repeated GitHub failures each fetch upstream despite hourly-refresh contract", async () => {
    const now = new Date("2026-10-03T04:00:00Z");
    const fetchedAt = new Date("2026-10-03T02:00:00Z");
    const repo = "yorayriniwnl/helios";
    setCachedSnapshot(repo, { repo, fetchedAt, isStale: false, payload: { repo, name: "helios", description: null, stars: 0, forks: 0, openIssues: 0, license: null, language: null, updatedAt: fetchedAt.toISOString(), pushedAt: fetchedAt.toISOString(), fetchedAt: fetchedAt.toISOString(), stale: false } });
    let calls = 0;
    const customFetch: typeof fetch = async () => { calls++; return new Response("Synthetic outage", { status: 503 }); };
    const results = [];
    for (let index = 0; index < 3; index++) results.push(await getRepositoryMetadata(repo, { now, customFetch }));
    expect(calls).toBe(3);
    expect(results.every((result) => result.success && result.data?.fetchedAt === fetchedAt.toISOString())).toBe(true);
    observations.push({ id: "github-failure-refresh-frequency", sameClockRequests: 3, calls, returnedLastGood: true });
  });
});
