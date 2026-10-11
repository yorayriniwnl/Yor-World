import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { GET as getPreview } from "@/app/api/admin/preview/route";
import { GET as getDraftMedia } from "@/app/api/admin/preview/media/[id]/route";
import { GET as getMediaList } from "@/app/api/admin/media/route";
import { POST as saveDraft } from "@/app/api/admin/projects/route";
import { POST as publishDraft } from "@/app/api/admin/publish/route";
import { POST as rollbackDraft } from "@/app/api/admin/rollback/route";
import { PrivateDraftReviewSchema } from "@/server/content/preview";
import { getProjectDraft, setTestDraftRegistry } from "@/server/content/revisions";
import { resetPublicationState, getActivePublication } from "@/server/content/publish";
import { setTestAuthRegistry } from "@/server/auth/require-owner";
import { approveMediaAsset, registerMediaAsset, setTestMediaRegistry, validateUpload } from "@/server/media/validate-upload";
import { setTestMediaBytesForTests } from "@/server/media/manifest";
import type { OwnerContext } from "@/server/auth/types";

const owner: OwnerContext = { userId: "11111111-1111-1111-1111-111111111111", email: "owner@fixture.test", role: "owner", active: true, assurance: "aal2" };
const token = "completion-preview-owner";
const ownerRequest = (url: string, init: RequestInit = {}, session = token) => new Request(`http://localhost${url}`, { ...init, headers: { Authorization: `Bearer ${session}`, ...(init.headers as Record<string, string> | undefined) } });

describe("A1 R5 private authoring preview routes", () => {
  let mediaId: string | null = null;

  beforeEach(() => {
    resetPublicationState();
    setTestDraftRegistry(null);
    setTestMediaRegistry(null);
    setTestAuthRegistry(new Map([
      [token, { user: { id: owner.userId, email: owner.email, aal: "aal2" }, adminRecord: { id: owner.userId, role: "owner", active: true } }],
      ["completion-preview-visitor", { user: { id: "22222222-2222-2222-2222-222222222222", email: "visitor@fixture.test", aal: "aal2" }, adminRecord: undefined }],
      ["completion-preview-aal1", { user: { id: "33333333-3333-3333-3333-333333333333", email: "aal1@fixture.test", aal: "aal1" }, adminRecord: { id: "33333333-3333-3333-3333-333333333333", role: "owner", active: true } }],
      ["completion-preview-revoked", { user: { id: "44444444-4444-4444-4444-444444444444", email: "revoked@fixture.test", aal: "aal2" }, adminRecord: { id: "44444444-4444-4444-4444-444444444444", role: "owner", active: false } }],
    ]));
    mediaId = null;
  });

  afterEach(() => {
    if (mediaId) setTestMediaBytesForTests(mediaId, null);
    setTestAuthRegistry(null);
    setTestDraftRegistry(null);
    setTestMediaRegistry(null);
    resetPublicationState();
  });

  it("returns a strict private review only to the authenticated AAL2 owner", async () => {
    const denied = await getPreview(new Request("http://localhost/api/admin/preview"));
    expect(denied.status).toBe(401);
    expect(denied.headers.get("cache-control")).toContain("no-store");

    const response = await getPreview(ownerRequest("/api/admin/preview"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("vary")).toContain("Cookie");
    const review = PrivateDraftReviewSchema.parse(await response.json());
    expect(review.canPublish).toBe(true);
    expect(review.checks).toHaveLength(review.drafts.filter((draft) => draft.projectId !== "candidatex").length * 5);

    const candidate = await getPreview(ownerRequest("/api/admin/preview?projectId=candidatex"));
    const candidateReview = PrivateDraftReviewSchema.parse(await candidate.json());
    expect(candidateReview.canPublish).toBe(false);
    expect(candidateReview.identity.projects.some((item) => item.projectId === "candidatex")).toBe(false);
    expect(candidateReview.checks.find((check) => check.id === "candidatex" && check.kind === "publication-rules")?.status).toBe("failed");
  });

  it("denies nonowners, AAL1 sessions, and revoked owners before private review or media responses", async () => {
    for (const session of ["completion-preview-visitor", "completion-preview-aal1", "completion-preview-revoked"]) {
      const review = await getPreview(ownerRequest("/api/admin/preview", {}, session));
      expect(review.status).toBe(403);
      expect(review.headers.get("cache-control")).toContain("no-store");
      const media = await getDraftMedia(ownerRequest("/api/admin/preview/media/sentinel", {}, session), { params: Promise.resolve({ id: "sentinel" }) });
      expect(media.status).toBe(403);
      expect(media.headers.get("cache-control")).toContain("no-store");
      const mediaList = await getMediaList(ownerRequest("/api/admin/media", {}, session));
      expect(mediaList.status).toBe(403);
      expect(mediaList.headers.get("cache-control")).toContain("no-store");
    }
    const list = await getMediaList(ownerRequest("/api/admin/media"));
    expect(list.status).toBe(200);
    expect(list.headers.get("cache-control")).toContain("no-store");
  });

  it("saves a structured draft and streams its approved image only through the private preview route", async () => {
    const bytes = await readFile("tests/fixtures/scp-media/valid-rgba-16x12.png");
    const validated = await validateUpload({ buffer: bytes, mime: "image/png", filename: "preview.png" });
    const asset = await registerMediaAsset(validated, owner);
    mediaId = asset.id;
    await approveMediaAsset(asset.id, owner);
    setTestMediaBytesForTests(asset.id, bytes);

    const draft = await getProjectDraft("ai-vs-real", owner);
    expect(draft).not.toBeNull();
    const invalidProject = {
      ...draft!.project,
      sections: draft!.project.sections.map((section, index) => index === 0 ? {
        ...section,
        blocks: [...section.blocks, { type: "image" as const, mediaId: "unapproved-missing-media", alt: "Invalid image", caption: "Must fail before the draft pointer changes." }],
      } : section),
    };
    const invalidSave = await saveDraft(ownerRequest("/api/admin/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: "ai-vs-real", expectedRevision: draft!.draftRevision, project: invalidProject }) }));
    expect(invalidSave.status).toBe(422);
    expect(invalidSave.headers.get("cache-control")).toContain("no-store");
    expect(invalidSave.headers.get("vary")).toContain("Cookie");
    expect((await getProjectDraft("ai-vs-real", owner))?.draftRevision).toBe(draft!.draftRevision);
    const project = {
      ...draft!.project,
      sections: draft!.project.sections.map((section, index) => index === 0 ? {
        ...section,
        blocks: [...section.blocks,
          { type: "image" as const, mediaId: asset.id, alt: "Synthetic approved preview", caption: "Local fixture only" },
          { type: "image" as const, mediaId: asset.id, alt: "Same reviewed object", caption: "Repeated reference verifies media vector deduplication." },
        ],
      } : section),
    };
    const saved = await saveDraft(ownerRequest("/api/admin/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: "ai-vs-real", expectedRevision: draft!.draftRevision, project }) }));
    expect(saved.status).toBe(201);
    expect((await saved.json()).draftRevision).toBe(draft!.draftRevision + 1);
    const staleSave = await saveDraft(ownerRequest("/api/admin/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: "ai-vs-real", expectedRevision: draft!.draftRevision, project }) }));
    expect(staleSave.status).toBe(409);
    expect(staleSave.headers.get("cache-control")).toContain("no-store");
    expect((await getProjectDraft("ai-vs-real", owner))?.draftRevision).toBe(draft!.draftRevision + 1);
    const reviewResponse = await getPreview(ownerRequest("/api/admin/preview"));
    const review = PrivateDraftReviewSchema.parse(await reviewResponse.json());
    expect(review.identity.media.filter((item) => item.mediaId === asset.id)).toHaveLength(1);

    const response = await getDraftMedia(ownerRequest(`/api/admin/preview/media/${asset.id}`), { params: Promise.resolve({ id: asset.id }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array(bytes));

    const tampered = Uint8Array.from(bytes);
    tampered[tampered.length - 1] = tampered[tampered.length - 1]! ^ 0xff;
    setTestMediaBytesForTests(asset.id, tampered);
    const invalidBytes = await getDraftMedia(ownerRequest(`/api/admin/preview/media/${asset.id}`), { params: Promise.resolve({ id: asset.id }) });
    expect(invalidBytes.status).toBe(422);
    expect(invalidBytes.headers.get("cache-control")).toContain("no-store");
    setTestMediaBytesForTests(asset.id, bytes);

    const missing = await getDraftMedia(ownerRequest("/api/admin/preview/media/unreferenced"), { params: Promise.resolve({ id: "unreferenced" }) });
    expect(missing.status).toBe(404);
    expect(missing.headers.get("cache-control")).toContain("no-store");
  });

  it("requires a fresh matching review identity and preserves publication on stale replay", async () => {
    const reviewResponse = await getPreview(ownerRequest("/api/admin/preview"));
    const review = PrivateDraftReviewSchema.parse(await reviewResponse.json());
    const body = { expectedRevision: review.identity.expectedPublicationRevision, review: review.identity };
    const missingReview = await publishDraft(ownerRequest("/api/admin/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedRevision: body.expectedRevision }) }));
    expect(missingReview.status).toBe(422);
    expect(missingReview.headers.get("cache-control")).toContain("no-store");
    const unknownField = await publishDraft(ownerRequest("/api/admin/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, alternateCandidate: true }) }));
    expect(unknownField.status).toBe(422);
    expect(getActivePublication().revision).toBe(1);
    const published = await publishDraft(ownerRequest("/api/admin/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
    expect(published.status).toBe(200);
    expect((await published.json()).publication.revision).toBe(2);

    const stale = await publishDraft(ownerRequest("/api/admin/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
    expect(stale.status).toBe(409);
    expect(stale.headers.get("cache-control")).toContain("no-store");
    expect(getActivePublication().revision).toBe(2);

    const badReason = await rollbackDraft(ownerRequest("/api/admin/rollback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetRevision: 1, expectedRevision: 2, reason: " " }) }));
    expect(badReason.status).toBe(422);
    expect(badReason.headers.get("cache-control")).toContain("no-store");
    const staleRollback = await rollbackDraft(ownerRequest("/api/admin/rollback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetRevision: 1, expectedRevision: 99, reason: "A stale rollback must not write." }) }));
    expect(staleRollback.status).toBe(409);
    expect(staleRollback.headers.get("cache-control")).toContain("no-store");
    expect(getActivePublication().revision).toBe(2);
  });
});
