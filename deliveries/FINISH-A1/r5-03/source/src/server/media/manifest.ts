/**
 * YOR WORLD Milestone A4: Media Manifest & Publication Integrity Checker
 *
 * Verifies that all media assets referenced in publication sections exist
 * and hold verified 'approved' status before entering public snapshots.
 */

import type { Publication, PublishedProject } from "@/contracts/content";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { getTestMediaRegistry, MAX_UPLOAD_BYTES, MediaValidationError, validateUpload } from "./validate-upload";
import { isDraftTestRegistryEnabled } from "../content/revisions";
import { getPlatformDb, isE2EFixture } from "../database";
import { createAdminServiceRoleClient, getSupabaseEnv } from "../auth/clients";
import { readPublicPublication } from "../content/publish";
import { validatePublication } from "@/content/publication-reader";
import { approvedPublication } from "@/content/approved-publication";
import type { QueryableDb } from "../contact/quota";
import type { MediaAssetRecord } from "./validate-upload";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type ReviewedMedia =
  | { kind: "asset"; mediaId: string; objectKey: string; sha256: string; mime: string; bytes: number;
      dimensions: JsonValue; provenance: JsonValue; approvalStatus: string; createdAt: string;
      approvalAudit: { eventId: string; createdAt: string } | null }
  | { kind: "accepted-placeholder"; mediaId: string }
  | { kind: "missing"; mediaId: string };
export type ReviewedMediaResult = {
  items: ReviewedMedia[];
  issues: Map<string, string[]>;
  bytesById: Map<string, Uint8Array>;
};

type ImageBlock = Extract<PublishedProject["sections"][number]["blocks"][number], { type: "image" }>;

/** A placeholder is valid only at the exact accepted project/section/block position and value. */
export function isAcceptedPlaceholder(projectId: string, sectionIndex: number, blockIndex: number, block: ImageBlock): boolean {
  if (!block.mediaId.startsWith("missing-")) return false;
  const acceptedProject = approvedPublication.projects.find((project) => project.id === projectId);
  const acceptedBlock = acceptedProject?.sections[sectionIndex]?.blocks[blockIndex];
  return acceptedBlock?.type === "image" && JSON.stringify(acceptedBlock) === JSON.stringify(block);
}

// Tests may supply bytes only alongside their synthetic database row. Production
// always reads the private Storage object and never treats this map as authority.
const testMediaBytes = new Map<string, Uint8Array>();
export function setTestMediaBytesForTests(id: string, bytes: Uint8Array | null): void {
  if (process.env.NODE_ENV !== "test" && process.env.VITEST !== "true") throw new Error("Test media bytes are test-only.");
  if (bytes) testMediaBytes.set(id, Uint8Array.from(bytes)); else testMediaBytes.delete(id);
}
export function clearTestMediaBytesForTests(): void {
  if (process.env.NODE_ENV !== "test" && process.env.VITEST !== "true") throw new Error("Test media bytes are test-only.");
  testMediaBytes.clear();
}

type TestStorageTransport = (bucket: string, objectKey: string, signal: AbortSignal) => Promise<Response>;
let testStorageTransport: TestStorageTransport | null = null;
export function setTestStorageTransportForTests(transport: TestStorageTransport | null): void {
  if (process.env.NODE_ENV !== "test" && process.env.VITEST !== "true") throw new Error("Test storage transport is test-only.");
  testStorageTransport = transport;
}

const E2E_APPROVED_MEDIA_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const e2eApprovedPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
const e2eApprovedMedia: MediaAssetRecord = {
  id: E2E_APPROVED_MEDIA_ID,
  objectKey: "e2e-fixtures/synthetic-local-approved-preview.png",
  hash: createHash("sha256").update(e2eApprovedPng).digest("hex"),
  mime: "image/png",
  bytes: e2eApprovedPng.byteLength,
  dimensions: { width: 1, height: 1 },
  approvalStatus: "approved",
  createdAt: "2026-10-11T00:00:00.000Z",
};
const e2eApprovedAudit = { eventId: "e2e-fixture-approval", createdAt: e2eApprovedMedia.createdAt };

/** A conspicuously synthetic approved row, available only to the explicit local E2E database fixture. */
export function listE2EApprovedMediaFixtures(): MediaAssetRecord[] {
  return isE2EFixture() ? [{ ...e2eApprovedMedia, dimensions: { ...e2eApprovedMedia.dimensions } }] : [];
}

/**
 * Accumulates at most 5 MiB from a response stream. The caller owns the single
 * deadline covering signed-URL creation, network fetch and this body read.
 */
export async function readBoundedResponse(response: Response, signal: AbortSignal,
  maxBytes = MAX_UPLOAD_BYTES): Promise<Uint8Array> {
  const cancelResponse = () => { void response.body?.cancel().catch(() => undefined); };
  if (!response.ok) {
    cancelResponse();
    throw new MediaValidationError("Private media object could not be read.");
  }
  if (!response.body) throw new MediaValidationError("Private media response has no body.");

  const declaredLengthHeader = response.headers.get("content-length");
  let declaredLength: number | null = null;
  if (declaredLengthHeader !== null) {
    if (!/^\d+$/.test(declaredLengthHeader.trim())) {
      cancelResponse();
      throw new MediaValidationError("Private media response has an invalid content length.");
    }
    declaredLength = Number(declaredLengthHeader);
    if (!Number.isSafeInteger(declaredLength)) {
      cancelResponse();
      throw new MediaValidationError("Private media response has an invalid content length.");
    }
    if (declaredLength > maxBytes) {
      cancelResponse();
      throw new MediaValidationError("Private media object exceeds the 5 MiB limit.");
    }
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let complete = false;
  let rejectAborted!: (reason: Error) => void;
  const aborted = new Promise<never>((_resolve, reject) => { rejectAborted = reject; });
  const onAbort = () => {
    rejectAborted(new MediaValidationError("Private media read timed out or was aborted."));
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener("abort", onAbort, { once: true });
  if (signal.aborted) onAbort();

  try {
    for (;;) {
      const result = await Promise.race([reader.read(), aborted]);
      if (signal.aborted) throw new MediaValidationError("Private media read timed out or was aborted.");
      if (result.done) { complete = true; break; }
      const chunk = result.value;
      total += chunk.byteLength;
      if (total > maxBytes) throw new MediaValidationError("Private media object exceeds the 5 MiB limit.");
      chunks.push(chunk);
    }
    if (declaredLength !== null && total !== declaredLength) {
      throw new MediaValidationError("Private media response length does not match its content-length header.");
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return bytes;
  } catch (error) {
    if (!complete) void reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}

async function readPrivateStorageBytes(bucket: string, objectKey: string): Promise<Uint8Array> {
  return withPrivateMediaReadDeadline(async (signal) => {
    let response: Response;
    if (testStorageTransport) {
      response = await testStorageTransport(bucket, objectKey, signal);
    } else {
      const env = getSupabaseEnv();
      if (!env.supabaseServiceRoleKey) throw new Error("Private media storage is not configured.");
      const fetchWithDeadline: typeof fetch = (input, init = {}) => {
        const requestSignal = init.signal ? AbortSignal.any([signal, init.signal]) : signal;
        return fetch(input, { ...init, signal: requestSignal });
      };
      const client = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { fetch: fetchWithDeadline },
      });
      const signed = await client.storage.from(bucket).createSignedUrl(objectKey, 30);
      if (signed.error || !signed.data?.signedUrl) throw new Error("Private media object could not be signed.");
      const signedUrl = new URL(signed.data.signedUrl, env.supabaseUrl);
      if (signedUrl.origin !== new URL(env.supabaseUrl).origin) throw new Error("Private media URL origin is invalid.");
      response = await fetch(signedUrl, { signal, redirect: "error" });
    }
    return await readBoundedResponse(response, signal);
  });
}

export async function withPrivateMediaReadDeadline<T>(work: (signal: AbortSignal) => Promise<T>, timeoutMs = 10_000): Promise<T> {
  const controller = new AbortController();
  let rejectAborted!: (reason: Error) => void;
  const aborted = new Promise<never>((_resolve, reject) => { rejectAborted = reject; });
  const onAbort = () => rejectAborted(new MediaValidationError("Private media read timed out or was aborted."));
  controller.signal.addEventListener("abort", onAbort, { once: true });
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  timeout.unref?.();
  try {
    return await Promise.race([work(controller.signal), aborted]);
  } catch (error) {
    if (controller.signal.aborted) throw new MediaValidationError("Private media read timed out or was aborted.");
    throw error;
  } finally {
    clearTimeout(timeout);
    controller.signal.removeEventListener("abort", onAbort);
  }
}

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
function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort(compareCodePoint).map((key) => `${JSON.stringify(key)}:${stableJson(object[key])}`).join(",")}}`;
}
function jsonValue(value: unknown): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number") return value;
  if (Array.isArray(value)) return value.map(jsonValue);
  if (typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, jsonValue(item)]));
  return null;
}
function parseJson(value: unknown): JsonValue {
  if (typeof value !== "string") return jsonValue(value);
  try { return jsonValue(JSON.parse(value)); } catch { return null; }
}

/** Reads the exact reviewed row, its latest approval receipt and actual object bytes. */
export async function readReviewedMedia(ids: string[], transaction?: QueryableDb): Promise<ReviewedMediaResult> {
  const sortedIds = [...new Set(ids)].sort(compareCodePoint);
  const items: ReviewedMedia[] = [];
  const issues = new Map<string, string[]>();
  const bytesById = new Map<string, Uint8Array>();
  if (!sortedIds.length) return { items, issues, bytesById };

  let rows: Array<Record<string, unknown>> = [];
  let audits: Array<Record<string, unknown>> = [];
  if (!transaction && isDraftTestRegistryEnabled()) {
    const registry = getTestMediaRegistry();
    for (const id of sortedIds) {
      const record = registry.get(id);
      if (!record) { items.push({ kind: "missing", mediaId: id }); continue; }
      const bytes = testMediaBytes.get(id);
      const item: ReviewedMedia = { kind: "asset", mediaId: id, objectKey: record.objectKey, sha256: record.hash,
        mime: record.mime, bytes: record.bytes, dimensions: jsonValue(record.dimensions), provenance: null,
        approvalStatus: record.approvalStatus, createdAt: record.createdAt,
        approvalAudit: record.approvalStatus === "approved" ? { eventId: `test-approval:${id}`,createdAt: record.createdAt } : null };
      items.push(item);
      const reasons: string[] = [];
      if (!bytes) reasons.push("Storage bytes were not supplied by the test fixture.");
      else {
        try {
          const verified = await validateUpload({ buffer: bytes, mime: record.mime, filename: record.objectKey.split("/").pop() ?? id });
          if (verified.hash !== record.hash || verified.bytes !== record.bytes || stableJson(verified.dimensions) !== stableJson(record.dimensions)) reasons.push("Storage bytes do not match the media row.");
          else bytesById.set(id, Uint8Array.from(bytes));
        } catch (error) { reasons.push(error instanceof Error ? error.message : "Storage bytes failed validation."); }
      }
      if (reasons.length) issues.set(id, reasons);
    }
    return { items, issues, bytesById };
  }

  try {
    const db = transaction ?? await getPlatformDb();
    const assetResult = await db.query(`SELECT id,object_key,hash,mime,bytes,dimensions,provenance,approval_status,created_at
      FROM public.media_assets WHERE id::text = ANY($1::text[]) ORDER BY id::text COLLATE "C"${transaction ? " FOR SHARE" : ""}`,[sortedIds]);
    rows = assetResult.rows;
    const auditResult = await db.query(`SELECT id,entity_id,created_at FROM public.audit_events
      WHERE action='media_approved' AND entity_type='media' AND entity_id=ANY($1::text[])
      ORDER BY entity_id COLLATE "C",created_at DESC,id DESC`,[sortedIds]);
    audits = auditResult.rows;
  } catch {
    for (const id of sortedIds) { items.push({ kind: "missing", mediaId: id }); issues.set(id,["Durable media records could not be read."]); }
    return { items, issues, bytesById };
  }
  const auditById = new Map<string, { eventId: string; createdAt: string }>();
  for (const row of audits) {
    const id = String(row["entity_id"]);
    if (!auditById.has(id)) auditById.set(id,{ eventId: String(row["id"]),createdAt: new Date(String(row["created_at"])).toISOString() });
  }
  const rowById = new Map(rows.map((row) => [String(row["id"]),row]));
  for (const id of sortedIds) {
    if (isE2EFixture() && id === E2E_APPROVED_MEDIA_ID) {
      const item: ReviewedMedia = { kind: "asset", mediaId: e2eApprovedMedia.id, objectKey: e2eApprovedMedia.objectKey,
        sha256: e2eApprovedMedia.hash, mime: e2eApprovedMedia.mime, bytes: e2eApprovedMedia.bytes,
        dimensions: e2eApprovedMedia.dimensions, provenance: { source: "synthetic local E2E fixture; not provider approval" },
        approvalStatus: "approved", createdAt: e2eApprovedMedia.createdAt, approvalAudit: e2eApprovedAudit };
      items.push(item);
      try {
        const verified = await validateUpload({ buffer: e2eApprovedPng, mime: e2eApprovedMedia.mime, filename: "approved-preview.png" });
        if (verified.hash !== item.sha256 || verified.bytes !== item.bytes ||
            stableJson(verified.dimensions) !== stableJson(item.dimensions)) {
          issues.set(id, ["Synthetic E2E bytes do not match their fixture identity."]);
        } else bytesById.set(id, Uint8Array.from(e2eApprovedPng));
      } catch (error) {
        issues.set(id, [error instanceof Error ? error.message : "Synthetic E2E bytes failed validation."]);
      }
      continue;
    }
    const row = rowById.get(id);
    if (!row) { items.push({ kind: "missing", mediaId: id }); continue; }
    const mime = String(row["mime"] ?? "");
    const rowBytes = Number(row["bytes"]);
    const createdAt = new Date(String(row["created_at"])).toISOString();
    const audit = auditById.get(id) ?? null;
    const item: ReviewedMedia = { kind: "asset", mediaId: id, objectKey: String(row["object_key"]),
      sha256: String(row["hash"]), mime, bytes: rowBytes, dimensions: parseJson(row["dimensions"]),
      provenance: parseJson(row["provenance"]), approvalStatus: String(row["approval_status"]), createdAt, approvalAudit: audit };
    items.push(item);
    const reasons: string[] = [];
    let bytes: Uint8Array | null = null;
    try {
      if (testMediaBytes.has(id)) bytes = testMediaBytes.get(id)!;
      else {
        const bucket = process.env.MEDIA_PRIVATE_BUCKET;
        if (!bucket) throw new Error("Private media storage is not configured.");
        bytes = await readPrivateStorageBytes(bucket, item.objectKey);
      }
      const verified = await validateUpload({ buffer: bytes, mime, filename: item.objectKey.split("/").pop() ?? id });
      if (verified.hash !== item.sha256 || verified.bytes !== item.bytes || stableJson(verified.dimensions) !== stableJson(item.dimensions)) {
        reasons.push("Storage bytes do not match the reviewed media row.");
      } else bytesById.set(id,Uint8Array.from(bytes));
    } catch (error) { reasons.push(error instanceof Error ? error.message : "Storage object validation failed."); }
    if (item.approvalStatus === "approved" && !item.approvalAudit) reasons.push("Approved media has no durable approval audit event.");
    if (reasons.length) issues.set(id,reasons);
  }
  return { items,issues,bytesById };
}

export async function readPrivateDraftMedia(id: string): Promise<{ bytes: Uint8Array; mime: string }> {
  const result = await readReviewedMedia([id]);
  const item = result.items[0];
  if (!item || item.kind !== "asset" || item.approvalStatus !== "approved" || !item.approvalAudit) {
    throw Object.assign(new Error("Media asset not found or not approved for preview."),{ status: 404 });
  }
  const reasons = result.issues.get(id) ?? [];
  if (reasons.length) throw new MediaValidationError(`Media preview rejected: ${reasons.join(" ")}`);
  const bytes = result.bytesById.get(id);
  if (!bytes) throw new MediaValidationError("Media preview rejected because validated bytes are unavailable.");
  return { bytes,mime:item.mime };
}

/** Save-time validation. An edit pointer cannot advance with dangling or unverifiable media references. */
export async function validateDraftMediaReferences(project: PublishedProject, transaction?: QueryableDb): Promise<void> {
  const ids = [...new Set(project.sections.flatMap((section, sectionIndex) => section.blocks.flatMap((block, blockIndex) =>
    block.type === "image" && !isAcceptedPlaceholder(project.id, sectionIndex, blockIndex, block) ? [block.mediaId] : [])))].sort(compareCodePoint);
  const result = await readReviewedMedia(ids,transaction);
  const byId = new Map(result.items.map((item) => [item.mediaId,item]));
  const invalid = ids.filter((id) => {
    const item = byId.get(id);
    return !item || item.kind !== "asset" || item.approvalStatus !== "approved" || !item.approvalAudit ||
      Boolean(result.issues.get(id)?.length) || !result.bytesById.has(id);
  });
  if (invalid.length) throw new MediaValidationError(`Draft rejected: media is missing, unapproved or unverifiable: [${invalid.join(", ")}].`);
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
  const uniqueIds = [...new Set(mediaIds)].sort(compareCodePoint);
  // Legacy unit helper has a status-only in-memory adapter. Publication,
  // save, review and proxy gates do not call this shortcut; they use the
  // byte-and-audit verifier below through their own boundary functions.
  if (!transaction && isDraftTestRegistryEnabled()) {
    const registry = getTestMediaRegistry();
    const unapprovedIds = uniqueIds.filter((id) => registry.get(id)?.approvalStatus !== "approved");
    return { approved: unapprovedIds.length === 0,unapprovedIds };
  }
  const result = await readReviewedMedia(uniqueIds,transaction);
  const byId = new Map(result.items.map((item) => [item.mediaId,item]));
  const unapproved = uniqueIds.filter((id) => {
    const item = byId.get(id);
    return !item || item.kind !== "asset" || item.approvalStatus !== "approved" || !item.approvalAudit ||
      Boolean(result.issues.get(id)?.length) || !result.bytesById.has(id);
  });
  return { approved: unapproved.length === 0,unapprovedIds: unapproved };
}

/**
 * Verifies that all image blocks in a publication snapshot reference approved media.
 * Throws MediaValidationError (422) if unapproved or missing media is detected.
 */
export async function verifyPublicationAssets(publication: Publication, transaction?: QueryableDb): Promise<void> {
  const referencedMediaIds: string[] = [];

  for (const project of publication.projects) {
    for (const [sectionIndex, section] of project.sections.entries()) {
      for (const [blockIndex, block] of section.blocks.entries()) {
        if (block.type === "image" && block.mediaId) {
          // Retain the exact accepted honest placeholder; it never resolves to a media URL.
          if (isAcceptedPlaceholder(project.id, sectionIndex, blockIndex, block)) continue;
          referencedMediaIds.push(block.mediaId);
        }
      }
    }
  }

  if (referencedMediaIds.length === 0) {
    return;
  }

  const uniqueIds = [...new Set(referencedMediaIds)].sort(compareCodePoint);
  const result = await readReviewedMedia(uniqueIds,transaction);
  const byId = new Map(result.items.map((item) => [item.mediaId,item]));
  const unapproved = uniqueIds.filter((id) => {
    const item = byId.get(id);
    return !item || item.kind !== "asset" || item.approvalStatus !== "approved" || !item.approvalAudit ||
      Boolean(result.issues.get(id)?.length) || !result.bytesById.has(id);
  });
  if (unapproved.length) {
    throw new MediaValidationError(
      `Publication rejected: contains unapproved, missing or unverifiable media assets: [${unapproved.join(", ")}]. All media must be verified and approved before publication.`
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
    for (const [sectionIndex, section] of proj.sections.entries()) {
      for (const [blockIndex, block] of section.blocks.entries()) {
        if (block.type === "image" && block.mediaId && !isAcceptedPlaceholder(proj.id, sectionIndex, blockIndex, block)) {
          referencedIds.add(block.mediaId);
        }
      }
    }
  }

  const result = await readReviewedMedia(Array.from(referencedIds));
  const byId = new Map(result.items.map((item) => [item.mediaId,item]));
  const urls: Record<string, string> = {};
  for (const id of referencedIds) {
    const item = byId.get(id);
    if (item?.kind === "asset" && item.approvalStatus === "approved" && item.approvalAudit &&
        !result.issues.has(id) && result.bytesById.has(id)) {
      urls[id] = `/api/admin/preview/media/${encodeURIComponent(id)}`;
    }
  }
  return urls;
}
