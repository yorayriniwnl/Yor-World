import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { approvedPublication } from "@/content/approved-publication";
import { setPlatformDbForTests } from "@/server/database";
import type { OwnerContext } from "@/server/auth/types";
import { ContentValidationError, RevisionConflictError, getProjectDraft, saveProjectDraft, setTestDraftRegistry } from "@/server/content/revisions";
import { publishRevision, readPublicationHistory, rollbackPublication } from "@/server/content/publish";
import { generateDraftReview } from "@/server/content/preview";
import { readReviewedMedia, setReviewedMediaStorageForTests } from "@/server/media/manifest";
import { MediaValidationError, validateUpload } from "@/server/media/validate-upload";
import { setTestAuthRegistry, type TestAuthEntry } from "@/server/auth/require-owner";
import { GET as getPrivatePreview } from "@/app/api/admin/preview/route";
import { GET as getPrivatePreviewMedia } from "@/app/api/admin/preview/media/[id]/route";
import { POST as postPublish } from "@/app/api/admin/publish/route";
import { POST as postProjectDraft } from "@/app/api/admin/projects/route";

const actor: OwnerContext = { userId: "11111111-1111-1111-1111-111111111111", email: "owner@fixture.test", role: "owner", active: true, assurance: "aal2" };
const mediaId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const timestamp = "2026-10-11T00:00:00.000Z";

describe("FINISH A1 current review identity, bounded media, and atomic publish", () => {
  let db: PGlite;
  let png: Uint8Array;
  let validated: Awaited<ReturnType<typeof validateUpload>>;

  beforeAll(async () => {
    png = new Uint8Array(await readFile("tests/fixtures/scp-media/valid-rgba-16x12.png"));
    validated = await validateUpload({ buffer: png, mime: "image/png", filename: "private-review.png" });
    db = new PGlite();
    for (const name of ["20261001000000_a3_owner_auth_rls.sql", "20261001000001_a4_publication_media.sql"]) {
      await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
    }
    await db.exec(await readFile("supabase/operations/harden-publication-grants.sql", "utf8"));
    await db.query("INSERT INTO auth.users(id,email) VALUES($1,$2)", [actor.userId, actor.email]);
    await db.query("INSERT INTO public.admin_users(id,role,active) VALUES($1,'owner',true)", [actor.userId]);
  });

  beforeEach(async () => {
    await db.exec("TRUNCATE public.audit_events,public.projects,public.project_revisions,public.published_content,public.publication_history,public.media_assets CASCADE");
    setPlatformDbForTests(db);
    setReviewedMediaStorageForTests(null);
  });

  afterEach(() => { setPlatformDbForTests(null); setReviewedMediaStorageForTests(null); setTestAuthRegistry(null); setTestDraftRegistry(null); });
  afterAll(async () => { await db.close(); });

  function useStorage(fetch: (url: string, init: RequestInit) => Promise<Response>) {
    setReviewedMediaStorageForTests({ createSignedUrl: async () => "https://storage.test/temporary-token", fetch });
  }

  function verifiedResponse(headers: HeadersInit = {}) {
    return new Response(png.slice().buffer as ArrayBuffer, { headers: { "Content-Type": "image/png", "Content-Length": String(png.byteLength), ...Object.fromEntries(new Headers(headers)) } });
  }

  async function insertApprovedMedia(id = mediaId) {
    await db.query(`INSERT INTO public.media_assets(id,object_key,hash,mime,bytes,dimensions,provenance,approval_status,created_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,'approved',$8)`, [id, `private/${id}.png`, validated.hash, validated.mime, validated.bytes,
      JSON.stringify(validated.dimensions), JSON.stringify({ source: "synthetic test fixture" }), timestamp]);
    await db.query("INSERT INTO public.audit_events(actor,action,entity_type,entity_id,payload,created_at) VALUES($1,'media_approved','media',$2,'{}',$3)", [actor.userId, id, timestamp]);
  }

  async function publicationState() {
    const [history, content, audits] = await Promise.all([
      db.query("SELECT * FROM public.publication_history ORDER BY revision"),
      db.query("SELECT * FROM public.published_content ORDER BY revision"),
      db.query("SELECT * FROM public.audit_events ORDER BY created_at,id"),
    ]);
    return JSON.stringify({ history: history.rows, content: content.rows, audits: audits.rows });
  }

  async function attachImageToHelios(id = mediaId) {
    const draft = await getProjectDraft("helios", actor);
    if (!draft) throw new Error("Helios draft fixture is missing.");
    const project = structuredClone(draft.project);
    project.sections[0]!.blocks.push({ type: "image", mediaId: id, alt: "Synthetic reviewed image", caption: "Local test fixture" });
    await saveProjectDraft({ projectId: "helios", expectedRevision: draft.draftRevision, project }, actor);
  }

  it("binds full draft bodies to the review and rejects stale candidates without publication writes", async () => {
    const beforeReview = await generateDraftReview(actor);
    const draft = await getProjectDraft("helios", actor);
    expect(draft).not.toBeNull();
    const changed = { ...draft!.project, title: `${draft!.project.title} updated after review` };
    await saveProjectDraft({ projectId: "helios", expectedRevision: draft!.draftRevision, project: changed }, actor);
    const before = await publicationState();

    await expect(publishRevision({ expectedRevision: beforeReview.identity.expectedPublicationRevision, review: beforeReview.identity }, actor)).rejects.toBeInstanceOf(RevisionConflictError);

    expect(await publicationState()).toBe(before);
  });

  it("reviews durable draft revision 7 instead of a conflicting local revision 1", async () => {
    const local = approvedPublication.projects.find((project) => project.id === "helios")!;
    setTestDraftRegistry(new Map([["helios", { projectId: "helios", draftRevision: 1, project: local, updatedAt: timestamp, updatedBy: "system-seed" }]]));
    const durable = { ...local, revision: 7, title: "Durable seventh revision" };
    const row = await db.query<{ id: string }>("INSERT INTO public.projects(slug,title,draft_revision) VALUES('helios',$1,7) RETURNING id", [durable.title]);
    await db.query("INSERT INTO public.project_revisions(project_id,revision,payload,created_by) VALUES($1,7,$2,$3)", [row.rows[0]!.id, JSON.stringify(durable), actor.userId]);
    const review = await generateDraftReview(actor);
    expect(review.identity.projects.find((item) => item.projectId === "helios")?.draftRevision).toBe(7);
    expect(review.drafts.find((draft) => draft.projectId === "helios")?.project.title).toBe("Durable seventh revision");
  });

  it("returns private not-found for a requested project without a genuine draft", async () => {
    setTestAuthRegistry(new Map([["token-owner", { user: { id: actor.userId, email: actor.email, aal: "aal2" }, adminRecord: { id: actor.userId, role: "owner", active: true } }]]));
    expect(await generateDraftReview(actor, undefined, "candidatex")).toBeNull();
    const response = await getPrivatePreview(new Request("http://localhost/api/admin/preview?projectId=candidatex", {
      headers: { Authorization: "Bearer token-owner" },
    }));
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("vary")).toContain("Cookie");
    expect(await response.text()).not.toContain("CandidateX");
  });

  it("returns the authorized current draft on stale save without writing and keeps it private", async () => {
    setTestAuthRegistry(new Map([["token-owner", { user: { id: actor.userId, email: actor.email, aal: "aal2" }, adminRecord: { id: actor.userId, role: "owner", active: true } }]]));
    const initial = await getProjectDraft("helios", actor);
    expect(initial).not.toBeNull();
    const winningProject = { ...initial!.project, title: "Current saved draft content" };
    await saveProjectDraft({ projectId: "helios", expectedRevision: initial!.draftRevision, project: winningProject }, actor);
    const current = await getProjectDraft("helios", actor);
    expect(current).not.toBeNull();
    const staleBody = { projectId: "helios", expectedRevision: initial!.draftRevision, project: { ...initial!.project, title: "Unsaved stale buffer" } };
    const state = async () => JSON.stringify({
      projects: (await db.query("SELECT slug,draft_revision FROM public.projects ORDER BY slug")).rows,
      revisions: (await db.query("SELECT revision,payload FROM public.project_revisions ORDER BY project_id,revision")).rows,
      audits: (await db.query("SELECT actor,action,entity_type,entity_id,payload FROM public.audit_events ORDER BY created_at,id")).rows,
    });
    const before = await state();
    const denied = await postProjectDraft(new Request("http://localhost/api/admin/projects", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(staleBody),
    }));
    expect(denied.status).toBe(401);
    expect(await denied.text()).not.toContain("Current saved draft content");
    const response = await postProjectDraft(new Request("http://localhost/api/admin/projects", {
      method: "POST", headers: { Authorization: "Bearer token-owner", "Content-Type": "application/json" }, body: JSON.stringify(staleBody),
    }));
    expect(response.status).toBe(409);
    expect(response.headers.get("cache-control")).toContain("no-store");
    const body = await response.json() as { currentDraft?: { projectId: string; draftRevision: number; project: { title: string; summary: string } } };
    expect(body.currentDraft).toMatchObject({
      projectId: "helios",
      draftRevision: current!.draftRevision,
      project: { title: "Current saved draft content", summary: current!.project.summary },
    });
    expect(await state()).toBe(before);
  });

  it("rejects publish without a review at the service boundary", async () => {
    const before = await publicationState();
    await expect(publishRevision({ expectedRevision: approvedPublication.revision } as never, actor)).rejects.toBeInstanceOf(ContentValidationError);
    const currentReview = await generateDraftReview(actor);
    await expect(publishRevision({ expectedRevision: currentReview.identity.expectedPublicationRevision, review: { ...currentReview.identity, unexpected: true } } as never, actor)).rejects.toBeInstanceOf(ContentValidationError);
    await expect(publishRevision({ expectedRevision: currentReview.identity.expectedPublicationRevision + 1, review: currentReview.identity }, actor)).rejects.toBeInstanceOf(ContentValidationError);
    expect(await publicationState()).toBe(before);
  });

  it("rejects missing, malformed, and mismatched review bodies at the publish API", async () => {
    setTestAuthRegistry(new Map([["token-owner", { user: { id: actor.userId, email: actor.email, aal: "aal2" }, adminRecord: { id: actor.userId, role: "owner", active: true } }]]));
    const send = (body: unknown) => postPublish(new Request("http://localhost/api/admin/publish", {
      method: "POST", headers: { Authorization: "Bearer token-owner", "Content-Type": "application/json" }, body: JSON.stringify(body),
    }));
    const before = await publicationState();
    expect((await send({ expectedRevision: 1 })).status).toBe(422);
    expect((await send({ expectedRevision: 1, review: { unexpected: true } })).status).toBe(422);
    const review = await generateDraftReview(actor);
    expect((await send({ expectedRevision: 2, review: review.identity })).status).toBe(422);
    expect(await publicationState()).toBe(before);
  });

  it("guards review and media-byte routes for anonymous, nonowner, AAL1, and revoked sessions", async () => {
    const entry = (id: string, aal: "aal1" | "aal2", active?: boolean): TestAuthEntry => ({
      user: { id, email: `${id.slice(0, 8)}@fixture.test`, aal },
      ...(active === undefined ? {} : { adminRecord: { id, role: "owner" as const, active } }),
    });
    setTestAuthRegistry(new Map([
      ["token-nonowner", entry("22222222-2222-2222-2222-222222222222", "aal2")],
      ["token-aal1", entry("33333333-3333-3333-3333-333333333333", "aal1", true)],
      ["token-revoked", entry("44444444-4444-4444-4444-444444444444", "aal2", false)],
    ]));

    for (const [token, expected] of [[null, 401], ["token-nonowner", 403], ["token-aal1", 403], ["token-revoked", 403]] as const) {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const preview = await getPrivatePreview(new Request("http://localhost/api/admin/preview", { headers }));
      const media = await getPrivatePreviewMedia(new Request(`http://localhost/api/admin/preview/media/${mediaId}`, { headers }), { params: Promise.resolve({ id: mediaId }) });
      expect(preview.status).toBe(expected);
      expect(media.status).toBe(expected);
      expect(preview.headers.get("cache-control")).toContain("no-store");
      expect(preview.headers.get("vary")).toContain("Cookie");
      expect(media.headers.get("cache-control")).toContain("no-store");
    }
  });

  it("rejects invalid current durable draft content before publication", async () => {
    const draft = await getProjectDraft("helios", actor);
    expect(draft).not.toBeNull();
    const project = structuredClone(draft!.project);
    project.sections[0]!.heading = "";
    const projectRow = await db.query<{ id: string }>("INSERT INTO public.projects(slug,title,draft_revision) VALUES('helios',$1,2) RETURNING id", [project.title]);
    await db.query("INSERT INTO public.project_revisions(project_id,revision,payload,created_by) VALUES($1,2,$2,$3)", [projectRow.rows[0]!.id, JSON.stringify({ ...project, revision: 2 }), actor.userId]);
    await db.query("UPDATE public.projects SET draft_revision=2 WHERE id=$1", [projectRow.rows[0]!.id]);
    const review = await generateDraftReview(actor).catch(() => null);
    expect(review).toBeNull();
    const before = await publicationState();
    await expect(publishRevision({ expectedRevision: approvedPublication.revision, review: { expectedPublicationRevision: 1, projects: [], siteDraftRevision: null, media: [], candidateSha256: "a".repeat(64) } }, actor)).rejects.toBeInstanceOf(ContentValidationError);
    expect(await publicationState()).toBe(before);
  });

  it("requires rollback concurrency and reason, then records the reason in a new audit revision", async () => {
    const published = await publishRevision({ expectedRevision: approvedPublication.revision, review: (await generateDraftReview(actor)).identity }, actor);
    await expect(rollbackPublication(1, published.revision - 1, "Stale rollback", actor)).rejects.toBeInstanceOf(RevisionConflictError);
    await expect(rollbackPublication(1, published.revision, "", actor)).rejects.toBeInstanceOf(ContentValidationError);
    const rolledBack = await rollbackPublication(1, published.revision, "Restore baseline after review", actor);
    expect(rolledBack.revision).toBe(published.revision + 1);
    expect((await readPublicationHistory()).at(-1)?.rollbackReason).toBe("Restore baseline after review");
    expect((await db.query<{ payload: Record<string, unknown> }>("SELECT payload FROM public.audit_events WHERE action='publication_rollback' AND entity_id=$1", [String(rolledBack.revision)])).rows[0]?.payload).toMatchObject({ reason: "Restore baseline after review", targetRevision: 1 });
  });

  it("binds media metadata and the latest approval audit event to the review identity", async () => {
    await insertApprovedMedia();
    useStorage(async () => verifiedResponse());
    await attachImageToHelios();
    const original = await generateDraftReview(actor);
    expect(JSON.stringify(original)).not.toContain("temporary-token");
    const mediaIdentity = original.identity.media.find((item) => item.mediaId === mediaId);
    expect(mediaIdentity?.kind).toBe("asset");
    if (mediaIdentity?.kind !== "asset") throw new Error("Expected approved media identity.");
    expect(mediaIdentity.approvalAudit?.eventId).toBeTruthy();
    expect(Object.keys(mediaIdentity.approvalAudit ?? {}).sort()).toEqual(["createdAt", "eventId"]);

    await db.query("UPDATE public.media_assets SET provenance=$1 WHERE id=$2", [JSON.stringify({ source: "changed after review" }), mediaId]);
    const before = await publicationState();
    await expect(publishRevision({ expectedRevision: original.identity.expectedPublicationRevision, review: original.identity }, actor)).rejects.toBeInstanceOf(RevisionConflictError);
    expect(await publicationState()).toBe(before);

    const provenanceReview = await generateDraftReview(actor);
    const provenanceIdentity = provenanceReview.identity.media.find((item) => item.mediaId === mediaId);
    await db.query("UPDATE public.media_assets SET created_at=$1 WHERE id=$2", ["2026-10-11T01:00:00.000Z", mediaId]);
    const createdAtReview = await generateDraftReview(actor);
    const createdAtIdentity = createdAtReview.identity.media.find((item) => item.mediaId === mediaId);
    expect(createdAtIdentity?.kind === "asset" ? createdAtIdentity.createdAt : null).not.toBe(provenanceIdentity?.kind === "asset" ? provenanceIdentity.createdAt : null);
    const beforeCreatedAtConflict = await publicationState();
    await expect(publishRevision({ expectedRevision: provenanceReview.identity.expectedPublicationRevision, review: provenanceReview.identity }, actor)).rejects.toBeInstanceOf(RevisionConflictError);
    expect(await publicationState()).toBe(beforeCreatedAtConflict);

    const nextTime = "2026-10-12T00:00:00.000Z";
    await db.query("INSERT INTO public.audit_events(actor,action,entity_type,entity_id,payload,created_at) VALUES($1,'media_approved','media',$2,'{}',$3)", [actor.userId, mediaId, nextTime]);
    const changedReview = await generateDraftReview(actor);
    const changedIdentity = changedReview.identity.media.find((item) => item.mediaId === mediaId);
    expect(changedIdentity?.kind === "asset" ? changedIdentity.approvalAudit?.createdAt : null).not.toBe(mediaIdentity.approvalAudit?.createdAt);
    await expect(publishRevision({ expectedRevision: createdAtReview.identity.expectedPublicationRevision, review: createdAtReview.identity }, actor)).rejects.toBeInstanceOf(RevisionConflictError);
  });

  it("returns 409 for an object-key-only approved mapping replacement and preserves all publication tables", async () => {
    await insertApprovedMedia();
    useStorage(async () => verifiedResponse());
    await attachImageToHelios();
    const review = await generateDraftReview(actor);
    await db.query("UPDATE public.media_assets SET object_key=$1 WHERE id=$2", [`private/replacement-${mediaId}.png`, mediaId]);
    useStorage(async () => verifiedResponse());
    const before = await publicationState();
    await expect(publishRevision({ expectedRevision: review.identity.expectedPublicationRevision, review: review.identity }, actor)).rejects.toBeInstanceOf(RevisionConflictError);
    expect(await publicationState()).toBe(before);
  });

  it("binds hash, MIME, byte count, and dimensions for a second valid approved object under the same ID", async () => {
    await insertApprovedMedia();
    useStorage(async () => verifiedResponse());
    await attachImageToHelios();
    const original = await generateDraftReview(actor);
    const replacementBytes = new Uint8Array(await readFile("tests/fixtures/scp-media/valid-rgb-16x12.jpg"));
    const replacement = await validateUpload({ buffer: replacementBytes, mime: "image/jpeg", filename: "second-valid-mapping.jpg" });
    await db.query("UPDATE public.media_assets SET hash=$1,mime=$2,bytes=$3,dimensions=$4 WHERE id=$5", [replacement.hash, replacement.mime, replacement.bytes, JSON.stringify(replacement.dimensions), mediaId]);
    useStorage(async () => new Response(replacementBytes.slice().buffer as ArrayBuffer, { headers: { "Content-Type": "image/jpeg", "Content-Length": String(replacementBytes.byteLength) } }));
    const changedReview = await generateDraftReview(actor);
    expect(changedReview.canPublish).toBe(true);
    const before = await publicationState();
    await expect(publishRevision({ expectedRevision: original.identity.expectedPublicationRevision, review: original.identity }, actor)).rejects.toBeInstanceOf(RevisionConflictError);
    expect(await publicationState()).toBe(before);
  });

  it("returns 422 when Storage bytes change under metadata-equivalent approved mapping", async () => {
    await insertApprovedMedia();
    useStorage(async () => verifiedResponse());
    await attachImageToHelios();
    const review = await generateDraftReview(actor);
    const replacementBytes = new Uint8Array(await readFile("tests/fixtures/scp-media/valid-rgb-16x12.jpg"));
    useStorage(async () => new Response(replacementBytes.slice().buffer as ArrayBuffer, { headers: { "Content-Type": "image/jpeg", "Content-Length": String(replacementBytes.byteLength) } }));
    const before = await publicationState();
    await expect(publishRevision({ expectedRevision: review.identity.expectedPublicationRevision, review: review.identity }, actor)).rejects.toBeInstanceOf(ContentValidationError);
    expect(await publicationState()).toBe(before);
  });

  it.each(["pending", "rejected", "missing"] as const)("fails closed for a current %s media reference", async (state) => {
    await insertApprovedMedia();
    useStorage(async () => verifiedResponse());
    await attachImageToHelios();
    if (state === "missing") await db.query("DELETE FROM public.media_assets WHERE id=$1", [mediaId]);
    else await db.query("UPDATE public.media_assets SET approval_status=$1 WHERE id=$2", [state, mediaId]);
    const review = await generateDraftReview(actor);
    expect(review.canPublish).toBe(false);
    const before = await publicationState();
    await expect(publishRevision({ expectedRevision: review.identity.expectedPublicationRevision, review: review.identity }, actor)).rejects.toBeInstanceOf(ContentValidationError);
    expect(await publicationState()).toBe(before);
  });

  it("verifies valid image bytes and rejects declared oversize before stream reads", async () => {
    await insertApprovedMedia();
    let reads = 0;
    useStorage(async () => {
      const body = new ReadableStream<Uint8Array>({ pull(controller) { reads++; controller.enqueue(new Uint8Array([1])); controller.close(); } }, { highWaterMark: 0 });
      return new Response(body, { headers: { "Content-Length": String(5 * 1024 * 1024 + 1) } });
    });
    const oversized = await readReviewedMedia([mediaId]);
    expect(oversized.issues.get(mediaId)?.join(" ")).toMatch(/5 MiB/);
    expect(reads).toBe(0);

    useStorage(async () => verifiedResponse());
    const valid = await readReviewedMedia([mediaId]);
    expect(valid.issues.has(mediaId)).toBe(false);
    expect(valid.verifiedBytes.get(mediaId)).toEqual(png);
    const deduplicated = await readReviewedMedia([mediaId, mediaId]);
    expect(deduplicated.media.map((item) => item.mediaId)).toEqual([mediaId]);
  });

  it("caps streamed bytes, checks declared length, records stream failures, and enforces the deadline", async () => {
    await insertApprovedMedia();
    useStorage(async () => {
      let part = 0;
      const stream = new ReadableStream<Uint8Array>({ pull(controller) {
        part++;
        if (part === 1) controller.enqueue(new Uint8Array(5 * 1024 * 1024));
        else controller.enqueue(new Uint8Array(1));
      }, cancel() { streamWasCancelled = true; } }, { highWaterMark: 0 });
      return new Response(stream);
    });
    let streamWasCancelled = false;
    const streamedOversize = await readReviewedMedia([mediaId]);
    expect(streamedOversize.issues.get(mediaId)?.join(" ")).toMatch(/5 MiB/);
    expect(streamWasCancelled).toBe(true);

    useStorage(async () => new Response(png.slice().buffer as ArrayBuffer, { headers: { "Content-Length": String(png.byteLength + 1) } }));
    const mismatch = await readReviewedMedia([mediaId]);
    expect(mismatch.issues.get(mediaId)?.join(" ")).toMatch(/Content-Length/);

    useStorage(async () => new Response(new ReadableStream<Uint8Array>({ pull(controller) { controller.error(new Error("fixture stream failure")); } }, { highWaterMark: 0 })));
    const failed = await readReviewedMedia([mediaId]);
    expect(failed.issues.has(mediaId)).toBe(true);

    const timeoutSignal: { value: AbortSignal | null } = { value: null };
    useStorage(async (_url, init) => {
      timeoutSignal.value = init.signal as AbortSignal;
      return new Response(new ReadableStream<Uint8Array>({ pull() { return new Promise<void>(() => undefined); } }, { highWaterMark: 0 }));
    });
    const startedAt = Date.now();
    const timedOut = await readReviewedMedia([mediaId]);
    expect(Date.now() - startedAt).toBeLessThan(11_000);
    expect(timedOut.issues.get(mediaId)?.join(" ")).toMatch(/10-second deadline/);
    expect(timeoutSignal.value?.aborted).toBe(true);
  }, 20_000);

  it("enforces the shared deadline while creating a private Storage URL", async () => {
    await insertApprovedMedia();
    let signedUrlCompleted = false;
    let storageFetchCalled = false;
    setReviewedMediaStorageForTests({
      createSignedUrl: async () => {
        await new Promise<void>(() => undefined);
        signedUrlCompleted = true;
        return "https://storage.test/never-created";
      },
      fetch: async () => { storageFetchCalled = true; return verifiedResponse(); },
    });
    const startedAt = Date.now();
    const timedOut = await readReviewedMedia([mediaId]);
    expect(Date.now() - startedAt).toBeLessThan(11_000);
    expect(timedOut.issues.get(mediaId)?.join(" ")).toMatch(/10-second deadline/);
    expect(signedUrlCompleted).toBe(false);
    expect(storageFetchCalled).toBe(false);
  }, 15_000);

  it("rejects draft references to absent or unapproved media", async () => {
    const draft = await getProjectDraft("helios", actor);
    expect(draft).not.toBeNull();
    const project = structuredClone(draft!.project);
    project.sections[0]!.blocks.push({ type: "image", mediaId: "missing-unapproved-asset", alt: "Unknown", caption: "Must not save" });
    await expect(saveProjectDraft({ projectId: "helios", expectedRevision: draft!.draftRevision, project }, actor)).rejects.toBeInstanceOf(MediaValidationError);
  });

  it("maps image approval failures to private 422 responses without writing a draft pointer", async () => {
    setTestAuthRegistry(new Map([["token-owner", { user: { id: actor.userId, email: actor.email, aal: "aal2" }, adminRecord: { id: actor.userId, role: "owner", active: true } }]]));
    const draft = await getProjectDraft("helios", actor);
    expect(draft).not.toBeNull();
    const project = structuredClone(draft!.project);
    project.sections[0]!.blocks.push({ type: "image", mediaId: "missing-unapproved-asset", alt: "Unknown", caption: "Must not save" });
    const response = await postProjectDraft(new Request("http://localhost/api/admin/projects", {
      method: "POST", headers: { Authorization: "Bearer token-owner", "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: "helios", expectedRevision: draft!.draftRevision, project }),
    }));
    expect(response.status).toBe(422);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("vary")).toContain("Cookie");
    expect((await getProjectDraft("helios", actor))?.draftRevision).toBe(draft!.draftRevision);
  });

  it("serves only freshly verified approved bytes from the private proxy", async () => {
    await insertApprovedMedia();
    setTestAuthRegistry(new Map([["token-owner", { user: { id: actor.userId, email: actor.email, aal: "aal2" }, adminRecord: { id: actor.userId, role: "owner", active: true } }]]));
    const request = () => new Request(`http://localhost/api/admin/preview/media/${mediaId}`, { headers: { Authorization: "Bearer token-owner" } });
    const context = { params: Promise.resolve({ id: mediaId }) };
    useStorage(async () => verifiedResponse());
    const valid = await getPrivatePreviewMedia(request(), context);
    expect(valid.status).toBe(200);
    expect(valid.headers.get("content-type")).toBe("image/png");
    expect(valid.headers.get("cache-control")).toContain("no-store");
    expect(valid.headers.get("vary")).toContain("Authorization");
    expect(new Uint8Array(await valid.arrayBuffer())).toEqual(png);

    const altered = new Uint8Array(await readFile("tests/fixtures/scp-media/valid-rgb-16x12.jpg"));
    useStorage(async () => new Response(altered.slice().buffer as ArrayBuffer, { headers: { "Content-Type": "image/jpeg", "Content-Length": String(altered.byteLength) } }));
    const rejected = await getPrivatePreviewMedia(request(), context);
    expect(rejected.status).toBe(404);
    expect((await rejected.arrayBuffer()).byteLength).toBe(0);
  });
});
