import type { Publication, PublishedProject } from "@/contracts/content";
import { approvedPublication } from "@/content/approved-publication";
import { validatePublication } from "@/content/publication-reader";
import { createAdminServiceRoleClient } from "../auth/clients";
import type { OwnerContext } from "../auth/types";
import { getPlatformDb, isE2EFixture } from "../database";
import type { QueryableDb } from "../contact/quota";
import { isDraftTestRegistryEnabled, listProjectDrafts } from "../content/revisions";
import { getTestMediaRegistry, MediaValidationError, validateUpload, MAX_UPLOAD_BYTES, type AllowedMimeType, type MediaAssetRecord } from "./validate-upload";
import { readPublicPublication } from "../content/publish";

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type ReviewedMedia =
  | { kind: "asset"; mediaId: string; objectKey: string; sha256: string; mime: string; bytes: number; dimensions: JsonValue; provenance: JsonValue; approvalStatus: string; createdAt: string; approvalAudit: { eventId: string; createdAt: string } | null }
  | { kind: "accepted-placeholder"; mediaId: string }
  | { kind: "missing"; mediaId: string };
export interface ReviewedMediaResult { items: ReviewedMedia[]; issues: Map<string, string[]>; bytesById: Map<string, Uint8Array> }
type ImageBlock = Extract<PublishedProject["sections"][number]["blocks"][number], { type: "image" }>;
type PrivateAsset = Extract<ReviewedMedia, { kind: "asset" }>;
type E2EMediaFixture = { item: PrivateAsset; bytes: Uint8Array };

const testMediaBytes = new Map<string, Uint8Array>();
const e2eGlobal = globalThis as typeof globalThis & { __yorA1E2EMediaFixtures?: Map<string, E2EMediaFixture> };

function e2eMediaFixtures(): Map<string, E2EMediaFixture> {
  return e2eGlobal.__yorA1E2EMediaFixtures ??= new Map();
}

export function setTestMediaBytesForTests(id: string, bytes: Uint8Array | null): void {
  if (process.env.NODE_ENV !== "test" && process.env.VITEST !== "true") throw new Error("Test media bytes are test-only.");
  if (bytes) testMediaBytes.set(id, Uint8Array.from(bytes));
  else testMediaBytes.delete(id);
}

export function clearTestMediaBytesForTests(): void {
  if (process.env.NODE_ENV !== "test" && process.env.VITEST !== "true") throw new Error("Test media bytes are test-only.");
  testMediaBytes.clear();
}

export async function registerE2ESyntheticMediaFixture(input: { bytes: Uint8Array; mime: string; filename: string }): Promise<PrivateAsset> {
  if (!isE2EFixture()) throw new Error("Synthetic media fixtures are available only in the explicit local E2E fixture mode.");
  const validated = await validateUpload({ buffer: input.bytes, mime: input.mime, filename: input.filename });
  const id = `e2e-${validated.hash.slice(0, 32)}`;
  const createdAt = new Date().toISOString();
  const item: PrivateAsset = {
    kind: "asset", mediaId: id, objectKey: `synthetic-test-only/${id}/${validated.filename}`,
    sha256: validated.hash, mime: validated.mime, bytes: validated.bytes, dimensions: validated.dimensions,
    provenance: { source: "local-e2e-fixture", synthetic: true, providerApproved: false }, approvalStatus: "approved",
    createdAt, approvalAudit: { eventId: `synthetic-test-only:${id}`, createdAt },
  };
  e2eMediaFixtures().set(id, { item, bytes: Uint8Array.from(input.bytes) });
  return structuredClone(item);
}

export function listE2ESyntheticMediaFixtures(): PrivateAsset[] {
  if (!isE2EFixture()) throw new Error("Synthetic media fixtures are available only in the explicit local E2E fixture mode.");
  return [...e2eMediaFixtures().values()].map(({ item }) => structuredClone(item));
}

function compareCodePoint(left: string, right: string): number { return left < right ? -1 : left > right ? 1 : 0; }
function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort(compareCodePoint).map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}
function toJsonValue(value: unknown): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number") return value;
  if (Array.isArray(value)) return value.map(toJsonValue);
  if (typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, toJsonValue(item)]));
  return null;
}
function parseJson(value: unknown): JsonValue {
  if (typeof value !== "string") return toJsonValue(value);
  try { return toJsonValue(JSON.parse(value)); } catch { return null; }
}

/** A placeholder is valid only at the exact accepted project/section/block position and value. */
export function isAcceptedPlaceholder(projectId: string, sectionIndex: number, blockIndex: number, block: ImageBlock): boolean {
  if (!block.mediaId.startsWith("missing-")) return false;
  const project = approvedPublication.projects.find((item) => item.id === projectId);
  const accepted = project?.sections[sectionIndex]?.blocks[blockIndex];
  return accepted?.type === "image" && JSON.stringify(accepted) === JSON.stringify(block);
}

async function cancelBody(body: ReadableStream<Uint8Array> | null, reader: ReadableStreamDefaultReader<Uint8Array> | null, reason?: unknown): Promise<void> {
  try {
    const cancellation = reader ? reader.cancel(reason) : body && !body.locked ? body.cancel(reason) : Promise.resolve();
    await Promise.race([cancellation.catch(() => undefined), new Promise<void>((resolve) => setTimeout(resolve, 50))]);
  } catch { /* Keep the bounded-read error as the public result. */ }
}

/** Reads signed private bytes incrementally; the signed URL never leaves this function. */
export async function readPrivateSignedObject(
  createSignedUrl: (signal: AbortSignal) => Promise<string>,
  fetcher: typeof fetch = fetch,
  options: { maxBytes?: number; timeoutMs?: number } = {},
): Promise<Uint8Array> {
  const maxBytes = options.maxBytes ?? MAX_UPLOAD_BYTES;
  const timeoutMs = options.timeoutMs ?? 10_000;
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1) throw new TypeError("Invalid private media read bounds.");
  const controller = new AbortController();
  let rejectDeadline!: (reason: Error) => void;
  const deadlineError = new MediaValidationError("Private media read exceeded its 10-second deadline.");
  const deadline = new Promise<never>((_resolve, reject) => { rejectDeadline = reject; });
  const timer = setTimeout(() => { controller.abort(deadlineError); rejectDeadline(deadlineError); }, timeoutMs);
  let response: Response | null = null;
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  const raceDeadline = <T>(promise: Promise<T>) => Promise.race([promise, deadline]);

  try {
    const signedUrl = await raceDeadline(Promise.resolve().then(() => createSignedUrl(controller.signal)));
    const parsed = new URL(signedUrl);
    if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname))) {
      throw new MediaValidationError("Private media storage returned an invalid URL.");
    }
    const received = await raceDeadline(Promise.resolve().then(() => fetcher(signedUrl, { signal: controller.signal, redirect: "error" })));
    response = received;
    if (!received.ok) throw new MediaValidationError("Private media object could not be read.");
    const rawLength = received.headers.get("content-length");
    let declaredLength: number | null = null;
    if (rawLength !== null) {
      if (!/^\d+$/.test(rawLength) || !Number.isSafeInteger(Number(rawLength))) throw new MediaValidationError("Private media object has an invalid content length.");
      declaredLength = Number(rawLength);
      if (declaredLength > maxBytes) throw new MediaValidationError("Private media object exceeds the 5 MiB size limit.");
    }
    if (!received.body) throw new MediaValidationError("Private media object returned no readable body.");
    reader = received.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const result = await raceDeadline(reader.read());
      if (result.done) break;
      const chunk = result.value;
      if (total + chunk.byteLength > maxBytes) throw new MediaValidationError("Private media object exceeds the 5 MiB size limit.");
      chunks.push(chunk);
      total += chunk.byteLength;
    }
    if (declaredLength !== null && total !== declaredLength) throw new MediaValidationError("Private media content length does not match streamed bytes.");
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return bytes;
  } catch (error) {
    await cancelBody(response?.body ?? null, reader, error);
    if (error instanceof MediaValidationError) throw error;
    throw new MediaValidationError("Private media object could not be read within the bounded deadline.");
  } finally {
    clearTimeout(timer);
  }
}

function mediaRowsEqual(left: unknown, right: unknown): boolean { return stableJson(left) === stableJson(right); }
function validTimestamp(value: unknown): string | null {
  const date = new Date(String(value));
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}
function allowedMime(value: unknown): value is AllowedMimeType {
  return value === "image/png" || value === "image/jpeg" || value === "image/webp";
}
function addIssue(issues: Map<string, string[]>, id: string, reason: string): void {
  const current = issues.get(id) ?? [];
  if (!current.includes(reason)) current.push(reason);
  issues.set(id, current);
}

async function readBytesForAsset(item: PrivateAsset, tx?: QueryableDb): Promise<Uint8Array> {
  const fixture = e2eMediaFixtures().get(item.mediaId);
  if (isE2EFixture() && fixture) return Uint8Array.from(fixture.bytes);
  const localTestBytes = testMediaBytes.get(item.mediaId);
  if (localTestBytes) return Uint8Array.from(localTestBytes);
  const bucket = process.env.MEDIA_PRIVATE_BUCKET;
  if (!bucket) throw new MediaValidationError("Private media storage is not configured.");
  void tx;
  return readPrivateSignedObject(async () => {
    const result = await createAdminServiceRoleClient().storage.from(bucket).createSignedUrl(item.objectKey, 60);
    if (result.error || !result.data?.signedUrl) throw new Error("Private media signature unavailable.");
    return result.data.signedUrl;
  });
}

function mediaItemFromRecord(record: MediaAssetRecord): PrivateAsset {
  const createdAt = validTimestamp(record.createdAt);
  if (!createdAt) throw new MediaValidationError("Media metadata has an invalid timestamp.");
  return {
    kind: "asset", mediaId: record.id, objectKey: record.objectKey, sha256: record.hash, mime: record.mime,
    bytes: record.bytes, dimensions: toJsonValue(record.dimensions), provenance: null,
    approvalStatus: record.approvalStatus, createdAt,
    approvalAudit: record.approvalStatus === "approved" ? { eventId: `test-approval:${record.id}`, createdAt } : null,
  };
}

async function validateAssetBytes(item: PrivateAsset, bytes: Uint8Array): Promise<string[]> {
  const reasons: string[] = [];
  if (!allowedMime(item.mime)) return ["Media row has an unsupported image type."];
  if (!Number.isSafeInteger(item.bytes) || item.bytes < 1 || item.bytes > MAX_UPLOAD_BYTES) reasons.push("Media row has an invalid byte count.");
  if (!/^[a-f0-9]{64}$/.test(item.sha256)) reasons.push("Media row has an invalid SHA-256.");
  try {
    const verified = await validateUpload({ buffer: bytes, mime: item.mime, filename: item.objectKey.split("/").pop() ?? item.mediaId });
    if (verified.hash !== item.sha256 || verified.bytes !== item.bytes || !mediaRowsEqual(verified.dimensions, item.dimensions)) reasons.push("Private object bytes do not match the complete media row.");
  } catch (error) { reasons.push(error instanceof Error ? error.message : "Private object bytes failed media validation."); }
  return reasons;
}

/** Reads the exact reviewed row, latest approval receipt, and actual private object bytes. */
export async function readReviewedMedia(ids: string[], transaction?: QueryableDb): Promise<ReviewedMediaResult> {
  const sortedIds = [...new Set(ids)].sort(compareCodePoint);
  const items: ReviewedMedia[] = [];
  const issues = new Map<string, string[]>();
  const bytesById = new Map<string, Uint8Array>();
  if (sortedIds.length === 0) return { items, issues, bytesById };

  if (!transaction && isDraftTestRegistryEnabled()) {
    const registry = getTestMediaRegistry();
    for (const id of sortedIds) {
      const record = registry.get(id);
      if (!record) { items.push({ kind: "missing", mediaId: id }); continue; }
      let item: PrivateAsset;
      try { item = mediaItemFromRecord(record); }
      catch (error) { items.push({ kind: "missing", mediaId: id }); addIssue(issues, id, error instanceof Error ? error.message : "Invalid media row."); continue; }
      items.push(item);
      const bytes = testMediaBytes.get(id);
      if (!bytes) { addIssue(issues, id, "Private test fixture bytes were not supplied."); continue; }
      const reasons = await validateAssetBytes(item, bytes);
      if (reasons.length) reasons.forEach((reason) => addIssue(issues, id, reason));
      else bytesById.set(id, Uint8Array.from(bytes));
    }
    return { items, issues, bytesById };
  }

  if (isE2EFixture()) {
    for (const id of sortedIds) {
      const fixture = e2eMediaFixtures().get(id);
      if (!fixture) { items.push({ kind: "missing", mediaId: id }); continue; }
      items.push(structuredClone(fixture.item));
      const reasons = await validateAssetBytes(fixture.item, fixture.bytes);
      if (reasons.length) reasons.forEach((reason) => addIssue(issues, id, reason));
      else bytesById.set(id, Uint8Array.from(fixture.bytes));
    }
    if (items.length === sortedIds.length && items.some((item) => item.kind === "asset")) return { items, issues, bytesById };
  }

  let rows: Array<Record<string, unknown>>;
  let audits: Array<Record<string, unknown>>;
  try {
    const db = transaction ?? await getPlatformDb();
    const rowResult = await db.query(`SELECT id,object_key,hash,mime,bytes,dimensions,provenance,approval_status,created_at
      FROM public.media_assets WHERE id::text = ANY($1::text[]) ORDER BY id::text COLLATE "C"${transaction ? " FOR SHARE" : ""}`,[sortedIds]);
    const auditResult = await db.query(`SELECT id,entity_id,created_at FROM public.audit_events
      WHERE action='media_approved' AND entity_type='media' AND entity_id=ANY($1::text[])
      ORDER BY entity_id COLLATE "C",created_at DESC,id DESC`,[sortedIds]);
    rows = rowResult.rows;
    audits = auditResult.rows;
  } catch {
    for (const id of sortedIds) { items.push({ kind: "missing", mediaId: id }); addIssue(issues, id, "Durable media records could not be read."); }
    return { items, issues, bytesById };
  }

  const auditById = new Map<string, { eventId: string; createdAt: string }>();
  for (const row of audits) {
    const id = String(row["entity_id"]);
    if (auditById.has(id)) continue;
    const createdAt = validTimestamp(row["created_at"]);
    if (createdAt) auditById.set(id, { eventId: String(row["id"]), createdAt });
  }
  const byId = new Map(rows.map((row) => [String(row["id"]), row]));
  for (const id of sortedIds) {
    const row = byId.get(id);
    if (!row) { items.push({ kind: "missing", mediaId: id }); continue; }
    const createdAt = validTimestamp(row["created_at"]);
    const mime = row["mime"];
    const byteCount = Number(row["bytes"]);
    const approvalStatus = String(row["approval_status"] ?? "");
    if (!createdAt || typeof row["object_key"] !== "string" || !row["object_key"] || typeof row["hash"] !== "string" || !allowedMime(mime) || !Number.isSafeInteger(byteCount) || !["pending", "approved", "rejected"].includes(approvalStatus)) {
      items.push({ kind: "missing", mediaId: id });
      addIssue(issues, id, "Durable media metadata is malformed.");
      continue;
    }
    const item: PrivateAsset = {
      kind: "asset", mediaId: id, objectKey: row["object_key"], sha256: row["hash"], mime,
      bytes: byteCount, dimensions: parseJson(row["dimensions"]), provenance: parseJson(row["provenance"]),
      approvalStatus, createdAt, approvalAudit: auditById.get(id) ?? null,
    };
    items.push(item);
    if (item.approvalStatus === "approved" && !item.approvalAudit) addIssue(issues, id, "Approved media has no approval audit record.");
    try {
      const bytes = await readBytesForAsset(item, transaction);
      const reasons = await validateAssetBytes(item, bytes);
      if (reasons.length) reasons.forEach((reason) => addIssue(issues, id, reason));
      else bytesById.set(id, Uint8Array.from(bytes));
    } catch (error) { addIssue(issues, id, error instanceof Error ? error.message : "Private object validation failed."); }
  }
  return { items, issues, bytesById };
}

export async function readPrivateDraftMedia(id: string, actor: OwnerContext): Promise<{ bytes: Uint8Array; mime: string }> {
  const drafts = await listProjectDrafts(actor);
  const referenced = drafts.some((draft) => draft.project.sections.some((section, sectionIndex) => section.blocks.some((block, blockIndex) =>
    block.type === "image" && block.mediaId === id && !isAcceptedPlaceholder(draft.projectId, sectionIndex, blockIndex, block))));
  if (!referenced) throw Object.assign(new Error("Media asset not found for this private draft."), { status: 404 });
  const result = await readReviewedMedia([id]);
  const item = result.items[0];
  if (!item || item.kind !== "asset" || item.approvalStatus !== "approved" || !item.approvalAudit) throw Object.assign(new Error("Media asset is not approved for private preview."), { status: 404 });
  const reasons = result.issues.get(id) ?? [];
  const bytes = result.bytesById.get(id);
  if (reasons.length || !bytes) throw new MediaValidationError(`Private preview rejected: ${reasons.join(" ") || "validated bytes are unavailable."}`);
  return { bytes, mime: item.mime };
}

export async function validateDraftMediaReferences(project: PublishedProject, transaction?: QueryableDb): Promise<void> {
  const ids = new Set<string>();
  for (const [sectionIndex, section] of project.sections.entries()) {
    for (const [blockIndex, block] of section.blocks.entries()) {
      if (block.type === "image" && !isAcceptedPlaceholder(project.id, sectionIndex, blockIndex, block)) ids.add(block.mediaId);
    }
  }
  const result = await readReviewedMedia([...ids], transaction);
  const byId = new Map(result.items.map((item) => [item.mediaId, item]));
  const invalid = [...ids].filter((id) => {
    const item = byId.get(id);
    return !item || item.kind !== "asset" || item.approvalStatus !== "approved" || !item.approvalAudit || Boolean(result.issues.get(id)?.length) || !result.bytesById.has(id);
  });
  if (invalid.length) throw new MediaValidationError(`Draft rejected: media is missing, unapproved, or unverifiable: [${invalid.sort(compareCodePoint).join(", ")}].`);
}

export interface MediaCheckResult { approved: boolean; unapprovedIds: string[] }
export async function checkMediaApproved(ids: string[], transaction?: QueryableDb): Promise<MediaCheckResult> {
  const unique = [...new Set(ids)].sort(compareCodePoint);
  if (!unique.length) return { approved: true, unapprovedIds: [] };
  const result = await readReviewedMedia(unique, transaction);
  const byId = new Map(result.items.map((item) => [item.mediaId, item]));
  const unapprovedIds = unique.filter((id) => {
    const item = byId.get(id);
    return !item || item.kind !== "asset" || item.approvalStatus !== "approved" || !item.approvalAudit;
  });
  // This compatibility helper answers only whether metadata carries an approval receipt.
  // Draft, review, publication and rollback gates use readReviewedMedia directly and also
  // require validated bytes before they permit the content to be saved or published.
  return { approved: unapprovedIds.length === 0, unapprovedIds };
}

export async function verifyPublicationAssets(publication: Publication, transaction?: QueryableDb): Promise<void> {
  const ids = new Set<string>();
  for (const project of publication.projects) {
    for (const [sectionIndex, section] of project.sections.entries()) {
      for (const [blockIndex, block] of section.blocks.entries()) {
        if (block.type === "image" && !isAcceptedPlaceholder(project.id, sectionIndex, blockIndex, block)) ids.add(block.mediaId);
      }
    }
  }
  const result = await readReviewedMedia([...ids], transaction);
  const byId = new Map(result.items.map((item) => [item.mediaId, item]));
  const invalid = [...ids].filter((id) => {
    const item = byId.get(id);
    return !item || item.kind !== "asset" || item.approvalStatus !== "approved" || !item.approvalAudit || Boolean(result.issues.get(id)?.length) || !result.bytesById.has(id);
  });
  if (invalid.length) throw new MediaValidationError(`Publication rejected: unapproved, missing, or unverifiable media: [${invalid.sort(compareCodePoint).join(", ")}].`);
}

/** Public pages receive URLs only for approved assets referenced by the current approved snapshot. */
export async function readApprovedPublishedMediaUrls(publication: Publication): Promise<Record<string, string>> {
  try {
    const requested = validatePublication(publication);
    const snapshot = await readPublicPublication();
    if (!snapshot || snapshot.revision !== requested.revision) return {};
    const current = validatePublication(snapshot);
    const currentIds = new Set(current.projects.filter((project) => project.id !== "candidatex").flatMap((project) => project.sections.flatMap((section) => section.blocks.flatMap((block) => block.type === "image" ? [block.mediaId] : []))));
    const wanted = [...new Set(requested.projects.flatMap((project) => project.sections.flatMap((section) => section.blocks.flatMap((block) => block.type === "image" ? [block.mediaId] : []))))].filter((id) => currentIds.has(id) && !id.startsWith("missing-")).sort(compareCodePoint);
    const bucket = process.env.MEDIA_PRIVATE_BUCKET;
    if (!wanted.length || !bucket) return {};
    const db = await getPlatformDb();
    const assets = await db.query("SELECT id,object_key FROM public.media_assets WHERE approval_status='approved' AND id::text=ANY($1::text[])", [wanted]);
    if (!assets.rows.length) return {};
    const signed = await createAdminServiceRoleClient().storage.from(bucket).createSignedUrls(assets.rows.map((row) => String(row["object_key"])), 900);
    if (signed.error || !signed.data) return {};
    const byPath = new Map(assets.rows.map((row) => [String(row["object_key"]), String(row["id"])]));
    const urls: Record<string, string> = {};
    for (const item of signed.data) {
      if (!item.path || !item.signedUrl || item.error) continue;
      const id = byPath.get(item.path);
      try { if (id && new URL(item.signedUrl).protocol === "https:") urls[id] = item.signedUrl; } catch { /* Ignore malformed provider URLs. */ }
    }
    return urls;
  } catch { return {}; }
}

export async function readApprovedDraftMediaUrls(projects: PublishedProject[]): Promise<Record<string, string>> {
  const ids = new Set<string>();
  for (const project of projects) {
    for (const [sectionIndex, section] of project.sections.entries()) {
      for (const [blockIndex, block] of section.blocks.entries()) {
        if (block.type === "image" && !isAcceptedPlaceholder(project.id, sectionIndex, blockIndex, block)) ids.add(block.mediaId);
      }
    }
  }
  const result = await readReviewedMedia([...ids]);
  const byId = new Map(result.items.map((item) => [item.mediaId, item]));
  const urls: Record<string, string> = {};
  for (const id of ids) {
    const item = byId.get(id);
    if (item?.kind === "asset" && item.approvalStatus === "approved" && item.approvalAudit && !result.issues.has(id) && result.bytesById.has(id)) {
      urls[id] = `/api/admin/preview/media/${encodeURIComponent(id)}`;
    }
  }
  return urls;
}
