import { createHash } from "node:crypto";
import type { PublishedProject, Publication } from "@/contracts/content";
import { approvedPublication } from "@/content/approved-publication";
import { validatePublication } from "@/content/publication-reader";
import { createAdminServiceRoleClient } from "../auth/clients";
import { getPlatformDb, hasPlatformDatabase, isE2EFixture } from "../database";
import type { QueryableDb } from "../contact/quota";
import type { DraftRecord } from "../content/revisions";
import { isDraftTestRegistryEnabled } from "../content/revisions";
import type { OwnerContext } from "../auth/types";
import type { JsonValue, ReviewedMedia } from "../content/preview";

export const PRIVATE_MEDIA_BYTE_LIMIT = 5 * 1024 * 1024;
export const PRIVATE_MEDIA_READ_DEADLINE_MS = 10_000;
export const R5_E2E_FIXTURE_MEDIA_ID = "00000000-0000-4000-8000-000000000051";

const R5_E2E_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);
const R5_E2E_FIXTURE_AUDIT_ID = "00000000-0000-4000-8000-000000000052";

export interface ReviewedMediaRead {
  media: ReviewedMedia[];
  bytesById: Map<string, Uint8Array>;
  issues: Map<string, string[]>;
}

const testMediaBytes = new Map<string, Uint8Array>();

export function setTestReviewedMediaBytes(mediaId: string, bytes: Uint8Array | null): void {
  if (!isDraftTestRegistryEnabled()) throw new Error("Reviewed media byte fixtures are test-only.");
  if (bytes === null) testMediaBytes.delete(mediaId);
  else testMediaBytes.set(mediaId, Uint8Array.from(bytes));
}

export function resetTestReviewedMediaBytes(): void {
  if (!isDraftTestRegistryEnabled()) throw new Error("Reviewed media byte fixtures are test-only.");
  testMediaBytes.clear();
}

function compareCodePoint(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function jsonValue(value: unknown): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(jsonValue);
  if (typeof value === "object") {
    const output: Record<string, JsonValue> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) output[key] = jsonValue(item);
    return output;
  }
  if (typeof value === "string") {
    try { return jsonValue(JSON.parse(value)); } catch { return null; }
  }
  return null;
}

function normalizedTimestamp(value: unknown): string | null {
  const date = new Date(String(value));
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function addIssue(issues: Map<string, string[]>, id: string, message: string): void {
  const current = issues.get(id) ?? [];
  current.push(message);
  issues.set(id, current);
}

export async function ensureR5E2EFixtureAsset(): Promise<void> {
  if (!isE2EFixture()) return;
  const db = await getPlatformDb();
  const hash = createHash("sha256").update(R5_E2E_PNG).digest("hex");
  const existing = await db.query("SELECT id FROM public.media_assets WHERE id::text=$1 LIMIT 1", [R5_E2E_FIXTURE_MEDIA_ID]);
  if (!existing.rows.length) {
    await db.query(
      "INSERT INTO public.media_assets(id,object_key,hash,mime,bytes,dimensions,provenance,approval_status,created_at) VALUES($1,$2,$3,'image/png',$4,$5,$6,'approved',$7)",
      [
        R5_E2E_FIXTURE_MEDIA_ID,
        "r5-test-only/approved-fixture.png",
        hash,
        R5_E2E_PNG.length,
        JSON.stringify({ width: 1, height: 1 }),
        JSON.stringify({ source: "synthetic local E2E fixture; not provider approval" }),
        "2026-10-11T00:00:00.000Z",
      ],
    );
  }
  const audit = await db.query(
    "SELECT id FROM public.audit_events WHERE entity_type='media' AND entity_id=$1 AND action='media_approved' LIMIT 1",
    [R5_E2E_FIXTURE_MEDIA_ID],
  );
  if (!audit.rows.length) {
    await db.query(
      "INSERT INTO public.audit_events(id,actor,action,entity_type,entity_id,payload,created_at) VALUES($1,$2,'media_approved','media',$3,$4,$5)",
      [
        R5_E2E_FIXTURE_AUDIT_ID,
        "11111111-1111-1111-1111-111111111111",
        R5_E2E_FIXTURE_MEDIA_ID,
        JSON.stringify({ source: "synthetic local E2E fixture; not provider approval" }),
        "2026-10-11T00:00:00.000Z",
      ],
    );
  }
}

async function readPrivateObject(mediaId: string, objectKey: string): Promise<Uint8Array> {
  if (isE2EFixture() && mediaId === R5_E2E_FIXTURE_MEDIA_ID) return new Uint8Array(R5_E2E_PNG);
  const bucket = process.env.MEDIA_PRIVATE_BUCKET;
  if (!bucket) throw new Error("Private media storage is not configured.");

  const controller = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let rejectDeadline: ((reason: Error) => void) | undefined;
  const deadline = new Promise<Uint8Array>((_resolve, reject) => {
    rejectDeadline = reject;
    timeout = setTimeout(() => {
      controller.abort();
      if (reader) void reader.cancel().catch(() => undefined);
      reject(new Error("Private media read exceeded its 10-second deadline."));
    }, PRIVATE_MEDIA_READ_DEADLINE_MS);
  });

  const operation = (async () => {
    const storage = createAdminServiceRoleClient().storage.from(bucket);
    const signed = await storage.createSignedUrl(objectKey, 60);
    const result = signed as { data?: { signedUrl?: string }; error?: unknown } | null;
    const signedUrl = result?.data?.signedUrl;
    if (result?.error || !signedUrl) throw new Error("Private media read could not resolve the object.");

    const response = await fetch(signedUrl, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw new Error("Private media object could not be read.");
    }
    const contentLengthHeader = response.headers.get("content-length");
    let declaredLength: number | null = null;
    if (contentLengthHeader !== null) {
      if (!/^\d+$/.test(contentLengthHeader)) {
        await response.body?.cancel().catch(() => undefined);
        throw new Error("Private media response has an invalid content length.");
      }
      declaredLength = Number(contentLengthHeader);
      if (!Number.isSafeInteger(declaredLength) || declaredLength > PRIVATE_MEDIA_BYTE_LIMIT) {
        await response.body?.cancel().catch(() => undefined);
        throw new Error("Private media response exceeds the 5 MiB limit.");
      }
    }
    if (!response.body) throw new Error("Private media response has no body.");

    reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      const chunk = next.value;
      total += chunk.byteLength;
      if (total > PRIVATE_MEDIA_BYTE_LIMIT) {
        await reader.cancel().catch(() => undefined);
        throw new Error("Private media stream exceeds the 5 MiB limit.");
      }
      chunks.push(chunk);
    }
    if (declaredLength !== null && declaredLength !== total) {
      throw new Error("Private media content length does not match the streamed bytes.");
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes;
  })();

  try {
    return await Promise.race([operation, deadline]);
  } catch (error) {
    controller.abort();
    const activeReader = reader as ReadableStreamDefaultReader<Uint8Array> | null;
    if (activeReader) await activeReader.cancel().catch(() => undefined);
    const message = error instanceof Error ? error.message : "Private media read failed.";
    rejectDeadline?.(new Error(message));
    throw error;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function readReviewedMedia(
  mediaIds: string[],
  transaction?: QueryableDb,
): Promise<ReviewedMediaRead> {
  const ids = [...new Set(mediaIds)].sort(compareCodePoint);
  const media: ReviewedMedia[] = [];
  const bytesById = new Map<string, Uint8Array>();
  const issues = new Map<string, string[]>();
  if (!ids.length) return { media, bytesById, issues };

  if (isDraftTestRegistryEnabled() && !hasPlatformDatabase()) {
    const { getTestMediaRegistry, validateUpload } = await import("./validate-upload");
    const registry = getTestMediaRegistry();
    for (const id of ids) {
      const row = registry.get(id);
      if (!row) {
        media.push({ kind: "missing", mediaId: id });
        addIssue(issues, id, "Referenced media row is missing.");
        continue;
      }
      const provenance: JsonValue = { source: "synthetic local media fixture; not provider approval" };
      const approvalAudit = row.approvalStatus === "approved"
        ? { eventId: "synthetic-test-approval:" + id, createdAt: normalizedTimestamp(row.createdAt)! }
        : null;
      media.push({
        kind: "asset",
        mediaId: id,
        objectKey: row.objectKey,
        sha256: row.hash,
        mime: row.mime,
        bytes: row.bytes,
        dimensions: row.dimensions,
        provenance,
        approvalStatus: row.approvalStatus,
        createdAt: normalizedTimestamp(row.createdAt) ?? new Date(0).toISOString(),
        approvalAudit,
      });
      if (row.approvalStatus !== "approved") {
        addIssue(issues, id, "Referenced media is not approved.");
        continue;
      }
      const content = testMediaBytes.get(id);
      if (!content) {
        addIssue(issues, id, "Synthetic test media bytes are unavailable.");
        continue;
      }
      try {
        const validated = await validateUpload({ buffer: content, mime: row.mime, filename: row.objectKey.split("/").pop() || "fixture" });
        if (content.byteLength !== row.bytes || validated.hash !== row.hash || JSON.stringify(validated.dimensions) !== JSON.stringify(row.dimensions)) {
          throw new Error("Synthetic test bytes do not match their media row.");
        }
        bytesById.set(id, content);
      } catch (error) {
        addIssue(issues, id, error instanceof Error ? error.message : "Synthetic test media bytes could not be verified.");
      }
    }
    return { media, bytesById, issues };
  }

  if (isE2EFixture() && ids.includes(R5_E2E_FIXTURE_MEDIA_ID)) await ensureR5E2EFixtureAsset();
  const db = transaction ?? await getPlatformDb();
  const rows = await db.query(
    "SELECT m.id,m.object_key,m.hash,m.mime,m.bytes,m.dimensions,m.provenance,m.approval_status,m.created_at,a.id AS approval_event_id,a.created_at AS approval_event_created_at FROM public.media_assets m LEFT JOIN LATERAL (SELECT id,created_at FROM public.audit_events WHERE entity_type='media' AND entity_id=m.id::text AND action='media_approved' ORDER BY created_at DESC,id DESC LIMIT 1) a ON TRUE WHERE m.id::text=ANY($1::text[]) ORDER BY m.id" + (transaction ? " FOR SHARE OF m" : ""),
    [ids],
  );
  const byId = new Map(rows.rows.map((row) => [String(row["id"]), row]));

  for (const id of ids) {
    const row = byId.get(id);
    if (!row) {
      media.push({ kind: "missing", mediaId: id });
      addIssue(issues, id, "Referenced media row is missing.");
      continue;
    }

    const objectKey = String(row["object_key"] ?? "");
    const sha256 = String(row["hash"] ?? "");
    const mime = String(row["mime"] ?? "");
    const bytes = Number(row["bytes"]);
    const createdAt = normalizedTimestamp(row["created_at"]);
    const approvalStatus = String(row["approval_status"] ?? "");
    const auditId = row["approval_event_id"] == null ? null : String(row["approval_event_id"]);
    const auditCreatedAt = row["approval_event_created_at"] == null
      ? null
      : normalizedTimestamp(row["approval_event_created_at"]);
    const dimensions = jsonValue(row["dimensions"]);
    const provenance = jsonValue(row["provenance"]);
    if (!objectKey || !/^[a-f0-9]{64}$/.test(sha256) || !Number.isSafeInteger(bytes) ||
        bytes <= 0 || !["image/png", "image/jpeg", "image/webp"].includes(mime) || !createdAt ||
        !["pending", "approved", "rejected"].includes(approvalStatus)) {
      media.push({ kind: "missing", mediaId: id });
      addIssue(issues, id, "Referenced media metadata is malformed.");
      continue;
    }
    if (auditId !== null && !auditCreatedAt) {
      addIssue(issues, id, "Media approval audit timestamp is malformed.");
    }
    const approvalAudit = auditId && auditCreatedAt ? { eventId: auditId, createdAt: auditCreatedAt } : null;
    const reviewed: ReviewedMedia = {
      kind: "asset",
      mediaId: id,
      objectKey,
      sha256,
      mime: mime as "image/png" | "image/jpeg" | "image/webp",
      bytes,
      dimensions,
      provenance,
      approvalStatus: approvalStatus as "pending" | "approved" | "rejected",
      createdAt,
      approvalAudit,
    };
    media.push(reviewed);
    if (approvalStatus !== "approved") {
      addIssue(issues, id, "Referenced media is not approved.");
      continue;
    }
    if (!approvalAudit) addIssue(issues, id, "Approved media has no approval audit event.");

    try {
      const content = await readPrivateObject(id, objectKey);
      if (content.byteLength !== bytes) throw new Error("Private media size does not match its recorded size.");
      const { validateUpload } = await import("./validate-upload");
      const validated = await validateUpload({ buffer: content, mime, filename: objectKey.split("/").pop() || "asset" });
      if (validated.hash !== sha256) throw new Error("Private media hash does not match its recorded hash.");
      if (JSON.stringify(validated.dimensions) !== JSON.stringify(dimensions)) {
        throw new Error("Private media dimensions do not match the recorded dimensions.");
      }
      bytesById.set(id, content);
    } catch (error) {
      addIssue(issues, id, error instanceof Error ? error.message : "Private media bytes could not be verified.");
    }
  }
  return { media, bytesById, issues };
}

function acceptedPlaceholder(project: PublishedProject, sectionIndex: number, blockIndex: number): string | null {
  const baseline = approvedPublication.projects.find((item) => item.id === project.id);
  const current = project.sections[sectionIndex]?.blocks[blockIndex];
  const accepted = baseline?.sections[sectionIndex]?.blocks[blockIndex];
  if (current?.type === "image" && accepted?.type === "image" &&
      current.mediaId.startsWith("missing-") && JSON.stringify(current) === JSON.stringify(accepted)) {
    return current.mediaId;
  }
  return null;
}

export function collectDraftMediaReferences(projects: PublishedProject[]): { ids: string[]; placeholders: string[] } {
  const ids = new Set<string>();
  const placeholders = new Set<string>();
  for (const project of projects) {
    project.sections.forEach((section, sectionIndex) => section.blocks.forEach((block, blockIndex) => {
      if (block.type !== "image") return;
      const accepted = acceptedPlaceholder(project, sectionIndex, blockIndex);
      if (accepted) placeholders.add(accepted);
      else ids.add(block.mediaId);
    }));
  }
  return { ids: [...ids].sort(compareCodePoint), placeholders: [...placeholders].sort(compareCodePoint) };
}

export async function resolveDraftMediaUrls(
  draft: DraftRecord,
  _actor: OwnerContext,
): Promise<Record<string, string>> {
  void _actor;
  const references = collectDraftMediaReferences([draft.project]);
  const checked = await readReviewedMedia(references.ids);
  const urls: Record<string, string> = {};
  for (const id of checked.bytesById.keys()) urls[id] = "/api/admin/preview/media/" + encodeURIComponent(id);
  return urls;
}

export async function checkMediaApproved(mediaIds: string[], transaction?: QueryableDb) {
  if (!mediaIds.length) return { approved: true, unapprovedIds: [] as string[] };
  const uniqueIds = [...new Set(mediaIds)].sort(compareCodePoint);
  if (!transaction && isDraftTestRegistryEnabled() && !hasPlatformDatabase()) {
    const { getTestMediaRegistry } = await import("./validate-upload");
    const registry = getTestMediaRegistry();
    const unapprovedIds = uniqueIds.filter((id) => registry.get(id)?.approvalStatus !== "approved");
    return { approved: unapprovedIds.length === 0, unapprovedIds };
  }
  const db = transaction ?? await getPlatformDb();
  const result = await db.query(
    "SELECT id,approval_status FROM public.media_assets WHERE id::text=ANY($1::text[])" + (transaction ? " FOR SHARE" : ""),
    [uniqueIds],
  );
  const approved = new Set(result.rows.filter((row) => row["approval_status"] === "approved").map((row) => String(row["id"])));
  const unapprovedIds = uniqueIds.filter((id) => !approved.has(id));
  return { approved: unapprovedIds.length === 0, unapprovedIds };
}

export async function verifyPublicationAssets(publication: Publication, transaction?: QueryableDb): Promise<void> {
  const references = collectDraftMediaReferences(publication.projects.filter((project) => project.id !== "candidatex"));
  const checked = await readReviewedMedia(references.ids, transaction);
  const invalid = [...checked.issues.keys()];
  if (invalid.length) {
    const { MediaValidationError } = await import("./validate-upload");
    throw new MediaValidationError("Publication rejected: media verification failed for " + invalid.join(", ") + ".");
  }
}

export async function readApprovedPublishedMediaUrls(publication: Publication): Promise<Record<string, string>> {
  try {
    const requested = validatePublication(publication);
    const snapshot = await import("../content/publish").then(({ readPublicPublication }) => readPublicPublication());
    if (!snapshot || snapshot.revision !== requested.revision) return {};
    const approved = validatePublication(snapshot);
    const canonicalize = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(canonicalize);
      if (value && typeof value === "object") {
        return Object.fromEntries(Object.entries(value as Record<string, unknown>)
          .sort(([left], [right]) => compareCodePoint(left, right))
          .map(([key, child]) => [key, canonicalize(child)]));
      }
      return value;
    };
    if (JSON.stringify(canonicalize(requested)) !== JSON.stringify(canonicalize(approved))) return {};
    const references = collectDraftMediaReferences(approved.projects.filter((project) => project.id !== "candidatex"));
    const ids = references.ids;
    if (!ids.length || !process.env.MEDIA_PRIVATE_BUCKET) return {};
    const db = await getPlatformDb();
    const rows = await db.query("SELECT id,object_key FROM public.media_assets WHERE approval_status='approved' AND id::text=ANY($1::text[])", [ids]);
    if (!rows.rows.length) return {};
    const signed = await createAdminServiceRoleClient().storage.from(process.env.MEDIA_PRIVATE_BUCKET).createSignedUrls(
      rows.rows.map((row) => String(row["object_key"])),
      900,
    );
    if (signed.error || !signed.data) return {};
    const byPath = new Map(rows.rows.map((row) => [String(row["object_key"]), String(row["id"])]));
    const urls: Record<string, string> = {};
    for (const item of signed.data) {
      if (!item.path || !item.signedUrl || item.error) continue;
      const id = byPath.get(item.path);
      if (id && new URL(item.signedUrl).protocol === "https:") urls[id] = item.signedUrl;
    }
    return urls;
  } catch {
    return {};
  }
}
