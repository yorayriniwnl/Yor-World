import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import type { SupabaseClient } from "@supabase/supabase-js";
import { approvedPublication } from "@/content/approved-publication";
import { setPlatformDbForTests } from "@/server/database";
import * as authClients from "@/server/auth/clients";
import { publishRevision, readPublicPublication, rollbackPublication } from "@/server/content/publish";
import { boundedMediaOperation, MediaStorageUnavailableError, verifyStoredMedia } from "@/server/media/integrity";
import { approveMediaAsset } from "@/server/media/validate-upload";
import type { OwnerContext } from "@/server/auth/types";

const actor: OwnerContext = {
  userId: "11111111-1111-1111-1111-111111111111",
  email: "owner@fixture.test",
  role: "owner",
  active: true,
  assurance: "aal2",
};

// Valid 1x1 transparent PNG fixture
const VALID_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);
const VALID_PNG_HASH = createHash("sha256").update(VALID_PNG).digest("hex");
const BUCKET = "test-private-media";

function mockStorageWithStreams(objects: Map<string, Uint8Array | { error: { statusCode?: string; message: string } }>) {
  return vi.spyOn(authClients, "createAdminServiceRoleClient").mockImplementation((signal?: AbortSignal) => ({
    storage: {
      from: () => ({
        download: (key: string) => ({
          asStream: async () => {
            const entry = objects.get(key);
            if (!entry) {
              return { data: null, error: { statusCode: "404", message: "Object not found" } };
            }
            if ("error" in entry && entry.error) {
              return { data: null, error: entry.error };
            }
            const bytes = entry as Uint8Array;
            const stream = new ReadableStream<Uint8Array>({
              start(controller) {
                if (signal?.aborted) {
                  controller.error(new Error("Aborted"));
                  return;
                }
                controller.enqueue(bytes);
                controller.close();
              },
            });
            return { data: stream, error: null };
          },
        }),
        remove: async (keys: string[]) => {
          for (const k of keys) objects.delete(k);
          return { data: keys.map((k) => ({ name: k })), error: null };
        },
        upload: async (key: string, data: Uint8Array) => {
          objects.set(key, data);
          return { data: { path: key }, error: null };
        },
      }),
    },
  } as unknown as SupabaseClient));
}

describe("Media integrity and publication lifecycle verification (embedded PGlite, not native Supabase)", () => {
  let db: PGlite;
  const migrations = [
    "20261001000000_a3_owner_auth_rls.sql",
    "20261001000001_a4_publication_media.sql",
    "20261005000000_github_refresh_state.sql",
    "20261009000000_owner_identity_media_integrity.sql",
  ];

  beforeAll(async () => {
    db = new PGlite();
    for (const name of migrations) {
      await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
    }
    await db.exec(await readFile("supabase/operations/harden-publication-grants.sql", "utf8"));
    await db.query("INSERT INTO auth.users(id,email) VALUES($1,$2)", [actor.userId, actor.email]);
    await db.query("INSERT INTO public.admin_users(id,role,active) VALUES($1,'owner',true)", [actor.userId]);
  });

  beforeEach(async () => {
    await db.exec("TRUNCATE public.media_assets, public.published_content, public.publication_history, public.project_revisions, public.audit_events CASCADE");
    setPlatformDbForTests(db);
    process.env.MEDIA_PRIVATE_BUCKET = BUCKET;
    process.env.SUPABASE_URL = "https://fixture.supabase.test";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-service-key";
  });

  afterEach(() => {
    setPlatformDbForTests(null);
    vi.restoreAllMocks();
    delete process.env.MEDIA_PRIVATE_BUCKET;
  });

  afterAll(async () => {
    await db.close();
  });

  it("1. validates actual object availability and sha256 byte integrity before publication", async () => {
    const mediaId = randomUUID();
    const objectKey = `drafts/${randomUUID()}/${VALID_PNG_HASH}/valid.png`;
    const objects = new Map<string, Uint8Array>([[objectKey, new Uint8Array(VALID_PNG)]]);
    mockStorageWithStreams(objects);

    await db.query(
      `INSERT INTO public.media_assets(id, object_key, hash, mime, bytes, dimensions, approval_status, storage_bucket, integrity_verified_at)
       VALUES($1, $2, $3, 'image/png', $4, '{"width":1,"height":1}', 'approved', $5, now())`,
      [mediaId, objectKey, VALID_PNG_HASH, VALID_PNG.length, BUCKET]
    );

    const customProjects = approvedPublication.projects.map((p) => ({
      ...p,
      sections: p.sections.map((s) => ({
        ...s,
        blocks: s.blocks.map((b) => (b.type === "image" ? { ...b, mediaId } : b)),
      })),
    }));

    const result = await publishRevision({ expectedRevision: approvedPublication.revision, customProjects }, actor);
    expect(result.revision).toBe(2);

    const publicPub = await readPublicPublication();
    expect(publicPub?.revision).toBe(2);
  });

  it("2. rejects publication when referenced media object is missing in storage (404)", async () => {
    const mediaId = randomUUID();
    const objectKey = `drafts/${randomUUID()}/${VALID_PNG_HASH}/missing.png`;
    const objects = new Map<string, Uint8Array>(); // Empty: object does not exist in storage
    mockStorageWithStreams(objects);

    await db.query(
      `INSERT INTO public.media_assets(id, object_key, hash, mime, bytes, dimensions, approval_status, storage_bucket, integrity_verified_at)
       VALUES($1, $2, $3, 'image/png', $4, '{"width":1,"height":1}', 'approved', $5, now())`,
      [mediaId, objectKey, VALID_PNG_HASH, VALID_PNG.length, BUCKET]
    );

    const customProjects = approvedPublication.projects.map((p) => ({
      ...p,
      sections: p.sections.map((s) => ({
        ...s,
        blocks: s.blocks.map((b) => (b.type === "image" ? { ...b, mediaId } : b)),
      })),
    }));

    await expect(publishRevision({ expectedRevision: approvedPublication.revision, customProjects }, actor))
      .rejects.toThrow(/contains unapproved or missing media assets/);

    // Publication state must remain at baseline and uncommitted in database
    expect((await readPublicPublication())?.revision).toBe(approvedPublication.revision);
    const pubRows = await db.query<{ count: number }>("SELECT COUNT(*)::int AS count FROM public.published_content");
    expect(pubRows.rows[0]?.count).toBe(0);
    const historyRows = await db.query<{ count: number }>("SELECT COUNT(*)::int AS count FROM public.publication_history");
    expect(historyRows.rows[0]?.count).toBe(0);
  });

  it("3. rejects publication when storage bytes do not match approved SHA-256 hash", async () => {
    const mediaId = randomUUID();
    const objectKey = `drafts/${randomUUID()}/${VALID_PNG_HASH}/tampered.png`;
    // Storage has different bytes than approved
    const tamperedBytes = new Uint8Array(Buffer.from("tampered bytes that do not match hash"));
    const objects = new Map<string, Uint8Array>([[objectKey, tamperedBytes]]);
    mockStorageWithStreams(objects);

    await db.query(
      `INSERT INTO public.media_assets(id, object_key, hash, mime, bytes, dimensions, approval_status, storage_bucket, integrity_verified_at)
       VALUES($1, $2, $3, 'image/png', $4, '{"width":1,"height":1}', 'approved', $5, now())`,
      [mediaId, objectKey, VALID_PNG_HASH, VALID_PNG.length, BUCKET]
    );

    const customProjects = approvedPublication.projects.map((p) => ({
      ...p,
      sections: p.sections.map((s) => ({
        ...s,
        blocks: s.blocks.map((b) => (b.type === "image" ? { ...b, mediaId } : b)),
      })),
    }));

    await expect(publishRevision({ expectedRevision: approvedPublication.revision, customProjects }, actor))
      .rejects.toThrow(/contains unapproved or missing media assets/);
  });

  it("4. rejects publication with 503 error on storage provider outage", async () => {
    const mediaId = randomUUID();
    const objectKey = `drafts/${randomUUID()}/${VALID_PNG_HASH}/error.png`;
    const objects = new Map<string, { error: { statusCode?: string; message: string } }>([
      [objectKey, { error: { statusCode: "500", message: "Internal Storage Provider Error" } }],
    ]);
    mockStorageWithStreams(objects);

    await db.query(
      `INSERT INTO public.media_assets(id, object_key, hash, mime, bytes, dimensions, approval_status, storage_bucket, integrity_verified_at)
       VALUES($1, $2, $3, 'image/png', $4, '{"width":1,"height":1}', 'approved', $5, now())`,
      [mediaId, objectKey, VALID_PNG_HASH, VALID_PNG.length, BUCKET]
    );

    const customProjects = approvedPublication.projects.map((p) => ({
      ...p,
      sections: p.sections.map((s) => ({
        ...s,
        blocks: s.blocks.map((b) => (b.type === "image" ? { ...b, mediaId } : b)),
      })),
    }));

    await expect(publishRevision({ expectedRevision: approvedPublication.revision, customProjects }, actor))
      .rejects.toBeInstanceOf(MediaStorageUnavailableError);
  });

  it("5. bounds operations and aborts on storage timeout", async () => {
    let aborted = false;
    const slowRun = (signal: AbortSignal) => new Promise<never>((_resolve, reject) => {
      signal.addEventListener("abort", () => {
        aborted = true;
        reject(new Error("aborted"));
      });
    });

    await expect(boundedMediaOperation(slowRun, 50)).rejects.toBeInstanceOf(MediaStorageUnavailableError);
    expect(aborted).toBe(true);
  });

  it("6. prevents inconsistent partial publication when one of multiple media assets fails", async () => {
    const goodId = randomUUID();
    const badId = randomUUID();
    const goodKey = `drafts/${randomUUID()}/${VALID_PNG_HASH}/good.png`;
    const badKey = `drafts/${randomUUID()}/${VALID_PNG_HASH}/bad.png`;
    const objects = new Map<string, Uint8Array>([
      [goodKey, new Uint8Array(VALID_PNG)],
      // badKey missing
    ]);
    mockStorageWithStreams(objects);

    for (const [id, key] of [[goodId, goodKey], [badId, badKey]]) {
      await db.query(
        `INSERT INTO public.media_assets(id, object_key, hash, mime, bytes, dimensions, approval_status, storage_bucket, integrity_verified_at)
         VALUES($1, $2, $3, 'image/png', $4, '{"width":1,"height":1}', 'approved', $5, now())`,
        [id, key, VALID_PNG_HASH, VALID_PNG.length, BUCKET]
      );
    }

    const customProjects = approvedPublication.projects.map((p, idx) => ({
      ...p,
      sections: p.sections.map((s) => ({
        ...s,
        blocks: s.blocks.map((b) => (b.type === "image" ? { ...b, mediaId: idx === 0 ? goodId : badId } : b)),
      })),
    }));

    await expect(publishRevision({ expectedRevision: approvedPublication.revision, customProjects }, actor))
      .rejects.toThrow(/contains unapproved or missing media assets/);

    expect((await readPublicPublication())?.revision).toBe(approvedPublication.revision);
    const rows = await db.query<{ count: number }>("SELECT COUNT(*)::int AS count FROM public.published_content");
    expect(rows.rows[0]?.count).toBe(0);
  });

  it("7. prevents deleting retained media referenced in publication history", async () => {
    const mediaId = randomUUID();
    const objectKey = `drafts/${randomUUID()}/${VALID_PNG_HASH}/retained.png`;
    const objects = new Map<string, Uint8Array>([[objectKey, new Uint8Array(VALID_PNG)]]);
    mockStorageWithStreams(objects);

    await db.query(
      `INSERT INTO public.media_assets(id, object_key, hash, mime, bytes, dimensions, approval_status, storage_bucket, integrity_verified_at)
       VALUES($1, $2, $3, 'image/png', $4, '{"width":1,"height":1}', 'approved', $5, now())`,
      [mediaId, objectKey, VALID_PNG_HASH, VALID_PNG.length, BUCKET]
    );

    const customProjects = approvedPublication.projects.map((p) => ({
      ...p,
      sections: p.sections.map((s) => ({
        ...s,
        blocks: s.blocks.map((b) => (b.type === "image" ? { ...b, mediaId } : b)),
      })),
    }));

    await publishRevision({ expectedRevision: approvedPublication.revision, customProjects }, actor);

    // Deleting retained media must be blocked by database trigger
    await expect(db.query("DELETE FROM public.media_assets WHERE id=$1", [mediaId]))
      .rejects.toThrow(/Retained publication media cannot be deleted/);

    // Modifying its hash/bytes must also be blocked
    await expect(
      db.query("UPDATE public.media_assets SET hash='0000000000000000000000000000000000000000000000000000000000000000' WHERE id=$1", [mediaId])
    ).rejects.toThrow(/Approved or retained media identity is immutable/);
  });

  it("8. rollback failure when referenced media is corrupt preserves current publication", async () => {
    const mediaId = randomUUID();
    const objectKey = `drafts/${randomUUID()}/${VALID_PNG_HASH}/rollback.png`;
    const objects = new Map<string, Uint8Array>([[objectKey, new Uint8Array(VALID_PNG)]]);
    mockStorageWithStreams(objects);

    await db.query(
      `INSERT INTO public.media_assets(id, object_key, hash, mime, bytes, dimensions, approval_status, storage_bucket, integrity_verified_at)
       VALUES($1, $2, $3, 'image/png', $4, '{"width":1,"height":1}', 'approved', $5, now())`,
      [mediaId, objectKey, VALID_PNG_HASH, VALID_PNG.length, BUCKET]
    );

    // Revision 2 published with the image
    const customProjects = approvedPublication.projects.map((p) => ({
      ...p,
      sections: p.sections.map((s) => ({
        ...s,
        blocks: s.blocks.map((b) => (b.type === "image" ? { ...b, mediaId } : b)),
      })),
    }));
    const rev2 = await publishRevision({ expectedRevision: approvedPublication.revision, customProjects }, actor);
    expect(rev2.revision).toBe(2);

    // Revision 3 published without the image
    const rev3 = await publishRevision({ expectedRevision: 2 }, actor);
    expect(rev3.revision).toBe(3);

    // Now corrupt the media object in storage before attempting rollback to rev2
    objects.set(objectKey, new Uint8Array(Buffer.from("tampered-data-corrupting-hash")));

    // Rollback to rev2 must fail due to integrity verification failure
    await expect(rollbackPublication(2, actor)).rejects.toThrow(/contains unapproved or missing media assets/);

    // Public publication must remain unchanged at revision 3
    expect((await readPublicPublication())?.revision).toBe(3);
  });

  it("9. approveMediaAsset verifies actual storage bytes and sets integrity_verified_at", async () => {
    const mediaId = randomUUID();
    const objectKey = `drafts/${randomUUID()}/${VALID_PNG_HASH}/approve.png`;
    const objects = new Map<string, Uint8Array>([[objectKey, new Uint8Array(VALID_PNG)]]);
    mockStorageWithStreams(objects);

    await db.query(
      `INSERT INTO public.media_assets(id, object_key, hash, mime, bytes, dimensions, approval_status, storage_bucket)
       VALUES($1, $2, $3, 'image/png', $4, '{"width":1,"height":1}', 'pending', $5)`,
      [mediaId, objectKey, VALID_PNG_HASH, VALID_PNG.length, BUCKET]
    );

    const approved = await approveMediaAsset(mediaId, actor);
    expect(approved.approvalStatus).toBe("approved");

    const row = (await db.query<{ approval_status: string; integrity_verified_at: string | null }>(
      "SELECT approval_status, integrity_verified_at FROM public.media_assets WHERE id=$1",
      [mediaId]
    )).rows[0];
    expect(row?.approval_status).toBe("approved");
    expect(row?.integrity_verified_at).not.toBeNull();
  });

  it("10. stream reader terminates early when storage bytes exceed declared ceiling", async () => {
    const fakeRow = {
      storage_bucket: BUCKET,
      object_key: "drafts/oversized.png",
      hash: VALID_PNG_HASH,
      bytes: VALID_PNG.length,
      mime: "image/png",
    };

    // Stream returns more bytes than row.bytes
    const oversizedBytes = new Uint8Array(VALID_PNG.length + 100);
    const objects = new Map<string, Uint8Array>([[fakeRow.object_key, oversizedBytes]]);
    mockStorageWithStreams(objects);

    await expect(verifyStoredMedia(fakeRow)).rejects.toThrow(/exceeds its approved byte identity/);
  });
});
