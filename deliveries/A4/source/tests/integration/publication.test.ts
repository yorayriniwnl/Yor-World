/**
 * YOR WORLD Milestone A4: Publication, Drafts, and Rollback Integration Suite
 *
 * Exhaustively verifies:
 * - Non-owner draft access rejection (401/403)
 * - Owner without MFA rejection (403 FORBIDDEN_MFA_REQUIRED)
 * - Revoked owner rejection (403 FORBIDDEN_REVOKED)
 * - Stale revision conflict rejection (409)
 * - Concurrent publication race rejection (409)
 * - Invalid URL rejection (422)
 * - Invalid content block rejection (422)
 * - Unapproved media rejection (422)
 * - Missing rollback asset rejection (422)
 * - Cache refresh failure resilience
 * - Successful rollback
 * - Public snapshot isolation (only approved published content visible)
 */

import { describe, expect, it, beforeEach } from "vitest";
import {
  publishRevision,
  rollbackPublication,
  getActivePublication,
  getPublicationHistoryList,
  resetPublicationState,
  setSimulateCacheRefreshFailure,
} from "@/server/content/publish";
import {
  saveProjectDraft,
  getProjectDraft,
  RevisionConflictError,
  ContentValidationError,
} from "@/server/content/revisions";
import {
  setTestAuthRegistry,
  verifyOwner,
} from "@/server/auth/require-owner";
import {
  setTestMediaRegistry,
  getTestMediaRegistry,
  validateUpload,
  registerMediaAsset,
  approveMediaAsset,
  MediaValidationError,
} from "@/server/media/validate-upload";
import { readPublication, findPublishedProject } from "@/content/publication-reader";
import type { OwnerContext } from "@/server/auth/types";
import type { PublishedProject } from "@/contracts/content";

// Setup identities
const ACTIVE_OWNER: OwnerContext = {
  userId: "11111111-1111-1111-1111-111111111111",
  email: "owner_active@yorworld.test",
  assurance: "aal2",
  role: "owner",
  active: true,
};

describe("Milestone A4: Structured Editing, Publishing & Rollback", () => {
  beforeEach(() => {
    resetPublicationState();
    setTestAuthRegistry(
      new Map([
        [
          "token-owner-aal2",
          {
            user: { id: ACTIVE_OWNER.userId, email: ACTIVE_OWNER.email, aal: "aal2" },
            adminRecord: { id: ACTIVE_OWNER.userId, role: "owner", active: true },
          },
        ],
        [
          "token-owner-aal1",
          {
            user: { id: "33333333-3333-3333-3333-333333333333", email: "owner_aal1@yorworld.test", aal: "aal1" },
            adminRecord: { id: "33333333-3333-3333-3333-333333333333", role: "owner", active: true },
          },
        ],
        [
          "token-revoked",
          {
            user: { id: "22222222-2222-2222-2222-222222222222", email: "owner_revoked@yorworld.test", aal: "aal2" },
            adminRecord: { id: "22222222-2222-2222-2222-222222222222", role: "owner", active: false },
          },
        ],
        [
          "token-visitor",
          {
            user: { id: "44444444-4444-4444-4444-444444444444", email: "visitor@external.test", aal: "aal2" },
            adminRecord: undefined,
          },
        ],
      ])
    );
    setTestMediaRegistry(null);
  });

  describe("Access Control & Authorization Guards", () => {
    it("non-owner draft access: unauthenticated returns 401 UNAUTHENTICATED", async () => {
      const req = new Request("http://localhost:3000/api/admin/projects");
      const res = await verifyOwner(req);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.status).toBe(401);
        expect(res.code).toBe("UNAUTHENTICATED");
      }
    });

    it("non-owner draft access: authenticated non-owner returns 403 FORBIDDEN_NOT_OWNER", async () => {
      const req = new Request("http://localhost:3000/api/admin/projects", {
        headers: { Authorization: "Bearer token-visitor" },
      });
      const res = await verifyOwner(req);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.status).toBe(403);
        expect(res.code).toBe("FORBIDDEN_NOT_OWNER");
      }
    });

    it("owner without MFA (AAL1): returns 403 FORBIDDEN_MFA_REQUIRED", async () => {
      const req = new Request("http://localhost:3000/api/admin/projects", {
        headers: { Authorization: "Bearer token-owner-aal1" },
      });
      const res = await verifyOwner(req);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.status).toBe(403);
        expect(res.code).toBe("FORBIDDEN_MFA_REQUIRED");
      }
    });

    it("revoked owner: returns 403 FORBIDDEN_REVOKED immediately", async () => {
      const req = new Request("http://localhost:3000/api/admin/projects", {
        headers: { Authorization: "Bearer token-revoked" },
      });
      const res = await verifyOwner(req);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.status).toBe(403);
        expect(res.code).toBe("FORBIDDEN_REVOKED");
      }
    });

    it("active owner with AAL2: passes authorization guard", async () => {
      const req = new Request("http://localhost:3000/api/admin/projects", {
        headers: { Authorization: "Bearer token-owner-aal2" },
      });
      const res = await verifyOwner(req);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.context.userId).toBe(ACTIVE_OWNER.userId);
        expect(res.context.assurance).toBe("aal2");
      }
    });
  });

  describe("Draft Editing & Optimistic Concurrency", () => {
    it("stale expectedRevision on draft save throws 409 RevisionConflictError", async () => {
      const draft = await getProjectDraft("ai-vs-real", ACTIVE_OWNER);
      expect(draft).not.toBeNull();

      // Current draftRevision is 1, but caller sends expectedRevision: 99
      await expect(
        saveProjectDraft(
          {
            projectId: "ai-vs-real",
            expectedRevision: 99,
            project: draft!.project,
          },
          ACTIVE_OWNER
        )
      ).rejects.toThrowError(RevisionConflictError);
    });

    it("successful draft save increments draftRevision and persists changes", async () => {
      const draft = await getProjectDraft("ai-vs-real", ACTIVE_OWNER);
      expect(draft).not.toBeNull();

      const updated = {
        ...draft!.project,
        title: "AI vs. Real Image Detector (Updated)",
      };

      const result = await saveProjectDraft(
        {
          projectId: "ai-vs-real",
          expectedRevision: draft!.draftRevision,
          project: updated,
        },
        ACTIVE_OWNER
      );

      expect(result.draftRevision).toBe(draft!.draftRevision + 1);
      expect(result.project.title).toBe("AI vs. Real Image Detector (Updated)");

      // Verification from registry
      const loaded = await getProjectDraft("ai-vs-real", ACTIVE_OWNER);
      expect(loaded?.draftRevision).toBe(result.draftRevision);
      expect(loaded?.project.title).toBe("AI vs. Real Image Detector (Updated)");
    });
  });

  describe("Publication Semantics: Concurrency & Validation Gates", () => {
    it("stale expectedRevision on publication throws 409 RevisionConflictError", async () => {
      const current = getActivePublication().revision;
      await expect(
        publishRevision(
          {
            expectedRevision: current + 10,
          },
          ACTIVE_OWNER
        )
      ).rejects.toThrowError(RevisionConflictError);
    });

    it("concurrent publication: first succeeds, second with stale expectedRevision returns 409", async () => {
      const initialRev = getActivePublication().revision;

      // First publication succeeds
      const pub1 = await publishRevision(
        {
          expectedRevision: initialRev,
        },
        ACTIVE_OWNER
      );
      expect(pub1.revision).toBe(initialRev + 1);

      // Second concurrent publisher attempts with initialRev (now stale) -> 409 Conflict
      await expect(
        publishRevision(
          {
            expectedRevision: initialRev,
          },
          ACTIVE_OWNER
        )
      ).rejects.toThrowError(RevisionConflictError);
    });

    it("invalid URL (non-https) throws 422 ContentValidationError", async () => {
      const current = getActivePublication();
      const corruptedProjects: PublishedProject[] = JSON.parse(JSON.stringify(current.projects));
      const targetProj = corruptedProjects[0];
      expect(targetProj).toBeDefined();
      targetProj!.links[0]!.url = "http://insecure-domain.com/unencrypted" as unknown as string;

      await expect(
        publishRevision(
          {
            expectedRevision: current.revision,
            customProjects: corruptedProjects,
          },
          ACTIVE_OWNER
        )
      ).rejects.toThrowError(ContentValidationError);
    });

    it("invalid content block (empty heading) throws 422 ContentValidationError", async () => {
      const current = getActivePublication();
      const corruptedProjects: PublishedProject[] = JSON.parse(JSON.stringify(current.projects));
      const targetProj = corruptedProjects[0];
      expect(targetProj).toBeDefined();
      targetProj!.sections[0]!.heading = "";

      await expect(
        publishRevision(
          {
            expectedRevision: current.revision,
            customProjects: corruptedProjects,
          },
          ACTIVE_OWNER
        )
      ).rejects.toThrowError(ContentValidationError);
    });

    it("unapproved media throws 422 MediaValidationError", async () => {
      const current = getActivePublication();
      const corruptedProjects: PublishedProject[] = JSON.parse(JSON.stringify(current.projects));
      const targetProj = corruptedProjects[0];
      expect(targetProj).toBeDefined();

      // Insert image block with unapproved / unregistered media ID
      targetProj!.sections[0]!.blocks.push({
        type: "image",
        mediaId: "med-unapproved-uuid-9999",
        alt: "Unapproved chart",
        caption: "Testing unapproved media gating",
      });

      await expect(
        publishRevision(
          {
            expectedRevision: current.revision,
            customProjects: corruptedProjects,
          },
          ACTIVE_OWNER
        )
      ).rejects.toThrowError(MediaValidationError);
    });

    it("approved media passes validation and enters publication", async () => {
      // 1. Upload valid PNG
      const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
      const validated = validateUpload({ buffer: pngHeader, mime: "image/png", filename: "approved-chart.png" });
      const asset = await registerMediaAsset(validated, ACTIVE_OWNER);
      expect(asset.approvalStatus).toBe("pending");

      // 2. Owner approves media
      await approveMediaAsset(asset.id, ACTIVE_OWNER);

      // 3. Include in project section
      const current = getActivePublication();
      const validProjects: PublishedProject[] = JSON.parse(JSON.stringify(current.projects));
      const targetProj = validProjects[0];
      expect(targetProj).toBeDefined();
      targetProj!.sections[0]!.blocks.push({
        type: "image",
        mediaId: asset.id,
        alt: "Approved system diagram",
        caption: "Approved diagram caption",
      });

      const pub = await publishRevision(
        {
          expectedRevision: current.revision,
          customProjects: validProjects,
        },
        ACTIVE_OWNER
      );

      expect(pub.revision).toBe(current.revision + 1);
    });
  });

  describe("Cache-Refresh Resilience & Public Snapshot Integrity", () => {
    it("cache refresh failure preserves durable publication without corruption", async () => {
      setSimulateCacheRefreshFailure(true);

      const current = getActivePublication();
      const pub = await publishRevision(
        {
          expectedRevision: current.revision,
        },
        ACTIVE_OWNER
      );

      // Durable revision incremented
      expect(pub.revision).toBe(current.revision + 1);
      expect(pub.cacheRefreshed).toBe(false);
      expect(pub.cacheRefreshWarning).toContain("Simulated cache-refresh service timeout");

      // Publication history recorded the entry durably
      const history = getPublicationHistoryList();
      const last = history[history.length - 1];
      expect(last).toBeDefined();
      expect(last?.revision).toBe(pub.revision);
      expect(last?.action).toBe("publish");
    });

    it("public readers consume only approved publication snapshots", async () => {
      const publicPublication = await readPublication();
      expect(publicPublication.revision).toBeGreaterThanOrEqual(1);

      // CandidateX is held unpublished; public reader finds null
      const candidateX = findPublishedProject(publicPublication, "candidatex");
      expect(candidateX).toBeNull();

      // Verified project is readable
      const aiVsReal = findPublishedProject(publicPublication, "ai-vs-real");
      expect(aiVsReal).not.toBeNull();
      expect(aiVsReal?.slug).toBe("ai-vs-real");
    });
  });

  describe("Rollback & Historical Asset Verification", () => {
    it("missing rollback asset throws 422 MediaValidationError", async () => {
      // Create revision 2 containing a temporary media asset
      const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
      const validated = validateUpload({ buffer: pngHeader, mime: "image/png", filename: "temp.png" });
      const asset = await registerMediaAsset(validated, ACTIVE_OWNER);
      await approveMediaAsset(asset.id, ACTIVE_OWNER);

      const current = getActivePublication();
      const pCopy: PublishedProject[] = JSON.parse(JSON.stringify(current.projects));
      const targetProj = pCopy[0];
      expect(targetProj).toBeDefined();
      targetProj!.sections[0]!.blocks.push({
        type: "image",
        mediaId: asset.id,
        alt: "Test",
        caption: "Test",
      });

      const pub2 = await publishRevision(
        {
          expectedRevision: current.revision,
          customProjects: pCopy,
        },
        ACTIVE_OWNER
      );
      expect(pub2.revision).toBe(2);

      // Now, simulate the asset being deleted or marked unapproved
      getTestMediaRegistry().delete(asset.id);

      // Attempting rollback to revision 2 must fail because referenced asset is missing!
      await expect(
        rollbackPublication(2, ACTIVE_OWNER)
      ).rejects.toThrowError(MediaValidationError);
    });

    it("successful rollback restores prior approved snapshot as a new revision", async () => {
      // Current is revision 1. Publish revision 2.
      const pub2 = await publishRevision(
        {
          expectedRevision: 1,
        },
        ACTIVE_OWNER
      );
      expect(pub2.revision).toBe(2);

      // Now rollback to revision 1
      const rolledBack = await rollbackPublication(1, ACTIVE_OWNER);

      // Rollback creates a NEW incremented revision (r3) restoring r1 snapshot content
      expect(rolledBack.revision).toBe(3);
      expect(getActivePublication().revision).toBe(3);

      const history = getPublicationHistoryList();
      const lastEntry = history[history.length - 1];
      expect(lastEntry).toBeDefined();
      expect(lastEntry?.revision).toBe(3);
      expect(lastEntry?.action).toBe("rollback");
      expect(lastEntry?.targetRevision).toBe(1);

      // Public reader immediately observes the restored snapshot
      const publicSnap = await readPublication();
      expect(publicSnap.revision).toBe(3);
    });
  });
});
