/**
 * YOR WORLD Milestone A4: Media Manifest & Publication Integrity Checker
 *
 * Verifies that all media assets referenced in publication sections exist
 * and hold verified 'approved' status before entering public snapshots.
 */

import { z } from "zod";
import type { ContentSection, Publication, PublishedProject } from "@/contracts/content";
import { getTestMediaRegistry, MAX_UPLOAD_BYTES, MediaValidationError, validateUpload, type AllowedMimeType, type MediaAssetRecord } from "./validate-upload";
import { isDraftTestRegistryEnabled } from "../content/revisions";
import { getPlatformDb, isE2EFixture, isTestRuntime } from "../database";
import { createAdminServiceRoleClient } from "../auth/clients";
import { readPublicPublication } from "../content/publish";
import { validatePublication } from "@/content/publication-reader";
import { approvedPublication } from "@/content/approved-publication";
import type { QueryableDb } from "../contact/quota";
import type { DraftRecord } from "../content/revisions";
import type { OwnerContext } from "../auth/types";

const timestampSchema = z.iso.datetime({ offset: true });
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() => z.union([
  z.string(), z.number().finite(), z.boolean(), z.null(), z.array(jsonValueSchema), z.record(z.string(), jsonValueSchema),
]));

/** Metadata only. Object bytes and signed URLs never enter the returned review identity. */
export const ReviewedMediaSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("asset"), mediaId: z.string().min(1), objectKey: z.string().min(1),
    sha256: z.string().regex(/^[a-f0-9]{64}$/), mime: z.string().min(1), bytes: z.number().int().nonnegative().safe(),
    dimensions: jsonValueSchema.nullable(), provenance: jsonValueSchema.nullable(),
    approvalStatus: z.enum(["pending", "approved", "rejected"]), createdAt: timestampSchema,
    approvalAudit: z.strictObject({ eventId: z.string().min(1), createdAt: timestampSchema }).nullable(),
  }),
  z.strictObject({ kind: z.literal("missing"), mediaId: z.string().min(1) }),
  z.strictObject({ kind: z.literal("accepted-placeholder"), mediaId: z.string().min(1) }),
]);
export type ReviewedMedia = z.infer<typeof ReviewedMediaSchema>;

export interface ReviewedMediaResult {
  media: ReviewedMedia[];
  issues: Map<string, string[]>;
  verifiedBytes: Map<string, Uint8Array>;
}

export const E2E_SYNTHETIC_MEDIA_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const E2E_SYNTHETIC_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAABAAAAAMCAYAAABr5z2BAAAALElEQVR4nGNkYGhYIMjAIIKEj5DCZ2EQZ6AIsIwawMDCIDEaiAwUJyQKAxEAg0sGiLLN9pwAAAAASUVORK5CYII=";
const E2E_SYNTHETIC_PNG_SHA256 = "a546f194dae161fa53cadb9f0a0b83b0f7d3d694a553df0b9eff844301bc7cba";
const E2E_SYNTHETIC_PNG_BYTES = 101;
const E2E_SYNTHETIC_CREATED_AT = "2026-10-11T00:00:00.000Z";

/** The local fixture is enabled only by the explicit browser-test environment. */
export function getE2ESyntheticMediaAsset(): MediaAssetRecord | null {
  if (!isE2EFixture()) return null;
  return {
    id: E2E_SYNTHETIC_MEDIA_ID,
    objectKey: "test-only/synthetic-local-approved-preview.png",
    hash: E2E_SYNTHETIC_PNG_SHA256,
    mime: "image/png",
    bytes: E2E_SYNTHETIC_PNG_BYTES,
    dimensions: { width: 16, height: 12 },
    approvalStatus: "approved",
    createdAt: E2E_SYNTHETIC_CREATED_AT,
  };
}

export interface ReviewedMediaStorageForTests {
  createSignedUrl(bucket: string, objectKey: string): Promise<string>;
  fetch(url: string, init: RequestInit): Promise<Response>;
}

let reviewedMediaStorageForTests: ReviewedMediaStorageForTests | null = null;

export function setReviewedMediaStorageForTests(storage: ReviewedMediaStorageForTests | null): void {
  if (!isTestRuntime()) throw new Error("Reviewed-media Storage injection is test-only.");
  reviewedMediaStorageForTests = storage;
}

function compareCodePoints(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalizeJson(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(canonicalizeJson);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort(compareCodePoints).map((key) => [key, canonicalizeJson(value[key]!)]));
  }
  return value;
}

function recordJsonValue(value: unknown): JsonValue | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    try { return JSON.parse(value) as JsonValue; } catch { throw new MediaValidationError("Approved media metadata is malformed."); }
  }
  return value as JsonValue;
}

function isoTimestamp(value: unknown): string {
  const date = value instanceof Date ? value : new Date(String(value));
  const normalized = date.toISOString();
  if (!timestampSchema.safeParse(normalized).success) throw new MediaValidationError("Approved media timestamp is malformed.");
  return normalized;
}

function acceptedPlaceholderBlocks(projects: PublishedProject[]): Set<string> {
  const baseline = approvedPublication.projects.flatMap((project) => project.sections.flatMap((section) => section.blocks))
    .filter((block) => block.type === "image" && block.mediaId.startsWith("missing-"));
  const result = new Set<string>();
  for (const project of projects) for (const section of project.sections) for (const block of section.blocks) {
    if (block.type === "image" && baseline.some((accepted) => accepted.type === "image" &&
      accepted.mediaId === block.mediaId && accepted.alt === block.alt && accepted.caption === block.caption)) {
      result.add(block.mediaId);
    }
  }
  return result;
}

export function isAcceptedPlaceholderBlock(block: Extract<ContentSection["blocks"][number], { type: "image" }>): boolean {
  return acceptedPlaceholderBlocks(approvedPublication.projects).has(block.mediaId) &&
    approvedPublication.projects.some((project) => project.sections.some((section) => section.blocks.some((accepted) =>
      accepted.type === "image" && accepted.mediaId === block.mediaId && accepted.alt === block.alt && accepted.caption === block.caption)));
}

function addIssue(issues: Map<string, string[]>, mediaId: string, message: string): void {
  const current = issues.get(mediaId) ?? [];
  current.push(message);
  issues.set(mediaId, current);
}

function abortError(): MediaValidationError {
  return new MediaValidationError("Approved media verification exceeded its 10-second deadline.");
}

function waitForAbort<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => { cleanup(); reject(abortError()); };
    const cleanup = () => signal.removeEventListener("abort", onAbort);
    if (signal.aborted) { reject(abortError()); return; }
    signal.addEventListener("abort", onAbort, { once: true });
    operation.then((value) => { cleanup(); resolve(value); }, (error: unknown) => { cleanup(); reject(error); });
  });
}

async function readBoundedResponse(response: Response, controller: AbortController): Promise<Uint8Array> {
  if (!response.ok) throw new MediaValidationError("Approved private media is unavailable.");
  const declaredText = response.headers.get("content-length");
  let declaredLength: number | null = null;
  if (declaredText !== null) {
    if (!/^\d+$/.test(declaredText)) throw new MediaValidationError("Approved private media has an invalid Content-Length.");
    declaredLength = Number(declaredText);
    if (!Number.isSafeInteger(declaredLength) || declaredLength > MAX_UPLOAD_BYTES) {
      void response.body?.cancel("declared media size exceeds bound").catch(() => undefined);
      throw new MediaValidationError("Approved private media exceeds the 5 MiB read limit.");
    }
  }
  if (!response.body) throw new MediaValidationError("Approved private media returned no byte stream.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let completed = false;
  const cancelOnAbort = () => { void reader.cancel("media verification aborted").catch(() => undefined); };
  controller.signal.addEventListener("abort", cancelOnAbort, { once: true });
  try {
    while (true) {
      const { value, done } = await waitForAbort(reader.read(), controller.signal);
      if (done) { completed = true; break; }
      if (!value) continue;
      total += value.byteLength;
      if (total > MAX_UPLOAD_BYTES) {
        void reader.cancel("streamed media size exceeds bound").catch(() => undefined);
        throw new MediaValidationError("Approved private media exceeds the 5 MiB read limit.");
      }
      chunks.push(value);
    }
  } catch (error) {
    if (!completed) {
      void reader.cancel("media stream failed").catch(() => undefined);
    }
    throw error;
  } finally {
    controller.signal.removeEventListener("abort", cancelOnAbort);
    if (completed) reader.releaseLock();
  }
  if (declaredLength !== null && declaredLength !== total) {
    throw new MediaValidationError("Approved private media Content-Length did not match streamed bytes.");
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

async function fetchPrivateBytes(objectKey: string, controller: AbortController): Promise<Uint8Array> {
  let signedUrl: string;
  if (reviewedMediaStorageForTests) {
    signedUrl = await waitForAbort(reviewedMediaStorageForTests.createSignedUrl(process.env.MEDIA_PRIVATE_BUCKET ?? "test-only", objectKey), controller.signal);
  } else {
    const bucket = process.env.MEDIA_PRIVATE_BUCKET;
    if (!bucket) throw new MediaValidationError("Private media storage is not configured.");
    const signed = await waitForAbort(createAdminServiceRoleClient().storage.from(bucket).createSignedUrl(objectKey, 60), controller.signal);
    if (signed.error || !signed.data?.signedUrl) throw new MediaValidationError("Approved private media is unavailable.");
    signedUrl = signed.data.signedUrl;
  }
  const response = reviewedMediaStorageForTests
    ? await waitForAbort(reviewedMediaStorageForTests.fetch(signedUrl, { signal: controller.signal }), controller.signal)
    : await waitForAbort(fetch(signedUrl, { signal: controller.signal, cache: "no-store", redirect: "error" }), controller.signal);
  return readBoundedResponse(response, controller);
}

function identityFromRow(row: Record<string, unknown>, approvalAudit: Record<string, unknown> | undefined): ReviewedMedia {
  const bytes = Number(row["bytes"]);
  const approvalStatus = String(row["approval_status"]);
  const identity = {
    kind: "asset" as const,
    mediaId: String(row["id"]),
    objectKey: String(row["object_key"]),
    sha256: String(row["hash"]),
    mime: String(row["mime"]),
    bytes,
    dimensions: recordJsonValue(row["dimensions"]),
    provenance: recordJsonValue(row["provenance"]),
    approvalStatus,
    createdAt: isoTimestamp(row["created_at"]),
    approvalAudit: approvalAudit ? {
      eventId: String(approvalAudit["id"]),
      createdAt: isoTimestamp(approvalAudit["created_at"]),
    } : null,
  };
  const parsed = ReviewedMediaSchema.safeParse(identity);
  if (!parsed.success) throw new MediaValidationError("Approved media metadata is malformed.");
  return parsed.data;
}

/**
 * Reads one ordered identity vector and verifies every approved object's bytes.
 * Storage URLs and bytes are returned only to the caller's private server path.
 */
export async function readReviewedMedia(ids: string[], transaction?: QueryableDb): Promise<ReviewedMediaResult> {
  const orderedIds = [...new Set(ids)].sort(compareCodePoints);
  const media: ReviewedMedia[] = [];
  const issues = new Map<string, string[]>();
  const verifiedBytes = new Map<string, Uint8Array>();
  if (!orderedIds.length) return { media, issues, verifiedBytes };

  const fixtureAsset = getE2ESyntheticMediaAsset();
  const fixtureIds = new Set(orderedIds.filter((id) => fixtureAsset?.id === id));
  const storedIds = orderedIds.filter((id) => !fixtureIds.has(id));
  let rows: Record<string, unknown>[] = [];
  let audits: Record<string, unknown>[] = [];
  if (storedIds.length && isDraftTestRegistryEnabled() && !transaction) {
    rows = storedIds.flatMap((id) => {
      const record = getTestMediaRegistry().get(id);
      return record ? [{ id: record.id, object_key: record.objectKey, hash: record.hash, mime: record.mime, bytes: record.bytes,
        dimensions: record.dimensions, provenance: { source: "explicit test media registry" }, approval_status: record.approvalStatus, created_at: record.createdAt }] : [];
    });
  } else if (storedIds.length) {
    const db = transaction ?? await getPlatformDb();
    const rowResult = await db.query(`SELECT id,object_key,hash,mime,bytes,dimensions,provenance,approval_status,created_at
      FROM public.media_assets WHERE id::text=ANY($1::text[]) ORDER BY id::text COLLATE "C"${transaction ? " FOR SHARE" : ""}`,[storedIds]);
    rows = rowResult.rows;
    const auditResult = await db.query(`SELECT DISTINCT ON (entity_id) entity_id,id,action,created_at
      FROM public.audit_events WHERE entity_type='media' AND action='media_approved' AND entity_id=ANY($1::text[])
      ORDER BY entity_id,created_at DESC,id DESC`,[storedIds]);
    audits = auditResult.rows;
  }
  const rowsById = new Map(rows.map((row) => [String(row["id"]), row]));
  const auditById = new Map(audits.map((row) => [String(row["entity_id"]), row]));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    for (const id of orderedIds) {
      if (fixtureIds.has(id) && fixtureAsset) {
        const identity = ReviewedMediaSchema.parse({
          kind: "asset", mediaId: id, objectKey: fixtureAsset.objectKey, sha256: fixtureAsset.hash, mime: fixtureAsset.mime,
          bytes: fixtureAsset.bytes, dimensions: fixtureAsset.dimensions,
          provenance: { source: "synthetic local browser fixture; not provider approval" }, approvalStatus: "approved",
          createdAt: fixtureAsset.createdAt, approvalAudit: null,
        });
        media.push(identity);
        const fixtureBytes = new Uint8Array(Buffer.from(E2E_SYNTHETIC_PNG_BASE64, "base64"));
        try {
          const validated = await validateUpload({ buffer: fixtureBytes, mime: "image/png", filename: "synthetic-local-preview.png" });
          if (validated.hash !== E2E_SYNTHETIC_PNG_SHA256 || validated.bytes !== E2E_SYNTHETIC_PNG_BYTES ||
              JSON.stringify(canonicalizeJson(validated.dimensions)) !== JSON.stringify(canonicalizeJson(fixtureAsset.dimensions))) {
            throw new MediaValidationError("Synthetic local browser fixture failed its recorded byte identity.");
          }
          verifiedBytes.set(id, validated.buffer ?? fixtureBytes);
        } catch (error) {
          addIssue(issues, id, error instanceof MediaValidationError ? error.message : "Synthetic local browser fixture failed validation.");
        }
        continue;
      }
      const row = rowsById.get(id);
      if (!row) {
        media.push({ kind: "missing", mediaId: id });
        addIssue(issues, id, "Referenced media asset is missing.");
        continue;
      }
      const identity = identityFromRow(row, auditById.get(id));
      media.push(identity);
      if (identity.kind !== "asset") continue;
      if (identity.approvalStatus !== "approved") {
        addIssue(issues, id, "Referenced media asset is not approved.");
        continue;
      }
      if (!Number.isSafeInteger(identity.bytes) || identity.bytes <= 0) {
        addIssue(issues, id, "Approved media byte metadata is invalid.");
        continue;
      }
      if (!/^[a-f0-9]{64}$/.test(identity.sha256)) {
        addIssue(issues, id, "Approved media hash metadata is invalid.");
        continue;
      }
      if (!["image/png", "image/jpeg", "image/webp"].includes(identity.mime)) {
        addIssue(issues, id, "Only approved still images can be used in project content.");
        continue;
      }
      try {
        const bytes = await fetchPrivateBytes(identity.objectKey, controller);
        const validated = await validateUpload({ buffer: bytes, mime: identity.mime as AllowedMimeType, filename: "reviewed-media" });
        if (validated.hash !== identity.sha256 || validated.bytes !== identity.bytes || validated.mime !== identity.mime ||
            JSON.stringify(canonicalizeJson(identity.dimensions ?? null)) !== JSON.stringify(canonicalizeJson(validated.dimensions))) {
          addIssue(issues, id, "Stored media bytes do not match their approved row metadata.");
          continue;
        }
        verifiedBytes.set(id, validated.buffer ?? bytes);
      } catch (error) {
        const message = error instanceof MediaValidationError ? error.message : "Approved private media could not be verified.";
        addIssue(issues, id, message);
      }
    }
  } finally {
    clearTimeout(timer);
  }
  return { media, issues, verifiedBytes };
}

export async function validateDraftMediaReferences(project: PublishedProject, transaction?: QueryableDb): Promise<void> {
  const imageBlocks = project.sections.flatMap((section) => section.blocks.filter((block) => block.type === "image"));
  const requested = imageBlocks.filter((block) => !isAcceptedPlaceholderBlock(block)).map((block) => block.mediaId);
  const result = await readReviewedMedia(requested, transaction);
  const invalid = [...new Set(requested)].filter((id) => {
    const media = result.media.find((item) => item.mediaId === id);
    return media?.kind !== "asset" || media.approvalStatus !== "approved" || result.issues.has(id);
  });
  if (invalid.length) throw new MediaValidationError(`Draft image references require approved, verified still images: ${invalid.join(", " )}`);
}

export async function readApprovedDraftMediaUrls(draft: DraftRecord, actor: OwnerContext): Promise<Record<string, string>> {
  if (!actor.userId || actor.assurance !== "aal2" || actor.role !== "owner" || !actor.active) {
    throw new MediaValidationError("Owner authorization is required for private draft media.");
  }
  const blocks = draft.project.sections.flatMap((section) => section.blocks.filter((block) => block.type === "image"));
  const ids = blocks.filter((block) => !isAcceptedPlaceholderBlock(block)).map((block) => block.mediaId);
  const result = await readReviewedMedia(ids);
  const urls: Record<string, string> = {};
  for (const item of result.media) {
    if (item.kind === "asset" && item.approvalStatus === "approved" && !result.issues.has(item.mediaId) && result.verifiedBytes.has(item.mediaId)) {
      urls[item.mediaId] = `/api/admin/preview/media/${encodeURIComponent(item.mediaId)}`;
    }
  }
  return urls;
}

export async function readApprovedDraftMediaBytes(mediaId: string, actor: OwnerContext): Promise<{ mime: string; bytes: Uint8Array } | null> {
  if (!actor.userId || actor.assurance !== "aal2" || actor.role !== "owner" || !actor.active) {
    throw new MediaValidationError("Owner authorization is required for private draft media.");
  }
  const result = await readReviewedMedia([mediaId]);
  const item = result.media[0];
  const bytes = result.verifiedBytes.get(mediaId);
  return item?.kind === "asset" && item.approvalStatus === "approved" && bytes && !result.issues.has(mediaId)
    ? { mime: item.mime, bytes }
    : null;
}


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

  const uniqueIds = [...new Set(mediaIds)];
  if (!transaction && isDraftTestRegistryEnabled()) {
    const registry = getTestMediaRegistry();
    const unapprovedIds = uniqueIds.filter((id) => registry.get(id)?.approvalStatus !== "approved");
    return { approved: unapprovedIds.length === 0, unapprovedIds };
  }
  const result = await readReviewedMedia(uniqueIds, transaction);
  const unapprovedIds = uniqueIds.filter((id) => {
    const item = result.media.find((entry) => entry.mediaId === id);
    return item?.kind !== "asset" || item.approvalStatus !== "approved" || result.issues.has(id);
  });
  return { approved: unapprovedIds.length === 0, unapprovedIds };
}

/**
 * Verifies that all image blocks in a publication snapshot reference approved media.
 * Throws MediaValidationError (422) if unapproved or missing media is detected.
 */
export async function verifyPublicationAssets(publication: Publication, transaction?: QueryableDb): Promise<void> {
  const referencedMediaIds: string[] = [];

  for (const project of publication.projects) for (const section of project.sections) for (const block of section.blocks) {
    if (block.type === "image" && !isAcceptedPlaceholderBlock(block)) referencedMediaIds.push(block.mediaId);
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
