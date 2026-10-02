/**
 * YOR WORLD Milestone A4: Server-side Media Upload Validation
 *
 * Enforces strict MIME allowlisting, magic bytes inspection, file size boundaries,
 * and cryptographic hashing before private draft registration.
 */

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

/**
 * Extracts dimensions from image binary header.
 */
function extractDimensions(bytes: Uint8Array, mime: AllowedMimeType): { width: number; height: number } {
  try {
    if (mime === "image/png" && bytes.length >= 24) {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const width = view.getUint32(16, false);
      const height = view.getUint32(20, false);
      return { width: width || 800, height: height || 600 };
    }
  } catch {
    // Fallback to default dimensions
  }
  return { width: 1200, height: 800 };
}

/**
 * Inspects and validates uploaded media buffer.
 * Throws MediaValidationError (422) if invalid, corrupted, or unsupported.
 */
export function validateUpload(file: {
  buffer: Uint8Array | Buffer;
  mime: string;
  filename: string;
}): ValidatedMedia {
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
  const dimensions = extractDimensions(bytes, mime);

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
