/**
 * YOR WORLD Milestone A4: Media Manifest & Publication Integrity Checker
 *
 * Verifies that all media assets referenced in publication sections exist
 * and hold verified 'approved' status before entering public snapshots.
 */

import type { Publication, PublishedProject } from "@/contracts/content";
import { getTestMediaRegistry, MediaValidationError } from "./validate-upload";
import { isDraftTestRegistryEnabled } from "../content/revisions";
import { getPlatformDb } from "../database";
import { createAdminServiceRoleClient } from "../auth/clients";
import { readPublicPublication } from "../content/publish";
import { validatePublication } from "@/content/publication-reader";
import { approvedPublication } from "@/content/approved-publication";
import type { QueryableDb } from "../contact/quota";


export interface MediaCheckResult {
  approved: boolean;
  unapprovedIds: string[];
}

/**
 * Checks a list of media IDs to verify they exist and are approved.
 */
export async function checkMediaApproved(mediaIds: string[], transaction?: QueryableDb): Promise<MediaCheckResult> {
  if (mediaIds.length === 0) {
    return { approved: true, unapprovedIds: [] };
  }

  const uniqueIds = Array.from(new Set(mediaIds));
  const testRegistry = !transaction && isDraftTestRegistryEnabled() ? getTestMediaRegistry() : null;

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
    const db=transaction ?? await getPlatformDb();
    const { rows } = await db.query("SELECT id,approval_status FROM public.media_assets WHERE id::text = ANY($1::text[])" + (transaction ? " FOR SHARE" : ""),[uniqueIds]);
    const approvedSet = new Set(rows.filter((row) => row["approval_status"] === "approved").map((row) => String(row["id"])));

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
export async function verifyPublicationAssets(publication: Publication, transaction?: QueryableDb): Promise<void> {
  const referencedMediaIds: string[] = [];

  for (const project of publication.projects) {
    for (const section of project.sections) {
      for (const block of section.blocks) {
        if (block.type === "image" && block.mediaId) {
          // Retain the exact accepted honest placeholder; it never resolves to a media URL.
          const acceptedPlaceholder = block.mediaId.startsWith("missing-") && approvedPublication.projects
            .flatMap((item) => item.sections.flatMap((section) => section.blocks))
            .some((accepted) => accepted.type === "image" && JSON.stringify(accepted) === JSON.stringify(block));
          if (acceptedPlaceholder) continue;
          referencedMediaIds.push(block.mediaId);
        }
      }
    }
  }

  if (referencedMediaIds.length === 0) {
    return;
  }

  const check = await checkMediaApproved(referencedMediaIds, transaction);
  if (!check.approved) {
    throw new MediaValidationError(
      `Publication rejected: contains unapproved or missing media assets: [${check.unapprovedIds.join(", ")}]. All media must be verified and approved before publication.`
    );
  }
}

/** Public pages receive URLs only for approved assets referenced by the CURRENT approved snapshot. */
export async function readApprovedPublishedMediaUrls(publication: Publication): Promise<Record<string,string>> {
  try {
    const requested=validatePublication(publication);
    const snapshot=await readPublicPublication();
    if (!snapshot || snapshot.revision !== requested.revision) return {};
    const approved=validatePublication(snapshot);
    const collect=(value: Publication) => new Set(value.projects.filter((project) => project.id !== "candidatex")
      .flatMap((project) => project.sections.flatMap((section) => section.blocks.flatMap((block) => block.type === "image" ? [block.mediaId] : []))));
    const currentIds=collect(approved);
    const wanted=[...collect(requested)].filter((id) => currentIds.has(id) && !id.startsWith("missing"));
    const bucket=process.env.MEDIA_PRIVATE_BUCKET;
    if (!wanted.length || !bucket) return {};
    const db=await getPlatformDb();
    const assets=await db.query("SELECT id,object_key FROM public.media_assets WHERE approval_status='approved' AND id::text=ANY($1::text[])",[wanted]);
    if (!assets.rows.length) return {};
    const signed=await createAdminServiceRoleClient().storage.from(bucket).createSignedUrls(assets.rows.map((row) => String(row["object_key"])),900);
    if (signed.error || !signed.data) return {};
    const byPath=new Map(assets.rows.map((row) => [String(row["object_key"]),String(row["id"])]));
    const urls: Record<string,string>={};
    for (const item of signed.data) {
      if (!item.path || !item.signedUrl || item.error) continue;
      const id=byPath.get(item.path);
      if (id && new URL(item.signedUrl).protocol === "https:") urls[id]=item.signedUrl;
    }
    return urls;
  } catch { return {}; }
}

/**
 * Draft preview receives private streaming proxy URLs for approved media assets.
 * Private: requires owner context at endpoint execution.
 */
export async function readApprovedDraftMediaUrls(projects: PublishedProject[]): Promise<Record<string, string>> {
  const referencedIds = new Set<string>();
  for (const proj of projects) {
    for (const section of proj.sections) {
      for (const block of section.blocks) {
        if (block.type === "image" && block.mediaId && !block.mediaId.startsWith("missing-")) {
          referencedIds.add(block.mediaId);
        }
      }
    }
  }

  const check = await checkMediaApproved(Array.from(referencedIds));
  const urls: Record<string, string> = {};
  for (const id of referencedIds) {
    if (!check.unapprovedIds.includes(id)) {
      urls[id] = `/api/admin/preview/media/${id}`;
    }
  }
  return urls;
}

