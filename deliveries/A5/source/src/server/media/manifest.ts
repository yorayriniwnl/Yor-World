/**
 * YOR WORLD Milestone A4: Media Manifest & Publication Integrity Checker
 *
 * Verifies that all media assets referenced in publication sections exist
 * and hold verified 'approved' status before entering public snapshots.
 */

import type { Publication } from "@/contracts/content";
import { getTestMediaRegistry, MediaValidationError } from "./validate-upload";
import { createAdminServiceRoleClient } from "../auth/clients";

export interface MediaCheckResult {
  approved: boolean;
  unapprovedIds: string[];
}

/**
 * Checks a list of media IDs to verify they exist and are approved.
 */
export async function checkMediaApproved(mediaIds: string[]): Promise<MediaCheckResult> {
  if (mediaIds.length === 0) {
    return { approved: true, unapprovedIds: [] };
  }

  const uniqueIds = Array.from(new Set(mediaIds));
  const testRegistry = getTestMediaRegistry();

  if (testRegistry) {
    const unapproved: string[] = [];
    for (const id of uniqueIds) {
      const asset = testRegistry.get(id);
      if (!asset || asset.approvalStatus !== "approved") {
        unapproved.push(id);
      }
    }
    return {
      approved: unapproved.length === 0,
      unapprovedIds: unapproved,
    };
  }

  try {
    const client = createAdminServiceRoleClient();
    const { data, error } = await client
      .from("media_assets")
      .select("id, approval_status")
      .in("id", uniqueIds);

    if (error || !data) {
      return { approved: false, unapprovedIds: uniqueIds };
    }

    const approvedSet = new Set(
      data.filter((row) => row.approval_status === "approved").map((row) => row.id)
    );

    const unapproved = uniqueIds.filter((id) => !approvedSet.has(id));
    return {
      approved: unapproved.length === 0,
      unapprovedIds: unapproved,
    };
  } catch {
    // If DB is unreachable and no test registry, check against test registry fallback
    return { approved: false, unapprovedIds: uniqueIds };
  }
}

/**
 * Verifies that all image blocks in a publication snapshot reference approved media.
 * Throws MediaValidationError (422) if unapproved or missing media is detected.
 */
export async function verifyPublicationAssets(publication: Publication): Promise<void> {
  const referencedMediaIds: string[] = [];

  for (const project of publication.projects) {
    for (const section of project.sections) {
      for (const block of section.blocks) {
        if (block.type === "image" && block.mediaId) {
          referencedMediaIds.push(block.mediaId);
        }
      }
    }
  }

  if (referencedMediaIds.length === 0) {
    return;
  }

  const check = await checkMediaApproved(referencedMediaIds);
  if (!check.approved) {
    throw new MediaValidationError(
      `Publication rejected: contains unapproved or missing media assets: [${check.unapprovedIds.join(", ")}]. All media must be verified and approved before publication.`
    );
  }
}
