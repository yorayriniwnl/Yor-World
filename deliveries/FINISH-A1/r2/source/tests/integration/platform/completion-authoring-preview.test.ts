/**
 * YOR WORLD Milestone A1 / Milestone A4 Integration Suite:
 * Draft Preview, Pre-flight Verification & Review Identity Concurrency
 *
 * Exhaustively verifies:
 * - Deterministic ReviewIdentity generation with media row hash binding (PLAT-R2-01)
 * - Dynamic preflight checks (schema, evidence, links, media approval)
 * - Stale draft revision detection rejecting publish with HTTP 409 (CA-02)
 * - Media row hash mutation post-review rejecting publish with HTTP 409 (PLAT-R2-01)
 * - Private preview and media streaming authorization guards and private no-store headers
 */

import { describe, expect, it, beforeEach } from "vitest";
import {
  generateDraftReview,
} from "@/server/content/preview";
import {
  publishRevision,
  getActivePublication,
  resetPublicationState,
} from "@/server/content/publish";
import {
  saveProjectDraft,
  getProjectDraft,
  setTestDraftRegistry,
  RevisionConflictError,
} from "@/server/content/revisions";
import {
  setTestAuthRegistry,
} from "@/server/auth/require-owner";
import {
  getTestMediaRegistry,
  setTestMediaRegistry,
} from "@/server/media/validate-upload";
import type { OwnerContext } from "@/server/auth/types";
import { GET as previewRouteGET } from "@/app/api/admin/preview/route";
import { GET as previewMediaRouteGET } from "@/app/api/admin/preview/media/[id]/route";

const ACTIVE_OWNER: OwnerContext = {
  userId: "11111111-1111-1111-1111-111111111111",
  email: "owner_active@yorworld.test",
  assurance: "aal2",
  role: "owner",
  active: true,
};

function createOwnerRequest(path: string): Request {
  return new Request(`http://localhost:3000${path}`, {
    headers: {
      Authorization: "Bearer test-valid-owner-token",
      Origin: "http://localhost:3000",
    },
  });
}

function createAnonRequest(path: string): Request {
  return new Request(`http://localhost:3000${path}`);
}

describe("Draft Preview & ReviewIdentity Pre-flight Suite (A1 / PLAT-R2-01 / CA-02)", () => {
  beforeEach(() => {
    resetPublicationState();
    setTestDraftRegistry(null);
    setTestMediaRegistry(null);
    setTestAuthRegistry(
      new Map([
        [
          "test-valid-owner-token",
          {
            user: { id: ACTIVE_OWNER.userId, email: ACTIVE_OWNER.email, aal: "aal2" },
            adminRecord: { id: ACTIVE_OWNER.userId, role: "owner", active: true },
          },
        ],
      ])
    );
  });

  it("generates deterministic ReviewIdentity with preflight checks and media hash bindings", async () => {
    const summary = await generateDraftReview(ACTIVE_OWNER);

    expect(summary.review).toBeDefined();
    expect(summary.review.expectedPublicationRevision).toBe(getActivePublication().revision);
    expect(typeof summary.review.candidateSha256).toBe("string");
    expect(summary.review.candidateSha256.length).toBe(64);

    // Checks executed
    expect(summary.checks.length).toBeGreaterThanOrEqual(4);
    const schemaCheck = summary.checks.find((c) => c.key === "check-schema");
    const evidenceCheck = summary.checks.find((c) => c.key === "check-evidence");
    const linksCheck = summary.checks.find((c) => c.key === "check-links");
    const mediaCheck = summary.checks.find((c) => c.key === "check-media");

    expect(schemaCheck?.status).toBe("pass");
    expect(evidenceCheck?.status).toBe("pass");
    expect(linksCheck?.status).toBe("pass");
    expect(mediaCheck?.status).toBe("pass");

    // CandidateX is isolated from candidate projects
    expect(summary.projects.some((p) => p.id === "candidatex")).toBe(false);
  });

  it("publishes successfully when review identity and draft revisions match", async () => {
    const summary = await generateDraftReview(ACTIVE_OWNER);
    const expectedRev = summary.review.expectedPublicationRevision;

    const draftRevisions: Record<string, number> = {};
    for (const p of summary.review.projects) {
      draftRevisions[p.projectId] = p.draftRevision;
    }

    const nextPub = await publishRevision(
      {
        expectedRevision: expectedRev,
        review: {
          candidateSha256: summary.review.candidateSha256,
          draftRevisions,
        },
      },
      ACTIVE_OWNER
    );

    expect(nextPub.revision).toBe(expectedRev + 1);
    expect(nextPub.projects.length).toBe(summary.projects.length);
  });

  it("rejects publication with 409 when draft was modified post-review (stale revision conflict CA-02)", async () => {
    // 1. Generate review
    const summary = await generateDraftReview(ACTIVE_OWNER);
    const expectedRev = summary.review.expectedPublicationRevision;

    const draftRevisions: Record<string, number> = {};
    for (const p of summary.review.projects) {
      draftRevisions[p.projectId] = p.draftRevision;
    }

    // 2. Modify one draft post-review
    const currentDraft = await getProjectDraft("ai-vs-real", ACTIVE_OWNER);
    expect(currentDraft).not.toBeNull();
    if (currentDraft) {
      await saveProjectDraft(
        {
          projectId: "ai-vs-real",
          expectedRevision: currentDraft.draftRevision,
          project: {
            ...currentDraft.project,
            title: "AI vs Real (Mutated Post-Review)",
          },
        },
        ACTIVE_OWNER
      );
    }

    // 3. Attempt to publish using old review identity -> MUST throw RevisionConflictError (409)
    await expect(
      publishRevision(
        {
          expectedRevision: expectedRev,
          review: {
            candidateSha256: summary.review.candidateSha256,
            draftRevisions,
          },
        },
        ACTIVE_OWNER
      )
    ).rejects.toThrow(RevisionConflictError);
  });

  it("strictly closes PLAT-R2-01: rejects publication with 409 when media row hash is mutated post-review", async () => {
    // 1. Register and approve a test media asset
    const mediaRegistry = getTestMediaRegistry();
    mediaRegistry.set("media-test-plat-r2", {
      id: "media-test-plat-r2",
      objectKey: "test/plat-r2.png",
      hash: "original-hash-aaaa1111",
      mime: "image/png",
      bytes: 2048,
      dimensions: { width: 100, height: 100 },
      approvalStatus: "approved",
      createdAt: new Date().toISOString(),
    });

    // 2. Attach this media asset to a draft
    const draft = await getProjectDraft("ai-vs-real", ACTIVE_OWNER);
    expect(draft).not.toBeNull();
    if (draft) {
      await saveProjectDraft(
        {
          projectId: "ai-vs-real",
          expectedRevision: draft.draftRevision,
          project: {
            ...draft.project,
            sections: [
              ...draft.project.sections,
              {
                id: "media-sec-plat",
                heading: "Media Section",
                blocks: [
                  {
                    type: "image",
                    mediaId: "media-test-plat-r2",
                    alt: "Test image",
                    caption: "Caption",
                  },
                ],
              },
            ],
          },
        },
        ACTIVE_OWNER
      );
    }

    // 3. Generate review with the media asset included
    const summary = await generateDraftReview(ACTIVE_OWNER);
    const expectedRev = summary.review.expectedPublicationRevision;
    const mediaItem = summary.review.media.find((m) => m.mediaId === "media-test-plat-r2");
    expect(mediaItem).toBeDefined();
    expect(mediaItem?.hash).toBe("original-hash-aaaa1111");

    const draftRevisions: Record<string, number> = {};
    for (const p of summary.review.projects) {
      draftRevisions[p.projectId] = p.draftRevision;
    }

    // 4. Mutate media row hash in the registry post-review (simulating replacement or tampering)
    const mediaAsset = mediaRegistry.get("media-test-plat-r2");
    if (mediaAsset) {
      mediaAsset.hash = "mutated-hash-bbbb2222";
    }

    // 5. Attempt publication with review generated before media mutation
    // Must throw RevisionConflictError (409) because candidateSha256 differs!
    await expect(
      publishRevision(
        {
          expectedRevision: expectedRev,
          review: {
            candidateSha256: summary.review.candidateSha256,
            draftRevisions,
          },
        },
        ACTIVE_OWNER
      )
    ).rejects.toThrow(RevisionConflictError);
  });

  it("enforces owner authorization and emits private no-store headers on GET /api/admin/preview", async () => {
    // Unauthenticated request
    const anonReq = createAnonRequest("/api/admin/preview");
    const anonRes = await previewRouteGET(anonReq);
    expect(anonRes.status).toBe(401);
    expect(anonRes.headers.get("Cache-Control")).toContain("no-store");

    // Authenticated owner request
    const ownerReq = createOwnerRequest("/api/admin/preview");
    const ownerRes = await previewRouteGET(ownerReq);
    expect(ownerRes.status).toBe(200);
    expect(ownerRes.headers.get("Cache-Control")).toContain("private");
    expect(ownerRes.headers.get("Cache-Control")).toContain("no-store");

    const data = await ownerRes.json();
    expect(data.review).toBeDefined();
    expect(data.checks).toBeDefined();
    expect(data.projects).toBeDefined();
  });

  it("enforces owner authorization and streams media on GET /api/admin/preview/media/[id]", async () => {
    // 1. Prepare approved test media
    const mediaRegistry = getTestMediaRegistry();
    mediaRegistry.set("media-stream-01", {
      id: "media-stream-01",
      objectKey: "test/stream.png",
      hash: "stream-hash-1111",
      mime: "image/png",
      bytes: 1024,
      dimensions: { width: 50, height: 50 },
      approvalStatus: "approved",
      createdAt: new Date().toISOString(),
    });

    // Unauthenticated -> 401
    const anonReq = createAnonRequest("/api/admin/preview/media/media-stream-01");
    const anonRes = await previewMediaRouteGET(anonReq, {
      params: Promise.resolve({ id: "media-stream-01" }),
    });
    expect(anonRes.status).toBe(401);
    expect(anonRes.headers.get("Cache-Control")).toContain("no-store");

    // Authenticated owner for approved media -> 200 with private no-store headers
    const ownerReq = createOwnerRequest("/api/admin/preview/media/media-stream-01");
    const ownerRes = await previewMediaRouteGET(ownerReq, {
      params: Promise.resolve({ id: "media-stream-01" }),
    });
    expect(ownerRes.status).toBe(200);
    expect(ownerRes.headers.get("Content-Type")).toBe("image/png");
    expect(ownerRes.headers.get("Cache-Control")).toContain("private");
    expect(ownerRes.headers.get("Cache-Control")).toContain("no-store");

    // Authenticated owner for non-existent media -> 404
    const notFoundReq = createOwnerRequest("/api/admin/preview/media/does-not-exist");
    const notFoundRes = await previewMediaRouteGET(notFoundReq, {
      params: Promise.resolve({ id: "does-not-exist" }),
    });
    expect(notFoundRes.status).toBe(404);
  });
});
