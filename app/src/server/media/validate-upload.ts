/**
 * YOR WORLD Milestone A4: Server-side Media Upload Validation
 *
 * Enforces strict MIME allowlisting, magic bytes inspection, file size boundaries,
 * and cryptographic hashing before private draft registration.
 */

import sharp from "sharp";
import { crc32 } from "node:zlib";
import { createHash } from "node:crypto";
import type { OwnerContext } from "../auth/types";
import { createAdminServiceRoleClient } from "../auth/clients";
import { getPlatformDb } from "../database";
import { isDraftTestRegistryEnabled } from "../content/revisions";

export const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MiB

export class MediaValidationError extends Error {
  readonly status = 422;
  readonly code = "INVALID_MEDIA";

  constructor(message: string) {
    super(message);
    this.name = "MediaValidationError";
  }
}

export interface ValidatedMedia {
  buffer?: Uint8Array;
  hash: string;
  mime: AllowedMimeType;
  bytes: number;
  filename: string;
  dimensions: { width: number; height: number };
}

export interface MediaAssetRecord {
  id: string;
  objectKey: string;
  hash: string;
  mime: AllowedMimeType;
  bytes: number;
  dimensions: { width: number; height: number };
  approvalStatus: "pending" | "approved" | "rejected";
  createdAt: string;
}

function initializeDefaultMedia(): Map<string, MediaAssetRecord> {
  const map = new Map<string, MediaAssetRecord>();
  map.set("missing-helios-diagram", {
    id: "missing-helios-diagram",
    objectKey: "approved/helios/diagram.png",
    hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    mime: "image/png",
    bytes: 1024,
    dimensions: { width: 800, height: 600 },
    approvalStatus: "approved",
    createdAt: "2026-10-01T12:00:00Z",
  });
  return map;
}

// In-memory test registry for isolated testing
let testMediaRegistry: Map<string, MediaAssetRecord> | null = null;

export function setTestMediaRegistry(registry: Map<string, MediaAssetRecord> | null) {
  if (!isDraftTestRegistryEnabled()) throw new Error("Media registry is test-only.");
  testMediaRegistry = registry;
}

export function getTestMediaRegistry(): Map<string, MediaAssetRecord> {
  if (!testMediaRegistry) {
    testMediaRegistry = initializeDefaultMedia();
  }
  return testMediaRegistry;
}

/**
 * Validates header magic bytes against claimed MIME type.
 */
function verifyMagicBytes(bytes: Uint8Array, mime: string): boolean {
  if (mime === "image/png") {
    // 89 50 4E 47 0D 0A 1A 0A
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }
  if (mime === "image/jpeg") {
    // FF D8 FF
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mime === "image/webp") {
    // RIFF .... WEBP
    if (bytes.length < 12) return false;
    const riff = String.fromCharCode(...Array.from(bytes.slice(0, 4)));
    const webp = String.fromCharCode(...Array.from(bytes.slice(8, 12)));
    return riff === "RIFF" && webp === "WEBP";
  }
  return false;
}

// libpng can decode pixels even when the final IEND is missing. Check the
// entire PNG container and checksums as well as forcing a complete pixel decode.
function verifyPngContainer(bytes: Uint8Array): void {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 8;
  let first = true;
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset, false);
    const end = offset + 12 + length;
    if (end > bytes.length) break;
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    if ((first && (type !== "IHDR" || length !== 13)) ||
        crc32(bytes.subarray(offset + 4, end - 4)) !== view.getUint32(end - 4, false)) break;
    if (type === "IEND") {
      if (length === 0 && end === bytes.length) return;
      break;
    }
    first = false;
    offset = end;
  }
  throw new MediaValidationError("Upload rejected: corrupt or truncated PNG container.");
}

// Bound decoded RGBA output to 64 MiB and reject pathological image axes.
export const MAX_IMAGE_DIMENSION = 8192;
export const MAX_IMAGE_PIXELS = 16 * 1024 * 1024;

async function decodeDimensions(bytes: Uint8Array, mime: AllowedMimeType) {
  try {
    if (mime === "image/png") verifyPngContainer(bytes);
    if (mime === "image/webp" && new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(4, true) + 8 !== bytes.length) {
      throw new Error("Invalid WebP RIFF length");
    }
    const decoder = sharp(Buffer.from(bytes), {
      failOn: "warning",
      limitInputPixels: MAX_IMAGE_PIXELS,
      animated: true,
    });
    const metadata = await decoder.metadata();
    const expectedFormat = mime === "image/jpeg" ? "jpeg" : mime.slice(6);
    const { width, height } = metadata;
    if (metadata.format !== expectedFormat || !width || !height ||
        width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION ||
        width * height > MAX_IMAGE_PIXELS || (metadata.pages ?? 1) !== 1) {
      throw new Error("Invalid image dimensions, format or frame count");
    }
    // metadata() alone never proves that compressed pixel data is intact.
    // Force complete decoding without resize or other shortcuts.
    const { info } = await decoder.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    if (info.width !== width || info.height !== height) throw new Error("Dimension mismatch");
    return { width, height };
  } catch {
    throw new MediaValidationError("Upload rejected: image is corrupt, truncated or exceeds image dimension/pixel limits.");
  }
}

/**
 * Inspects and validates uploaded media buffer.
 * Throws MediaValidationError (422) if invalid, corrupted, or unsupported.
 */
export async function validateUpload(file: {
  buffer: Uint8Array | Buffer;
  mime: string;
  filename: string;
}): Promise<ValidatedMedia> {
  const bytes = file.buffer instanceof Uint8Array ? file.buffer : new Uint8Array(file.buffer);

  if (!file.mime || !ALLOWED_MIME_TYPES.includes(file.mime as AllowedMimeType)) {
    throw new MediaValidationError(
      `Unsupported media MIME type '${file.mime}'. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`
    );
  }

  const mime = file.mime as AllowedMimeType;

  if (bytes.length === 0) {
    throw new MediaValidationError("Upload rejected: empty file payload");
  }

  if (bytes.length > MAX_UPLOAD_BYTES) {
    throw new MediaValidationError(
      `Upload rejected: file size ${bytes.length} bytes exceeds maximum ${MAX_UPLOAD_BYTES} bytes (5 MiB)`
    );
  }

  if (!verifyMagicBytes(bytes, mime)) {
    throw new MediaValidationError(
      `Media validation failed: file header does not match claimed MIME type '${mime}'. Header spoofing rejected.`
    );
  }

  const hash = createHash("sha256").update(bytes).digest("hex");
  const dimensions = await decodeDimensions(bytes, mime);

  return {
    buffer: bytes,
    hash,
    mime,
    bytes: bytes.length,
    filename: file.filename || `asset-${hash.slice(0, 8)}.${mime.split("/")[1]}`,
    dimensions,
  };
}

/**
 * Registers a validated media asset as a private draft (approval_status: 'pending').
 */
export async function registerMediaAsset(
  validated: ValidatedMedia,
  actor: OwnerContext
): Promise<MediaAssetRecord> {
  const assetId = `med-${validated.hash.slice(0, 16)}`;
  const objectKey = `private/drafts/${assetId}/${validated.filename}`;
  const now = new Date().toISOString();

  const record: MediaAssetRecord = {
    id: assetId,
    objectKey,
    hash: validated.hash,
    mime: validated.mime,
    bytes: validated.bytes,
    dimensions: validated.dimensions,
    approvalStatus: "pending",
    createdAt: now,
  };

  if (isDraftTestRegistryEnabled()) {
    getTestMediaRegistry().set(assetId,record);
    return record;
  }
  if (!validated.buffer) throw new MediaValidationError("Validated media bytes are required.");
  const safeFilename = validated.filename.replace(/[^a-zA-Z0-9._-]/g,"_");
  const privateKey = `drafts/${validated.hash}/${safeFilename}`;
  const bucket = process.env.MEDIA_PRIVATE_BUCKET;
  if (!bucket) throw new Error("Private media storage is not configured.");
  const storage = createAdminServiceRoleClient().storage.from(bucket);
  const uploaded = await storage.upload(privateKey,validated.buffer,{ contentType: validated.mime,upsert: false });
  if (uploaded.error) throw new Error("Private media upload failed.");
  try {
    const db = await getPlatformDb();
    const rows = await db.query(`INSERT INTO public.media_assets(object_key,hash,mime,bytes,dimensions,provenance,approval_status)
      VALUES($1,$2,$3,$4,$5,$6,'pending') RETURNING *`, [privateKey,validated.hash,validated.mime,validated.bytes,
      JSON.stringify(validated.dimensions),JSON.stringify({ uploadedBy: actor.userId,filename: safeFilename })]);
    return rowToMedia(rows.rows[0]!);
  } catch (error) {
    await storage.remove([privateKey]);
    throw error;
  }
}

/**
 * Approves a pending media asset for use in public publications.
 */
export async function approveMediaAsset(
  mediaId: string,
  _actor: OwnerContext
): Promise<MediaAssetRecord> {
  void _actor;
  if (isDraftTestRegistryEnabled()) {
    const existing = getTestMediaRegistry().get(mediaId);
    if (!existing) throw new MediaValidationError("Media asset not found.");
    existing.approvalStatus="approved";
    return existing;
  }
  const db=await getPlatformDb();
  if (!db.transaction) throw new Error("Transactional database is required.");
  return db.transaction(async (tx) => {
    const rows=await tx.query("UPDATE public.media_assets SET approval_status='approved' WHERE id::text=$1 RETURNING *", [mediaId]);
    if (!rows.rows[0]) throw new MediaValidationError("Media asset not found.");
    await tx.query("INSERT INTO public.audit_events(actor,action,entity_type,entity_id) VALUES($1,'media_approved','media',$2)", [_actor.userId,mediaId]);
    return rowToMedia(rows.rows[0]);
  });
}

function rowToMedia(row: Record<string,unknown>): MediaAssetRecord {
  return { id: String(row["id"]),objectKey: String(row["object_key"]),hash: String(row["hash"]),
    mime: row["mime"] as AllowedMimeType,bytes: Number(row["bytes"]),dimensions: row["dimensions"] as MediaAssetRecord["dimensions"],
    approvalStatus: row["approval_status"] as MediaAssetRecord["approvalStatus"],createdAt: new Date(String(row["created_at"])).toISOString() };
}

export async function listMediaAssets(): Promise<MediaAssetRecord[]> {
  if (isDraftTestRegistryEnabled()) return [...getTestMediaRegistry().values()];
  const db=await getPlatformDb();
  const result=await db.query("SELECT * FROM public.media_assets ORDER BY created_at DESC");
  return result.rows.map(rowToMedia);
}

export async function getMediaAsset(id: string): Promise<MediaAssetRecord | null> {
  if (isDraftTestRegistryEnabled()) return getTestMediaRegistry().get(id) ?? null;
  const db=await getPlatformDb();
  const result=await db.query("SELECT * FROM public.media_assets WHERE id::text=$1 LIMIT 1",[id]);
  return result.rows[0] ? rowToMedia(result.rows[0]) : null;
}
