import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { approvedPublication } from "@/content/approved-publication";
import { setPlatformDbForTests } from "@/server/database";
import { publishRevision, readPublicPublication, rollbackPublication } from "@/server/content/publish";
import { readApprovedPublishedMediaUrls } from "@/server/media/manifest";
import { registerMediaAsset, validateUpload } from "@/server/media/validate-upload";
import { boundedMediaOperation, MediaStorageUnavailableError } from "@/server/media/integrity";
import type { QueryableDb } from "@/server/contact/quota";
import type { OwnerContext } from "@/server/auth/types";

const actor: OwnerContext = { userId: "11111111-1111-1111-1111-111111111111", email: "owner@example.test", role: "owner", active: true, assurance: "aal2" };
const legacy = [randomUUID(), randomUUID(), randomUUID()];

describe("Fail-closed legacy media and unique upload ownership (embedded SQL; installed SDK with synthetic HTTP)", () => {
  let db: PGlite;
  let png: Uint8Array;
  let hash: string;
  let objects: Map<string, Uint8Array>;
  let calls: string[];
  beforeAll(async () => {
    png = new Uint8Array(await readFile("tests/fixtures/scp-media/valid-rgba-16x12.png"));
    hash = createHash("sha256").update(png).digest("hex");
    db = new PGlite();
    for (const name of ["20261001000000_a3_owner_auth_rls.sql", "20261001000001_a4_publication_media.sql", "20261005000000_github_refresh_state.sql"])
      await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
    for (const [index, id] of legacy.entries()) await db.query("INSERT INTO public.media_assets(id,object_key,hash,mime,bytes,approval_status) VALUES($1,$2,$3,'image/png',$4,'approved')", [id, `legacy-${index}.png`, hash, png.byteLength]);
    await db.exec(await readFile("supabase/migrations/20261009000000_owner_identity_media_integrity.sql", "utf8"));
    // Test-only fixture setup for partially backfilled legacy metadata, without weakening production triggers.
    await db.exec("ALTER TABLE public.media_assets DISABLE TRIGGER media_integrity_guard");
    await db.query("UPDATE public.media_assets SET storage_bucket='recorded-private' WHERE id=$1", [legacy[0]]);
    await db.query("UPDATE public.media_assets SET integrity_verified_at=now() WHERE id=$1", [legacy[1]]);
    await db.exec("ALTER TABLE public.media_assets ENABLE TRIGGER media_integrity_guard");
    await db.query("INSERT INTO auth.users(id) VALUES($1)", [actor.userId]);
  });
  beforeEach(async () => {
    await db.exec("TRUNCATE public.published_content,public.publication_history,public.audit_events CASCADE");
    setPlatformDbForTests(db);
    vi.stubEnv("MEDIA_PRIVATE_BUCKET", "environment-private");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://synthetic-storage.example.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "synthetic-anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "synthetic-service-key");
    objects = new Map(); calls = [];
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      calls.push(`${request.method} ${url.pathname}`);
      const key = decodeURIComponent(url.pathname.replace(/^\/storage\/v1\/object\//, ""));
      if (request.method === "POST") {
        expect(request.headers.get("x-upsert")).toBe("false");
        expect(objects.has(key)).toBe(false);
        objects.set(key, new Uint8Array(await request.arrayBuffer()));
        return Response.json({ Id: randomUUID(), Key: key });
      }
      if (request.method === "DELETE") {
        const body = await request.json();
        for (const prefix of body.prefixes) objects.delete(`${key}/${prefix}`);
        return Response.json([]);
      }
      if (request.method === "GET" && objects.has(key)) return new Response(new Uint8Array(objects.get(key)!), { headers: { "content-type": "image/png" } });
      return Response.json({ statusCode: "404", error: "not_found", message: "Synthetic missing object" }, { status: 404 });
    });
  });
  afterEach(() => { setPlatformDbForTests(null); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
  afterAll(async () => { await db.close(); });

  const projects = (id: string) => approvedPublication.projects.map((project) => ({ ...project, sections: project.sections.map((section) => ({ ...section, blocks: section.blocks.map((block) => block.type === "image" ? { ...block, mediaId: id } : block) })) }));
  const state = async () => Promise.all(["published_content", "publication_history", "audit_events"].map(async (table) => (await db.query(`SELECT * FROM public.${table} ORDER BY id`)).rows));
  for (const [index, id] of legacy.entries()) it.each([false, true])(`legacy metadata variant ${index} rejects publish and rollback, object present=%s`, async (present) => {
    if (present) objects.set(`recorded-private/legacy-${index}.png`, png);
    const target = { ...approvedPublication, revision: 2, projects: projects(id) };
    await db.query("INSERT INTO public.publication_history(revision,snapshot,actor) VALUES(2,$1,$2)", [JSON.stringify(target), actor.userId]);
    const before = await state();
    await expect(publishRevision({ expectedRevision: 1, customProjects: target.projects }, actor)).rejects.toThrow(/unapproved or missing media/);
    await expect(rollbackPublication(2, actor)).rejects.toThrow(/unapproved or missing media/);
    expect(await state()).toEqual(before);
    expect((await readPublicPublication())?.revision).toBe(1);
    expect(calls).toEqual([]);
  });

  it("public URL reads never infer a bucket or verification from the environment", async () => {
    const publication = { ...approvedPublication, projects: projects(legacy[2]!) };
    await db.query("INSERT INTO public.published_content(revision,payload) VALUES(1,$1)", [JSON.stringify(publication)]);
    expect(await readApprovedPublishedMediaUrls(publication)).toEqual({});
    expect(calls).toEqual([]);
  });

  it("duplicate uploads use distinct persisted bucket/key identities; failed insertion cleans only its own new key", async () => {
    const validated = await validateUpload({ buffer: png, mime: "image/png", filename: "identical.png" });
    const first = await registerMediaAsset(validated, actor);
    const second = await registerMediaAsset(validated, actor);
    expect(first.objectKey).not.toBe(second.objectKey);
    expect(first.storageBucket).toBe("environment-private");
    const original = new Map(objects);
    const broken: QueryableDb = { query: (sql, params) => db.query(sql, params), transaction: async (run) => db.transaction((tx) => run({ query: async (sql, params) => {
      if (sql.startsWith("INSERT INTO public.media_assets")) throw new Error("Synthetic registration failure");
      return tx.query(sql, params);
    } })) };
    setPlatformDbForTests(broken);
    await expect(registerMediaAsset(validated, actor)).rejects.toThrow(/registration failure/);
    expect(objects).toEqual(original);
    expect(calls.filter((call) => call.startsWith("DELETE"))).toHaveLength(1);
    expect((await db.query("SELECT object_key FROM public.media_assets WHERE object_key=ANY($1::text[])", [[first.objectKey, second.objectKey]])).rows).toHaveLength(2);
  });

  it("a permanently pending provider operation fails at the deadline even when it ignores AbortSignal", async () => {
    await expect(boundedMediaOperation(() => new Promise(() => {}), 20)).rejects.toBeInstanceOf(MediaStorageUnavailableError);
  });
});
