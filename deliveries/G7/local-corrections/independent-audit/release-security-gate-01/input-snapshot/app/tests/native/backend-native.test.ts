/** Explicit local native PostgreSQL proof. No hosted Supabase or real Storage attestation. */
import { Client, Pool, type PoolClient } from "pg";
import { readFile } from "node:fs/promises";
import { randomUUID, createHash } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { approvedPublication } from "@/content/approved-publication";
import { setPlatformDbForTests } from "@/server/database";
import { approveMediaAsset } from "@/server/media/validate-upload";
import { publishRevision, rollbackPublication, readPublicPublication } from "@/server/content/publish";
import * as authClients from "@/server/auth/clients";
import { receiveContact } from "@/server/contact/receive";
import type { QueryableDb } from "@/server/contact/quota";
import type { OwnerContext } from "@/server/auth/types";

const supplied = process.env.YOR_NATIVE_DATABASE_URL;
if (!supplied || new URL(supplied).hostname !== "127.0.0.1") throw new Error("Explicit loopback YOR_NATIVE_DATABASE_URL is required; native tests never skip silently.");
const owner = "11111111-1111-1111-1111-111111111111";
const actor: OwnerContext = { userId: owner, email: "owner@native.test", role: "owner", active: true, assurance: "aal2" };
const migrations = ["20261001000000_a3_owner_auth_rls.sql", "20261001000001_a4_publication_media.sql", "20261005000000_github_refresh_state.sql", "20261009000000_owner_identity_media_integrity.sql"];
function gate() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { resolve, promise };
}

describe("Native PostgreSQL local identity and actual multi-connection lifecycle ordering", () => {
  let admin: Client;
  let pool: Pool;
  let database: string;
  let png: Uint8Array;
  let hash: string;
  let objects: Map<string, Uint8Array>;
  let provider: QueryableDb;
  let pause: ReturnType<typeof gate> | null;
  let entered: ReturnType<typeof gate>;
  const reserved = new Set<PoolClient>();

  beforeAll(async () => {
    admin = new Client({ connectionString: supplied, application_name: "yor-remediation-admin" });
    await admin.connect();
    database = `yor_remediation_${Date.now()}_${randomUUID().slice(0, 8)}`;
    expect(database).toMatch(/^yor_remediation_[0-9]+_[a-f0-9]+$/);
    await admin.query(`CREATE DATABASE ${database}`);
    const url = new URL(supplied!); url.pathname = `/${database}`;
    pool = new Pool({ connectionString: url.href, max: 8, application_name: "yor-remediation-native", connectionTimeoutMillis: 5000, statement_timeout: 10000 });
    for (const file of migrations.slice(0, 3)) await pool.query(await readFile(`supabase/migrations/${file}`, "utf8"));
    const legacy = await pool.connect();
    try {
      await legacy.query("SELECT set_config('request.jwt.claim.sub','',false),set_config('request.jwt.claims',$1,false)", [JSON.stringify({ sub: owner, aal: "aal2" })]);
      expect((await legacy.query("SELECT auth.uid() AS id")).rows).toEqual([{ id: null }]);
    } finally { legacy.release(); }
    await pool.query(await readFile(`supabase/migrations/${migrations[3]}`, "utf8"));
    await pool.query(await readFile("supabase/operations/harden-publication-grants.sql", "utf8"));
    for (const id of [owner, "22222222-2222-2222-2222-222222222222", "44444444-4444-4444-4444-444444444444"]) await pool.query("INSERT INTO auth.users(id) VALUES($1)", [id]);
    await pool.query("INSERT INTO public.admin_users(id,role,active) VALUES($1,'owner',true),($2,'owner',false)", [owner, "22222222-2222-2222-2222-222222222222"]);
    png = new Uint8Array(await readFile("tests/fixtures/scp-media/valid-rgba-16x12.png"));
    hash = createHash("sha256").update(png).digest("hex");
    provider = {
      query: async (sql, params = []) => ({ rows: (await pool.query(sql, params)).rows }),
      transaction: async (run) => {
        const connection = await pool.connect();
        try {
          await connection.query("BEGIN");
          const result = await run({ query: async (sql, params = []) => ({ rows: (await connection.query(sql, params)).rows }) });
          await connection.query("COMMIT"); return result;
        } catch (error) { await connection.query("ROLLBACK"); throw error; }
        finally { connection.release(); }
      },
    };
  });
  beforeEach(async () => {
    await pool.query("TRUNCATE public.media_assets,public.projects,public.project_revisions,public.published_content,public.publication_history,public.audit_events,public.contact_messages,public.contact_idempotency,public.email_outbox,public.request_quotas CASCADE");
    setPlatformDbForTests(provider);
    objects = new Map(); pause = null; entered = gate();
    vi.spyOn(authClients, "createAdminServiceRoleClient").mockImplementation(() => ({ storage: { from: (bucket: string) => ({ download: (key: string) => ({ asStream: async () => {
      entered.resolve(); if (pause) await pause.promise;
      const bytes = objects.get(`${bucket}/${key}`);
      return bytes ? { data: new ReadableStream({ start(controller) { controller.enqueue(bytes); controller.close(); } }), error: null }
        : { data: null, error: { statusCode: "404" } };
    } }) }) } } as unknown as SupabaseClient));
  });
  afterEach(async () => {
    pause?.resolve();
    for (const connection of reserved) { await connection.query("ROLLBACK").catch(() => {}); connection.release(); }
    reserved.clear();
    setPlatformDbForTests(null); vi.restoreAllMocks();
  });
  afterAll(async () => {
    if (pool) await pool.end();
    // Preserve the isolated database for Parent/auditor inspection; no destructive cleanup.
    if (admin) { console.log(`NATIVE_DATABASE_PRESERVED=${database}`); await admin.end(); }
  });
  async function connection() { const client = await pool.connect(); reserved.add(client); return client; }
  async function seed(approved = true) {
    const id = randomUUID(); const key = `drafts/${randomUUID()}/native.png`;
    await pool.query("INSERT INTO public.media_assets(id,object_key,hash,mime,bytes,storage_bucket,integrity_verified_at,approval_status) VALUES($1,$2,$3,'image/png',$4,'native-private',$5,$6)", [id, key, hash, png.byteLength, approved ? new Date() : null, approved ? "approved" : "pending"]);
    objects.set(`native-private/${key}`, png); return id;
  }
  const projects = (id: string) => approvedPublication.projects.map((project) => ({ ...project, sections: project.sections.map((section) => ({ ...section, blocks: section.blocks.map((block) => block.type === "image" ? { ...block, mediaId: id } : block) })) }));
  async function waitForActualAdvisoryWait() {
    for (let attempt = 0; attempt < 100; attempt++) {
      const waiting = await pool.query("SELECT EXISTS(SELECT 1 FROM pg_locks WHERE locktype='advisory' AND NOT granted AND database=(SELECT oid FROM pg_database WHERE datname=current_database())) AS waiting");
      if (waiting.rows[0].waiting) return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error("No actual native advisory lock wait was observed.");
  }

  it.each([
    ["owner JSON-only AAL2", { sub: owner, aal: "aal2" }, "", true],
    ["non-owner", { sub: "44444444-4444-4444-4444-444444444444", aal: "aal2" }, "", false],
    ["revoked owner", { sub: "22222222-2222-2222-2222-222222222222", aal: "aal2" }, "", false],
    ["AAL1", { sub: owner, aal: "aal1" }, "", false],
    ["mismatched contexts", { sub: "44444444-4444-4444-4444-444444444444", aal: "aal2" }, owner, false],
    ["invalid UUID", { sub: "invalid", aal: "aal2" }, owner, false],
    ["missing subject", { aal: "aal2" }, owner, false],
  ] as const)("native RLS: %s", async (_name, claims, legacy, allowed) => {
    await pool.query("INSERT INTO public.projects(slug,title) VALUES('private','Native private project')");
    const client = await connection();
    await client.query("SET ROLE authenticated");
    await client.query("SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)", [legacy, JSON.stringify(claims)]);
    expect((await client.query("SELECT public.is_active_owner_with_aal2() AS allowed")).rows).toEqual([{ allowed }]);
    expect((await client.query("SELECT title FROM public.projects")).rows).toHaveLength(allowed ? 1 : 0);
    await client.query("RESET ROLE; RESET request.jwt.claim.sub; RESET request.jwt.claims");
  });

  it("native malformed/scalar claims deny without masking a legacy owner or regranting publication RPC", async () => {
    const client = await connection(); await client.query("SET ROLE authenticated");
    for (const claims of ["{malformed", "[]", '"scalar"', "null", ""]) {
      await client.query("SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)", [owner, claims]);
      expect((await client.query("SELECT public.is_active_owner_with_aal2() AS allowed")).rows).toEqual([{ allowed: false }]);
    }
    expect((await client.query("SELECT has_function_privilege('authenticated','public.publish_new_revision(integer,jsonb,uuid)','EXECUTE') AS allowed")).rows).toEqual([{ allowed: false }]);
    await client.query("RESET ROLE; RESET request.jwt.claim.sub; RESET request.jwt.claims");
  });

  it("withdrawal commits before a waiting publication: publication fails atomically", async () => {
    const id = await seed(); const withdraw = await connection(); await withdraw.query("BEGIN");
    await withdraw.query("UPDATE public.media_assets SET approval_status='rejected' WHERE id=$1", [id]);
    const publication = publishRevision({ expectedRevision: 1, customProjects: projects(id) }, actor);
    const assertion = expect(publication).rejects.toThrow(/unapproved or missing media/);
    await waitForActualAdvisoryWait(); await withdraw.query("COMMIT"); await assertion;
    expect((await pool.query("SELECT count(*)::int AS count FROM public.publication_history")).rows[0].count).toBe(0);
    expect((await pool.query("SELECT count(*)::int AS count FROM public.audit_events")).rows[0].count).toBe(0);
  });

  it("publication holds its lifecycle lock through actual verification; waiting deletion then sees retained identity", async () => {
    const id = await seed(); pause = gate();
    const publication = publishRevision({ expectedRevision: 1, customProjects: projects(id) }, actor);
    await entered.promise;
    const deleting = await connection(); await deleting.query("BEGIN");
    const deletion = deleting.query("DELETE FROM public.media_assets WHERE id=$1", [id]);
    const assertion = expect(deletion).rejects.toThrow(/Retained publication media cannot be deleted/);
    await waitForActualAdvisoryWait(); pause.resolve();
    expect((await publication).revision).toBe(2); await assertion; await deleting.query("ROLLBACK");
    expect((await pool.query("SELECT id FROM public.media_assets WHERE id=$1", [id])).rows).toHaveLength(1);
    expect((await readPublicPublication())?.revision).toBe(2);
  });

  it("deletion before approval commits: waiting approval cannot resurrect the deleted object row", async () => {
    const id = await seed(false); const deleting = await connection(); await deleting.query("BEGIN");
    await deleting.query("DELETE FROM public.media_assets WHERE id=$1", [id]);
    const approval = approveMediaAsset(id, actor); const assertion = expect(approval).rejects.toThrow(/not found/);
    await waitForActualAdvisoryWait(); await deleting.query("COMMIT"); await assertion;
    expect((await pool.query("SELECT count(*)::int AS count FROM public.audit_events")).rows[0].count).toBe(0);
  });

  it("approval before withdrawal holds the lock; withdrawal completes afterward and prevents later publication", async () => {
    const id = await seed(false); pause = gate(); const approval = approveMediaAsset(id, actor); await entered.promise;
    const withdrawing = await connection(); await withdrawing.query("BEGIN");
    const withdrawal = withdrawing.query("UPDATE public.media_assets SET approval_status='rejected' WHERE id=$1", [id]);
    await waitForActualAdvisoryWait(); pause.resolve(); expect((await approval).approvalStatus).toBe("approved");
    await withdrawal; await withdrawing.query("COMMIT");
    await expect(publishRevision({ expectedRevision: 1, customProjects: projects(id) }, actor)).rejects.toThrow(/unapproved or missing media/);
  });

  it("native rollback detects storage loss and leaves all snapshot/history/audit rows unchanged", async () => {
    const id = await seed(); await publishRevision({ expectedRevision: 1, customProjects: projects(id) }, actor);
    await publishRevision({ expectedRevision: 2 }, actor);
    const state = async () => Promise.all(["published_content", "publication_history", "audit_events"].map(async (table) => (await pool.query(`SELECT * FROM public.${table} ORDER BY id`)).rows));
    const before = await state(); objects.clear();
    await expect(rollbackPublication(2, actor)).rejects.toThrow(/unapproved or missing media/);
    expect(await state()).toEqual(before); expect((await readPublicPublication())?.revision).toBe(3);
  });

  it("native concurrent contact duplicates use the database arbiter with the process mutex disabled", async () => {
    const payload = { name: "Native Fixture", email: "fixture@native.test", message: "A synthetic inquiry for real local database concurrency.", idempotencyKey: randomUUID() };
    const receipts = await Promise.all(Array.from({ length: 30 }, () => receiveContact(payload, "192.0.2.100", { db: provider, useInMemoryMutex: false })));
    expect(new Set(receipts.map((receipt) => receipt.id)).size).toBe(1);
    expect((await pool.query("SELECT count(*)::int AS count FROM public.contact_messages")).rows[0].count).toBe(1);
    expect((await pool.query("SELECT count(*)::int AS count FROM public.email_outbox")).rows[0].count).toBe(1);
    await expect(receiveContact({ ...payload, message: "A different conflicting synthetic payload for the same key." }, "192.0.2.100", { db: provider, useInMemoryMutex: false })).rejects.toThrow(/Conflicting idempotency key/);
  });
});
