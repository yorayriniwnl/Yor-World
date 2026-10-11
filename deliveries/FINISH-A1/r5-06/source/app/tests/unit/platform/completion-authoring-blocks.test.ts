import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { approvedPublication } from "@/content/approved-publication";
import { computeReviewHash, DraftNotFoundError, DraftRecordSchema, PrivateDraftReviewSchema, ReviewCheckSchema, ReviewIdentitySchema } from "@/server/content/preview";
import { ReviewedMediaSchema } from "@/server/media/manifest";
import { ContentValidationError, validateDraftContent } from "@/server/content/revisions";
import { AccessibleFigure } from "@/features/portfolio/case-study";
import { createEmptyEvidence, createEmptyLink, createEmptySection } from "@/features/admin/project-editor";
import { createEmptyTextBlock } from "@/features/admin/structured-block-editor";
import AdminProjectPreviewPage from "@/app/admin/preview/[slug]/page";
import type { PublishedProject } from "@/contracts/content";

const previewPageMocks = vi.hoisted(() => ({
  notFound: vi.fn(() => { throw new Error("PAGE_NOT_FOUND_SENTINEL"); }),
  requirePageOwner: vi.fn(),
  generateDraftReview: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: previewPageMocks.notFound }));
vi.mock("@/server/auth/page-owner", () => ({ requirePageOwner: previewPageMocks.requirePageOwner }));
vi.mock("@/server/content/preview", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/server/content/preview")>(),
  generateDraftReview: previewPageMocks.generateDraftReview,
}));

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
  it("routes a missing requested draft to the private page not-found path", async () => {
    previewPageMocks.requirePageOwner.mockResolvedValue({ userId: "11111111-1111-1111-1111-111111111111", email: "owner@fixture.test", role: "owner", active: true, assurance: "aal2" });
    previewPageMocks.generateDraftReview.mockRejectedValueOnce(new DraftNotFoundError("candidatex"));

    await expect(AdminProjectPreviewPage({ params: Promise.resolve({ slug: "candidatex" }) })).rejects.toThrow("PAGE_NOT_FOUND_SENTINEL");
    expect(previewPageMocks.notFound).toHaveBeenCalledTimes(1);
  });

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

    expect(PrivateDraftReviewSchema.safeParse({ identity: emptyIdentity, drafts: [], checks: [], canPublish: false }).success).toBe(true);
    expect(PrivateDraftReviewSchema.safeParse({ identity: emptyIdentity, drafts: [], checks: [], canPublish: true }).success).toBe(false);
    expect(PrivateDraftReviewSchema.safeParse({ identity: emptyIdentity, drafts: [], checks: [], canPublish: false, previewProjectId: null }).success).toBe(false);
    const malformedDraft = { projectId: "candidatex", draftRevision: 1, project: approvedPublication.projects[0], updatedAt: "2026-10-11T00:00:00.000Z", updatedBy: "system-seed" };
    expect(PrivateDraftReviewSchema.safeParse({ identity: emptyIdentity, drafts: [malformedDraft], checks: [], canPublish: false }).success).toBe(false);
    expect(DraftRecordSchema.safeParse({ ...malformedDraft, project: { ...approvedPublication.projects[0], id: "candidatex", slug: "candidatex" } }).success).toBe(true);
    expect(DraftRecordSchema.safeParse({ ...malformedDraft, updatedAt: "tomorrow" }).success).toBe(false);
    expect(DraftRecordSchema.safeParse({ ...malformedDraft, updatedBy: "untrusted actor" }).success).toBe(false);
    expect(DraftRecordSchema.safeParse({ ...malformedDraft, draftRevision: Number.MAX_SAFE_INTEGER + 1 }).success).toBe(false);
    expect(ReviewCheckSchema.safeParse({ scope: "project", id: "helios", kind: "schema", status: "failed", checkedAt: "2026-10-11T00:00:00.000Z", reasons: [] }).success).toBe(false);
    expect(ReviewCheckSchema.safeParse({ scope: "project", id: "helios", kind: "unknown", status: "passed", checkedAt: "2026-10-11T00:00:00.000Z", reasons: [] }).success).toBe(false);

    const candidatexProject: PublishedProject = { ...structuredClone(hashInput.projects[0]!), id: "candidatex", slug: "candidatex" };
    const candidatexDraft = { projectId: "candidatex", draftRevision: candidatexProject.revision, project: candidatexProject, updatedAt: "2026-10-11T00:00:00.000Z", updatedBy: "system-seed" };
    const candidatexChecks = ["schema", "evidence-records", "https-links", "approved-media", "publication-rules"].map((kind) => ({
      scope: "project", id: "candidatex", kind, status: "failed", checkedAt: "2026-10-11T00:00:00.000Z", reasons: ["Private draft previews cannot publish CandidateX."],
    }));
    expect(PrivateDraftReviewSchema.safeParse({ identity: emptyIdentity, drafts: [candidatexDraft], checks: candidatexChecks, canPublish: false }).success).toBe(true);
  });

  it("accepts the frozen DTO shapes, including generic site checks and approval event identity", () => {
    const identity = { expectedPublicationRevision: 1, projects: [], siteDraftRevision: null, media: [], candidateSha256: "a".repeat(64) };
    const review = { identity, drafts: [], checks: [], canPublish: false };
    expect(PrivateDraftReviewSchema.parse(review)).toEqual(review);
    expect(ReviewCheckSchema.parse({ scope: "site", id: "site", kind: "schema", status: "passed", checkedAt: "2026-10-11T00:00:00.000Z", reasons: [] })).toEqual({
      scope: "site", id: "site", kind: "schema", status: "passed", checkedAt: "2026-10-11T00:00:00.000Z", reasons: [],
    });
    const media = {
      kind: "asset", mediaId: "fixture-media", objectKey: "projects/fixture.png", sha256: "b".repeat(64), mime: "image/png", bytes: 12,
      dimensions: { width: 1, height: 1 }, provenance: null, approvalStatus: "approved", createdAt: "2026-10-11T00:00:00.000Z",
      approvalAudit: { eventId: "audit-event-1", createdAt: "2026-10-11T00:00:00.000Z" },
    };
    expect(ReviewedMediaSchema.parse(media)).toEqual(media);
    expect(ReviewedMediaSchema.safeParse({ ...media, approvalAudit: { id: "audit-event-1", action: "media_approved", createdAt: media.createdAt } }).success).toBe(false);
  });

  it("renders draft media only from its exact canonical private route", () => {
    const figure = (approvedUrl: string, draftPreview = true) => renderToStaticMarkup(React.createElement(AccessibleFigure, {
      mediaId: "media-1", alt: "Fixture image", caption: "Synthetic fixture", approvedUrl, draftPreview,
    }));
    const canonical = "/api/admin/preview/media/media-1";
    expect(figure(canonical)).toContain(`src="${canonical}"`);
    for (const rejected of [
      "http://yor-world.local/api/admin/preview/media/media-1",
      "https://attacker.example/api/admin/preview/media/media-1",
      "//yor-world.local/api/admin/preview/media/media-1",
      "/api/admin/preview/media/../media-1",
      "/api/admin/preview/media/%2e%2e/media-1",
      "/api/admin/preview/media/media-1?download=1",
      "/api/admin/preview/media/media-1#fragment",
    ]) expect(figure(rejected)).not.toContain("<img");
    expect(figure("https://cdn.example.test/approved.png", false)).toContain('src="https://cdn.example.test/approved.png"');
  });

  it("starts new authoring fields empty and evidence unknown", () => {
    expect(createEmptyTextBlock("paragraph")).toEqual({ type: "paragraph", text: "" });
    expect(createEmptyTextBlock("list")).toEqual({ type: "list", items: [""] });
    expect(createEmptyTextBlock("code")).toEqual({ type: "code", language: "", text: "" });
    expect(createEmptySection("section-new")).toEqual({ id: "section-new", heading: "", blocks: [{ type: "paragraph", text: "" }] });
    expect(createEmptyLink()).toEqual({ label: "", url: "", checkedAt: "" });
    expect(createEmptyEvidence("evidence-new")).toEqual({ id: "evidence-new", kind: "document", url: null, checkedAt: null, status: "unknown", note: "" });
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
