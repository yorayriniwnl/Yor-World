import { verifyOwner, createAuthErrorResponse } from "@/server/auth/require-owner";
import {
  validateUpload,
  registerMediaAsset,
  listMediaAssets,
  MediaValidationError,
} from "@/server/media/validate-upload";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const result = await verifyOwner(request);
  if (!result.ok) {
    return createAuthErrorResponse(result);
  }

  try {
  const assets = await listMediaAssets();

  return Response.json(
    {
      assets,
      authorizedActor: result.context.userId,
    },
    {
      headers: {
        "Cache-Control": "no-store",
        Vary: "Authorization, Cookie",
      },
    }
  );
  } catch {
    return Response.json({ error: "Private storage is temporarily unavailable." },{ status: 503,headers: { "Cache-Control": "no-store, private",Vary: "Authorization, Cookie" } });
  }

}

export async function POST(request: Request) {
  const result = await verifyOwner(request);
  if (!result.ok) {
    return createAuthErrorResponse(result);
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

    return Response.json(
      {
        success: true,
        action: "media_registered",
        asset,
        actor: result.context.userId,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof MediaValidationError) {
      return Response.json(
        { error: err.message, code: err.code },
        { status: 422 }
      );
    }
    return Response.json(
      { error: "Private storage is temporarily unavailable." },
      { status: 503 }
    );
  }
}
