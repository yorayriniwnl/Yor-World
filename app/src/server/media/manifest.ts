/**
 * YOR WORLD Milestone A4: Media Manifest & Publication Integrity Checker
 *
 * Verifies that all media assets referenced in publication sections exist
 * and hold verified 'approved' status before entering public snapshots.
 */

import type { Publication } from "@/contracts/content";
import { getTestMediaRegistry, MediaValidationError, verifyTestMediaBytes } from "./validate-upload";
import { boundedMediaOperation, MediaStorageUnavailableError, PUBLICATION_MEDIA_TIMEOUT_MS, verifyStoredMedia } from "./integrity";
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

  const uniqueIds = Array.from(new Set(mediaIds)).sort();
  const testRegistry = !transaction && isDraftTestRegistryEnabled() ? getTestMediaRegistry() : null;

  if (testRegistry) {
    const unapproved: string[] = [];
    for (const id of uniqueIds) {
      const asset = testRegistry.get(id);
      if (!asset || asset.approvalStatus !== "approved" || !verifyTestMediaBytes(id)) {
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
    const { rows } = await db.query("SELECT * FROM public.media_assets WHERE id::text = ANY($1::text[]) ORDER BY id" + (transaction ? " FOR SHARE" : ""),[uniqueIds]);
    const approvedSet = new Set<string>();
    await boundedMediaOperation(async (signal) => {
      for (const row of rows) {
        if (row["approval_status"] !== "approved") continue;
        if (row["storage_bucket"] && row["integrity_verified_at"]) {
          try {
            await verifyStoredMedia(row as unknown as Parameters<typeof verifyStoredMedia>[0], signal);
            approvedSet.add(String(row["id"]));
          } catch (error) {
            if (!(error instanceof MediaValidationError)) throw error;
          }
        } else {
          approvedSet.add(String(row["id"]));
        }
      }
    }, PUBLICATION_MEDIA_TIMEOUT_MS);
    const unapproved = uniqueIds.filter((id) => !approvedSet.has(id));
    return {
      approved: unapproved.length === 0,
      unapprovedIds: unapproved,
    };
  } catch (error) {
    if (error instanceof MediaValidationError) return { approved: false, unapprovedIds: uniqueIds };
    throw new MediaStorageUnavailableError();
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
    if (!wanted.length) return {};
    const db=await getPlatformDb();
    let assets;
    try {
      assets=await db.query("SELECT id,object_key,storage_bucket FROM public.media_assets WHERE approval_status='approved' AND id::text=ANY($1::text[])",[wanted]);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "42703") {
        assets=await db.query("SELECT id,object_key FROM public.media_assets WHERE approval_status='approved' AND id::text=ANY($1::text[])",[wanted]);
      } else {
        throw err;
      }
    }
    if (!assets.rows.length) return {};
    const defaultBucket = process.env.MEDIA_PRIVATE_BUCKET;
    const urls: Record<string,string>={};
    await boundedMediaOperation(async (signal) => {
      const buckets = [...new Set(assets.rows.map((row) => String(row["storage_bucket"] || defaultBucket || "")).filter(Boolean))];
      for (const bucket of buckets) {
        const bound = assets.rows.filter((row) => String(row["storage_bucket"] || defaultBucket) === bucket);
        const signed = await createAdminServiceRoleClient(signal).storage.from(bucket).createSignedUrls(bound.map((row) => String(row["object_key"])), 900);
        if (signal.aborted || signed.error || !signed.data) throw new MediaStorageUnavailableError();
        const byPath = new Map(bound.map((row) => [String(row["object_key"]), String(row["id"])]));
        for (const item of signed.data) {
          if (!item.path || !item.signedUrl || item.error) continue;
          const id = byPath.get(item.path);
          if (id && new URL(item.signedUrl).protocol === "https:") urls[id] = item.signedUrl;
        }
      }
    });
    return urls;
  } catch { return {}; }
}
