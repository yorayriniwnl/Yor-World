import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { approvedPublication } from "@/content/approved-publication";
import { computeReviewHash, DraftRecordSchema, PrivateDraftReviewSchema, ReviewCheckSchema, ReviewIdentitySchema } from "@/server/content/preview";
import { ContentValidationError, validateDraftContent } from "@/server/content/revisions";
import { ReviewedMediaSchema } from "@/server/media/manifest";
import { AccessibleFigure } from "@/features/portfolio/case-study";
import { createEmptyLink, createEmptySection } from "@/features/admin/project-editor";
import { createEmptyTextBlock } from "@/features/admin/structured-block-editor";
import type { PublishedProject } from "@/contracts/content";

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

    expect(PrivateDraftReviewSchema.safeParse({ identity: emptyIdentity, drafts: [], checks: [], canPublish: false }).success).toBe(true);
    expect(PrivateDraftReviewSchema.safeParse({ identity: emptyIdentity, drafts: [], checks: [], canPublish: true }).success).toBe(false);
    expect(PrivateDraftReviewSchema.safeParse({ identity: emptyIdentity, drafts: [], checks: [], previewProjectId: null, canPublish: false }).success).toBe(false);
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

  it("accepts the exact frozen review DTO including the generic site seam and approval event identity", () => {
    const checkedAt = "2026-10-11T00:00:00.000Z";
    const media = {
      kind: "asset", mediaId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", objectKey: "private/diagram.png",
      sha256: "b".repeat(64), mime: "image/png", bytes: 101, dimensions: { width: 16, height: 12 },
      provenance: null, approvalStatus: "approved", createdAt: checkedAt,
      approvalAudit: { eventId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", createdAt: checkedAt },
    } as const;
    expect(ReviewedMediaSchema.safeParse(media).success).toBe(true);
    expect(ReviewedMediaSchema.safeParse({ ...media, approvalAudit: { id: media.approvalAudit.eventId, action: "media_approved", createdAt: checkedAt } }).success).toBe(false);
    expect(ReviewCheckSchema.safeParse({ scope: "site", id: "site", kind: "schema", status: "passed", checkedAt, reasons: [] }).success).toBe(true);

    const project = approvedPublication.projects.find((item) => item.id === "helios")!;
    const identity = {
      expectedPublicationRevision: 1,
      projects: [{ projectId: project.id, draftRevision: project.revision }],
      siteDraftRevision: null,
      media: [],
      candidateSha256: "c".repeat(64),
    };
    const draft = { projectId: project.id, draftRevision: project.revision, project, updatedAt: checkedAt, updatedBy: "accepted-static-baseline" };
    const checks = ["schema", "evidence-records", "https-links", "approved-media", "publication-rules"].map((kind) => ({
      scope: "project", id: project.id, kind, status: "passed", checkedAt, reasons: [],
    }));
    expect(PrivateDraftReviewSchema.safeParse({ identity, drafts: [draft], checks, canPublish: true }).success).toBe(true);
  });

  it("renders draft media only from the exact canonical owner-preview path", () => {
    const mediaId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const canonical = `/api/admin/preview/media/${mediaId}`;
    const render = (approvedUrl: string) => renderToStaticMarkup(React.createElement(AccessibleFigure, {
      mediaId, alt: "Private fixture", caption: "Local fixture", approvedUrl, draftPreview: true,
    }));
    expect(render(canonical)).toContain(`src="${canonical}"`);
    for (const unsafe of [
      `http://yor-world.local${canonical}`,
      `https://yor-world.local${canonical}`,
      `${canonical}/../${mediaId}`,
      `/api/admin/preview/media/%2e%2e/${mediaId}`,
      `${canonical}?next=https://example.invalid`,
    ]) expect(render(unsafe)).not.toContain("<img");
    expect(renderToStaticMarkup(React.createElement(AccessibleFigure, {
      mediaId, alt: "Published fixture", caption: "Public", approvedUrl: "https://media.example.test/image.png",
    }))).toContain("src=\"https://media.example.test/image.png\"");
  });

  it("creates new authoring controls without invented content or verification metadata", () => {
    expect(createEmptySection("new-section")).toEqual({ id: "new-section", heading: "", blocks: [{ type: "paragraph", text: "" }] });
    expect(createEmptyTextBlock("paragraph")).toEqual({ type: "paragraph", text: "" });
    expect(createEmptyTextBlock("list")).toEqual({ type: "list", items: [""] });
    expect(createEmptyTextBlock("code")).toEqual({ type: "code", language: "", text: "" });
    expect(createEmptyLink()).toEqual({ label: "", url: "", checkedAt: "" });
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
