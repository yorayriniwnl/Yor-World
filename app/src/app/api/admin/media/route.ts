import { verifyOwner, createAuthErrorResponse } from "@/server/auth/require-owner";
import {
  validateUpload,
  registerMediaAsset,
  listMediaAssets,
  MediaValidationError,
} from "@/server/media/validate-upload";
import { ensureR5E2EFixtureAsset, R5_E2E_FIXTURE_MEDIA_ID } from "@/server/media/manifest";
import { isE2EFixture } from "@/server/database";

export const dynamic = "force-dynamic";

function privateJson(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "private, no-store");
  headers.set("Vary", "Authorization, Cookie");
  return Response.json(data, { ...init, headers });
}

export async function GET(request: Request) {
  const result = await verifyOwner(request);
  if (!result.ok) {
    const denied = createAuthErrorResponse(result);
    return privateJson(await denied.json(), { status: denied.status, headers: denied.headers });
  }

  try {
  await ensureR5E2EFixtureAsset();
  const records = await listMediaAssets();
  const assets = records
    .filter((asset) => ["image/png", "image/jpeg", "image/webp"].includes(asset.mime))
    .map((asset) => ({
      id: asset.id,
      approvalStatus: asset.approvalStatus,
      mime: asset.mime,
      bytes: asset.bytes,
      dimensions: asset.dimensions,
      createdAt: asset.createdAt,
      ...(isE2EFixture() && asset.id === R5_E2E_FIXTURE_MEDIA_ID
        ? { fixtureLabel: "LOCAL FIXTURE — SYNTHETIC; NOT PROVIDER APPROVAL" }
        : {}),
    }));

  return privateJson(
    {
      assets,
      authorizedActor: result.context.userId,
    }
  );
  } catch {
    return privateJson({ error: "Private storage is temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const result = await verifyOwner(request);
  if (!result.ok) {
    const denied = createAuthErrorResponse(result);
    return privateJson(await denied.json(), { status: denied.status, headers: denied.headers });
  }

  try {
    const contentType = request.headers.get("content-type") || "";

    let buffer: Uint8Array;
    let mime = "";
    let filename = "upload";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return Response.json({ error: "Missing file field in multipart form" }, { status: 422 });
      }
      buffer = new Uint8Array(await file.arrayBuffer());
      mime = file.type;
      filename = file.name;
    } else {
      // JSON base64 upload fallback
      const body = await request.json();
      if (!body.data || !body.mime) {
        return Response.json({ error: "Missing data (base64) or mime in JSON payload" }, { status: 422 });
      }
      buffer = Buffer.from(body.data, "base64");
      mime = body.mime;
      filename = body.filename || "upload";
    }

    const validated = await validateUpload({ buffer, mime, filename });
    const asset = await registerMediaAsset(validated, result.context);

    return privateJson(
      {
        success: true,
        action: "media_registered",
        asset,
        actor: result.context.userId,
      }, { status: 201 }
    );
  } catch (err) {
    if (err instanceof MediaValidationError) {
      return privateJson(
        { error: err.message, code: err.code },
        { status: 422 }
      );
    }
    return privateJson(
      { error: "Private storage is temporarily unavailable." },
      { status: 503 }
    );
  }
}
