import { beforeAll,beforeEach,afterEach,afterAll,describe,expect,it,vi } from "vitest";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { approvedPublication } from "@/content/approved-publication";
import { setPlatformDbForTests } from "@/server/database";
import { readApprovedPublishedMediaUrls } from "@/server/media/manifest";
import type { Publication } from "@/contracts/content";

const storage=vi.hoisted(() => ({ keys: [] as string[],protocol: "https:",fail: false }));
vi.mock("@/server/auth/clients",() => ({ createAdminServiceRoleClient: () => ({ storage: { from: () => ({ createSignedUrls: async (keys: string[]) => {
  storage.keys=keys;
  return { error: storage.fail ? { message: "Synthetic storage failure" } : null,data: keys.map((key) => ({ path: key,signedUrl: `${storage.protocol}//storage.fixture.test/${key}?synthetic-signature=approved` })) };
} }) } }) }));

describe("Public media signed URL resolver preserves approval and publication boundary",() => {
  const publishedId="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const privateId="bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
  let db: PGlite;
  let snapshot: Publication;
  beforeAll(async () => {
    db=new PGlite();
    for (const name of [
      "20261001000000_a3_owner_auth_rls.sql",
      "20261001000001_a4_publication_media.sql",
      "20261005000000_github_refresh_state.sql",
      "20261009000000_owner_identity_media_integrity.sql",
    ]) {
      await db.exec(await readFile(`supabase/migrations/${name}`,"utf8"));
    }
  });
  beforeEach(async () => {
    storage.keys=[];storage.protocol="https:";storage.fail=false;
    process.env.MEDIA_PRIVATE_BUCKET="synthetic-private";
    await db.exec("TRUNCATE public.media_assets,public.published_content CASCADE");
    snapshot={ ...approvedPublication,projects: approvedPublication.projects.map((project) => ({ ...project,sections: project.sections.map((section) => ({ ...section,blocks: section.blocks.map((block) => block.type === "image" ? { ...block,mediaId: publishedId } : block) })) })) };
    await db.query("INSERT INTO public.published_content(revision,payload) VALUES($1,$2)",[snapshot.revision,JSON.stringify(snapshot)]);
    const validHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    for (const [id,key] of [[publishedId,"approved-image.png"],[privateId,"private-draft.png"]])
      await db.query("INSERT INTO public.media_assets(id,object_key,hash,mime,bytes,approval_status,storage_bucket,integrity_verified_at) VALUES($1,$2,$3,'image/png',1,'approved','synthetic-private',now())",[id,key,validHash]);
    setPlatformDbForTests(db);
  });
  afterEach(() => { setPlatformDbForTests(null); delete process.env.MEDIA_PRIVATE_BUCKET; });
  afterAll(async () => { await db.close(); });
  it("signs only referenced approved media, without exposing approved but unpublished draft objects",async () => {
    const result=await readApprovedPublishedMediaUrls(snapshot);
    expect(result).toEqual({ [publishedId]: "https://storage.fixture.test/approved-image.png?synthetic-signature=approved" });
    expect(storage.keys).toEqual(["approved-image.png"]);
    expect(result[privateId]).toBeUndefined();
  });
  it("caller-supplied unpublished references cannot request a private object signature",async () => {
    const requested={ ...snapshot,projects: snapshot.projects.map((project) => ({ ...project,sections: project.sections.map((section) => ({ ...section,blocks: section.blocks.map((block) => block.type === "image" ? { ...block,mediaId: privateId } : block) })) })) };
    expect(await readApprovedPublishedMediaUrls(requested)).toEqual({});
    expect(storage.keys).toEqual([]);
  });
  it("revoked media approval gives no public URL",async () => {
    await db.query("UPDATE public.media_assets SET approval_status='rejected' WHERE id=$1",[publishedId]);
    expect(await readApprovedPublishedMediaUrls(snapshot)).toEqual({});
    expect(storage.keys).toEqual([]);
  });
  it("storage outage or non-HTTPS signatures produce an honest empty mapping",async () => {
    storage.fail=true;
    expect(await readApprovedPublishedMediaUrls(snapshot)).toEqual({});
    storage.fail=false;storage.protocol="http:";
    expect(await readApprovedPublishedMediaUrls(snapshot)).toEqual({});
  });
});
