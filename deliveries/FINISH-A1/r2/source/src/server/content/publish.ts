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
  getTestDraftRegistry,
  isDraftTestRegistryEnabled,
  readDurableDrafts,
  RevisionConflictError,
  ContentValidationError,
} from "./revisions";
import { verifyPublicationAssets } from "../media/manifest";
import { getPlatformDb, hasPlatformDatabase } from "../database";
import type { QueryableDb } from "../contact/quota";
import {
  computeReviewHash,
  fetchMediaReviewItems,
} from "./preview";

export interface PublicationHistoryEntry {
  revision: number;
  snapshot: Publication;
  actor: string;
  publishedAt: string;
  action: "publish" | "rollback";
  targetRevision?: number;
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
    for (const section of project.sections) {
      if (!section.heading || section.heading.trim().length === 0) {
        throw new ContentValidationError(`Project '${project.slug}' section '${section.id}' has empty heading.`);
      }
      if (section.blocks.length === 0) {
        throw new ContentValidationError(`Project '${project.slug}' section '${section.id}' has no content blocks.`);
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
export interface PublishInput {
  projectId?: ProjectId;
  expectedRevision: number;
  customProjects?: PublishedProject[];
  review?: {
    candidateSha256: string;
    draftRevisions?: Record<string, number>;
  };
}

export async function publishRevision(
  input: PublishInput,
  actor: OwnerContext
): Promise<Publication & { cacheRefreshed?: boolean; cacheRefreshWarning?: string }> {
  if (!isDraftTestRegistryEnabled()) return publishDurable(input, actor);
  const currentRevision = activePublication.revision;

  // 1. Optimistic concurrency check
  if (currentRevision !== input.expectedRevision) {
    throw new RevisionConflictError(
      `Stale revision conflict: expected publication revision ${input.expectedRevision}, but current publication is revision ${currentRevision}. Refresh before publishing.`
    );
  }

  // 2. Prepare projects to publish
  let projectsToPublish: PublishedProject[];
  const draftRegistry = getTestDraftRegistry();

  if (input.customProjects) {
    projectsToPublish = input.customProjects;
  } else {
    // Collect active drafts from draft registry
    projectsToPublish = [];

    // Include all approved projects from drafts, excluding unpublished candidatex
    for (const [id, draft] of draftRegistry.entries()) {
      if (id === "candidatex") {
        continue;
      }
      projectsToPublish.push(draft.project);
    }
  }

  // 2.5. Stale draft review / identity verification closing CA-02 & PLAT-R2-01
  if (input.review) {
    if (input.review.draftRevisions) {
      for (const [pId, expectedDraftRev] of Object.entries(input.review.draftRevisions)) {
        const draftRec = draftRegistry.get(pId as ProjectId);
        const actualRev = draftRec ? draftRec.draftRevision : undefined;
        if (actualRev !== undefined && actualRev !== expectedDraftRev) {
          throw new RevisionConflictError(
            `Stale draft revision conflict: project '${pId}' is at revision ${actualRev}, but review expected ${expectedDraftRev}. Re-review before publishing.`
          );
        }
      }
    }

    const referencedMediaIds: string[] = [];
    for (const proj of projectsToPublish) {
      for (const section of proj.sections) {
        for (const block of section.blocks) {
          if (block.type === "image" && block.mediaId && !block.mediaId.startsWith("missing-")) {
            referencedMediaIds.push(block.mediaId);
          }
        }
      }
    }
    const mediaItems = await fetchMediaReviewItems(referencedMediaIds);
    const projectReviewItems = projectsToPublish.map((p) => {
      const rec = draftRegistry.get(p.id as ProjectId);
      return {
        projectId: p.id as ProjectId,
        draftRevision: rec ? rec.draftRevision : p.revision,
      };
    });

    const computedSha = computeReviewHash(
      input.expectedRevision,
      projectReviewItems,
      mediaItems,
      projectsToPublish
    );

    if (computedSha !== input.review.candidateSha256) {
      throw new RevisionConflictError(
        `Stale review hash conflict: candidate content or referenced media has changed since review was generated. Re-review before publishing.`
      );
    }
  }

  const nextRevision = currentRevision + 1;
  const now = new Date().toISOString();

  const nextPublication: Publication = {
    revision: nextRevision,
    publishedAt: now,
    projects: projectsToPublish,
    assetManifestRevision: `manifest-${now.slice(0, 10).replace(/-/g, "")}-r${nextRevision}`,
  };

  // 3. Validation gate: structural, links, evidence, and media approval (throws 422 if invalid)
  await validatePublicationContent(nextPublication);

  // 4. Record history & active snapshot (durable transaction)
  const historyEntry: PublicationHistoryEntry = {
    revision: nextRevision,
    snapshot: nextPublication,
    actor: actor.userId,
    publishedAt: now,
    action: "publish",
  };
  publicationHistory.push(historyEntry);
  activePublication = nextPublication;

  // 5. Cache-refresh handling (failure preserves durable DB revision)
  const cacheResult = await handleCacheRefresh(nextPublication);

  return {
    ...nextPublication,
    cacheRefreshed: cacheResult.refreshed,
    ...(cacheResult.error ? { cacheRefreshWarning: cacheResult.error } : {}),
  };
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
  targetRevision: number,
  actor: OwnerContext
): Promise<Publication & { cacheRefreshed?: boolean; cacheRefreshWarning?: string }> {
  if (!isDraftTestRegistryEnabled()) return rollbackDurable(targetRevision, actor);
  // 1. Locate target revision in history
  const targetEntry = publicationHistory.find((entry) => entry.revision === targetRevision);
  if (!targetEntry) {
    throw new ContentValidationError(
      `Rollback rejected: target publication revision ${targetRevision} does not exist in publication history`
    );
  }

  const targetSnapshot = targetEntry.snapshot;

  // 2. Verify that all referenced assets in target snapshot are STILL available and approved
  await verifyPublicationAssets(targetSnapshot);

  // 3. Publish rollback as a NEW revision
  const newRevision = activePublication.revision + 1;
  const now = new Date().toISOString();

  const restoredPublication: Publication = {
    ...targetSnapshot,
    revision: newRevision,
    publishedAt: now,
  };

  const rollbackEntry: PublicationHistoryEntry = {
    revision: newRevision,
    snapshot: restoredPublication,
    actor: actor.userId,
    publishedAt: now,
    action: "rollback",
    targetRevision,
  };
  publicationHistory.push(rollbackEntry);
  activePublication = restoredPublication;

  // 4. Cache refresh
  const cacheResult = await handleCacheRefresh(restoredPublication);

  return {
    ...restoredPublication,
    cacheRefreshed: cacheResult.refreshed,
    ...(cacheResult.error ? { cacheRefreshWarning: cacheResult.error } : {}),
  };
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
  if (!result.rows.length) return [{ revision: approvedPublication.revision,snapshot: approvedPublication,
    actor: "accepted-static-baseline",publishedAt: approvedPublication.publishedAt,action: "publish" }];
  return result.rows.map((row) => ({ revision: Number(row["revision"]), snapshot: PublicationSchema.parse(row["snapshot"]),
    actor: String(row["actor"]), publishedAt: new Date(String(row["created_at"])).toISOString(),
    action: row["action"] === "publication_rollback" ? "rollback" : "publish",
    ...(row["action"] === "publication_rollback" ? { targetRevision: Number((row["audit_payload"] as Record<string,unknown>)["targetRevision"]) } : {}) }));
}

async function writeSnapshot(tx: QueryableDb, publication: Publication, actor: OwnerContext, targetRevision?: number) {
  // Record the accepted baseline once so the first deployment has a rollback target.
  const baseline = await tx.query("SELECT revision FROM public.publication_history WHERE revision=$1 LIMIT 1", [approvedPublication.revision]);
  if (!baseline.rows.length) await tx.query("INSERT INTO public.publication_history(revision,snapshot,actor) VALUES($1,$2,$3)", [approvedPublication.revision,JSON.stringify(approvedPublication),actor.userId]);
  await tx.query("INSERT INTO public.publication_history(revision,snapshot,actor) VALUES($1,$2,$3)", [publication.revision,JSON.stringify(publication),actor.userId]);
  await tx.query("INSERT INTO public.published_content(revision,payload) VALUES($1,$2)", [publication.revision,JSON.stringify(publication)]);
  await tx.query("INSERT INTO public.audit_events(actor,action,entity_type,entity_id,payload) VALUES($1,$2,'publication',$3,$4)",
    [actor.userId,targetRevision === undefined ? "publication_published" : "publication_rollback",String(publication.revision),JSON.stringify({ revision: publication.revision,...(targetRevision === undefined ? {} : { targetRevision }) })]);
}

async function publishDurable(input: PublishInput, actor: OwnerContext) {
  const db = await getPlatformDb();
  if (!db.transaction) throw new Error("Transactional database is required.");
  const publication = await db.transaction(async (tx) => {
    await tx.query("SELECT pg_advisory_xact_lock(hashtext('yor-publication'))");
    const current = await readDurablePublication(tx);
    if (current.revision !== input.expectedRevision) throw new RevisionConflictError("Publication changed. Refresh before publishing.");
    const durableDrafts = await readDurableDrafts(tx);
    const draftRevisions: Record<string, number> = {};
    for (const d of durableDrafts) {
      draftRevisions[d.projectId] = d.draftRevision;
    }

    if (input.review) {
      if (input.review.draftRevisions) {
        for (const [pId, expectedDraftRev] of Object.entries(input.review.draftRevisions)) {
          const actualRev = draftRevisions[pId];
          if (actualRev !== undefined && actualRev !== expectedDraftRev) {
            throw new RevisionConflictError(
              `Stale draft revision conflict: project '${pId}' is at revision ${actualRev}, but review expected ${expectedDraftRev}. Re-review before publishing.`
            );
          }
        }
      }

      const candidateProjectsForReview = input.customProjects ?? durableDrafts.filter((d) => d.projectId !== "candidatex").map((d) => d.project);
      const referencedMediaIds: string[] = [];
      for (const proj of candidateProjectsForReview) {
        for (const section of proj.sections) {
          for (const block of section.blocks) {
            if (block.type === "image" && block.mediaId && !block.mediaId.startsWith("missing-")) {
              referencedMediaIds.push(block.mediaId);
            }
          }
        }
      }
      const mediaItems = await fetchMediaReviewItems(referencedMediaIds, tx);
      const projectReviewItems = candidateProjectsForReview.map((p) => ({
        projectId: p.id as ProjectId,
        draftRevision: draftRevisions[p.id] ?? p.revision,
      }));

      const computedSha = computeReviewHash(
        input.expectedRevision,
        projectReviewItems,
        mediaItems,
        candidateProjectsForReview
      );

      if (computedSha !== input.review.candidateSha256) {
        throw new RevisionConflictError(
          "Stale review hash conflict: candidate content or referenced media changed since review was generated. Refresh and re-review before publishing."
        );
      }
    }

    const projects = input.customProjects ?? durableDrafts.filter((draft) => draft.projectId !== "candidatex").map((draft) => draft.project);
    // CandidateX cannot be added without a separately accepted content decision.
    if (projects.some((project) => project.id === "candidatex")) throw new ContentValidationError("CandidateX has no accepted public content decision.");
    const next: Publication = { revision: current.revision + 1,publishedAt: new Date().toISOString(),projects,
      assetManifestRevision: current.assetManifestRevision };
    await validatePublicationContent(next,tx);
    await writeSnapshot(tx,next,actor);
    return next;
  });
  const refreshed = await handleCacheRefresh(publication);
  return { ...publication,cacheRefreshed: refreshed.refreshed,...(refreshed.error ? { cacheRefreshWarning: refreshed.error } : {}) };
}

async function rollbackDurable(targetRevision: number, actor: OwnerContext) {
  const db = await getPlatformDb();
  if (!db.transaction) throw new Error("Transactional database is required.");
  const publication = await db.transaction(async (tx) => {
    await tx.query("SELECT pg_advisory_xact_lock(hashtext('yor-publication'))");
    const rows = await tx.query("SELECT snapshot FROM public.publication_history WHERE revision=$1 ORDER BY created_at DESC LIMIT 1", [targetRevision]);
    const target = rows.rows[0] ? PublicationSchema.parse(rows.rows[0]["snapshot"]) : targetRevision === approvedPublication.revision ? approvedPublication : null;
    if (!target) throw new ContentValidationError("Rollback target does not exist.");
    await validatePublicationContent(target,tx);
    const current = await readDurablePublication(tx);
    const next = { ...target,revision: current.revision + 1,publishedAt: new Date().toISOString() };
    await writeSnapshot(tx,next,actor,targetRevision);
    return next;
  });
  const refreshed = await handleCacheRefresh(publication);
  return { ...publication,cacheRefreshed: refreshed.refreshed,...(refreshed.error ? { cacheRefreshWarning: refreshed.error } : {}) };
}
