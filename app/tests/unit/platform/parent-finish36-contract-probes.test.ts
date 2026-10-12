import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AccessibleFigure } from "@/features/portfolio/case-study";
import { PrivateDraftReviewSchema, ReviewCheckSchema } from "@/server/content/preview";

describe("Parent FINISH-36 contract probes", () => {
  it("rejects fragments, alternate encodings, origin-confused, query, and traversal preview URLs", () => {
    const render = (approvedUrl: string) => renderToStaticMarkup(React.createElement(AccessibleFigure, { mediaId: "fixture/media", alt: "Local", caption: "probe", approvedUrl, draftPreview: true }));
    const canonical = "/api/admin/preview/media/fixture%2Fmedia";
    expect(render(canonical)).toContain('src="' + canonical + '"');
    for (const invalid of [
      "http://yor-world.local/api/admin/preview/media/fixture%2Fmedia",
      "https://yor-world.local/api/admin/preview/media/fixture%2Fmedia",
      "//yor-world.local/api/admin/preview/media/fixture%2Fmedia",
      "/api/admin/preview/media/fixture%2Fmedia#fragment",
      "/api/admin/preview/media/fixture%2Fmedia?next=/private",
      "/api/admin/preview/media/fixture%2fmedia",
      "/api/admin/preview/media/fixture/media",
      "/api/admin/preview/media/fixture%252Fmedia",
      "/discard/../api/admin/preview/media/fixture%2Fmedia",
    ]) expect(render(invalid), invalid).not.toContain("<img");
  });

  it("preserves generic site-scope ReviewCheck IDs and the frozen private review shape", () => {
    const kinds = ["schema", "evidence-records", "https-links", "approved-media", "publication-rules"] as const;
    const checks = kinds.map((kind) => ({ scope: "site" as const, id: "site-homepage", kind, status: "passed" as const, checkedAt: "2026-10-12T00:00:00.000Z", reasons: [] }));
    expect(ReviewCheckSchema.safeParse(checks[0]).success).toBe(true);
    const review = { identity: { expectedPublicationRevision: 1, projects: [], siteDraftRevision: null, media: [], candidateSha256: "a".repeat(64) }, drafts: [], checks, canPublish: false };
    expect(PrivateDraftReviewSchema.safeParse(review).success).toBe(true);
    expect(PrivateDraftReviewSchema.safeParse({ ...review, previewProjectId: "unallocated" }).success).toBe(false);
  });
});
