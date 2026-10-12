import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PrivateDraftReviewSchema, ReviewCheckSchema, ReviewIdentitySchema } from "@/server/content/preview";
import { ReviewedMediaSchema } from "@/server/media/manifest";
import { AccessibleFigure } from "@/features/portfolio/case-study";

describe("FINISH-43 independent A1 contract boundary probes", () => {
  it("accepts the frozen review DTO and generic site checks while rejecting unallocated fields", () => {
    const identity = {
      expectedPublicationRevision: 1,
      projects: [],
      siteDraftRevision: null,
      media: [],
      candidateSha256: "a".repeat(64),
    };
    expect(ReviewIdentitySchema.safeParse(identity).success).toBe(true);

    const siteChecks = ["schema", "evidence-records", "https-links", "approved-media", "publication-rules"].map((kind) => ({
      scope: "site",
      id: "future-site-review-target",
      kind,
      status: "passed",
      checkedAt: "2026-10-11T00:00:00.000Z",
      reasons: [],
    }));
    expect(siteChecks.every((check) => ReviewCheckSchema.safeParse(check).success)).toBe(true);
    const frozenReview = { identity, drafts: [], checks: siteChecks, canPublish: false };
    expect(PrivateDraftReviewSchema.safeParse(frozenReview).success).toBe(true);
    expect(PrivateDraftReviewSchema.safeParse({ ...frozenReview, previewProjectId: null }).success).toBe(false);
  });

  it("accepts approvalAudit.eventId and rejects the replaced id/action shape", () => {
    const media = {
      kind: "asset",
      mediaId: "media-1",
      objectKey: "private/media-1.png",
      sha256: "a".repeat(64),
      mime: "image/png",
      bytes: 12,
      dimensions: null,
      provenance: null,
      approvalStatus: "approved",
      createdAt: "2026-10-11T00:00:00.000Z",
      approvalAudit: { eventId: "audit-1", createdAt: "2026-10-11T00:00:00.000Z" },
    };
    expect(ReviewedMediaSchema.safeParse(media).success).toBe(true);
    expect(ReviewedMediaSchema.safeParse({
      ...media,
      approvalAudit: { id: "audit-1", action: "media_approved", createdAt: "2026-10-11T00:00:00.000Z" },
    }).success).toBe(false);
  });

  it("renders draft media only for the exact canonical URL string", () => {
    const mediaId = "fixture/media";
    const canonical = `/api/admin/preview/media/${encodeURIComponent(mediaId)}`;
    const render = (approvedUrl: string) => renderToStaticMarkup(React.createElement(AccessibleFigure, {
      mediaId, alt: "Private media", caption: "", approvedUrl, draftPreview: true,
    }));

    const invalid = [
      `${canonical}#fragment`,
      `${canonical}?query=1`,
      canonical.replace("%2F", "%2f"),
      canonical.replace("%2F", "%252F"),
      "/api/admin/preview/media/fixture/media",
      `https://yor-world.local${canonical}`,
      `//yor-world.local${canonical}`,
      `/discard/../${canonical.slice(1)}`,
      `${canonical}/`,
    ];
    for (const value of invalid) expect(render(value), value).not.toContain("<img");
    expect(render(canonical)).toContain(`src="${canonical}"`);
  });
});
