/** Owner-only review identity for the exact publishable project and media candidate. */

import { createHash } from "node:crypto";
import { z } from "zod";
import { ProjectIdSchema, PublicationSchema, PublishedProjectSchema, type ProjectId, type PublishedProject } from "@/contracts/content";
import { approvedPublication } from "@/content/approved-publication";
import type { OwnerContext } from "../auth/types";
import { getPlatformDb } from "../database";
import type { QueryableDb } from "../contact/quota";
import { getActivePublication } from "./publish";
import { isDraftTestRegistryEnabled, listProjectDrafts, readDurableDrafts, type DraftRecord } from "./revisions";
import { isAcceptedPlaceholderBlock, readReviewedMedia, ReviewedMediaSchema, type ReviewedMedia, type ReviewedMediaResult } from "../media/manifest";

const compareCodePoints = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0;
const timestampSchema = z.iso.datetime({ offset: true });
const projectPairSchema = z.strictObject({ projectId: ProjectIdSchema, draftRevision: z.number().int().nonnegative().safe() });
const projectVectorSchema = z.array(projectPairSchema).superRefine((items, context) => {
  const ids = items.map((item) => item.projectId);
  if (new Set(ids).size !== ids.length) context.addIssue({ code: "custom", message: "Project identity entries must be unique." });
  if (ids.some((id, index) => index > 0 && compareCodePoints(ids[index - 1]!, id) >= 0)) {
    context.addIssue({ code: "custom", message: "Project identity entries must use code-point order." });
  }
});
const mediaVectorSchema = z.array(ReviewedMediaSchema).superRefine((items, context) => {
  const ids = items.map((item) => item.mediaId);
  if (new Set(ids).size !== ids.length) context.addIssue({ code: "custom", message: "Media identity entries must be unique." });
  if (ids.some((id, index) => index > 0 && compareCodePoints(ids[index - 1]!, id) >= 0)) {
    context.addIssue({ code: "custom", message: "Media identity entries must use code-point order." });
  }
});

export const ReviewIdentitySchema = z.strictObject({
  expectedPublicationRevision: z.number().int().positive().safe(),
  projects: projectVectorSchema,
  siteDraftRevision: z.null(),
  media: mediaVectorSchema,
  candidateSha256: z.string().regex(/^[a-f0-9]{64}$/),
});
export type ReviewIdentity = z.infer<typeof ReviewIdentitySchema>;

export const ReviewCheckSchema = z.strictObject({
  scope: z.enum(["project", "site"]),
  id: z.string().min(1).max(128),
  kind: z.enum(["schema", "evidence-records", "https-links", "approved-media", "publication-rules"]),
  status: z.enum(["passed", "failed"]),
  checkedAt: timestampSchema,
  reasons: z.array(z.string().min(1)),
}).superRefine((check, context) => {
  if (check.scope === "project" && !ProjectIdSchema.safeParse(check.id).success) {
    context.addIssue({ code: "custom", message: "Project checks require a known project ID." });
  }
  if (check.status === "failed" && check.reasons.length === 0) context.addIssue({ code: "custom", message: "Failed checks require a reason." });
  if (check.status === "passed" && check.reasons.length > 0) context.addIssue({ code: "custom", message: "Passed checks cannot carry failure reasons." });
});
export type ReviewCheck = z.infer<typeof ReviewCheckSchema>;

const actorIdentitySchema = z.string().min(1).max(128).refine((value) =>
  value === "system-seed" || value === "accepted-static-baseline" || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value),
"Draft actor identity is invalid.");
export const DraftRecordSchema = z.strictObject({
  projectId: ProjectIdSchema,
  draftRevision: z.number().int().positive().safe(),
  project: PublishedProjectSchema,
  updatedAt: timestampSchema,
  updatedBy: actorIdentitySchema,
}).superRefine((draft, context) => {
  if (draft.project.id !== draft.projectId) context.addIssue({ code: "custom", message: "Draft project ID does not match its record." });
  if (draft.project.revision !== draft.draftRevision) context.addIssue({ code: "custom", message: "Draft revision does not match its record." });
});

export const PrivateDraftReviewSchema = z.strictObject({
  identity: ReviewIdentitySchema,
  drafts: z.array(DraftRecordSchema),
  checks: z.array(ReviewCheckSchema),
  canPublish: z.boolean(),
}).superRefine((review, context) => {
  const draftIds = review.drafts.map((draft) => draft.projectId);
  if (new Set(draftIds).size !== draftIds.length) context.addIssue({ code: "custom", message: "Draft project IDs must be unique." });
  const projectCheckIds = review.checks.filter((check) => check.scope === "project").map((check) => check.id);
  if (projectCheckIds.some((id) => !draftIds.includes(id as ProjectId))) {
    context.addIssue({ code: "custom", message: "Project checks must refer to a draft in this response." });
  }
  const checkKeys = review.checks.map((check) => `${check.scope}:${check.id}:${check.kind}`);
  if (new Set(checkKeys).size !== checkKeys.length) context.addIssue({ code: "custom", message: "Review checks must be unique." });
  const expectedKinds = ["schema", "evidence-records", "https-links", "approved-media", "publication-rules"];
  const checkedProjectIds = [...new Set(projectCheckIds)];
  for (const id of checkedProjectIds) for (const kind of expectedKinds) {
    if (!checkKeys.includes(`project:${id}:${kind}`)) context.addIssue({ code: "custom", message: `Review is missing ${id}:${kind}.` });
  }
  const matchingDrafts = review.identity.projects.every((item) => {
    const draft = review.drafts.find((candidate) => candidate.projectId === item.projectId);
    return draft?.draftRevision === item.draftRevision;
  });
  const checkedIdentityProjects = review.identity.projects.every((item) => checkedProjectIds.includes(item.projectId));
  const hasPrivateCandidateCheck = projectCheckIds.includes("candidatex");
  const expectedCanPublish = review.identity.projects.length > 0 && matchingDrafts && checkedIdentityProjects &&
    !hasPrivateCandidateCheck && review.checks.every((check) => check.status === "passed");
  if (review.canPublish !== expectedCanPublish) context.addIssue({ code: "custom", message: "canPublish does not match the executed checks and preview scope." });
});
export type PrivateDraftReview = z.infer<typeof PrivateDraftReviewSchema>;

export class DraftNotFoundError extends Error {
  readonly status = 404;
  constructor(readonly projectId: ProjectId) {
    super("Draft not found.");
    this.name = "DraftNotFoundError";
  }
}

export interface ReviewHashInput {
  projects: PublishedProject[];
  siteDraftRevision: null;
  site: null;
  assetManifestRevision: string;
  media: ReviewedMedia[];
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(record).sort(compareCodePoints).map((key) => [key, canonicalize(record[key])]));
  }
  return value;
}

/** Recursively sorts object keys while preserving every document and block array order. */
export function computeReviewHash(input: ReviewHashInput): string {
  const projects = input.projects.filter((project) => project.id !== "candidatex").slice().sort((left, right) => compareCodePoints(left.id, right.id));
  const media = input.media.slice().sort((left, right) => compareCodePoints(left.mediaId, right.mediaId));
  const preimage = { projects, siteDraftRevision: input.siteDraftRevision, site: input.site,
    assetManifestRevision: input.assetManifestRevision, media };
  return createHash("sha256").update(JSON.stringify(canonicalize(preimage)), "utf8").digest("hex");
}

function imageIds(projects: PublishedProject[]): { ids: string[]; placeholders: Set<string> } {
  const references = new Map<string, { hasApprovedReference: boolean; hasPlaceholder: boolean }>();
  for (const project of projects) for (const section of project.sections) for (const block of section.blocks) {
    if (block.type !== "image") continue;
    const current = references.get(block.mediaId) ?? { hasApprovedReference: false, hasPlaceholder: false };
    if (isAcceptedPlaceholderBlock(block)) current.hasPlaceholder = true;
    else current.hasApprovedReference = true;
    references.set(block.mediaId, current);
  }
  const ids = [...references].filter(([, value]) => value.hasApprovedReference).map(([id]) => id).sort(compareCodePoints);
  const placeholders = new Set([...references].filter(([, value]) => value.hasPlaceholder && !value.hasApprovedReference).map(([id]) => id));
  return { ids, placeholders };
}

function reviewMediaVector(result: ReviewedMediaResult, placeholders: Set<string>): ReviewedMedia[] {
  const media = [...result.media, ...[...placeholders].map((mediaId) => ({ kind: "accepted-placeholder" as const, mediaId }))];
  return media.sort((left, right) => compareCodePoints(left.mediaId, right.mediaId));
}

function makeCheck(id: ProjectId, kind: ReviewCheck["kind"], reasons: string[], checkedAt: string): ReviewCheck {
  return ReviewCheckSchema.parse({ scope: "project", id, kind, status: reasons.length ? "failed" : "passed", checkedAt, reasons });
}

function checksForDraft(draft: DraftRecord, media: ReviewedMedia[], mediaIssues: Map<string, string[]>, checkedAt: string): ReviewCheck[] {
  const project = draft.project;
  const projectId = draft.projectId;
  const schemaResult = PublishedProjectSchema.safeParse(project);
  const imageBlocks = project.sections.flatMap((section) => section.blocks.filter((block) => block.type === "image"));
  const imageIds = [...new Set(imageBlocks.filter((block) => !isAcceptedPlaceholderBlock(block)).map((block) => block.mediaId))];
  const byMedia = new Map(media.map((entry) => [entry.mediaId, entry]));
  const mediaReasons = imageIds.flatMap((id) => {
    const item = byMedia.get(id);
    const reasons = mediaIssues.get(id) ?? [];
    if (item?.kind !== "asset") return [`Image ${id} is not available as an approved asset.`, ...reasons];
    if (item.approvalStatus !== "approved") return [`Image ${id} is not approved.`, ...reasons];
    return reasons;
  });
  const evidenceReasons: string[] = [];
  if (projectId !== "candidatex" && !project.evidence.some((item) => item.status === "verified")) evidenceReasons.push("At least one evidence record must be verified.");
  if (project.evidence.some((item) => item.status === "unknown" || !item.note.trim())) evidenceReasons.push("Evidence status and notes must be complete and supported.");
  const linkReasons = project.links.filter((link) => {
    try { return new URL(link.url).protocol !== "https:"; } catch { return true; }
  }).map((link) => `Link ${link.label} must use HTTPS.`);
  const publicationReasons = project.id !== projectId || project.slug !== projectId ? ["Project ID and slug must match the draft identity."] : [];
  if (projectId === "candidatex") publicationReasons.push("CandidateX is a private draft and is not publishable.");
  return [
    makeCheck(projectId, "schema", schemaResult.success ? [] : schemaResult.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`), checkedAt),
    makeCheck(projectId, "evidence-records", evidenceReasons, checkedAt),
    makeCheck(projectId, "https-links", linkReasons, checkedAt),
    makeCheck(projectId, "approved-media", mediaReasons, checkedAt),
    makeCheck(projectId, "publication-rules", publicationReasons, checkedAt),
  ];
}

async function readPublicationInTransaction(tx: QueryableDb) {
  const result = await tx.query("SELECT payload FROM public.published_content ORDER BY revision DESC,published_at DESC LIMIT 1");
  return result.rows[0] ? PublicationSchema.parse(result.rows[0]["payload"]) : approvedPublication;
}

async function lockReviewInputs(tx: QueryableDb): Promise<void> {
  await tx.query("SELECT pg_advisory_xact_lock(hashtext('yor-publication'))");
  const projectIds = approvedPublication.projects.map((project) => project.id).filter((id) => id !== "candidatex").sort(compareCodePoints);
  for (const id of projectIds) await tx.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`yor-draft-${id}`]);
}

async function createReview(actor: OwnerContext, transaction?: QueryableDb, requestedProjectId: ProjectId | null = null): Promise<PrivateDraftReview> {
  let publication = getActivePublication();
  let drafts: DraftRecord[];
  let mediaResult: ReviewedMediaResult;
  let placeholders = new Set<string>();
  if (isDraftTestRegistryEnabled() && !transaction) {
    drafts = await listProjectDrafts(actor);
    if (requestedProjectId !== null && !drafts.some((draft) => draft.projectId === requestedProjectId)) {
      throw new DraftNotFoundError(requestedProjectId);
    }
    const candidate = drafts.filter((draft) => draft.projectId !== "candidatex").map((draft) => draft.project);
    const references = imageIds(candidate);
    placeholders = references.placeholders;
    mediaResult = await readReviewedMedia(references.ids);
  } else {
    const db = transaction ?? await getPlatformDb();
    if (!transaction && !db.transaction) throw new Error("Transactional database is required for an owner review.");
    const build = async (tx: QueryableDb) => {
      await lockReviewInputs(tx);
      publication = await readPublicationInTransaction(tx);
      const lockedDrafts = await readDurableDrafts(tx);
      if (requestedProjectId !== null && !lockedDrafts.some((draft) => draft.projectId === requestedProjectId)) {
        throw new DraftNotFoundError(requestedProjectId);
      }
      const candidate = lockedDrafts.filter((draft) => draft.projectId !== "candidatex").map((draft) => draft.project);
      const references = imageIds(candidate);
      const loadedMedia = await readReviewedMedia(references.ids, tx);
      return { lockedDrafts, loadedMedia, placeholderIds: references.placeholders };
    };
    if (transaction) {
      const loaded = await build(transaction);
      drafts = loaded.lockedDrafts;
      mediaResult = loaded.loadedMedia;
      placeholders = loaded.placeholderIds;
    } else {
      const loaded = await db.transaction!(build);
      drafts = loaded.lockedDrafts;
      mediaResult = loaded.loadedMedia;
      placeholders = loaded.placeholderIds;
    }
  }
  const candidateDrafts = drafts.filter((draft) => draft.projectId !== "candidatex");
  const candidateProjects = candidateDrafts.map((draft) => draft.project);
  const media = reviewMediaVector(mediaResult, placeholders);
  const identity = ReviewIdentitySchema.parse({
    expectedPublicationRevision: publication.revision,
    projects: candidateDrafts.map((draft) => ({ projectId: draft.projectId, draftRevision: draft.draftRevision })).sort((left, right) => compareCodePoints(left.projectId, right.projectId)),
    siteDraftRevision: null,
    media,
    candidateSha256: computeReviewHash({ projects: candidateProjects, siteDraftRevision: null, site: null, assetManifestRevision: publication.assetManifestRevision, media }),
  });
  const checkedAt = new Date().toISOString();
  const allChecks = (requestedProjectId === null ? candidateDrafts : drafts.filter((draft) => draft.projectId === requestedProjectId))
    .flatMap((draft) => checksForDraft(draft, media, mediaResult.issues, checkedAt));
  const returnedDrafts = requestedProjectId === null ? drafts : drafts.filter((draft) => draft.projectId === requestedProjectId);
  const canPublish = requestedProjectId === null && identity.projects.length > 0 && allChecks.every((check) => check.status === "passed");
  return PrivateDraftReviewSchema.parse({ identity, drafts: returnedDrafts, checks: allChecks, canPublish });
}

export async function generateDraftReview(actor: OwnerContext, transaction?: QueryableDb, requestedProjectId: ProjectId | null = null): Promise<PrivateDraftReview> {
  return createReview(actor, transaction, requestedProjectId);
}

export function reviewIdentityEquals(left: ReviewIdentity, right: ReviewIdentity): boolean {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}
