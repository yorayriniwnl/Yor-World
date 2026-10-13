/**
 * Owner-only review DTO and deterministic publication identity.
 * The publication and draft rows are read under the same transaction so the
 * review describes one durable state rather than a process-local snapshot.
 */

import { createHash } from "node:crypto";
import { z } from "zod";
import {
  ProjectIdSchema,
  type PublishedProject,
  type Publication,
  PublishedProjectSchema,
} from "@/contracts/content";
import { approvedPublication } from "@/content/approved-publication";
import type { OwnerContext } from "../auth/types";
import { getPlatformDb } from "../database";
import type { QueryableDb } from "../contact/quota";
import { getActivePublication, readPublicPublication } from "./publish";
import { isDraftTestRegistryEnabled, listProjectDrafts, readDurableDrafts, validateDraftContent,
  type DraftRecord } from "./revisions";
import { isAcceptedPlaceholder, readReviewedMedia, type ReviewedMedia } from "../media/manifest";

const projectPairSchema = z.strictObject({ projectId: ProjectIdSchema, draftRevision: z.number().int().nonnegative() });
const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() => z.union([
  z.null(), z.boolean(), z.number().finite(), z.string(), z.array(jsonValueSchema),
  z.record(z.string(), jsonValueSchema),
]));
const reviewMediaSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("asset"), mediaId: z.string().min(1), objectKey: z.string().min(1), sha256: z.string().regex(/^[a-f0-9]{64}$/),
    mime: z.string().min(1), bytes: z.number().int().nonnegative(), dimensions: jsonValueSchema, provenance: jsonValueSchema,
    approvalStatus: z.string().min(1), createdAt: z.iso.datetime({ offset: true }),
    approvalAudit: z.strictObject({ eventId: z.string().min(1), createdAt: z.iso.datetime({ offset: true }) }).nullable() }),
  z.strictObject({ kind: z.literal("accepted-placeholder"), mediaId: z.string().min(1) }),
  z.strictObject({ kind: z.literal("missing"), mediaId: z.string().min(1) }),
]);
export const ReviewIdentitySchema = z.strictObject({
  expectedPublicationRevision: z.number().int().positive(),
  projects: z.array(projectPairSchema),
  siteDraftRevision: z.null(),
  media: z.array(reviewMediaSchema),
  candidateSha256: z.string().regex(/^[a-f0-9]{64}$/),
}).superRefine((identity, context) => {
  const projectIds = identity.projects.map((item) => item.projectId);
  if (new Set(projectIds).size !== projectIds.length) {
    context.addIssue({ code: "custom", path: ["projects"], message: "Project review identities must be unique." });
  }
  if (projectIds.some((id, index) => index > 0 && compareCodePoint(projectIds[index - 1]!, id) >= 0)) {
    context.addIssue({ code: "custom", path: ["projects"], message: "Project review identities must be sorted by project ID." });
  }
  const mediaIds = identity.media.map((item) => item.mediaId);
  if (new Set(mediaIds).size !== mediaIds.length) {
    context.addIssue({ code: "custom", path: ["media"], message: "Reviewed media identities must be unique." });
  }
  if (mediaIds.some((id, index) => index > 0 && compareCodePoint(mediaIds[index - 1]!, id) >= 0)) {
    context.addIssue({ code: "custom", path: ["media"], message: "Reviewed media identities must be sorted by media ID." });
  }
});
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type ReviewIdentity = z.infer<typeof ReviewIdentitySchema>;
export type ReviewCheck = {
  scope: "project" | "site";
  id: string;
  kind: "schema" | "evidence-records" | "https-links" | "approved-media" | "publication-rules";
  status: "passed" | "failed";
  checkedAt: string;
  reasons: string[];
};
const reviewCheckSchema = z.strictObject({
  scope: z.enum(["project", "site"]),
  id: z.string().min(1),
  kind: z.enum(["schema", "evidence-records", "https-links", "approved-media", "publication-rules"]),
  status: z.enum(["passed", "failed"]),
  checkedAt: z.iso.datetime({ offset: true }),
  reasons: z.array(z.string().trim().min(1)),
}).superRefine((check, context) => {
  if (check.status === "failed" && check.reasons.length === 0) {
    context.addIssue({ code: "custom", path: ["reasons"], message: "A failed check must include at least one reason." });
  }
  if (check.status === "passed" && check.reasons.length !== 0) {
    context.addIssue({ code: "custom", path: ["reasons"], message: "A passed check cannot include failure reasons." });
  }
});
const draftRecordSchema = z.strictObject({
  projectId: ProjectIdSchema,
  draftRevision: z.number().int().nonnegative(),
  project: PublishedProjectSchema,
  updatedAt: z.iso.datetime({ offset: true }),
  updatedBy: z.union([z.literal("system-seed"), z.literal("accepted-static-baseline"), z.uuid()]),
}).superRefine((draft, context) => {
  if (draft.project.id !== draft.projectId) {
    context.addIssue({ code: "custom", path: ["project", "id"], message: "Draft project ID must match its record ID." });
  }
  const initialPrivateCandidate = draft.projectId === "candidatex" && draft.draftRevision === 0 && draft.project.revision === 1;
  if (draft.project.revision !== draft.draftRevision && !initialPrivateCandidate) {
    context.addIssue({ code: "custom", path: ["project", "revision"], message: "Draft content revision must match its record revision." });
  }
});
export const PrivateDraftReviewSchema = z.strictObject({
  identity: ReviewIdentitySchema,
  drafts: z.array(draftRecordSchema),
  checks: z.array(reviewCheckSchema),
  previewProjectId: ProjectIdSchema.nullable(),
  canPublish: z.boolean(),
}).superRefine((review, context) => {
  const draftById = new Map<string, DraftRecord>();
  for (const [index, draft] of review.drafts.entries()) {
    if (draftById.has(draft.projectId)) {
      context.addIssue({ code: "custom", path: ["drafts", index, "projectId"], message: "Draft project IDs must be unique." });
    }
    draftById.set(draft.projectId, draft);
  }

  const publicDrafts = review.drafts.filter((draft) => draft.projectId !== "candidatex")
    .map(({ projectId, draftRevision }) => ({ projectId, draftRevision }))
    .sort((left, right) => compareCodePoint(left.projectId, right.projectId));
  if (canonicalJson(review.identity.projects) !== canonicalJson(publicDrafts)) {
    context.addIssue({ code: "custom", path: ["identity", "projects"], message: "Review identity must match all and only the current publishable draft revisions." });
  }
  if (review.previewProjectId && !draftById.has(review.previewProjectId)) {
    context.addIssue({ code: "custom", path: ["previewProjectId"], message: "Preview project must identify a returned draft." });
  }

  const checkKeys = new Set<string>();
  for (const [index, check] of review.checks.entries()) {
    const key = `${check.scope}\u0000${check.id}\u0000${check.kind}`;
    if (checkKeys.has(key)) {
      context.addIssue({ code: "custom", path: ["checks", index], message: "Review check identities must be unique." });
    }
    checkKeys.add(key);
    if (check.scope === "project" && (!draftById.has(check.id) || check.id === "candidatex")) {
      context.addIssue({ code: "custom", path: ["checks", index, "id"], message: "Project checks must identify a publishable draft." });
    }
    if (check.scope === "site" && check.id !== "publication") {
      context.addIssue({ code: "custom", path: ["checks", index, "id"], message: "A1 site-scope checks use the publication identity." });
    }
  }

  const expectedCheckKeys = publicDrafts.length
    ? publicDrafts.flatMap(({ projectId }) => ["schema", "evidence-records", "https-links", "approved-media", "publication-rules"]
      .map((kind) => `project\u0000${projectId}\u0000${kind}`))
    : ["site\u0000publication\u0000publication-rules"];
  if (expectedCheckKeys.length !== checkKeys.size || expectedCheckKeys.some((key) => !checkKeys.has(key))) {
    context.addIssue({ code: "custom", path: ["checks"], message: "The review must contain the complete unique check set for the candidate." });
  }

  const checksPassed = review.checks.length > 0 && review.checks.every((check) => check.status === "passed");
  const shouldPublish = checksPassed && review.previewProjectId !== "candidatex";
  if (review.canPublish !== shouldPublish) {
    context.addIssue({ code: "custom", path: ["canPublish"], message: "canPublish must match the executed review and private CandidateX restriction." });
  }
});

export type DraftReviewSummary = {
  identity: ReviewIdentity;
  drafts: Awaited<ReturnType<typeof listProjectDrafts>>;
  checks: ReviewCheck[];
  canPublish: boolean;
  /** Candidate projects are an internal rendering aid and are not part of the review identity DTO. */
  projects: PublishedProject[];
  candidatePublication: Publication;
};

function compareCodePoint(left: string, right: string): number {
  let leftOffset = 0;
  let rightOffset = 0;
  while (leftOffset < left.length && rightOffset < right.length) {
    const leftPoint = left.codePointAt(leftOffset)!;
    const rightPoint = right.codePointAt(rightOffset)!;
    if (leftPoint !== rightPoint) return leftPoint - rightPoint;
    leftOffset += leftPoint > 0xffff ? 2 : 1;
    rightOffset += rightPoint > 0xffff ? 2 : 1;
  }
  if (leftOffset === left.length && rightOffset === right.length) return 0;
  return leftOffset === left.length ? -1 : 1;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort(compareCodePoint).map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(",")}}`;
}

/** Hashes only the accepted A1 preimage. Review timestamps and publication times are excluded. */
export function computeReviewHash(input: {
  projects: PublishedProject[];
  siteDraftRevision: null;
  assetManifestRevision: string;
  media: ReviewedMedia[];
}): string {
  const preimage = {
    // Bind full public project documents. The revision vector is checked
    // separately at publish; it cannot stand in for the content preimage.
    projects: input.projects.filter((project) => project.id !== "candidatex")
      .slice().sort((a, b) => compareCodePoint(a.id, b.id)),
    siteDraftRevision: null,
    site: null,
    assetManifestRevision: input.assetManifestRevision,
    media: [...input.media].sort((a, b) => compareCodePoint(a.mediaId, b.mediaId)),
  };
  return createHash("sha256").update(canonicalJson(preimage), "utf8").digest("hex");
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort(compareCodePoint);
}

function mediaReferences(projects: PublishedProject[]): { ids: string[]; placeholders: Set<string> } {
  const ids = new Set<string>();
  const placeholders = new Set<string>();
  const ordinary = new Set<string>();
  for (const project of projects) for (const [sectionIndex, section] of project.sections.entries()) {
    for (const [blockIndex, block] of section.blocks.entries()) {
      if (block.type !== "image") continue;
      ids.add(block.mediaId);
      if (isAcceptedPlaceholder(project.id, sectionIndex, blockIndex, block)) placeholders.add(block.mediaId);
      else ordinary.add(block.mediaId);
    }
  }
  for (const id of ordinary) placeholders.delete(id);
  return { ids: [...ids].sort(compareCodePoint), placeholders };
}

function pushCheck(checks: ReviewCheck[], scope: "project" | "site", id: string,
  kind: ReviewCheck["kind"], reasons: string[]): void {
  checks.push({ scope, id, kind, status: reasons.length === 0 ? "passed" : "failed", checkedAt: new Date().toISOString(), reasons });
}

async function lockReviewRows(tx: QueryableDb): Promise<void> {
  await tx.query("SELECT pg_advisory_xact_lock(hashtext('yor-publication'))");
  // Use the same publication -> project lock order as publish. Save uses one of
  // these project locks and cannot move a pointer while the review is assembled.
  const ids = ["ai-vs-real", "candidatex", "helios", "talks", "zenith"];
  for (const id of ids) await tx.query("SELECT pg_advisory_xact_lock(hashtext('yor-draft-' || $1))", [id]);
  await tx.query("SELECT id FROM public.projects WHERE archived_at IS NULL ORDER BY slug COLLATE \"C\" FOR SHARE");
}

async function buildReview(actor: OwnerContext, tx?: QueryableDb): Promise<DraftReviewSummary> {
  const current = tx ? await readPublicPublicationForReview(tx) : await readPublicPublication() ?? getActivePublication();
  const drafts = tx ? await readDurableDrafts(tx) : await listProjectDrafts(actor);
  const projects = drafts.filter((draft) => draft.projectId !== "candidatex").map((draft) => draft.project)
    .sort((a, b) => compareCodePoint(a.id, b.id));
  const projectPairs = drafts.filter((draft) => draft.projectId !== "candidatex")
    .map((draft) => ({ projectId: draft.projectId, draftRevision: draft.draftRevision }))
    .sort((a, b) => compareCodePoint(a.projectId, b.projectId));
  const references = mediaReferences(projects);
  const placeholders = references.placeholders;
  const ids = references.ids;
  const ordinaryIds = ids.filter((id) => !placeholders.has(id));
  const mediaResult = await readReviewedMedia(ordinaryIds, tx);
  const mediaById = new Map(mediaResult.items.map((item) => [item.mediaId, item]));
  const media: ReviewedMedia[] = ids.map((id) => placeholders.has(id)
    ? { kind: "accepted-placeholder", mediaId: id }
    : mediaById.get(id) ?? { kind: "missing", mediaId: id });

  const checks: ReviewCheck[] = [];
  const slugOwners = new Map<string, string>();
  const idOwners = new Map<string, string>();
  for (const project of projects) {
    const schema = PublishedProjectSchema.safeParse(project);
    const schemaReasons = schema.success ? [] : schema.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    pushCheck(checks, "project", project.id, "schema", schemaReasons);

    const evidenceReasons: string[] = [];
    if (!project.evidence.some((item) => item.status === "verified")) evidenceReasons.push("At least one verified evidence record is required.");
    for (const item of project.evidence) {
      if (item.status === "unknown") evidenceReasons.push(`Evidence ${item.id} is unknown.`);
      if (item.status === "verified" && (!item.note.trim() || !item.checkedAt)) evidenceReasons.push(`Verified evidence ${item.id} needs a note and checked time.`);
    }
    pushCheck(checks, "project", project.id, "evidence-records", evidenceReasons);

    const linkReasons: string[] = [];
    for (const link of project.links) {
      if (!link.label.trim()) linkReasons.push("A link label is empty.");
      try { if (new URL(link.url).protocol !== "https:") linkReasons.push(`Link ${link.label || link.url} is not HTTPS.`); }
      catch { linkReasons.push(`Link ${link.label || link.url} is malformed.`); }
    }
    for (const evidence of project.evidence) if (evidence.url) {
      try { if (new URL(evidence.url).protocol !== "https:") linkReasons.push(`Evidence ${evidence.id} is not HTTPS.`); }
      catch { linkReasons.push(`Evidence ${evidence.id} has a malformed URL.`); }
    }
    pushCheck(checks, "project", project.id, "https-links", linkReasons);

    const mediaReasons: string[] = [];
    const projectReferences = mediaReferences([project]);
    for (const id of projectReferences.ids) {
      if (projectReferences.placeholders.has(id)) continue;
      const item = mediaById.get(id);
      const storageReasons = mediaResult.issues.get(id) ?? [];
      if (!item || item.kind === "missing") mediaReasons.push(`Media ${id} is missing.`);
      else {
        if (item.kind === "asset" && item.approvalStatus !== "approved") mediaReasons.push(`Media ${id} is not approved.`);
        if (item.kind === "asset" && !item.approvalAudit) mediaReasons.push(`Media ${id} has no approval audit event.`);
        mediaReasons.push(...storageReasons);
      }
    }
    pushCheck(checks, "project", project.id, "approved-media", uniqueSorted(mediaReasons));

    const ruleReasons: string[] = [];
    if (slugOwners.has(project.slug)) ruleReasons.push(`Slug ${project.slug} is duplicated by ${slugOwners.get(project.slug)}.`);
    else slugOwners.set(project.slug, project.id);
    if (idOwners.has(project.id)) ruleReasons.push(`Project ID ${project.id} is duplicated.`);
    else idOwners.set(project.id, project.id);
    try { validateDraftContent(project); } catch (error) { ruleReasons.push(error instanceof Error ? error.message : "Project content rules failed."); }
    pushCheck(checks, "project", project.id, "publication-rules", uniqueSorted(ruleReasons));
  }
  if (projects.length === 0) pushCheck(checks, "site", "publication", "publication-rules", ["At least one public project is required."]);

  const identityWithoutHash = {
    expectedPublicationRevision: current.revision,
    projects: projectPairs,
    siteDraftRevision: null as null,
    media,
  };
  const identity: ReviewIdentity = {
    ...identityWithoutHash,
    candidateSha256: computeReviewHash({ projects, siteDraftRevision: null,
      assetManifestRevision: current.assetManifestRevision, media }),
  };
  return {
    identity,
    drafts,
    checks,
    canPublish: checks.every((check) => check.status === "passed"),
    projects,
    candidatePublication: { revision: current.revision + 1, publishedAt: new Date().toISOString(), projects,
      assetManifestRevision: current.assetManifestRevision },
  };
}

async function readPublicPublicationForReview(tx: QueryableDb): Promise<Publication> {
  const rows = await tx.query("SELECT payload FROM public.published_content ORDER BY revision DESC,published_at DESC LIMIT 1");
  if (!rows.rows[0]) return approvedPublication;
  const { PublicationSchema } = await import("@/contracts/content");
  return PublicationSchema.parse(rows.rows[0]["payload"]);
}

export async function generateDraftReview(actor: OwnerContext, transaction?: QueryableDb): Promise<DraftReviewSummary> {
  if (transaction || isDraftTestRegistryEnabled()) return buildReview(actor, transaction);
  const db = await getPlatformDb();
  if (!db.transaction) throw new Error("Transactional database is required for draft review.");
  return db.transaction(async (tx) => {
    await lockReviewRows(tx);
    return buildReview(actor, tx);
  });
}

export function sameReviewIdentity(left: unknown, right: ReviewIdentity): boolean {
  const parsed = ReviewIdentitySchema.safeParse(left);
  return parsed.success && canonicalJson(parsed.data) === canonicalJson(right);
}
