import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { processOutbox } from "../../../src/server/jobs/outbox-worker";
import type { QueryableDb } from "../../../src/server/contact/quota";
import type { EmailAdapter, EmailSendResult } from "../../../src/server/contact/email-adapter";

const now = new Date("2026-10-04T12:00:00Z");
const active = "11111111-1111-1111-1111-111111111111";
const identities = [
  { name: "anonymous", role: "anon", sub: "", aal: "aal1" },
  { name: "non-owner", role: "authenticated", sub: "44444444-4444-4444-4444-444444444444", aal: "aal2" },
  { name: "owner AAL1", role: "authenticated", sub: "33333333-3333-3333-3333-333333333333", aal: "aal1" },
  { name: "revoked owner", role: "authenticated", sub: "22222222-2222-2222-2222-222222222222", aal: "aal2" },
  { name: "active owner AAL2", role: "authenticated", sub: active, aal: "aal2" },
];
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}
const success: EmailSendResult = { success: true, providerId: "synthetic-current" };
const retryable: EmailSendResult = { success: false, retryable: true, error: "synthetic retry" };
const terminal: EmailSendResult = { success: false, retryable: false, error: "synthetic permanent failure" };

// Controlled interleavings in ONE embedded PostgreSQL instance, not independent hosted sessions.
describe("SCP publication grants and lease-fenced outbox on accepted SQL", () => {
  let db: PGlite;
  let elapsed: number;
  beforeAll(async () => {
    db = new PGlite();
    for (const name of ["20261001000000_a3_owner_auth_rls.sql", "20261001000001_a4_publication_media.sql"])
      await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
    // Exercise inherited PUBLIC rights as well as the grants in the accepted migrations.
    await db.exec("GRANT INSERT, UPDATE, DELETE ON public.published_content,public.publication_history TO PUBLIC");
    await db.exec(await readFile("supabase/operations/harden-publication-grants.sql", "utf8"));
    for (const identity of identities.filter((identity) => identity.sub)) {
      await db.query<Record<string, unknown>>("INSERT INTO auth.users(id,email) VALUES($1,$2)", [identity.sub, `${identity.name}@fixture.test`]);
      if (identity.name !== "non-owner") await db.query<Record<string, unknown>>("INSERT INTO public.admin_users(id,role,active) VALUES($1,'owner',$2)", [identity.sub, identity.name !== "revoked owner"]);
    }
  }, 90_000);
  beforeEach(async () => {
    elapsed = 0;
    vi.spyOn(Date, "now").mockImplementation(() => now.getTime() + elapsed);
    await db.exec("TRUNCATE public.email_outbox,public.contact_messages,public.published_content,public.publication_history,public.projects,public.audit_events CASCADE");
  });
  afterEach(async () => { vi.restoreAllMocks(); await db.exec("RESET ROLE; RESET request.jwt.claim.sub; RESET request.jwt.claims"); });
  afterAll(async () => { await db.close(); });

  it.each(identities)("SCP-01: $name cannot write snapshots/history or execute publication helper", async (identity) => {
    await db.query<Record<string, unknown>>("INSERT INTO public.published_content(revision,payload) VALUES(1,'{}')");
    await db.query<Record<string, unknown>>("INSERT INTO public.publication_history(revision,snapshot,actor) VALUES(1,'{}',$1)", [active]);
    await db.query<Record<string, unknown>>("INSERT INTO public.projects(slug,title) VALUES('private-seed','Private draft')");
    await db.exec(`SET ROLE ${identity.role}`);
    await db.query<Record<string, unknown>>("SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)", [identity.sub, JSON.stringify({ sub: identity.sub, aal: identity.aal })]);
    expect((await db.query<Record<string, unknown>>("SELECT revision FROM public.published_content")).rows).toEqual([{ revision: 1 }]);
    if (identity.role === "authenticated") {
      expect((await db.query<Record<string, unknown>>("SELECT revision FROM public.publication_history")).rows).toHaveLength(identity.name === "active owner AAL2" ? 1 : 0);
      expect((await db.query<Record<string, unknown>>("SELECT title FROM public.projects")).rows).toHaveLength(identity.name === "active owner AAL2" ? 1 : 0);
    }
    for (const table of ["published_content", "publication_history"]) {
      const payloadColumn = table === "published_content" ? "payload" : "snapshot";
      await expect(db.query<Record<string, unknown>>(`INSERT INTO public.${table}(revision,${payloadColumn}) VALUES(999,'{}')`)).rejects.toThrow(/permission denied/i);
      await expect(db.query<Record<string, unknown>>(`UPDATE public.${table} SET ${payloadColumn}='{"forged":true}'`)).rejects.toThrow(/permission denied/i);
      await expect(db.query<Record<string, unknown>>(`DELETE FROM public.${table}`)).rejects.toThrow(/permission denied/i);
    }
    await expect(db.query<Record<string, unknown>>("SELECT public.publish_new_revision(999,'{}',$1)", [active])).rejects.toThrow(/permission denied/i);
    await db.exec("RESET ROLE");
    expect((await db.query<Record<string, unknown>>("SELECT revision,payload FROM public.published_content")).rows).toEqual([{ revision: 1, payload: {} }]);
    expect((await db.query<Record<string, unknown>>("SELECT revision,snapshot FROM public.publication_history")).rows).toEqual([{ revision: 1, snapshot: {} }]);
    expect((await db.query<Record<string, unknown>>("SELECT * FROM public.audit_events")).rows).toHaveLength(0);
  });

  async function seed(attempts = 0) {
    const messageId = randomUUID();
    const id = randomUUID();
    await db.query<Record<string, unknown>>("INSERT INTO public.contact_messages(id,receipt_id,name,email,body,received_at) VALUES($1,$2,'Visitor','visitor@fixture.test','Synthetic contact inquiry',$3)", [messageId, `receipt_${id}`, now.toISOString()]);
    await db.query<Record<string, unknown>>("INSERT INTO public.email_outbox(id,message_id,attempts,next_attempt_at) VALUES($1,$2,$3,$4)", [id, messageId, attempts, now.toISOString()]);
    return id;
  }
  const snapshot = async () => (await db.query<{ status: string; attempts: number; provider_id: string | null; lease_until: string | null }>("SELECT status,attempts,provider_id,lease_until FROM public.email_outbox ORDER BY id")).rows;

  it.each(["success", "retry", "terminal", "exception", "missing message", "message read exception"])("SCP-02: stale %s leaves reclaimed success untouched and counts zero", async (mode) => {
    const id = await seed();
    const entered = deferred();
    const resume = deferred();
    const keys: string[] = [];
    const adapter: EmailAdapter = { send: async (_message, key) => {
      keys.push(key); entered.resolve(); await resume.promise;
      if (mode === "exception") throw new Error("Synthetic stale exception");
      return mode === "retry" ? retryable : mode === "terminal" ? terminal : { ...success, providerId: "synthetic-stale" };
    } };
    const readPaused = mode === "missing message" || mode === "message read exception";
    const oldDb: QueryableDb = { query: async (sql, params) => {
      if (readPaused && sql.includes("FROM public.contact_messages")) {
        entered.resolve(); await resume.promise;
        if (mode === "message read exception") throw new Error("Synthetic stale read error");
        return { rows: [] };
      }
      return db.query<Record<string, unknown>>(sql, params);
    } };
    const oldWorker = processOutbox(now, 1, { db: oldDb, emailAdapter: adapter, leaseDurationSeconds: 60 });
    await entered.promise;
    elapsed = 61_000;
    const freshKeys: string[] = [];
    const fresh = await processOutbox(new Date(now.getTime() + elapsed), 1, { db, emailAdapter: { send: async (_message, key) => { freshKeys.push(key); return success; } } });
    expect(fresh).toEqual({ sent: 1, retried: 0, failed: 0 });
    const completed = await snapshot();
    resume.resolve();
    expect(await oldWorker).toEqual({ sent: 0, retried: 0, failed: 0 });
    expect(await snapshot()).toEqual(completed);
    expect(completed).toEqual([{ status: "sent", attempts: 0, provider_id: "synthetic-current", lease_until: null }]);
    expect(freshKeys).toEqual([`outbox_${id}`]);
    if (!readPaused) expect(keys).toEqual(freshKeys);
    expect((await db.query<Record<string, unknown>>("SELECT receipt_id FROM public.contact_messages")).rows).toEqual([{ receipt_id: `receipt_${id}` }]);
  });

  it("SCP-02: stale completion cannot change a newer processing claim", async () => {
    await seed();
    const oldEntered = deferred(); const oldResume = deferred();
    const newEntered = deferred(); const newResume = deferred();
    const oldWorker = processOutbox(now, 1, { db, leaseDurationSeconds: 60, emailAdapter: { send: async () => { oldEntered.resolve(); await oldResume.promise; return retryable; } } });
    await oldEntered.promise;
    // Keep A's clock behind B to isolate the claim-version guard from lease validity.
    const newWorker = processOutbox(new Date(now.getTime() + 61_000), 1, { db, emailAdapter: { send: async () => { newEntered.resolve(); await newResume.promise; return success; } } });
    await newEntered.promise;
    const claimed = await snapshot();
    expect(claimed[0]?.status).toBe("processing");
    oldResume.resolve();
    expect(await oldWorker).toEqual({ sent: 0, retried: 0, failed: 0 });
    expect(await snapshot()).toEqual(claimed);
    newResume.resolve();
    expect(await newWorker).toEqual({ sent: 1, retried: 0, failed: 0 });
  });

  it("SCP-02: stale completion-write exception cannot retry a reclaimed row", async () => {
    await seed();
    const entered = deferred(); const resume = deferred();
    const oldDb: QueryableDb = { query: async (sql, params) => {
      if (sql.includes("SET status = 'sent'")) throw new Error("Synthetic stale completion-write error");
      return db.query<Record<string, unknown>>(sql, params);
    } };
    const oldWorker = processOutbox(now, 1, { db: oldDb, leaseDurationSeconds: 60, emailAdapter: { send: async () => { entered.resolve(); await resume.promise; return success; } } });
    await entered.promise;
    elapsed = 61_000;
    expect(await processOutbox(new Date(now.getTime() + elapsed), 1, { db, emailAdapter: { send: async () => success } })).toEqual({ sent: 1, retried: 0, failed: 0 });
    const completed = await snapshot();
    resume.resolve();
    expect(await oldWorker).toEqual({ sent: 0, retried: 0, failed: 0 });
    expect(await snapshot()).toEqual(completed);
  });

  it("SCP-03: an owned missing-message result terminally fails without provider work", async () => {
    await seed(4); let calls = 0;
    const missing: QueryableDb = { query: async (sql, params) => sql.includes("FROM public.contact_messages") ? { rows: [] } : db.query<Record<string, unknown>>(sql, params) };
    expect(await processOutbox(now, 1, { db: missing, emailAdapter: { send: async () => { calls++; return success; } } })).toEqual({ sent: 0, retried: 0, failed: 1 });
    expect(await snapshot()).toEqual([{ status: "failed", attempts: 5, provider_id: null, lease_until: null }]);
    expect(calls).toBe(0);
  });
  it("SCP-02: queued batch items lose ownership before any provider work", async () => {
    await seed(); await seed();
    const entered = deferred(); const resume = deferred();
    let oldCalls = 0; let freshCalls = 0;
    const oldWorker = processOutbox(now, 2, { db, leaseDurationSeconds: 60, emailAdapter: { send: async () => { oldCalls++; entered.resolve(); await resume.promise; return success; } } });
    await entered.promise;
    elapsed = 61_000;
    expect(await processOutbox(new Date(now.getTime() + elapsed), 2, { db, emailAdapter: { send: async () => { freshCalls++; return success; } } })).toEqual({ sent: 2, retried: 0, failed: 0 });
    resume.resolve();
    expect(await oldWorker).toEqual({ sent: 0, retried: 0, failed: 0 });
    expect(oldCalls).toBe(1); expect(freshCalls).toBe(2);
  });

  it("SCP-02: expiry without reclaim also rejects completion and queued provider work", async () => {
    await seed(); await seed();
    let calls = 0;
    expect(await processOutbox(now, 2, { db, leaseDurationSeconds: 60, emailAdapter: { send: async () => { calls++; elapsed = 60_000; return success; } } })).toEqual({ sent: 0, retried: 0, failed: 0 });
    expect(calls).toBe(1);
    expect((await snapshot()).every((row) => row.status === "processing" && row.provider_id === null && row.attempts === 0)).toBe(true);
  });

  it("SCP-02: an expired message lookup cannot start provider work", async () => {
    await seed(); let calls = 0;
    const slowRead: QueryableDb = { query: async (sql, params) => {
      const rows = await db.query<Record<string, unknown>>(sql, params);
      if (sql.includes("FROM public.contact_messages")) elapsed = 60_000;
      return rows;
    } };
    expect(await processOutbox(now, 1, { db: slowRead, leaseDurationSeconds: 60, emailAdapter: { send: async () => { calls++; return success; } } })).toEqual({ sent: 0, retried: 0, failed: 0 });
    expect(calls).toBe(0);
  });

  it.each(["adapter exception", "message read exception", "retryable failure", "terminal failure", "completion write exception"])("SCP-03: fifth %s is terminal failed", async (mode) => {
    await seed(4);
    let injected = false;
    const provider: QueryableDb = { query: async (sql, params) => {
      if (!injected && ((mode === "message read exception" && sql.includes("FROM public.contact_messages")) || (mode === "completion write exception" && sql.includes("SET status = 'sent'")))) {
        injected = true; throw new Error("Synthetic transient DB error");
      }
      return db.query<Record<string, unknown>>(sql, params);
    } };
    expect(await processOutbox(now, 1, { db: provider, emailAdapter: { send: async () => {
      if (mode === "adapter exception") throw new Error("Synthetic provider exception");
      return mode === "retryable failure" ? retryable : mode === "terminal failure" ? terminal : success;
    } } })).toEqual({ sent: 0, retried: 0, failed: 1 });
    expect(await snapshot()).toEqual([{ status: "failed", attempts: 5, provider_id: null, lease_until: null }]);
    let calls = 0;
    expect(await processOutbox(new Date(now.getTime() + 86_400_000), 1, { db, emailAdapter: { send: async () => { calls++; return success; } } })).toEqual({ sent: 0, retried: 0, failed: 0 });
    expect(calls).toBe(0);
  });

  it("SCP-03: exception retries preserve all four accepted delays", async () => {
    await seed();
    let attemptTime = now;
    for (const [index, delay] of [60, 300, 1800, 7200].entries()) {
      expect(await processOutbox(attemptTime, 1, { db, emailAdapter: { send: async () => { throw new Error("Synthetic provider error"); } } })).toEqual({ sent: 0, retried: 1, failed: 0 });
      const row = (await db.query<{ attempts: number; status: string; next_attempt_at: string }>("SELECT attempts,status,next_attempt_at FROM public.email_outbox")).rows[0]!;
      expect(row.attempts).toBe(index + 1); expect(row.status).toBe("retrying");
      expect(new Date(String(row.next_attempt_at)).getTime()).toBe(attemptTime.getTime() + delay * 1000);
      attemptTime = new Date(attemptTime.getTime() + delay * 1000);
    }
  });
});
