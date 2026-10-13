import { describe, expect, it, vi } from "vitest";

const probe = vi.hoisted(() => ({
  arrayBufferCalls: 0,
  materializedBytes: 0,
  asset: {
    id: "22222222-2222-2222-2222-222222222222",
    object_key: "approved/oversized.png",
    hash: "a".repeat(64),
    mime: "image/png",
    bytes: 1,
    dimensions: JSON.stringify({ width: 1, height: 1 }),
    provenance: JSON.stringify({ source: "audit fixture" }),
    approval_status: "approved",
    created_at: "2026-10-11T00:00:00.000Z",
  },
  audit: { id: "33333333-3333-3333-3333-333333333333", entity_id: "22222222-2222-2222-2222-222222222222", created_at: "2026-10-11T00:00:00.000Z" },
}));

vi.mock("@/server/database", () => ({
  getPlatformDb: async () => ({ query: async (sql: string) => ({ rows: sql.includes("media_assets") ? [probe.asset] : [probe.audit] }) }),
}));
vi.mock("@/server/auth/clients", () => ({
  createAdminServiceRoleClient: () => ({ storage: { from: () => ({ download: async () => ({
    error: null,
    data: { arrayBuffer: async () => {
      probe.arrayBufferCalls += 1;
      const payload = new ArrayBuffer(5 * 1024 * 1024 + 1);
      probe.materializedBytes = payload.byteLength;
      return payload;
    } },
  }) }) } }),
}));
vi.mock("@/server/content/revisions", () => ({ isDraftTestRegistryEnabled: () => false }));

import { computeReviewHash, PrivateDraftReviewSchema, ReviewIdentitySchema } from "@/server/content/preview";
import { readReviewedMedia } from "@/server/media/manifest";

describe("FINISH-10 audit-only R4 probes", () => {
  it("reproduces permissive review DTO acceptance of invalid draft and review semantics", () => {
    const parsed = PrivateDraftReviewSchema.safeParse({
      identity: {
        expectedPublicationRevision: 1,
        projects: [
          { projectId: "helios", draftRevision: 1 },
          { projectId: "helios", draftRevision: 2 },
        ],
        siteDraftRevision: null,
        media: [{
          kind: "asset", mediaId: "22222222-2222-2222-2222-222222222222", objectKey: "private/a.png",
          sha256: "a".repeat(64), mime: "image/png", bytes: 5,
          dimensions: null, provenance: null, approvalStatus: "approved", createdAt: "not-a-timestamp", approvalAudit: null,
        }],
        candidateSha256: "a".repeat(64),
      },
      drafts: [{ notA: "DraftRecord" }],
      checks: [],
      canPublish: true,
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error("Expected malformed DTO fixture to parse for the audit reproduction.");
    const unsafeBytes = {
      ...parsed.data.identity,
      media: parsed.data.identity.media.map((item) => item.kind === "asset" ? { ...item, bytes: Number.MAX_SAFE_INTEGER + 1 } : item),
    };
    expect(ReviewIdentitySchema.safeParse(unsafeBytes).success).toBe(false);
  });

  it("reproduces complete oversized Storage materialization before the image size rejection", async () => {
    process.env.MEDIA_PRIVATE_BUCKET = "audit-private-bucket";
    probe.arrayBufferCalls = 0;
    probe.materializedBytes = 0;
    const result = await readReviewedMedia([probe.asset.id]);
    expect(probe.arrayBufferCalls).toBe(1);
    expect(probe.materializedBytes).toBe(5 * 1024 * 1024 + 1);
    expect(result.issues.get(probe.asset.id)?.join(" ")).toContain("exceeds maximum 5242880");
    delete process.env.MEDIA_PRIVATE_BUCKET;
  });

  it("reproduces candidate hashes ignoring project document bodies and order", () => {
    const identity = { projects: [{ projectId: "helios", draftRevision: 1 }], siteDraftRevision: null, assetManifestRevision: "manifest-1", media: [] };
    const hashFor = (project: unknown) => computeReviewHash({
      ...identity,
      candidateProjects: [project],
    } as unknown as Parameters<typeof computeReviewHash>[0]);
    const before = { id: "helios", sections: [
      { id: "s1", blocks: [{ type: "paragraph", text: "before" }] },
      { id: "s2", blocks: [{ type: "paragraph", text: "second" }] },
    ] };
    const after = { id: "helios", sections: [
      { id: "s2", blocks: [{ type: "paragraph", text: "second" }] },
      { id: "s1", blocks: [{ type: "paragraph", text: "after" }] },
    ] };
    expect(hashFor(after)).toBe(hashFor(before));
  });
});
