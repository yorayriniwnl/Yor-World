/**
 * YOR WORLD Milestone A4: Transactional Publishing, Rollback & Cache Refresh
 *
 * Implements authoritative publication transactions, optimistic concurrency,
 * media/evidence validation, immutable history, rollback with asset verification,
 * and resilient cache refresh handling.
 */

import {
  type ProjectId,
  type Publication,
  type PublishedProject,
  PublicationSchema,
} from "@/contracts/content";
import type { OwnerContext } from "../auth/types";
import { approvedPublication } from "@/content/approved-publication";
import { setActivePublicationSnapshot } from "@/content/publication-reader";
import {
  isDraftTestRegistryEnabled,
  RevisionConflictError,
  ContentValidationError,
} from "./revisions";
import { verifyPublicationAssets } from "../media/manifest";
import { getPlatformDb, hasPlatformDatabase } from "../database";
import type { QueryableDb } from "../contact/quota";

export interface PublicationHistoryEntry {
  revision: number;
  snapshot: Publication;
  actor: string;
  publishedAt: string;
  action: "publish" | "rollback";
  targetRevision?: number;
  reason?: string;
}

// In-memory publication history registry
let publicationHistory: PublicationHistoryEntry[] = [
  {
    revision: 1,
    snapshot: approvedPublication,
    actor: "system-seed",
    publishedAt: "2026-10-01T12:00:00Z",
    action: "publish",
  },
];

let activePublication: Publication = approvedPublication;

// Simulation hook for cache refresh failure testing
let simulateCacheRefreshFailure = false;

export function setSimulateCacheRefreshFailure(fail: boolean) {
  simulateCacheRefreshFailure = fail;
}

export function getActivePublication(): Publication {
  return activePublication;
}

export function setActivePublication(pub: Publication) {
  activePublication = pub;
  setActivePublicationSnapshot(pub);
}

export function getPublicationHistoryList(): PublicationHistoryEntry[] {
  return [...publicationHistory];
}

export function resetPublicationState() {
  publicationHistory = [
    {
      revision: 1,
      snapshot: approvedPublication,
      actor: "system-seed",
      publishedAt: "2026-10-01T12:00:00Z",
      action: "publish",
    },
  ];
  activePublication = approvedPublication;
  setActivePublicationSnapshot(approvedPublication);
  simulateCacheRefreshFailure = false;
}

/**
 * Validates complete publication content integrity:
 * - Structural schema checks
 * - Safe HTTPS links
 * - Verified evidence (no unknown claims)
 * - Approved media assets
 */
export async function validatePublicationContent(publication: Publication, transaction?: QueryableDb): Promise<void> {
  const parsed = PublicationSchema.safeParse(publication);
  if (!parsed.success) {
    throw new ContentValidationError(
      `Publication schema invalid: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")}`
    );
  }

  const seenSlugs = new Set<string>();
  const seenIds = new Set<string>();

  for (const project of publication.projects) {
    if (seenSlugs.has(project.slug)) {
      throw new ContentValidationError(`Duplicate project slug '${project.slug}' in publication snapshot`);
    }
    seenSlugs.add(project.slug);

    if (seenIds.has(project.id)) {
      throw new ContentValidationError(`Duplicate project ID '${project.id}' in publication snapshot`);
    }
    seenIds.add(project.id);

    // Rule: Every published project must have verified evidence
    const verifiedEvidence = project.evidence.filter((e) => e.status === "verified");
    if (verifiedEvidence.length === 0) {
      throw new ContentValidationError(
        `Project '${project.slug}' has no verified evidence. Projects cannot be published without verifiable evidence.`
      );
    }

    // Rule: Rejection of unsupported claims
    for (const ev of project.evidence) {
      if (ev.status === "unknown") {
        throw new ContentValidationError(
          `Project '${project.slug}' contains unverified claim '${ev.id}' with status 'unknown'. Unsupported claims cannot enter public publication.`
        );
      }
      if (!ev.note || ev.note.trim().length === 0) {
        throw new ContentValidationError(
          `Project '${project.slug}' evidence '${ev.id}' is missing descriptive verification note.`
        );
      }
      if (ev.url) {
        try {
          const url = new URL(ev.url);
          if (url.protocol !== "https:") {
            throw new ContentValidationError(
              `Project '${project.slug}' evidence '${ev.id}' has insecure URL '${ev.url}'. Only https:// is permitted.`
            );
          }
        } catch (err) {
          if (err instanceof ContentValidationError) throw err;
          throw new ContentValidationError(`Project '${project.slug}' evidence '${ev.id}' has malformed URL '${ev.url}'.`);
        }
      }
    }

    // Rule: Safe external links
    for (const link of project.links) {
      try {
        const url = new URL(link.url);
        if (url.protocol !== "https:") {
          throw new ContentValidationError(
            `Project '${project.slug}' link '${link.label}' has insecure URL '${link.url}'. Only https:// is permitted.`
          );
        }
      } catch (err) {
        if (err instanceof ContentValidationError) throw err;
        throw new ContentValidationError(`Project '${project.slug}' link has malformed URL '${link.url}'.`);
      }
    }

    // Rule: Content sections & blocks
    const sectionIds = new Set<string>();
    for (const section of project.sections) {
      if (sectionIds.has(section.id)) {
        throw new ContentValidationError(`Project '${project.slug}' has duplicate section ID '${section.id}'.`);
      }
      sectionIds.add(section.id);
      if (!section.heading || section.heading.trim().length === 0) {
        throw new ContentValidationError(`Project '${project.slug}' section '${section.id}' has empty heading.`);
      }
      if (section.blocks.length === 0) {
        throw new ContentValidationError(`Project '${project.slug}' section '${section.id}' has no content blocks.`);
      }
      if (section.blocks.some((block) => block.type === "list" && block.items.length === 0)) {
        throw new ContentValidationError(`Project '${project.slug}' section '${section.id}' contains an empty list.`);
      }
    }
  }

  // Rule: Check that all media assets referenced in sections are approved!
  await verifyPublicationAssets(publication, transaction);
}

/**
 * Simulates or handles cache refresh across public edge / ISR / in-memory layer.
 */
async function handleCacheRefresh(publication: Publication): Promise<{ refreshed: boolean; error?: string }> {
  if (simulateCacheRefreshFailure) {
    return {
      refreshed: false,
      error: "Simulated cache-refresh service timeout",
    };
  }

  try {
    setActivePublicationSnapshot(publication);
    return { refreshed: true };
  } catch (err) {
    return {
      refreshed: false,
      error: err instanceof Error ? err.message : "Cache refresh failed",
    };
  }
}

/**
 * Publishes a new revision of the portfolio publication snapshot.
 *
 * Enforces:
 * - Optimistic concurrency: stale expectedRevision -> 409
 * - Content and media validation -> 422
 * - Transactional history and snapshot recording
 * - Resilient cache refresh
 */
export async function publishRevision(
  input: { expectedRevision: number; review: unknown; projectId?: ProjectId; customProjects?: PublishedProject[] },
  actor: OwnerContext,
): Promise<Publication & { cacheRefreshed?: boolean; cacheRefreshWarning?: string }> {
  if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 1) throw new ContentValidationError("A safe expected publication revision is required.");
  const { ReviewIdentitySchema, generateDraftReview, sameReviewIdentity } = await import("./preview");
  const parsedReview = ReviewIdentitySchema.safeParse(input.review);
  if (!parsedReview.success) throw new ContentValidationError("A complete review identity is required before publishing.");
  if (parsedReview.data.expectedPublicationRevision !== input.expectedRevision) throw new ContentValidationError("expectedRevision must match the reviewed publication revision.");

  if (!isDraftTestRegistryEnabled()) return publishDurable({ ...input, review: parsedReview.data }, actor);
  if (activePublication.revision !== input.expectedRevision) throw new RevisionConflictError("Publication changed. Refresh and review again before publishing.");

  const summary = await generateDraftReview(actor);
  if (!sameReviewIdentity(parsedReview.data, summary.identity)) throw new RevisionConflictError("The reviewed candidate changed. Refresh and review again before publishing.");
  if (!summary.canPublish) throw new ContentValidationError("The current review contains failed checks and cannot be published.");
  if (input.customProjects && JSON.stringify(input.customProjects) !== JSON.stringify(summary.projects)) throw new ContentValidationError("A custom project list cannot replace the reviewed draft candidate.");

  const nextPublication: Publication = {
    revision: activePublication.revision + 1,
    publishedAt: new Date().toISOString(),
    projects: summary.projects,
    assetManifestRevision: activePublication.assetManifestRevision,
  };
  await validatePublicationContent(nextPublication);
  publicationHistory.push({ revision: nextPublication.revision, snapshot: nextPublication, actor: actor.userId, publishedAt: nextPublication.publishedAt, action: "publish" });
  activePublication = nextPublication;
  const cacheResult = await handleCacheRefresh(nextPublication);
  return { ...nextPublication, cacheRefreshed: cacheResult.refreshed, ...(cacheResult.error ? { cacheRefreshWarning: cacheResult.error } : {}) };
}
/**
 * Rolls back publication to a previously approved publication snapshot.
 *
 * Enforces:
 * - Target revision exists in publication history -> 422 / 404
 * - Referenced assets are verified to still exist and be approved -> 422
 * - Restores snapshot as a NEW incremented revision
 * - Records rollback in publication history and audit log
 */
export async function rollbackPublication(
  input: { targetRevision: number; expectedRevision: number; reason: string },
  actor: OwnerContext,
): Promise<Publication & { cacheRefreshed?: boolean; cacheRefreshWarning?: string }> {
  const reason = input.reason.trim();
  if (!Number.isSafeInteger(input.targetRevision) || input.targetRevision < 1 || !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 1 || !reason || reason.length > 1000) {
    throw new ContentValidationError("Rollback requires a safe target/current revision and a reason of 1 to 1000 characters.");
  }
  if (!isDraftTestRegistryEnabled()) return rollbackDurable({ ...input, reason }, actor);
  if (activePublication.revision !== input.expectedRevision) throw new RevisionConflictError("Publication changed. Refresh before rollback.");
  const targetEntry = publicationHistory.find((entry) => entry.revision === input.targetRevision);
  if (!targetEntry) throw new ContentValidationError(`Rollback target revision ${input.targetRevision} does not exist.`);
  await verifyPublicationAssets(targetEntry.snapshot);
  const restored: Publication = { ...targetEntry.snapshot, revision: activePublication.revision + 1, publishedAt: new Date().toISOString() };
  publicationHistory.push({ revision: restored.revision, snapshot: restored, actor: actor.userId, publishedAt: restored.publishedAt, action: "rollback", targetRevision: input.targetRevision, reason });
  activePublication = restored;
  const cacheResult = await handleCacheRefresh(restored);
  return { ...restored, cacheRefreshed: cacheResult.refreshed, ...(cacheResult.error ? { cacheRefreshWarning: cacheResult.error } : {}) };
}
/** Public reader accesses only approved published_content, never drafts or private media. */
export async function readPublicPublication(): Promise<Publication | null> {
  if (isDraftTestRegistryEnabled()) return activePublication;
  if (!hasPlatformDatabase()) return null;
  const db = await getPlatformDb();
  return readDurablePublication(db);
}

async function readDurablePublication(db: QueryableDb): Promise<Publication> {
  const rows = await db.query("SELECT payload FROM public.published_content ORDER BY revision DESC,published_at DESC LIMIT 1");
  return rows.rows[0] ? PublicationSchema.parse(rows.rows[0]["payload"]) : approvedPublication;
}

export async function readPublicationHistory(): Promise<PublicationHistoryEntry[]> {
  if (isDraftTestRegistryEnabled()) return getPublicationHistoryList();
  const db = await getPlatformDb();
  const result = await db.query(`SELECT h.revision,h.snapshot,h.actor,h.created_at,
    a.action,a.payload AS audit_payload FROM public.publication_history h
    LEFT JOIN public.audit_events a ON a.entity_type='publication' AND a.entity_id=h.revision::text
    AND a.action IN ('publication_published','publication_rollback') ORDER BY h.revision`);
  if (!result.rows.length) return [{ revision: approvedPublication.revision, snapshot: approvedPublication, actor: "accepted-static-baseline", publishedAt: approvedPublication.publishedAt, action: "publish" }];
  return result.rows.map((row) => {
    const action = row["action"] === "publication_rollback" ? "rollback" : "publish";
    let payload: Record<string, unknown> = {};
    try {
      const raw = row["audit_payload"];
      payload = (typeof raw === "string" ? JSON.parse(raw) : raw) as Record<string, unknown>;
    } catch { payload = {}; }
    return {
      revision: Number(row["revision"]), snapshot: PublicationSchema.parse(row["snapshot"]),
      actor: String(row["actor"]), publishedAt: new Date(String(row["created_at"])).toISOString(), action,
      ...(action === "rollback" ? {
        targetRevision: Number(payload["targetRevision"]),
        ...(typeof payload["reason"] === "string" ? { reason: payload["reason"] } : {}),
      } : {}),
    };
  });
}
async function writeSnapshot(tx: QueryableDb, publication: Publication, actor: OwnerContext, targetRevision?: number, reason?: string) {
  // Record the accepted baseline once so the first deployment has a rollback target.
  const baseline = await tx.query("SELECT revision FROM public.publication_history WHERE revision=$1 LIMIT 1", [approvedPublication.revision]);
  if (!baseline.rows.length) await tx.query("INSERT INTO public.publication_history(revision,snapshot,actor) VALUES($1,$2,$3)", [approvedPublication.revision,JSON.stringify(approvedPublication),actor.userId]);
  await tx.query("INSERT INTO public.publication_history(revision,snapshot,actor) VALUES($1,$2,$3)", [publication.revision,JSON.stringify(publication),actor.userId]);
  await tx.query("INSERT INTO public.published_content(revision,payload) VALUES($1,$2)", [publication.revision,JSON.stringify(publication)]);
  await tx.query("INSERT INTO public.audit_events(actor,action,entity_type,entity_id,payload) VALUES($1,$2,'publication',$3,$4)",
    [actor.userId,targetRevision === undefined ? "publication_published" : "publication_rollback",String(publication.revision),JSON.stringify({ revision: publication.revision,...(targetRevision === undefined ? {} : { targetRevision, reason }) })]);
}

async function publishDurable(input: { expectedRevision: number; review: unknown; projectId?: ProjectId; customProjects?: PublishedProject[] }, actor: OwnerContext) {
  const db = await getPlatformDb();
  if (!db.transaction) throw new Error("Transactional database is required.");
  const { generateDraftReview, lockReviewRows, sameReviewIdentity } = await import("./preview");
  const publication = await db.transaction(async (tx) => {
    await lockReviewRows(tx);
    const current = await readDurablePublication(tx);
    if (current.revision !== input.expectedRevision) throw new RevisionConflictError("Publication changed. Refresh and review again before publishing.");
    const summary = await generateDraftReview(actor, tx);
    if (!sameReviewIdentity(input.review, summary.identity)) throw new RevisionConflictError("The reviewed candidate changed. Refresh and review again before publishing.");
    if (!summary.canPublish) throw new ContentValidationError("The current review contains failed checks and cannot be published.");
    if (input.customProjects && JSON.stringify(input.customProjects) !== JSON.stringify(summary.projects)) throw new ContentValidationError("A custom project list cannot replace the reviewed draft candidate.");
    if (summary.projects.some((project) => project.id === "candidatex")) throw new ContentValidationError("CandidateX has no accepted public content decision.");
    const next: Publication = { revision: current.revision + 1, publishedAt: new Date().toISOString(), projects: summary.projects, assetManifestRevision: current.assetManifestRevision };
    await validatePublicationContent(next, tx);
    await writeSnapshot(tx, next, actor);
    return next;
  });
  const refreshed = await handleCacheRefresh(publication);
  return { ...publication, cacheRefreshed: refreshed.refreshed, ...(refreshed.error ? { cacheRefreshWarning: refreshed.error } : {}) };
}

async function rollbackDurable(input: { targetRevision: number; expectedRevision: number; reason: string }, actor: OwnerContext) {
  const db = await getPlatformDb();
  if (!db.transaction) throw new Error("Transactional database is required.");
  const publication = await db.transaction(async (tx) => {
    await tx.query("SELECT pg_advisory_xact_lock(hashtext('yor-publication'))");
    const current = await readDurablePublication(tx);
    if (current.revision !== input.expectedRevision) throw new RevisionConflictError("Publication changed. Refresh before rollback.");
    const rows = await tx.query("SELECT snapshot FROM public.publication_history WHERE revision=$1 ORDER BY created_at DESC LIMIT 1", [input.targetRevision]);
    const target = rows.rows[0] ? PublicationSchema.parse(rows.rows[0]["snapshot"]) : input.targetRevision === approvedPublication.revision ? approvedPublication : null;
    if (!target) throw new ContentValidationError("Rollback target does not exist.");
    await validatePublicationContent(target, tx);
    const next = { ...target, revision: current.revision + 1, publishedAt: new Date().toISOString() };
    await writeSnapshot(tx, next, actor, input.targetRevision, input.reason);
    return next;
  });
  const refreshed = await handleCacheRefresh(publication);
  return { ...publication, cacheRefreshed: refreshed.refreshed, ...(refreshed.error ? { cacheRefreshWarning: refreshed.error } : {}) };
}
