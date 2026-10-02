import { afterAll,afterEach,beforeAll,beforeEach,describe,expect,it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { approvedPublication } from "@/content/approved-publication";
import { getPlatformDb,setPlatformDbForTests } from "@/server/database";
import { POST as contact } from "@/app/api/contact/route";
import { saveProjectDraft,listProjectDrafts,RevisionConflictError } from "@/server/content/revisions";
import { publishRevision,readPublicPublication,readPublicationHistory,rollbackPublication } from "@/server/content/publish";
import { createDatabaseBackup,restoreDatabaseFromBackup } from "@/server/operations/backup-restore";
import { createConfiguredEmailAdapter } from "@/server/contact/email-adapter";
import { processOutbox } from "@/server/jobs/outbox-worker";
import { verifyJobAuth } from "@/server/jobs/runner";
import type { QueryableDb } from "@/server/contact/quota";
import type { OwnerContext } from "@/server/auth/types";

const actor: OwnerContext={ userId: "11111111-1111-1111-1111-111111111111",email: "owner@fixture.test",role: "owner",active: true,assurance: "aal2" };
describe("Canonical production provider and actual platform route integration",() => {
  let db: PGlite;
  beforeAll(async () => {
    db=new PGlite();
    for (const name of ["20261001000000_a3_owner_auth_rls.sql","20261001000001_a4_publication_media.sql"])
      await db.exec(await readFile(`supabase/migrations/${name}`,"utf8"));
    await db.exec(await readFile("supabase/operations/harden-publication-grants.sql","utf8"));
    await db.query("INSERT INTO auth.users(id,email) VALUES($1,$2)",[actor.userId,actor.email]);
    await db.query("INSERT INTO public.admin_users(id,role,active) VALUES($1,'owner',true)",[actor.userId]);
  });
  beforeEach(async () => {
    await db.exec("TRUNCATE public.audit_events,public.projects,public.project_revisions,public.published_content,public.publication_history,public.media_assets,public.contact_messages,public.contact_idempotency,public.email_outbox,public.request_quotas,public.github_snapshots,public.aggregate_events CASCADE");
    setPlatformDbForTests(db);
  });
  afterEach(() => setPlatformDbForTests(null));
  afterAll(async () => { await db.close(); });

  function request(key: string,message="An inquiry through the canonical application contact API.") {
    return new NextRequest("http://localhost/api/contact",{ method: "POST",headers: { "Content-Type": "application/json","x-forwarded-for": "192.0.2.90" },
      body: JSON.stringify({ name: "Synthetic Visitor",email: "visitor@fixture.test",message,idempotencyKey: key }) });
  }

  it("executes canonical R2 API for twenty duplicates and a conflicting payload",async () => {
    const key=randomUUID();
    const responses=await Promise.all(Array.from({ length: 20 },() => contact(request(key))));
    expect(responses.map((response) => response.status)).toEqual(Array(20).fill(202));
    const bodies=await Promise.all(responses.map((response) => response.json()));
    expect(new Set(bodies.map((body) => body.id)).size).toBe(1);
    expect((await db.query("SELECT COUNT(*)::int AS count FROM public.contact_messages")).rows).toEqual([{ count: 1 }]);
    expect((await db.query("SELECT COUNT(*)::int AS count FROM public.email_outbox")).rows).toEqual([{ count: 1 }]);
    expect((await db.query("SELECT count FROM public.request_quotas")).rows.every((row) => (row as Record<string,unknown>)["count"] === 1)).toBe(true);
    expect((await contact(request(key,"A conflicting inquiry with the same submission key."))).status).toBe(409);
  });

  it("operational grants block direct privileged RPC bypass by anonymous and authenticated users",async () => {
    for (const role of ["anon","authenticated"]) {
      const privilege=await db.query("SELECT has_function_privilege($1,'public.publish_new_revision(integer,jsonb,uuid)','EXECUTE') AS permitted",[role]);
      expect(privilege.rows).toEqual([{ permitted: false }]);
      await db.exec(`SET ROLE ${role}`);
      try {
        await expect(db.query("SELECT public.publish_new_revision($1,$2,$3)",[2,JSON.stringify(approvedPublication),actor.userId])).rejects.toThrow(/permission denied/i);
      } finally { await db.exec("RESET ROLE"); }
    }
    expect((await db.query("SELECT COUNT(*)::int AS count FROM public.published_content")).rows).toEqual([{ count: 0 }]);
    expect((await db.query("SELECT has_function_privilege('service_role','public.publish_new_revision(integer,jsonb,uuid)','EXECUTE') AS permitted")).rows).toEqual([{ permitted: true }]);
  });

  it("outbox insertion failure rolls back claim, quotas and message before returning 503",async () => {
    const broken: QueryableDb={ query: (sql,params) => db.query(sql,params),transaction: async (run) => db.transaction(async (tx) => run({ query: async (sql,params) => {
      if (sql.includes("INSERT INTO public.email_outbox")) throw new Error("Synthetic insertion failure");
      return tx.query(sql,params);
    } })) };
    setPlatformDbForTests(broken);
    const response=await contact(request(randomUUID()));
    expect(response.status).toBe(503);
    expect((await response.json()).status).toBe("unavailable");
    for (const table of ["contact_idempotency","request_quotas","contact_messages","email_outbox"])
      expect((await db.query(`SELECT COUNT(*)::int AS count FROM public.${table}`)).rows).toEqual([{ count: 0 }]);
  });

  it("durable draft save remains private, publication is atomic and stale writers fail",async () => {
    const project=approvedPublication.projects.find((item) => item.id === "helios")!;
    const changed={ ...project,title: `${project.title} — approved update`,sections: project.sections.map((section) => ({ ...section,blocks: section.blocks.filter((block) => block.type !== "image") })) };
    const saved=await saveProjectDraft({ projectId: "helios",expectedRevision: project.revision,project: changed },actor);
    expect(saved.draftRevision).toBe(project.revision+1);
    expect((await readPublicPublication())?.projects.find((item) => item.id === "helios")?.title).toBe(project.title);
    const next=await publishRevision({ expectedRevision: approvedPublication.revision },actor);
    expect(next.projects.find((item) => item.id === "helios")?.title).toBe(changed.title);
    expect((await readPublicPublication())?.revision).toBe(next.revision);
    expect(next.assetManifestRevision).toBe(approvedPublication.assetManifestRevision);
    await expect(publishRevision({ expectedRevision: approvedPublication.revision },actor)).rejects.toBeInstanceOf(RevisionConflictError);
    expect((await readPublicationHistory()).map((entry) => entry.revision)).toEqual([1,2]);
    const drafts=await listProjectDrafts(actor);
    expect(drafts.find((draft) => draft.projectId === "helios")?.draftRevision).toBe(saved.draftRevision);
    // A second approved snapshot provides a target whose image dependencies exist in this fixture.
    const third=await publishRevision({ expectedRevision: next.revision },actor);
    expect((await rollbackPublication(next.revision,actor)).revision).toBe(third.revision+1);
  });

  it("backs up and restores all fifteen accepted public tables including outbox/idempotency",async () => {
    await contact(request(randomUUID()));
    const backup=await createDatabaseBackup(db,"synthetic-rehearsal");
    expect(Object.keys(backup.tables)).toHaveLength(15);
    await db.exec("TRUNCATE public.contact_messages,public.contact_idempotency,public.request_quotas CASCADE");
    const result=await restoreDatabaseFromBackup(db,backup);
    expect(result.success).toBe(true);
    expect(result.restoredTables).toHaveLength(15);
    expect((await db.query("SELECT COUNT(*)::int AS count FROM public.contact_messages")).rows).toEqual([{ count: 1 }]);
    expect((await db.query("SELECT COUNT(*)::int AS count FROM public.email_outbox")).rows).toEqual([{ count: 1 }]);
    expect((await db.query("SELECT COUNT(*)::int AS count FROM public.contact_idempotency")).rows).toEqual([{ count: 1 }]);
  });

  it("missing configured database fails closed and never selects ephemeral storage",async () => {
    setPlatformDbForTests(null);
    const original=process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try { await expect(getPlatformDb()).rejects.toThrow("Durable database is not configured."); }
    finally { if (original !== undefined) process.env.DATABASE_URL=original; }
  });

  it("unconfigured mail retains a retryable outbox; missing cron secret denies jobs",async () => {
    const received=await contact(request(randomUUID()));
    expect(received.status).toBe(202);
    const result=await processOutbox(new Date(),10,{ db,emailAdapter: createConfiguredEmailAdapter() });
    expect(result.sent).toBe(0);
    expect(result.retried).toBe(1);
    expect((await db.query("SELECT status FROM public.email_outbox")).rows).toEqual([{ status: "retrying" }]);
    const secret=process.env.CRON_SECRET; const alias=process.env.INTERNAL_JOB_KEY;
    delete process.env.CRON_SECRET; delete process.env.INTERNAL_JOB_KEY;
    try { expect(verifyJobAuth("Bearer yor-world-internal-cron-secret-key-v1",null)).toBe(false); }
    finally { if (secret !== undefined) process.env.CRON_SECRET=secret; if (alias !== undefined) process.env.INTERNAL_JOB_KEY=alias; }
  });
});
