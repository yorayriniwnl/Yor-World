import { createHash } from "node:crypto";
import { z } from "zod";
import {
  ProjectIdSchema,
  PublishedProjectSchema,
  type ProjectId,
  type PublishedProject,
  type Publication,
} from "@/contracts/content";
import { approvedPublication } from "@/content/approved-publication";
import { getPlatformDb, hasPlatformDatabase } from "../database";
import type { QueryableDb } from "../contact/quota";
import type { OwnerContext } from "../auth/types";
import {
  isDraftTestRegistryEnabled,
  listProjectDrafts,
  readDurableDrafts,
  RevisionConflictError,
  ContentValidationError,
  type DraftRecord,
} from "./revisions";
import { collectDraftMediaReferences, readReviewedMedia } from "../media/manifest";

const timestamp = z.iso.datetime({ offset: true });
const revisionNumber = z.number().int().safe().positive();
const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() => z.union([
  z.null(),
  z.boolean(),
  z.number().finite(),
  z.string(),
  z.array(JsonValueSchema),
  z.record(z.string(), JsonValueSchema),
]));

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const ReviewedMediaAssetSchema = z.strictObject({
  kind: z.literal("asset"),
  mediaId: z.string().min(1),
  objectKey: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  mime: z.enum(["image/png", "image/jpeg", "image/webp"]),
  bytes: z.number().int().safe().positive(),
  dimensions: JsonValueSchema,
  provenance: JsonValueSchema,
  approvalStatus: z.enum(["pending", "approved", "rejected"]),
  createdAt: timestamp,
  approvalAudit: z.strictObject({ eventId: z.string().min(1), createdAt: timestamp }).nullable(),
});

export const ReviewedMediaSchema = z.discriminatedUnion("kind", [
  ReviewedMediaAssetSchema,
  z.strictObject({ kind: z.literal("accepted-placeholder"), mediaId: z.string().min(1) }),
  z.strictObject({ kind: z.literal("missing"), mediaId: z.string().min(1) }),
]);
export type ReviewedMedia = z.infer<typeof ReviewedMediaSchema>;

const ProjectVectorEntrySchema = z.strictObject({
  projectId: ProjectIdSchema,
  draftRevision: revisionNumber,
});

export const ReviewIdentitySchema = z.strictObject({
  expectedPublicationRevision: revisionNumber,
  projects: z.array(ProjectVectorEntrySchema),
  siteDraftRevision: z.null(),
  media: z.array(ReviewedMediaSchema),
  candidateSha256: z.string().regex(/^[a-f0-9]{64}$/),
}).superRefine((identity, context) => {
  for (let index = 1; index < identity.projects.length; index += 1) {
    const previous = identity.projects[index - 1]!.projectId;
    const current = identity.projects[index]!.projectId;
    if (previous >= current) {
      context.addIssue({ code: "custom", path: ["projects", index], message: "Project identity vector must be sorted and unique." });
    }
  }
  for (let index = 1; index < identity.media.length; index += 1) {
    const previous = identity.media[index - 1]!.mediaId;
    const current = identity.media[index]!.mediaId;
    if (previous >= current) {
      context.addIssue({ code: "custom", path: ["media", index], message: "Media identity vector must be sorted and unique." });
    }
  }
});
export type ReviewIdentity = z.infer<typeof ReviewIdentitySchema>;

const checkKind = z.enum(["schema", "evidence-records", "https-links", "approved-media", "publication-rules"]);
export const ReviewCheckSchema = z.strictObject({
  scope: z.enum(["project", "site"]),
  id: z.string().min(1),
  kind: checkKind,
  status: z.enum(["passed", "failed"]),
  checkedAt: timestamp,
  reasons: z.array(z.string()),
}).superRefine((check, context) => {
  if (check.scope === "project" && !ProjectIdSchema.safeParse(check.id).success) {
    context.addIssue({ code: "custom", path: ["id"], message: "Unknown project check identity." });
  }
  if (check.scope === "site" && check.id !== "site") {
    context.addIssue({ code: "custom", path: ["id"], message: "Unknown site check identity." });
  }
  if (check.status === "failed" && check.reasons.length === 0) {
    context.addIssue({ code: "custom", path: ["reasons"], message: "Failed checks require a reason." });
  }
  if (check.status === "passed" && check.reasons.length !== 0) {
    context.addIssue({ code: "custom", path: ["reasons"], message: "Passed checks cannot contain failure reasons." });
  }
});
export type ReviewCheck = z.infer<typeof ReviewCheckSchema>;

export const DraftRecordSchema = z.strictObject({
  projectId: ProjectIdSchema,
  draftRevision: revisionNumber,
  project: PublishedProjectSchema,
  updatedAt: timestamp,
  updatedBy: z.string().min(1),
}).superRefine((draft, context) => {
  if (draft.project.id !== draft.projectId) {
    context.addIssue({ code: "custom", path: ["project", "id"], message: "Draft project identity does not match its record." });
  }
  if (draft.project.slug !== draft.projectId) {
    context.addIssue({ code: "custom", path: ["project", "slug"], message: "Draft project slug does not match its record." });
  }
  if (draft.project.revision !== draft.draftRevision) {
    context.addIssue({ code: "custom", path: ["project", "revision"], message: "Draft content revision does not match its record." });
  }
});

export const PrivateDraftReviewSchema = z.strictObject({
  identity: ReviewIdentitySchema,
  drafts: z.array(DraftRecordSchema),
  checks: z.array(ReviewCheckSchema),
  canPublish: z.boolean(),
}).superRefine((review, context) => {
  const draftIds = review.drafts.map((draft) => draft.projectId);
  if (new Set(draftIds).size !== draftIds.length) {
    context.addIssue({ code: "custom", path: ["drafts"], message: "Draft project IDs must be unique." });
  }
  const checkKeys = review.checks.map((check) => check.scope + ":" + check.id + ":" + check.kind);
  if (new Set(checkKeys).size !== checkKeys.length) {
    context.addIssue({ code: "custom", path: ["checks"], message: "Review checks must be unique." });
  }
  if (review.canPublish && (review.checks.length === 0 || review.checks.some((check) => check.status !== "passed"))) {
    context.addIssue({ code: "custom", path: ["canPublish"], message: "A publishable review requires executed passing checks." });
  }
  if (review.identity.projects.some((entry) => entry.projectId === "candidatex") && review.canPublish) {
    context.addIssue({ code: "custom", path: ["identity", "projects"], message: "CandidateX cannot be published." });
  }
});
export type PrivateDraftReview = z.infer<typeof PrivateDraftReviewSchema>;

function compareCodePoint(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => compareCodePoint(left, right));
    return Object.fromEntries(entries.map(([key, item]) => [key, canonicalize(item)]));
  }
  return value;
}

export function computeReviewHash(input: {
  projects: PublishedProject[];
  siteDraftRevision: number | null;
  site?: JsonValue | null;
  assetManifestRevision: string;
  media: ReviewedMedia[];
}): string {
  const preimage = {
    projects: input.projects,
    siteDraftRevision: input.siteDraftRevision,
    site: input.site ?? null,
    assetManifestRevision: input.assetManifestRevision,
    media: input.media,
  };
  return createHash("sha256").update(JSON.stringify(canonicalize(preimage)), "utf8").digest("hex");
}

function normalizePublication(value: unknown): Publication {
  const parsed = z.object({
    revision: revisionNumber,
    publishedAt: timestamp,
    projects: z.array(PublishedProjectSchema),
    assetManifestRevision: z.string().min(1),
  }).strict().safeParse(value);
  if (!parsed.success) return approvedPublication;
  return parsed.data;
}

async function readActivePublication(db: QueryableDb): Promise<Publication> {
  const result = await db.query("SELECT payload FROM public.published_content ORDER BY revision DESC,published_at DESC LIMIT 1");
  if (!result.rows[0]) return approvedPublication;
  return normalizePublication(result.rows[0]["payload"]);
}

function projectChecks(project: PublishedProject, mediaIssues: Map<string, string[]>, references: Set<string>): ReviewCheck[] {
  const checkedAt = new Date().toISOString();
  const schema = PublishedProjectSchema.safeParse(project);
  const evidenceReasons: string[] = [];
  if (!project.evidence.some((item) => item.status === "verified")) evidenceReasons.push("At least one retained verified evidence record is required.");
  if (project.evidence.some((item) => item.status === "unknown")) evidenceReasons.push("Unknown evidence cannot enter publication.");
  if (project.evidence.some((item) => !item.note.trim())) evidenceReasons.push("Evidence records require descriptive notes.");
  const linkReasons: string[] = [];
  for (const link of project.links) {
    try {
      if (new URL(link.url).protocol !== "https:") linkReasons.push("Every external link must use HTTPS.");
    } catch {
      linkReasons.push("An external link is malformed.");
    }
  }
  const mediaReasons = [...references].flatMap((id) => mediaIssues.get(id) ?? []);
  const projectRules: string[] = [];
  if (project.id === "candidatex") projectRules.push("CandidateX is private and excluded from publication.");
  return [
    { scope: "project", id: project.id, kind: "schema", status: schema.success ? "passed" : "failed", checkedAt, reasons: schema.success ? [] : ["Project content does not match the frozen content schema."] },
    { scope: "project", id: project.id, kind: "evidence-records", status: evidenceReasons.length ? "failed" : "passed", checkedAt, reasons: evidenceReasons },
    { scope: "project", id: project.id, kind: "https-links", status: linkReasons.length ? "failed" : "passed", checkedAt, reasons: linkReasons },
    { scope: "project", id: project.id, kind: "approved-media", status: mediaReasons.length ? "failed" : "passed", checkedAt, reasons: mediaReasons },
    { scope: "project", id: project.id, kind: "publication-rules", status: projectRules.length ? "failed" : "passed", checkedAt, reasons: projectRules },
  ];
}

async function reviewFromDatabase(db: QueryableDb, actor: OwnerContext): Promise<PrivateDraftReview> {
  await db.query("SELECT pg_advisory_xact_lock(hashtext('yor-publication'))");
  const initialDrafts = await readDurableDrafts(db);
  const lockIds = initialDrafts.filter((draft) => draft.projectId !== "candidatex").map((draft) => draft.projectId).sort(compareCodePoint);
  for (const projectId of lockIds) {
    await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["yor-draft-" + projectId]);
  }
  const publication = await readActivePublication(db);
  const drafts = await readDurableDrafts(db);
  const candidateDrafts = drafts.filter((draft) => draft.projectId !== "candidatex").sort((left, right) => compareCodePoint(left.projectId, right.projectId));
  const projects = candidateDrafts.map((draft) => draft.project);
  const references = collectDraftMediaReferences(projects);
  const read = await readReviewedMedia(references.ids, db);
  const media = [
    ...read.media,
    ...references.placeholders.map((mediaId) => ({ kind: "accepted-placeholder" as const, mediaId })),
  ].sort((left, right) => compareCodePoint(left.mediaId, right.mediaId));
  const mediaIssues = new Map(read.issues);
  for (const placeholder of references.placeholders) mediaIssues.delete(placeholder);
  const projectChecksResult = candidateDrafts.flatMap((draft) => {
    const projectIds = new Set<string>();
    draft.project.sections.forEach((section, sectionIndex) => section.blocks.forEach((block, blockIndex) => {
      if (block.type !== "image") return;
      const source = collectDraftMediaReferences([draft.project]);
      if (source.placeholders.includes(block.mediaId)) return;
      projectIds.add(block.mediaId);
    }));
    return projectChecks(draft.project, mediaIssues, projectIds);
  });
  const projectIdSet = new Set(projects.map((project) => project.id));
  const uniqueSlugs = new Set(projects.map((project) => project.slug));
  if (uniqueSlugs.size !== projects.length) {
    for (const projectId of projectIdSet) {
      const failed = projectChecksResult.find((check) => check.id === projectId && check.kind === "publication-rules");
      if (failed) {
        failed.status = "failed";
        failed.reasons = ["Published project slugs must be unique."];
      }
    }
  }
  const identity: ReviewIdentity = {
    expectedPublicationRevision: publication.revision,
    projects: candidateDrafts.map((draft) => ({ projectId: draft.projectId, draftRevision: draft.draftRevision })),
    siteDraftRevision: null,
    media,
    candidateSha256: computeReviewHash({
      projects,
      siteDraftRevision: null,
      site: null,
      assetManifestRevision: publication.assetManifestRevision,
      media,
    }),
  };
  return PrivateDraftReviewSchema.parse({
    identity,
    drafts,
    checks: projectChecksResult,
    canPublish: projectChecksResult.length > 0 && projectChecksResult.every((check) => check.status === "passed"),
  });
}

export async function generateDraftReviewInTransaction(db: QueryableDb, actor: OwnerContext): Promise<PrivateDraftReview> {
  return reviewFromDatabase(db, actor);
}

export async function generateDraftReview(actor: OwnerContext): Promise<PrivateDraftReview> {
  void actor;
  if (isDraftTestRegistryEnabled() && !hasPlatformDatabase()) {
    const drafts = await listProjectDrafts(actor);
    const { getActivePublication } = await import("./publish");
    const publication = getActivePublication();
    const candidateDrafts = drafts.filter((draft) => draft.projectId !== "candidatex").sort((left, right) => compareCodePoint(left.projectId, right.projectId));
    const projects = candidateDrafts.map((draft) => draft.project);
    const references = collectDraftMediaReferences(projects);
    const read = await readReviewedMedia(references.ids);
    const media = [
      ...read.media,
      ...references.placeholders.map((mediaId) => ({ kind: "accepted-placeholder" as const, mediaId })),
    ].sort((left, right) => compareCodePoint(left.mediaId, right.mediaId));
    const checks = candidateDrafts.flatMap((draft) => {
      const projectReferences = collectDraftMediaReferences([draft.project]);
      return projectChecks(draft.project, read.issues, new Set(projectReferences.ids));
    });
    return PrivateDraftReviewSchema.parse({
      identity: {
        expectedPublicationRevision: publication.revision,
        projects: candidateDrafts.map((draft) => ({ projectId: draft.projectId, draftRevision: draft.draftRevision })),
        siteDraftRevision: null,
        media,
        candidateSha256: computeReviewHash({ projects, siteDraftRevision: null, site: null, assetManifestRevision: publication.assetManifestRevision, media }),
      },
      drafts,
      checks,
      canPublish: checks.length > 0 && checks.every((check) => check.status === "passed"),
    });
  }
  const db = await getPlatformDb();
  if (db.transaction) return db.transaction((transaction) => reviewFromDatabase(transaction, actor));
  return reviewFromDatabase(db, actor);
}

export async function generateProjectReview(projectId: ProjectId, actor: OwnerContext): Promise<PrivateDraftReview | null> {
  const review = await generateDraftReview(actor);
  const draft = review.drafts.find((item) => item.projectId === projectId);
  if (!draft) return null;
  if (projectId === "candidatex") {
    const checkedAt = new Date().toISOString();
    const checks = [
      { scope: "project" as const, id: projectId, kind: "publication-rules" as const, status: "failed" as const, checkedAt, reasons: ["CandidateX is private and cannot be published."] },
    ];
    return PrivateDraftReviewSchema.parse({ ...review, drafts: [draft], checks, canPublish: false });
  }
  return PrivateDraftReviewSchema.parse({ ...review, drafts: [draft] });
}

export function assertReviewIdentityMatches(
  actual: ReviewIdentity,
  expected: unknown,
  expectedPublicationRevision: number,
): void {
  const parsed = ReviewIdentitySchema.safeParse(expected);
  if (!parsed.success) throw new ContentValidationError("A complete, valid review identity is required.");
  if (expectedPublicationRevision !== parsed.data.expectedPublicationRevision) {
    throw new ContentValidationError("Expected publication revision does not match the reviewed identity.");
  }
  if (JSON.stringify(canonicalize(parsed.data)) !== JSON.stringify(canonicalize(actual))) {
    throw new RevisionConflictError("The publication candidate changed after review.");
  }
}
