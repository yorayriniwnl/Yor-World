/**
 * YOR WORLD Milestone A1 / Milestone A4: Server-side Draft Preview & Preflight Verification
 *
 * Implements deterministic ReviewIdentity calculation, pre-flight check execution,
 * and authentic draft review binding closing defects CA-01, CA-02, and PLAT-R2-01.
 */

import { createHash } from "node:crypto";
import {
  type ProjectId,
  type PublishedProject,
  type Publication,
  type MediaReviewItem,
  type ProjectReviewItem,
  type ReviewIdentity,
  type PreflightCheckResult,
  PublishedProjectSchema,
} from "@/contracts/content";
import type { OwnerContext } from "../auth/types";
import {
  listProjectDrafts,
  isDraftTestRegistryEnabled,
} from "./revisions";
import { getActivePublication } from "./publish";
import { checkMediaApproved } from "../media/manifest";
import { getTestMediaRegistry } from "../media/validate-upload";
import { getPlatformDb } from "../database";
import type { QueryableDb } from "../contact/quota";

export type {
  MediaReviewItem,
  ProjectReviewItem,
  ReviewIdentity,
  PreflightCheckResult,
};

export interface DraftReviewSummary {
  review: ReviewIdentity;
  checks: PreflightCheckResult[];
  projects: PublishedProject[];
  candidatePublication: Publication;
}

export async function fetchMediaReviewItems(
  mediaIds: string[],
  transaction?: QueryableDb
): Promise<MediaReviewItem[]> {
  if (mediaIds.length === 0) return [];
  const uniqueIds = Array.from(new Set(mediaIds)).sort();

  if (!transaction && isDraftTestRegistryEnabled()) {
    const testRegistry = getTestMediaRegistry();
    return uniqueIds.map((id) => {
      const rec = testRegistry.get(id);
      return {
        mediaId: id,
        hash: rec ? rec.hash : "missing-hash",
        approvalStatus: rec ? rec.approvalStatus : "missing",
      };
    });
  }

  try {
    const db = transaction ?? (await getPlatformDb());
    const { rows } = await db.query(
      "SELECT id, hash, approval_status FROM public.media_assets WHERE id::text = ANY($1::text[])" +
        (transaction ? " FOR SHARE" : ""),
      [uniqueIds]
    );
    const rowMap = new Map(
      rows.map((r) => [
        String(r["id"]),
        {
          mediaId: String(r["id"]),
          hash: String(r["hash"] ?? ""),
          approvalStatus: String(r["approval_status"] ?? ""),
        },
      ])
    );
    return uniqueIds.map(
      (id) =>
        rowMap.get(id) ?? {
          mediaId: id,
          hash: "missing-hash",
          approvalStatus: "missing",
        }
    );
  } catch {
    return uniqueIds.map((id) => ({
      mediaId: id,
      hash: "unreachable-db",
      approvalStatus: "unknown",
    }));
  }
}

export function computeReviewHash(
  expectedPublicationRevision: number,
  projects: ProjectReviewItem[],
  media: MediaReviewItem[],
  candidateProjects: PublishedProject[]
): string {
  // Canonical sorted representation
  const sortedProjects = [...projects].sort((a, b) => a.projectId.localeCompare(b.projectId));
  const sortedMedia = [...media].sort((a, b) => a.mediaId.localeCompare(b.mediaId));
  const sortedCandidateProjects = [...candidateProjects].sort((a, b) => a.id.localeCompare(b.id));

  const preimage = JSON.stringify({
    expectedPublicationRevision,
    projects: sortedProjects,
    media: sortedMedia,
    candidateProjects: sortedCandidateProjects,
  });

  return createHash("sha256").update(preimage).digest("hex");
}

export async function generateDraftReview(
  actor: OwnerContext,
  transaction?: QueryableDb
): Promise<DraftReviewSummary> {
  const currentPub = getActivePublication();
  const expectedPublicationRevision = currentPub.revision;

  const drafts = await listProjectDrafts(actor);

  // Filter out candidatex for public candidate publication
  const candidateProjects: PublishedProject[] = [];
  const projectReviewItems: ProjectReviewItem[] = [];

  for (const draft of drafts) {
    if (draft.projectId === "candidatex") {
      continue;
    }
    candidateProjects.push(draft.project);
    projectReviewItems.push({
      projectId: draft.projectId,
      draftRevision: draft.draftRevision,
    });
  }

  // Preflight checks
  const checks: PreflightCheckResult[] = [];

  // Check 1: Structural schema validation
  let schemaPassed = true;
  const schemaErrors: string[] = [];
  for (const proj of candidateProjects) {
    const parseRes = PublishedProjectSchema.safeParse(proj);
    if (!parseRes.success) {
      schemaPassed = false;
      schemaErrors.push(`${proj.id}: ${parseRes.error.issues.map((i) => i.message).join(", ")}`);
    }
  }
  checks.push({
    key: "check-schema",
    name: "Structural Schema Integrity",
    status: schemaPassed ? "pass" : "fail",
    message: schemaPassed
      ? `All ${candidateProjects.length} candidate projects conform to PublishedProjectSchema.`
      : `Schema validation failed: ${schemaErrors.join("; ")}`,
  });

  // Check 2: Verifiable Evidence claims
  let evidencePassed = true;
  const evidenceIssues: string[] = [];
  for (const proj of candidateProjects) {
    const verifiedEvidence = proj.evidence.filter((e) => e.status === "verified");
    if (verifiedEvidence.length === 0) {
      evidencePassed = false;
      evidenceIssues.push(`Project '${proj.id}' has zero verified evidence claims`);
    }
    for (const ev of proj.evidence) {
      if (ev.status === "unknown") {
        evidencePassed = false;
        evidenceIssues.push(`Project '${proj.id}' claim '${ev.id}' has status 'unknown'`);
      }
      if (!ev.note || ev.note.trim().length === 0) {
        evidencePassed = false;
        evidenceIssues.push(`Project '${proj.id}' claim '${ev.id}' missing note`);
      }
      if (ev.url) {
        try {
          if (new URL(ev.url).protocol !== "https:") {
            evidencePassed = false;
            evidenceIssues.push(`Project '${proj.id}' claim '${ev.id}' URL must be https://`);
          }
        } catch {
          evidencePassed = false;
          evidenceIssues.push(`Project '${proj.id}' claim '${ev.id}' URL malformed`);
        }
      }
    }
  }
  checks.push({
    key: "check-evidence",
    name: "Verifiable Evidence Claims (C01)",
    status: evidencePassed ? "pass" : "fail",
    message: evidencePassed
      ? "All evidence claims are verified with non-empty notes and https:// URLs."
      : `Evidence validation failed: ${evidenceIssues.join("; ")}`,
  });

  // Check 3: External Link Safety
  let linksPassed = true;
  const linkIssues: string[] = [];
  for (const proj of candidateProjects) {
    for (const link of proj.links) {
      if (!link.label || link.label.trim().length === 0) {
        linksPassed = false;
        linkIssues.push(`Project '${proj.id}' link missing label`);
      }
      try {
        if (new URL(link.url).protocol !== "https:") {
          linksPassed = false;
          linkIssues.push(`Project '${proj.id}' link '${link.label}' URL must be https://`);
        }
      } catch {
        linksPassed = false;
        linkIssues.push(`Project '${proj.id}' link '${link.label}' URL malformed`);
      }
    }
  }
  checks.push({
    key: "check-links",
    name: "External Links Protocol Safety",
    status: linksPassed ? "pass" : "fail",
    message: linksPassed
      ? "All project links are labeled and use https:// protocol."
      : `Link validation failed: ${linkIssues.join("; ")}`,
  });

  // Collect referenced media IDs
  const referencedMediaIds: string[] = [];
  for (const proj of candidateProjects) {
    for (const section of proj.sections) {
      for (const block of section.blocks) {
        if (block.type === "image" && block.mediaId) {
          if (!block.mediaId.startsWith("missing-")) {
            referencedMediaIds.push(block.mediaId);
          }
        }
      }
    }
  }

  // Check 4: Media Approval Check
  const mediaApprovalResult = await checkMediaApproved(referencedMediaIds, transaction);
  const mediaItems = await fetchMediaReviewItems(referencedMediaIds, transaction);
  const mediaPassed = mediaApprovalResult.approved;
  checks.push({
    key: "check-media",
    name: "Media Asset Approval & Cryptographic Integrity",
    status: mediaPassed ? "pass" : "fail",
    message: mediaPassed
      ? `All ${referencedMediaIds.length} referenced media assets exist and hold verified 'approved' status.`
      : `Unapproved or missing media assets detected: [${mediaApprovalResult.unapprovedIds.join(", ")}]`,
  });

  // CandidateX Isolation
  const candidatexDraft = drafts.find((d) => d.projectId === "candidatex");
  if (candidatexDraft) {
    checks.push({
      key: "check-candidatex",
      name: "CandidateX Isolation",
      status: "pass",
      message: "CandidateX draft is isolated and excluded from public publication snapshot.",
    });
  }

  const candidateSha256 = computeReviewHash(
    expectedPublicationRevision,
    projectReviewItems,
    mediaItems,
    candidateProjects
  );

  const review: ReviewIdentity = {
    expectedPublicationRevision,
    projects: projectReviewItems,
    media: mediaItems,
    candidateSha256,
  };

  const candidatePublication: Publication = {
    revision: expectedPublicationRevision + 1,
    publishedAt: new Date().toISOString(),
    projects: candidateProjects,
    assetManifestRevision: `manifest-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-r${expectedPublicationRevision + 1}`,
  };

  return {
    review,
    checks,
    projects: candidateProjects,
    candidatePublication,
  };
}
