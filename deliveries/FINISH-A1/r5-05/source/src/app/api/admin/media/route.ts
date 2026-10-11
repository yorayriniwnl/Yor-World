import { verifyOwner, createAuthErrorResponse } from "@/server/auth/require-owner";
import { isE2EFixture } from "@/server/database";
import { validateUpload, registerMediaAsset, listMediaAssets, MediaValidationError, MAX_UPLOAD_BYTES } from "@/server/media/validate-upload";
import { listE2ESyntheticMediaFixtures, registerE2ESyntheticMediaFixture } from "@/server/media/manifest";

export const dynamic = "force-dynamic";
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store, no-cache, must-revalidate", Pragma: "no-cache", Expires: "0", Vary: "Authorization, Cookie" };
function privateJson(body: unknown, init: ResponseInit = {}): Response {
  return Response.json(body, { ...init, headers: { ...PRIVATE_HEADERS, ...(init.headers as Record<string, string> | undefined) } });
}
function privateAuthError(failure: Parameters<typeof createAuthErrorResponse>[0]): Response {
  const response = createAuthErrorResponse(failure);
  response.headers.set("Cache-Control", PRIVATE_HEADERS["Cache-Control"]);
  response.headers.set("Vary", PRIVATE_HEADERS.Vary);
  return response;
}
function loopback(hostname: string): boolean { return ["127.0.0.1", "localhost", "[::1]"].includes(hostname); }

export async function GET(request: Request): Promise<Response> {
  const auth = await verifyOwner(request);
  if (!auth.ok) return privateAuthError(auth);
  try {
    if (isE2EFixture() && loopback(new URL(request.url).hostname)) {
      const assets = listE2ESyntheticMediaFixtures().map((item) => ({ id: item.mediaId, objectKey: item.objectKey, filename: item.objectKey.split("/").pop(), mime: item.mime, bytes: item.bytes, dimensions: item.dimensions, approvalStatus: item.approvalStatus, createdAt: item.createdAt, synthetic: true }));
      return privateJson({ assets, authorizedActor: auth.context.userId, fixtureOnly: true });
    }
    const assets = await listMediaAssets();
    return privateJson({ assets, authorizedActor: auth.context.userId });
  } catch {
    return privateJson({ error: "Private storage is temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request): Promise<Response> {
  const auth = await verifyOwner(request);
  if (!auth.ok) return privateAuthError(auth);
  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return privateJson({ error: "Missing file field in multipart form." }, { status: 422 });
      if (file.size < 1 || file.size > MAX_UPLOAD_BYTES) return privateJson({ error: "Media uploads must be between 1 byte and 5 MiB." }, { status: 422 });
      if (isE2EFixture() && loopback(new URL(request.url).hostname) && request.headers.get("x-yor-e2e-fixture") === "synthetic-approved-png") {
        if (file.type !== "image/png") return privateJson({ error: "The local E2E fixture accepts a synthetic PNG only." }, { status: 422 });
        const item = await registerE2ESyntheticMediaFixture({ bytes: new Uint8Array(await file.arrayBuffer()), mime: file.type, filename: file.name });
        return privateJson({ success: true, action: "synthetic_media_fixture_registered", asset: { id: item.mediaId, mime: item.mime, bytes: item.bytes, dimensions: item.dimensions, approvalStatus: item.approvalStatus }, synthetic: true, providerApproved: false }, { status: 201 });
      }
      const validated = await validateUpload({ buffer: new Uint8Array(await file.arrayBuffer()), mime: file.type, filename: file.name });
      const asset = await registerMediaAsset(validated, auth.context);
      return privateJson({ success: true, action: "media_registered", asset, actor: auth.context.userId }, { status: 201 });
    }

    if (contentType.includes("application/json")) {
      const body: unknown = await request.json();
      if (!body || typeof body !== "object" || !("data" in body) || !("mime" in body) || typeof body.data !== "string" || typeof body.mime !== "string") {
        return privateJson({ error: "Missing base64 data or MIME type." }, { status: 422 });
      }
      if (body.data.length > Math.ceil(MAX_UPLOAD_BYTES * 4 / 3) + 4) return privateJson({ error: "Media uploads must not exceed 5 MiB." }, { status: 422 });
      const buffer = Buffer.from(body.data, "base64");
      const filename = "filename" in body && typeof body.filename === "string" ? body.filename : "upload";
      const validated = await validateUpload({ buffer, mime: body.mime, filename });
      const asset = await registerMediaAsset(validated, auth.context);
      return privateJson({ success: true, action: "media_registered", asset, actor: auth.context.userId }, { status: 201 });
    }
    return privateJson({ error: "Use multipart/form-data or JSON media upload." }, { status: 415 });
  } catch (error) {
    if (error instanceof MediaValidationError) return privateJson({ error: error.message, code: error.code }, { status: 422 });
    return privateJson({ error: "Private storage is temporarily unavailable." }, { status: 503 });
  }
}