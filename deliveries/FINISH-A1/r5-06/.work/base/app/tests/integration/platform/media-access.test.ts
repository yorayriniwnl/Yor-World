/**
 * YOR WORLD Milestone A4: Media Validation & Private Storage Access Test Suite
 *
 * Verifies:
 * - Strict MIME allowlisting and magic bytes verification
 * - File size boundary enforcement (5 MiB ceiling)
 * - Header spoofing rejection
 * - Private draft media isolation:
 *   - Anonymous visitor denied (401)
 *   - Authenticated non-owner denied (403)
 *   - Owner without MFA denied (403)
 *   - Revoked owner denied (403)
 *   - Active owner with AAL2 allowed (200)
 * - Media approval workflow and zero public leakage guarantee
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, beforeEach } from "vitest";
import {
  validateUpload,
  registerMediaAsset,
  approveMediaAsset,
  setTestMediaRegistry,
  MediaValidationError,
} from "@/server/media/validate-upload";
import { checkMediaApproved } from "@/server/media/manifest";
import { setTestAuthRegistry } from "@/server/auth/require-owner";
import { GET as getMediaAssetRoute } from "@/app/api/admin/media/[id]/route";
import type { OwnerContext } from "@/server/auth/types";

const fixture = (name: string) => readFileSync(resolve("tests/fixtures/scp-media", name));

const OWNER_AAL2: OwnerContext = {
  userId: "11111111-1111-1111-1111-111111111111",
  email: "owner@yorworld.test",
  assurance: "aal2",
  role: "owner",
  active: true,
};

describe("Milestone A4: Media Validation & Private Draft Storage Access", () => {
  beforeEach(() => {
    setTestMediaRegistry(new Map());
    setTestAuthRegistry(
      new Map([
        [
          "token-owner-aal2",
          {
            user: { id: OWNER_AAL2.userId, email: OWNER_AAL2.email, aal: "aal2" },
            adminRecord: { id: OWNER_AAL2.userId, role: "owner", active: true },
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
  });

  describe("Binary Media Validation Gate", () => {
    it("valid PNG buffer with authentic magic bytes passes validation", async () => {
      const validPng = fixture("valid-rgba-16x12.png");

      const result = await validateUpload({
        buffer: validPng,
        mime: "image/png",
        filename: "figure-1.png",
      });

      expect(result.mime).toBe("image/png");
      expect(result.bytes).toBe(validPng.length);
      expect(result.hash).toHaveLength(64);
      expect(result.dimensions.width).toBe(16);
      expect(result.dimensions.height).toBe(12);
    });

    it("valid JPEG buffer with authentic magic bytes passes validation", async () => {
      const validJpeg = fixture("valid-rgb-16x12.jpg");
      const result = await validateUpload({
        buffer: validJpeg,
        mime: "image/jpeg",
        filename: "photo.jpg",
      });

      expect(result.mime).toBe("image/jpeg");
      expect(result.hash).toHaveLength(64);
    });

    it("valid WebP buffer with authentic RIFF/WEBP magic bytes passes validation", async () => {
      const validWebp = fixture("valid-lossy-16x12.webp");
      const result = await validateUpload({
        buffer: validWebp,
        mime: "image/webp",
        filename: "capture.webp",
      });

      expect(result.mime).toBe("image/webp");
      expect(result.hash).toHaveLength(64);
    });

    it("disallowed MIME type (e.g. SVG / script payload) throws 422 MediaValidationError", async () => {
      const svg = new TextEncoder().encode("<svg><script>alert(1)</script></svg>");
      await expect(
        validateUpload({
          buffer: svg,
          mime: "image/svg+xml",
          filename: "exploit.svg",
        })
      ).rejects.toThrowError(MediaValidationError);
    });

    it("spoofed header (text file claiming image/png MIME) throws 422 MediaValidationError", async () => {
      const fakePng = new TextEncoder().encode("Not really a png image file");
      await expect(
        validateUpload({
          buffer: fakePng,
          mime: "image/png",
          filename: "fake.png",
        })
      ).rejects.toThrowError(/Header spoofing rejected/i);
    });

    it("empty buffer throws 422 MediaValidationError", async () => {
      await expect(
        validateUpload({
          buffer: new Uint8Array([]),
          mime: "image/png",
          filename: "empty.png",
        })
      ).rejects.toThrowError(/empty file payload/i);
    });

    it("oversized buffer (> 5 MiB) throws 422 MediaValidationError", async () => {
      // 5 MiB + 1 byte
      const oversized = new Uint8Array(5 * 1024 * 1024 + 1);
      // set valid PNG header
      oversized.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

      await expect(
        validateUpload({
          buffer: oversized,
          mime: "image/png",
          filename: "huge.png",
        })
      ).rejects.toThrowError(/exceeds maximum 5242880 bytes/i);
    });
  });

  describe("Private Draft Media Access Control (Zero Public Leakage)", () => {
    it("anonymous public visitor cannot read private draft media (401)", async () => {
      // Register a draft media item
      const validPng = fixture("valid-rgba-16x12.png");
      const validated = await validateUpload({ buffer: validPng, mime: "image/png", filename: "private-draft.png" });
      const asset = await registerMediaAsset(validated, OWNER_AAL2);

      // Anonymous request
      const req = new Request(`http://localhost:3000/api/admin/media/${asset.id}`);
      const res = await getMediaAssetRoute(req, { params: Promise.resolve({ id: asset.id }) });

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.code).toBe("UNAUTHENTICATED");
    });

    it("authenticated non-owner cannot read private draft media (403)", async () => {
      const validPng = fixture("valid-rgba-16x12.png");
      const validated = await validateUpload({ buffer: validPng, mime: "image/png", filename: "private-draft.png" });
      const asset = await registerMediaAsset(validated, OWNER_AAL2);

      const req = new Request(`http://localhost:3000/api/admin/media/${asset.id}`, {
        headers: { Authorization: "Bearer token-visitor" },
      });
      const res = await getMediaAssetRoute(req, { params: Promise.resolve({ id: asset.id }) });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.code).toBe("FORBIDDEN_NOT_OWNER");
    });

    it("owner without MFA cannot read private draft media (403)", async () => {
      const validPng = fixture("valid-rgba-16x12.png");
      const validated = await validateUpload({ buffer: validPng, mime: "image/png", filename: "private-draft.png" });
      const asset = await registerMediaAsset(validated, OWNER_AAL2);

      const req = new Request(`http://localhost:3000/api/admin/media/${asset.id}`, {
        headers: { Authorization: "Bearer token-owner-aal1" },
      });
      const res = await getMediaAssetRoute(req, { params: Promise.resolve({ id: asset.id }) });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.code).toBe("FORBIDDEN_MFA_REQUIRED");
    });

    it("revoked owner cannot read private draft media (403)", async () => {
      const validPng = fixture("valid-rgba-16x12.png");
      const validated = await validateUpload({ buffer: validPng, mime: "image/png", filename: "private-draft.png" });
      const asset = await registerMediaAsset(validated, OWNER_AAL2);

      const req = new Request(`http://localhost:3000/api/admin/media/${asset.id}`, {
        headers: { Authorization: "Bearer token-revoked" },
      });
      const res = await getMediaAssetRoute(req, { params: Promise.resolve({ id: asset.id }) });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.code).toBe("FORBIDDEN_REVOKED");
    });

    it("active owner with AAL2 can access private draft media (200)", async () => {
      const validPng = fixture("valid-rgba-16x12.png");
      const validated = await validateUpload({ buffer: validPng, mime: "image/png", filename: "private-draft.png" });
      const asset = await registerMediaAsset(validated, OWNER_AAL2);

      const req = new Request(`http://localhost:3000/api/admin/media/${asset.id}`, {
        headers: { Authorization: "Bearer token-owner-aal2" },
      });
      const res = await getMediaAssetRoute(req, { params: Promise.resolve({ id: asset.id }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.asset.id).toBe(asset.id);
      expect(json.asset.approvalStatus).toBe("pending");
      expect(json.asset.objectKey).toContain("private/drafts/");
    });
  });

  describe("Media Approval Workflow", () => {
    it("approval changes status from pending to approved", async () => {
      const validPng = fixture("valid-rgba-16x12.png");
      const validated = await validateUpload({ buffer: validPng, mime: "image/png", filename: "chart.png" });
      const asset = await registerMediaAsset(validated, OWNER_AAL2);

      expect(asset.approvalStatus).toBe("pending");

      // Before approval, checkMediaApproved flags it as unapproved
      const beforeCheck = await checkMediaApproved([asset.id]);
      expect(beforeCheck.approved).toBe(false);
      expect(beforeCheck.unapprovedIds).toContain(asset.id);

      // Approve asset
      const approved = await approveMediaAsset(asset.id, OWNER_AAL2);
      expect(approved.approvalStatus).toBe("approved");

      // After approval, checkMediaApproved passes
      const afterCheck = await checkMediaApproved([asset.id]);
      expect(afterCheck.approved).toBe(true);
      expect(afterCheck.unapprovedIds).toHaveLength(0);
    });
  });
});
