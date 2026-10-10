import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockInstance } from "vitest";
import { POST } from "@/app/api/admin/media/route";
import { GET as getMediaItem } from "@/app/api/admin/media/[id]/route";
import * as authClients from "@/server/auth/clients";
import type { QueryableDb } from "@/server/contact/quota";
import { isDraftTestRegistryEnabled } from "@/server/content/revisions";
import { setPlatformDbForTests } from "@/server/database";
import {
  MAX_IMAGE_PIXELS,
  MAX_UPLOAD_BYTES,
  validateUpload,
} from "@/server/media/validate-upload";

const fixture = (name: string) => readFileSync(resolve("tests/fixtures/residual-media", name));
const originalFixture = (name: string) => readFileSync(resolve("tests/fixtures/scp-media", name));
const validate = (buffer: Uint8Array, mime = "image/png") =>
  validateUpload({ buffer, mime, filename: "fixture" });

const animationCases = [
  ["animated.png", "image/png"],
  ["corrupt-second-frame.png", "image/png"],
  ["actl-only.png", "image/png"],
  ["orphan-fctl.png", "image/png"],
  ["orphan-fdat.png", "image/png"],
  ["truncated-fdat.png", "image/png"],
  ["animated.webp", "image/webp"],
] as const;

describe("SCP-04 V1 still images only", () => {
  it("accepts a genuine ordinary RGB PNG without changing its bytes", async () => {
    const bytes = fixture("normal-rgb.png");
    const result = await validate(bytes);
    expect(result.dimensions).toEqual({ width: 17, height: 11 });
    expect(result.buffer).toEqual(bytes);
    expect(result.hash).toBe(createHash("sha256").update(bytes).digest("hex"));
  });

  it.each(animationCases)("rejects animation structure or multiframe media: %s", async (name, mime) => {
    await expect(validate(fixture(name), mime)).rejects.toMatchObject({
      status: 422,
      code: "INVALID_MEDIA",
    });
  });

  it("retains the exact decoded-pixel ceiling for a genuine still PNG", async () => {
    const result = await validate(fixture("pixels-ok.png"));
    expect(result.dimensions).toEqual({ width: 4096, height: 4096 });
    expect(result.dimensions.width * result.dimensions.height).toBe(MAX_IMAGE_PIXELS);
  });

  it("retains the exact 5 MiB byte ceiling using legal JPEG COM padding", async () => {
    const jpeg = originalFixture("valid-rgb-16x12.jpg");
    const parts = [jpeg.subarray(0, 2)];
    let remaining = MAX_UPLOAD_BYTES - jpeg.length;
    while (remaining > 0) {
      let size = Math.min(65537, remaining);
      if (remaining - size > 0 && remaining - size < 4) size -= 4;
      const comment = Buffer.alloc(size);
      comment[0] = 0xff;
      comment[1] = 0xfe;
      comment.writeUInt16BE(size - 2, 2);
      parts.push(comment);
      remaining -= size;
    }
    parts.push(jpeg.subarray(2));
    const bytes = Buffer.concat(parts);
    expect(bytes.length).toBe(MAX_UPLOAD_BYTES);
    expect((await validate(bytes, "image/jpeg")).bytes).toBe(MAX_UPLOAD_BYTES);
    await expect(validate(Buffer.concat([bytes, Buffer.from([0])]), "image/jpeg"))
      .rejects.toMatchObject({ status: 422, code: "INVALID_MEDIA" });
  });
});

type Transport = "json" | "multipart";
const ownerId = "11111111-1111-1111-1111-111111111111";
const bucketName = "residual-private-media";
const observations: Record<string, unknown>[] = [];
const uploadCases = [
  ...animationCases.map(([name, mime]) => ({ name, mime, bytes: () => fixture(name) })),
  { name: "corrupt-idat.png", mime: "image/png", bytes: () => originalFixture("corrupt-idat.png") },
  { name: "corrupt-scan.jpg", mime: "image/jpeg", bytes: () => originalFixture("corrupt-scan.jpg") },
  { name: "corrupt-vp8.webp", mime: "image/webp", bytes: () => originalFixture("corrupt-vp8.webp") },
].flatMap((media) => (["json", "multipart"] as const).map((transport) => ({ ...media, transport })));

function uploadRequest(bytes: Uint8Array, mime: string, transport: Transport): Request {
  const headers = new Headers({ Authorization: "Bearer rc3-fixture-owner-aal2" });
  let body: BodyInit;
  if (transport === "multipart") {
    const form = new FormData();
    form.append("file", new Blob([Buffer.from(bytes)], { type: mime }), "private image.png");
    body = form;
  } else {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify({ data: Buffer.from(bytes).toString("base64"), mime, filename: "private image.png" });
  }
  return new Request("http://localhost/api/admin/media", { method: "POST", headers, body });
}

describe("SCP-04 real media POST with SQL registration and mocked private Storage transport", () => {
  let db: PGlite;
  let sqlCalls: string[];
  let objects: Map<string, Uint8Array>;
  let storageFetch: ReturnType<typeof vi.fn<typeof fetch>>;
  let clientFactory: MockInstance<typeof authClients.createAdminServiceRoleClient>;

  beforeAll(async () => {
    db = new PGlite();
    for (const name of ["20261001000000_a3_owner_auth_rls.sql", "20261001000001_a4_publication_media.sql"]) {
      await db.exec(readFileSync(resolve("supabase/migrations", name), "utf8"));
    }
    await db.exec(readFileSync(resolve("supabase/operations/harden-publication-grants.sql"), "utf8"));
    await db.query("INSERT INTO auth.users(id,email) VALUES($1,'owner@residual.test')", [ownerId]);
    await db.query("INSERT INTO public.admin_users(id,role,active) VALUES($1,'owner',true)", [ownerId]);
  });

  beforeEach(async () => {
    await db.exec("TRUNCATE public.media_assets,public.audit_events");
    sqlCalls = [];
    objects = new Map();
    const provider: QueryableDb = {
      query: async (sql, params) => {
        sqlCalls.push(sql);
        return db.query(sql, params);
      },
    };
    setPlatformDbForTests(provider);
    // The existing fixture identity still resolves its active-owner row through SQL.
    vi.stubEnv("YOR_E2E_FIXTURE", "1");
    vi.stubEnv("YOR_TEST_DATABASE_PATH", "residual-media-explicit-test-injection");
    vi.stubEnv("MEDIA_PRIVATE_BUCKET", bucketName);
    vi.stubEnv("SUPABASE_URL", "https://storage.residual.test");
    vi.stubEnv("SUPABASE_ANON_KEY", "synthetic-anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "synthetic-service-key");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://storage.residual.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "synthetic-anon-key");
    clientFactory = vi.spyOn(authClients, "createAdminServiceRoleClient");
    storageFetch = vi.fn<typeof fetch>(async (input, init) => {
      const request = new Request(input, init);
      const prefix = `/storage/v1/object/${bucketName}/`;
      const path = new URL(request.url).pathname;
      if (request.method !== "POST" || !path.startsWith(prefix)) {
        throw new Error("Unexpected mocked Storage operation.");
      }
      const key = decodeURIComponent(path.slice(prefix.length));
      objects.set(key, new Uint8Array(await request.arrayBuffer()));
      return Response.json({ Id: "synthetic-object", Key: `${bucketName}/${key}` });
    });
    vi.stubGlobal("fetch", storageFetch);
    expect(isDraftTestRegistryEnabled()).toBe(false);
  });

  afterEach(() => {
    setPlatformDbForTests(null);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  afterAll(async () => {
    await db.close();
    const output = process.env.YOR_RESIDUAL_MEDIA_EVIDENCE;
    if (output) writeFileSync(output, JSON.stringify({ observations }, null, 2) + "\n");
  });

  it.each(uploadCases)("rejects $name via $transport before Storage, media SQL or approval", async ({ name, mime, bytes, transport }) => {
    const response = await POST(uploadRequest(bytes(), mime, transport));
    const body: unknown = await response.json();
    const mediaRows = (await db.query("SELECT COUNT(*)::int AS count FROM public.media_assets")).rows;
    const auditRows = (await db.query("SELECT COUNT(*)::int AS count FROM public.audit_events")).rows;
    observations.push({ name, transport, status: response.status, body, mediaRows, auditRows,
      storageObjects: objects.size, storageCalls: storageFetch.mock.calls.length,
      storageClientCalls: clientFactory.mock.calls.length, sqlCalls });
    expect(response.status).toBe(422);
    expect(body).toMatchObject({ code: "INVALID_MEDIA" });
    expect(mediaRows).toEqual([{ count: 0 }]);
    expect(auditRows).toEqual([{ count: 0 }]);
    expect(objects.size).toBe(0);
    expect(storageFetch).not.toHaveBeenCalled();
    expect(clientFactory).not.toHaveBeenCalled();
    expect(sqlCalls).toHaveLength(1);
    expect(sqlCalls[0]).toMatch(/^SELECT id,role,active FROM public.admin_users/);
  });

  it.each(["json", "multipart"] as const)("stores exact validated still bytes privately and pending via %s", async (transport) => {
    const bytes = fixture("normal-rgb.png");
    const response = await POST(uploadRequest(bytes, "image/png", transport));
    const body: unknown = await response.json();
    const mediaRows = (await db.query("SELECT object_key,hash,mime,bytes,dimensions,approval_status FROM public.media_assets")).rows;
    const auditRows = (await db.query("SELECT COUNT(*)::int AS count FROM public.audit_events")).rows;
    observations.push({ name: "normal-rgb.png", transport, status: response.status, body, mediaRows, auditRows,
      storageObjects: objects.size, storageCalls: storageFetch.mock.calls.length,
      storageClientCalls: clientFactory.mock.calls.length, sqlCalls });
    expect(response.status).toBe(201);
    expect(body).toMatchObject({ success: true, asset: { approvalStatus: "pending", dimensions: { width: 17, height: 11 } } });
    const hash = createHash("sha256").update(bytes).digest("hex");
    const objectKey = `drafts/${hash}/private_image.png`;
    expect(mediaRows).toEqual([{ object_key: objectKey, hash, mime: "image/png", bytes: bytes.length,
      dimensions: { width: 17, height: 11 }, approval_status: "pending" }]);
    expect(objects.size).toBe(1);
    expect(objects.get(objectKey)).toEqual(new Uint8Array(bytes));
    expect(storageFetch).toHaveBeenCalledTimes(1);
    expect(clientFactory).toHaveBeenCalledTimes(1);
    expect(auditRows).toEqual([{ count: 0 }]);
    const id = (await db.query<{ id: string }>("SELECT id::text AS id FROM public.media_assets")).rows[0]!.id;
    expect(typeof id).toBe("string");
    expect((await getMediaItem(new Request(`http://localhost/api/admin/media/${id}`),
      { params: Promise.resolve({ id: String(id) }) })).status).toBe(401);
  });
});
