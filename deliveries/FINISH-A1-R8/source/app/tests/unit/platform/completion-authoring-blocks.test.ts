import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { approvedPublication } from "@/content/approved-publication";
import { computeReviewHash, DraftRecordSchema, PrivateDraftReviewSchema, ReviewCheckSchema, ReviewIdentitySchema } from "@/server/content/preview";
import { ContentValidationError, validateDraftContent } from "@/server/content/revisions";
import type { PublishedProject } from "@/contracts/content";
import { AccessibleFigure } from "@/features/portfolio/case-study";

function reverseObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseObjectKeys);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).reverse().map(([key, child]) => [key, reverseObjectKeys(child)]));
  }
  return value;
}

const hashInput = {
  projects: approvedPublication.projects.filter((project) => project.id !== "candidatex").slice(0, 2),
  siteDraftRevision: null as null,
  site: null,
  assetManifestRevision: approvedPublication.assetManifestRevision,
  media: [],
};

describe("FINISH A1 reviewed content identity and structured authoring", () => {
  it("binds project bodies, sorts project identity, and preserves section and block order", () => {
    const baseline = computeReviewHash(hashInput);
    const changedBody = structuredClone(hashInput.projects);
    changedBody[0]!.title += " revised";
    expect(computeReviewHash({ ...hashInput, projects: changedBody })).not.toBe(baseline);

    const reorderedProjects = [...hashInput.projects].reverse();
    expect(computeReviewHash({ ...hashInput, projects: reorderedProjects })).toBe(baseline);

    const reorderedSections = structuredClone(hashInput.projects[0]!);
    const originalSection = structuredClone(reorderedSections.sections[0]!);
    reorderedSections.sections = [originalSection, { ...originalSection, id: `${originalSection.id}-second`, heading: "Second section" }];
    const sectionHash = computeReviewHash({ ...hashInput, projects: [reorderedSections] });
    reorderedSections.sections.reverse();
    expect(computeReviewHash({ ...hashInput, projects: [reorderedSections] })).not.toBe(sectionHash);

    const reorderedBlocks = structuredClone(hashInput.projects);
    reorderedBlocks[0]!.sections[0]!.blocks = [
      { type: "paragraph", text: "first" },
      { type: "paragraph", text: "second" },
    ];
    const orderedHash = computeReviewHash({ ...hashInput, projects: reorderedBlocks });
    reorderedBlocks[0]!.sections[0]!.blocks.reverse();
    expect(computeReviewHash({ ...hashInput, projects: reorderedBlocks })).not.toBe(orderedHash);
  });

  it("canonicalizes object keys, excludes CandidateX, and sorts the reviewed media vector", () => {
    const baseline = computeReviewHash(hashInput);
    expect(computeReviewHash({ ...hashInput, projects: reverseObjectKeys(hashInput.projects) as PublishedProject[] })).toBe(baseline);
    const candidatex: PublishedProject = { ...structuredClone(hashInput.projects[0]!), id: "candidatex", slug: "candidatex" };
    expect(computeReviewHash({ ...hashInput, projects: [...hashInput.projects, candidatex] })).toBe(baseline);

    const media = [{ kind: "missing" as const, mediaId: "alpha" }, { kind: "missing" as const, mediaId: "beta" }];
    const first = computeReviewHash({ ...hashInput, media });
    expect(computeReviewHash({ ...hashInput, media: [...media].reverse() })).toBe(first);
  });

  it("rejects duplicate, unordered, and malformed review vectors and incoherent DTOs", () => {
    const emptyIdentity = { expectedPublicationRevision: 1, projects: [], siteDraftRevision: null, media: [], candidateSha256: "a".repeat(64) };
    expect(ReviewIdentitySchema.safeParse(emptyIdentity).success).toBe(true);
    expect(ReviewIdentitySchema.safeParse({ ...emptyIdentity, projects: [{ projectId: "helios", draftRevision: 1 }, { projectId: "helios", draftRevision: 2 }] }).success).toBe(false);
    expect(ReviewIdentitySchema.safeParse({ ...emptyIdentity, projects: [{ projectId: "zenith", draftRevision: 1 }, { projectId: "helios", draftRevision: 1 }] }).success).toBe(false);
    expect(ReviewIdentitySchema.safeParse({ ...emptyIdentity, media: [{ kind: "missing", mediaId: "same" }, { kind: "missing", mediaId: "same" }] }).success).toBe(false);

    const frozenReview = { identity: emptyIdentity, drafts: [], checks: [], canPublish: false };
    expect(PrivateDraftReviewSchema.safeParse(frozenReview).success).toBe(true);
    expect(PrivateDraftReviewSchema.safeParse({ ...frozenReview, previewProjectId: null }).success).toBe(false);
    expect(PrivateDraftReviewSchema.safeParse({ ...frozenReview, canPublish: true }).success).toBe(false);
    const malformedDraft = { projectId: "candidatex", draftRevision: 1, project: approvedPublication.projects[0], updatedAt: "2026-10-11T00:00:00.000Z", updatedBy: "system-seed" };
    expect(PrivateDraftReviewSchema.safeParse({ identity: emptyIdentity, drafts: [malformedDraft], checks: [], canPublish: false }).success).toBe(false);
    expect(DraftRecordSchema.safeParse({ ...malformedDraft, project: { ...approvedPublication.projects[0], id: "candidatex", slug: "candidatex" } }).success).toBe(true);
    expect(DraftRecordSchema.safeParse({ ...malformedDraft, updatedAt: "tomorrow" }).success).toBe(false);
    expect(DraftRecordSchema.safeParse({ ...malformedDraft, updatedBy: "untrusted actor" }).success).toBe(false);
    expect(DraftRecordSchema.safeParse({ ...malformedDraft, draftRevision: Number.MAX_SAFE_INTEGER + 1 }).success).toBe(false);
    expect(ReviewCheckSchema.safeParse({ scope: "project", id: "helios", kind: "schema", status: "failed", checkedAt: "2026-10-11T00:00:00.000Z", reasons: [] }).success).toBe(false);
    expect(ReviewCheckSchema.safeParse({ scope: "project", id: "helios", kind: "unknown", status: "passed", checkedAt: "2026-10-11T00:00:00.000Z", reasons: [] }).success).toBe(false);
    expect(ReviewCheckSchema.safeParse({ scope: "site", id: "portfolio-site", kind: "schema", status: "passed", checkedAt: "2026-10-11T00:00:00.000Z", reasons: [] }).success).toBe(true);

    const candidatexProject: PublishedProject = { ...structuredClone(hashInput.projects[0]!), id: "candidatex", slug: "candidatex" };
    const candidatexDraft = { projectId: "candidatex", draftRevision: candidatexProject.revision, project: candidatexProject, updatedAt: "2026-10-11T00:00:00.000Z", updatedBy: "system-seed" };
    const candidatexChecks = ["schema", "evidence-records", "https-links", "approved-media", "publication-rules"].map((kind) => ({
      scope: "project", id: "candidatex", kind, status: "failed", checkedAt: "2026-10-11T00:00:00.000Z", reasons: ["Private draft previews cannot publish CandidateX."],
    }));
    expect(PrivateDraftReviewSchema.safeParse({ identity: emptyIdentity, drafts: [candidatexDraft], checks: candidatexChecks, canPublish: false }).success).toBe(true);
  });

  it("renders draft images only from the exact canonical private preview path", () => {
    const render = (approvedUrl: string) => renderToStaticMarkup(React.createElement(AccessibleFigure, {
      mediaId: "fixture/media", alt: "Local media", caption: "Synthetic", approvedUrl, draftPreview: true,
    }));
    for (const invalid of [
      "http://yor-world.local/api/admin/preview/media/fixture%2Fmedia",
      "//yor-world.local/api/admin/preview/media/fixture%2Fmedia",
      "/discard/../api/admin/preview/media/fixture%2Fmedia",
      "/api/admin/preview/media/other",
      "/api/admin/preview/media/fixture%2Fmedia?token=secret",
      "/api/admin/preview/media/fixture%2Fmedia#details",
      "/api/admin/preview/media/fixture%2fmedia",
      "/api/admin/preview/media/%66ixture%2Fmedia",
      "/api/admin/preview/media/fixture%252Fmedia",
      "/api/admin/preview/media/%2e%2e%2Ffixture%2Fmedia",
      "/api/admin/preview/media/fixture%2F..%2Fmedia",
      "/%61pi/admin/preview/media/fixture%2Fmedia",
    ]) {
      expect(render(invalid)).not.toContain("<img");
    }
    expect(render("/api/admin/preview/media/fixture%2Fmedia")).toContain('src="/api/admin/preview/media/fixture%2Fmedia"');
  });

  it("requires unique, nonempty section identities for saved drafts", () => {
    const project = structuredClone(approvedPublication.projects[0]!);
    project.sections.push({ ...project.sections[0]!, id: project.sections[0]!.id });
    expect(() => validateDraftContent(project)).toThrowError(ContentValidationError);

    const emptyList = structuredClone(approvedPublication.projects[0]!);
    emptyList.sections[0]!.blocks = [{ type: "list", items: [] }];
    expect(() => validateDraftContent(emptyList)).toThrowError(/at least one item/);
  });
});
