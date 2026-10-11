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
import type { OwnerContext } from "../auth/types";
import { getPlatformDb } from "../database";
import type { QueryableDb } from "../contact/quota";
import { isDraftTestRegistryEnabled, listProjectDrafts, readDurableDrafts, validateDraftContent } from "./revisions";
import { readReviewedMedia, isAcceptedPlaceholder, type ReviewedMedia } from "../media/manifest";

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() => z.union([
  z.null(), z.boolean(), z.number().finite(), z.string(), z.array(jsonValueSchema), z.record(z.string(), jsonValueSchema),
]));
const timestampSchema = z.iso.datetime({ offset: true });
const actorIdentitySchema = z.union([
  z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  z.literal("system-seed"),
  z.literal("accepted-static-baseline"),
]);
const projectPairSchema = z.strictObject({
  projectId: ProjectIdSchema,
  draftRevision: z.number().int().refine(Number.isSafeInteger).positive(),
});
const reviewedMediaSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("asset"), mediaId: z.string().min(1), objectKey: z.string().min(1),
    sha256: z.string().regex(/^[a-f0-9]{64}$/), mime: z.enum(["image/png", "image/jpeg", "image/webp"]),
    bytes: z.number().int().refine(Number.isSafeInteger).positive(), dimensions: jsonValueSchema,
    provenance: jsonValueSchema, approvalStatus: z.enum(["pending", "approved", "rejected"]),
    createdAt: timestampSchema,
    approvalAudit: z.strictObject({ eventId: z.string().min(1), createdAt: timestampSchema }).nullable(),
  }),
  z.strictObject({ kind: z.literal("accepted-placeholder"), mediaId: z.string().min(1) }),
  z.strictObject({ kind: z.literal("missing"), mediaId: z.string().min(1) }),
]);

function compareCodePoint(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) throw new TypeError("Candidate contains a value outside JSON.");
    return encoded;
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const object = value as Record<string, unknown>;
  const keys = Object.keys(object).sort(compareCodePoint);
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(",")}}`;
}

export const ReviewIdentitySchema = z.strictObject({
  expectedPublicationRevision: z.number().int().refine(Number.isSafeInteger).positive(),
  projects: z.array(projectPairSchema),
  siteDraftRevision: z.null(),
  media: z.array(reviewedMediaSchema),
  candidateSha256: z.string().regex(/^[a-f0-9]{64}$/),
}).superRefine((identity, context) => {
  const projectIds = identity.projects.map((item) => item.projectId);
  if (new Set(projectIds).size !== projectIds.length) context.addIssue({ code: "custom", path: ["projects"], message: "Project identities must be unique." });
  if (projectIds.some((id, index) => index > 0 && compareCodePoint(projectIds[index - 1]!, id) >= 0)) {
    context.addIssue({ code: "custom", path: ["projects"], message: "Project identities must be sorted by project ID." });
  }
  const mediaIds = identity.media.map((item) => item.mediaId);
  if (new Set(mediaIds).size !== mediaIds.length) context.addIssue({ code: "custom", path: ["media"], message: "Media identities must be unique." });
  if (mediaIds.some((id, index) => index > 0 && compareCodePoint(mediaIds[index - 1]!, id) >= 0)) {
    context.addIssue({ code: "custom", path: ["media"], message: "Media identities must be sorted by media ID." });
  }
});
export type ReviewIdentity = z.infer<typeof ReviewIdentitySchema>;

const draftRecordSchema = z.strictObject({
  projectId: ProjectIdSchema,
  draftRevision: z.number().int().refine(Number.isSafeInteger).positive(),
  project: PublishedProjectSchema,
  updatedAt: timestampSchema,
  updatedBy: actorIdentitySchema,
}).superRefine((draft, context) => {
  if (draft.projectId !== draft.project.id || draft.project.slug !== draft.projectId) {
    context.addIssue({ code: "custom", path: ["project"], message: "Draft identity must match its complete project record." });
  }
  if (draft.draftRevision !== draft.project.revision) {
    context.addIssue({ code: "custom", path: ["draftRevision"], message: "Draft and content revisions must match." });
  }
});
export const DraftRecordSchema = draftRecordSchema;

const reviewKinds = ["schema", "evidence-records", "https-links", "approved-media", "publication-rules"] as const;
export const ReviewCheckSchema = z.strictObject({
  scope: z.enum(["project", "site"]),
  id: z.string().min(1),
  kind: z.enum(reviewKinds),
  status: z.enum(["passed", "failed"]),
  checkedAt: timestampSchema,
  reasons: z.array(z.string().trim().min(1)),
}).superRefine((check, context) => {
  if (check.status === "passed" && check.reasons.length !== 0) context.addIssue({ code: "custom", path: ["reasons"], message: "Passed checks cannot contain failure reasons." });
  if (check.status === "failed" && check.reasons.length === 0) context.addIssue({ code: "custom", path: ["reasons"], message: "Failed checks require a reason." });
  if (check.scope === "project" && !ProjectIdSchema.safeParse(check.id).success) context.addIssue({ code: "custom", path: ["id"], message: "Unknown project check ID." });
  if (check.scope === "site" && check.id !== "site" && check.id !== "publication") context.addIssue({ code: "custom", path: ["id"], message: "Unknown site check ID." });
});
export type ReviewCheck = z.infer<typeof ReviewCheckSchema>;

export const PrivateDraftReviewSchema = z.strictObject({
  identity: ReviewIdentitySchema,
  drafts: z.array(DraftRecordSchema),
  checks: z.array(ReviewCheckSchema),
  canPublish: z.boolean(),
}).superRefine((review, context) => {
  const draftIds = review.drafts.map((draft) => draft.projectId);
  if (new Set(draftIds).size !== draftIds.length) context.addIssue({ code: "custom", path: ["drafts"], message: "Draft project IDs must be unique." });

  const publicDrafts = review.drafts.filter((draft) => draft.projectId !== "candidatex").sort((a, b) => compareCodePoint(a.projectId, b.projectId));
  const expectedProjects = publicDrafts.map((draft) => ({ projectId: draft.projectId, draftRevision: draft.draftRevision }));
  if (canonicalJson(expectedProjects) !== canonicalJson(review.identity.projects)) {
    context.addIssue({ code: "custom", path: ["identity", "projects"], message: "Review identity must match every complete public draft record." });
  }

  const checkKeys = new Set<string>();
  for (const [index, check] of review.checks.entries()) {
    const key = `${check.scope}:${check.id}:${check.kind}`;
    if (checkKeys.has(key)) context.addIssue({ code: "custom", path: ["checks", index], message: "Review checks must be unique." });
    checkKeys.add(key);
    if (check.scope === "project" && !draftIds.includes(check.id as ProjectId)) {
      context.addIssue({ code: "custom", path: ["checks", index, "id"], message: "Project check must identify a returned draft." });
    }
  }
  if (review.checks.length === 0) context.addIssue({ code: "custom", path: ["checks"], message: "A review must contain executed checks." });

  for (const draft of publicDrafts) {
    const kinds = new Set(review.checks.filter((check) => check.scope === "project" && check.id === draft.projectId).map((check) => check.kind));
    for (const kind of reviewKinds) {
      if (!kinds.has(kind)) context.addIssue({ code: "custom", path: ["checks"], message: `Draft ${draft.projectId} is missing its ${kind} review check.` });
    }
  }

  const expectedCanPublish = publicDrafts.length > 0 && review.checks.every((check) => check.status === "passed");
  if (review.canPublish !== expectedCanPublish) context.addIssue({ code: "custom", path: ["canPublish"], message: "canPublish must match the complete review checks and public candidate." });
});
export type PrivateDraftReview = z.infer<typeof PrivateDraftReviewSchema>;

export type DraftReviewSummary = PrivateDraftReview & {
  projects: PublishedProject[];
  candidatePublication: Publication;
};

/**
 * Hashes canonical JSON for the actual candidate documents and reviewed media.
 * Object keys are sorted recursively; project, section, block, and media arrays keep their order.
 */
export function computeReviewHash(input: {
  projects: PublishedProject[];
  siteDraftRevision: null;
  assetManifestRevision: string;
  media: ReviewedMedia[];
}): string {
  const preimage = {
    projects: [...input.projects].sort((left, right) => compareCodePoint(left.id, right.id)),
    siteDraftRevision: input.siteDraftRevision,
    site: null,
    assetManifestRevision: input.assetManifestRevision,
    media: [...input.media].sort((left, right) => compareCodePoint(left.mediaId, right.mediaId)),
  };
  return createHash("sha256").update(canonicalJson(preimage), "utf8").digest("hex");
}

function mediaReferences(projects: PublishedProject[]) {
  const ids = new Set<string>();
  const placeholders = new Set<string>();
  const ordinary = new Set<string>();
  for (const project of projects) {
    for (const [sectionIndex, section] of project.sections.entries()) {
      for (const [blockIndex, block] of section.blocks.entries()) {
        if (block.type !== "image") continue;
        ids.add(block.mediaId);
        if (isAcceptedPlaceholder(project.id, sectionIndex, blockIndex, block)) placeholders.add(block.mediaId);
        else ordinary.add(block.mediaId);
      }
    }
  }
  for (const id of ordinary) placeholders.delete(id);
  return { ids: [...ids].sort(compareCodePoint), placeholders };
}

function addCheck(checks: ReviewCheck[], id: ProjectId | "publication", kind: ReviewCheck["kind"], reasons: string[], scope: "project" | "site", checkedAt: string): void {
  const uniqueReasons = [...new Set(reasons.map((reason) => reason.trim()).filter(Boolean))].sort(compareCodePoint);
  checks.push({ scope, id, kind, status: uniqueReasons.length === 0 ? "passed" : "failed", checkedAt, reasons: uniqueReasons });
}

export async function lockReviewRows(tx: QueryableDb): Promise<void> {
  await tx.query("SELECT pg_advisory_xact_lock(hashtext('yor-publication'))");
  const ids: ProjectId[] = ["ai-vs-real", "candidatex", "helios", "talks", "zenith"];
  for (const id of ids) await tx.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`yor-draft-${id}`]);
  await tx.query('SELECT id FROM public.projects WHERE archived_at IS NULL ORDER BY slug COLLATE "C" FOR SHARE');
}

async function readPublicationForReview(tx?: QueryableDb): Promise<Publication> {
  if (tx) {
    const rows = await tx.query("SELECT payload FROM public.published_content ORDER BY revision DESC,published_at DESC LIMIT 1");
    if (!rows.rows[0]) return approvedPublication;
    const { PublicationSchema } = await import("@/contracts/content");
    return PublicationSchema.parse(rows.rows[0]["payload"]);
  }
  const { readPublicPublication } = await import("./publish");
  return await readPublicPublication() ?? approvedPublication;
}

async function buildReview(actor: OwnerContext, tx?: QueryableDb, requestedProjectId?: ProjectId): Promise<DraftReviewSummary> {
  const current = await readPublicationForReview(tx);
  const drafts = tx ? await readDurableDrafts(tx) : await listProjectDrafts(actor);
  const publicDrafts = drafts.filter((draft) => draft.projectId !== "candidatex").sort((a, b) => compareCodePoint(a.projectId, b.projectId));
  const projects = publicDrafts.map((draft) => draft.project);
  const references = mediaReferences(projects);
  const ordinaryIds = references.ids.filter((id) => !references.placeholders.has(id));
  const mediaResult = await readReviewedMedia(ordinaryIds, tx);
  const mediaById = new Map(mediaResult.items.map((item) => [item.mediaId, item]));
  const media: ReviewedMedia[] = references.ids.map((id) => references.placeholders.has(id)
    ? { kind: "accepted-placeholder", mediaId: id }
    : mediaById.get(id) ?? { kind: "missing", mediaId: id });

  const checks: ReviewCheck[] = [];
  const checkedAt = new Date().toISOString();
  const slugOwner = new Map<string, string>();
  for (const draft of publicDrafts) {
    const project = draft.project;
    const parsed = PublishedProjectSchema.safeParse(project);
    addCheck(checks, draft.projectId, "schema", parsed.success ? [] : parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`), "project", checkedAt);

    const evidenceReasons: string[] = [];
    if (!project.evidence.some((item) => item.status === "verified")) evidenceReasons.push("At least one evidence record must be explicitly verified.");
    const evidenceIds = new Set<string>();
    for (const item of project.evidence) {
      if (evidenceIds.has(item.id)) evidenceReasons.push(`Evidence ID ${item.id} is duplicated.`);
      evidenceIds.add(item.id);
      if (item.status === "unknown") evidenceReasons.push(`Evidence ${item.id} is still unknown.`);
      if (item.status === "verified" && (!item.checkedAt || !item.note.trim())) evidenceReasons.push(`Verified evidence ${item.id} needs a recorded check time and note.`);
    }
    addCheck(checks, draft.projectId, "evidence-records", evidenceReasons, "project", checkedAt);

    const linkReasons: string[] = [];
    for (const link of project.links) {
      try { if (new URL(link.url).protocol !== "https:") linkReasons.push(`Link ${link.label} must use HTTPS.`); }
      catch { linkReasons.push(`Link ${link.label} has an invalid URL.`); }
    }
    for (const item of project.evidence) if (item.url) {
      try { if (new URL(item.url).protocol !== "https:") linkReasons.push(`Evidence ${item.id} must use HTTPS.`); }
      catch { linkReasons.push(`Evidence ${item.id} has an invalid URL.`); }
    }
    addCheck(checks, draft.projectId, "https-links", linkReasons, "project", checkedAt);

    const mediaReasons: string[] = [];
    const refs = mediaReferences([project]);
    for (const id of refs.ids) {
      if (refs.placeholders.has(id)) continue;
      const item = mediaById.get(id);
      if (!item || item.kind === "missing") mediaReasons.push(`Image ${id} has no media record.`);
      else {
        if (item.kind === "asset" && item.approvalStatus !== "approved") mediaReasons.push(`Image ${id} is not approved.`);
        if (item.kind === "asset" && !item.approvalAudit) mediaReasons.push(`Image ${id} has no approval audit record.`);
        mediaReasons.push(...(mediaResult.issues.get(id) ?? []));
      }
    }
    addCheck(checks, draft.projectId, "approved-media", mediaReasons, "project", checkedAt);

    const ruleReasons: string[] = [];
    const priorSlugOwner = slugOwner.get(project.slug);
    if (priorSlugOwner) ruleReasons.push(`Slug ${project.slug} is already assigned to ${priorSlugOwner}.`);
    else slugOwner.set(project.slug, project.id);
    try { validateDraftContent(project); }
    catch (error) { ruleReasons.push(error instanceof Error ? error.message : "Project content rules failed."); }
    addCheck(checks, draft.projectId, "publication-rules", ruleReasons, "project", checkedAt);
  }

  if (publicDrafts.length === 0) addCheck(checks, "publication", "publication-rules", ["At least one public project is required."], "site", checkedAt);

  const candidateX = requestedProjectId === "candidatex" ? drafts.find((draft) => draft.projectId === "candidatex") : undefined;
  if (candidateX) {
    const schema = PublishedProjectSchema.safeParse(candidateX.project);
    addCheck(checks, candidateX.projectId, "schema", schema.success ? [] : ["CandidateX draft failed structural validation."], "project", checkedAt);
    addCheck(checks, candidateX.projectId, "evidence-records", [], "project", checkedAt);
    addCheck(checks, candidateX.projectId, "https-links", [], "project", checkedAt);
    addCheck(checks, candidateX.projectId, "approved-media", [], "project", checkedAt);
    addCheck(checks, candidateX.projectId, "publication-rules", ["CandidateX has no accepted public content decision and cannot be published."], "project", checkedAt);
  }

  const pairs = publicDrafts.map((draft) => ({ projectId: draft.projectId, draftRevision: draft.draftRevision }));
  const identity = ReviewIdentitySchema.parse({
    expectedPublicationRevision: current.revision,
    projects: pairs,
    siteDraftRevision: null,
    media,
    candidateSha256: computeReviewHash({ projects, siteDraftRevision: null, assetManifestRevision: current.assetManifestRevision, media }),
  });
  const canPublish = publicDrafts.length > 0 && checks.every((check) => check.status === "passed");
  const review = PrivateDraftReviewSchema.parse({ identity, drafts, checks, canPublish });
  return {
    ...review,
    projects,
    candidatePublication: { revision: current.revision + 1, publishedAt: new Date().toISOString(), projects, assetManifestRevision: current.assetManifestRevision },
  };
}

export async function generateDraftReview(actor: OwnerContext, transaction?: QueryableDb, requestedProjectId?: ProjectId): Promise<DraftReviewSummary> {
  if (transaction || isDraftTestRegistryEnabled()) return buildReview(actor, transaction, requestedProjectId);
  const db = await getPlatformDb();
  if (!db.transaction) throw new Error("Transactional database is required for private review.");
  return db.transaction(async (tx) => {
    await lockReviewRows(tx);
    return buildReview(actor, tx, requestedProjectId);
  });
}

export function sameReviewIdentity(left: unknown, right: ReviewIdentity): boolean {
  const parsed = ReviewIdentitySchema.safeParse(left);
  return parsed.success && canonicalJson(parsed.data) === canonicalJson(right);
}
