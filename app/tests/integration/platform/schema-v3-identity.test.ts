import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

const owner = "11111111-1111-1111-1111-111111111111";
const revoked = "22222222-2222-2222-2222-222222222222";
const visitor = "44444444-4444-4444-4444-444444444444";
const migrations = ["20261001000000_a3_owner_auth_rls.sql", "20261001000001_a4_publication_media.sql", "20261005000000_github_refresh_state.sql", "20261009000000_owner_identity_media_integrity.sql"];

describe("Schema-v3 JSON-only identity repair (embedded PGlite, not native Supabase)", () => {
  let db: PGlite;
  beforeAll(async () => {
    db = new PGlite();
    for (const file of migrations.slice(0, 3)) await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    await db.query("SELECT set_config('request.jwt.claim.sub','',false), set_config('request.jwt.claims',$1,false)", [JSON.stringify({ sub: owner, aal: "aal2" })]);
    expect((await db.query("SELECT auth.uid() AS id")).rows).toEqual([{ id: null }]);
    await db.exec(await readFile(`supabase/migrations/${migrations[3]}`, "utf8"));
    await db.exec(await readFile("supabase/operations/harden-publication-grants.sql", "utf8"));
    for (const id of [owner, revoked, visitor]) await db.query("INSERT INTO auth.users(id) VALUES($1)", [id]);
    await db.query("INSERT INTO public.admin_users(id,role,active) VALUES($1,'owner',true),($2,'owner',false)", [owner, revoked]);
    await db.query("INSERT INTO public.projects(slug,title) VALUES('private','Private owner project')");
  });
  afterEach(async () => { await db.exec("RESET ROLE; RESET request.jwt.claim.sub; RESET request.jwt.claims"); });
  afterAll(async () => { await db.close(); });

  async function context(claims: string, legacy = "", role = "authenticated") {
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)", [legacy, claims]);
    await db.exec(`SET ROLE ${role}`);
  }

  it("JSON-only active owner/AAL2 can read and write through RLS with an explicitly empty legacy setting", async () => {
    await context(JSON.stringify({ sub: owner, aal: "aal2" }));
    expect((await db.query("SELECT current_setting('request.jwt.claim.sub',true) AS legacy,auth.uid() AS id,public.is_active_owner_with_aal2() AS allowed")).rows).toEqual([{ legacy: "", id: owner, allowed: true }]);
    expect((await db.query("SELECT title FROM public.projects")).rows).toEqual([{ title: "Private owner project" }]);
    expect((await db.query("UPDATE public.projects SET title=title WHERE slug='private' RETURNING slug")).rows).toEqual([{ slug: "private" }]);
  });

  it.each([
    ["non-owner", JSON.stringify({ sub: visitor, aal: "aal2" })],
    ["revoked owner", JSON.stringify({ sub: revoked, aal: "aal2" })],
    ["AAL1", JSON.stringify({ sub: owner, aal: "aal1" })],
    ["missing AAL", JSON.stringify({ sub: owner })],
    ["missing subject", JSON.stringify({ aal: "aal2" })],
    ["invalid UUID", JSON.stringify({ sub: "invalid-uuid", aal: "aal2" })],
    ["empty subject", JSON.stringify({ sub: "", aal: "aal2" })],
    ["numeric subject", JSON.stringify({ sub: 123, aal: "aal2" })],
    ["malformed JSON", "{malformed"], ["array", "[]"], ["scalar", '"scalar"'], ["JSON null", "null"], ["absent claims", ""],
  ])("denies %s without raising parse failures or authorizing writes", async (_name, claims) => {
    await context(claims!);
    expect((await db.query("SELECT public.is_active_owner_with_aal2() AS allowed")).rows).toEqual([{ allowed: false }]);
    expect((await db.query("SELECT title FROM public.projects")).rows).toEqual([]);
    await expect(db.query("INSERT INTO public.projects(slug,title) VALUES('forged','Denied')")).rejects.toThrow(/row-level security/i);
  });

  it.each([JSON.stringify({ sub: visitor, aal: "aal2" }), "{malformed", "[]", JSON.stringify({ aal: "aal2" }), JSON.stringify({ sub: "not-uuid", aal: "aal2" })])("a legacy owner cannot mask native claims %s", async (claims) => {
    await context(claims, owner);
    expect((await db.query("SELECT auth.uid() AS id,public.is_active_owner() AS owner,public.is_active_owner_with_aal2() AS allowed")).rows).toEqual([{ id: null, owner: false, allowed: false }]);
  });

  it("matching legacy/native subjects remain compatible, invalid legacy subject denies", async () => {
    await context(JSON.stringify({ sub: owner, aal: "aal2" }), owner);
    expect((await db.query("SELECT public.is_active_owner_with_aal2() AS allowed")).rows).toEqual([{ allowed: true }]);
    await db.exec("RESET ROLE");
    await context(JSON.stringify({ sub: owner, aal: "aal2" }), "invalid-legacy");
    expect((await db.query("SELECT auth.uid() AS id")).rows).toEqual([{ id: null }]);
  });

  it("anonymous identity and live revocation are denied; publication grant hardening survives", async () => {
    await context("", "", "anon");
    expect((await db.query("SELECT public.is_active_owner_with_aal2() AS allowed")).rows).toEqual([{ allowed: false }]);
    await expect(db.query("SELECT * FROM public.projects")).rejects.toThrow(/permission denied/i);
    await db.exec("RESET ROLE");
    await db.query("UPDATE public.admin_users SET active=false WHERE id=$1", [owner]);
    await context(JSON.stringify({ sub: owner, aal: "aal2" }));
    expect((await db.query("SELECT public.is_active_owner_with_aal2() AS allowed")).rows).toEqual([{ allowed: false }]);
    for (const role of ["anon", "authenticated"])
      expect((await db.query("SELECT has_function_privilege($1,'public.publish_new_revision(integer,jsonb,uuid)','EXECUTE') AS allowed", [role])).rows).toEqual([{ allowed: false }]);
  });

  it("clean full-order initialization and idempotent forward reapplication preserve invoker/stable auth helpers", async () => {
    const clean = new PGlite();
    try {
      for (const file of migrations) await clean.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
      await clean.exec(await readFile(`supabase/migrations/${migrations[3]}`, "utf8"));
      expect((await clean.query("SELECT proname,prosecdef,provolatile FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='auth' ORDER BY proname")).rows).toEqual([
        { proname: "jwt", prosecdef: false, provolatile: "s" }, { proname: "uid", prosecdef: false, provolatile: "s" },
      ]);
    } finally { await clean.close(); }
  });
});
