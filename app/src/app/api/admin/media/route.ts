import { verifyOwner, createAuthErrorResponse } from "@/server/auth/require-owner";
import {
  validateUpload,
  registerMediaAsset,
  listMediaAssets,
  MediaValidationError,
} from "@/server/media/validate-upload";
import { getE2ESyntheticMediaAsset } from "@/server/media/manifest";

export const dynamic = "force-dynamic";
const privateHeaders = { "Cache-Control": "private, no-store, no-cache, must-revalidate", Pragma: "no-cache", Expires: "0", Vary: "Authorization, Cookie" };
function privateResponse(body: unknown, status = 200) { return Response.json(body, { status, headers: privateHeaders }); }
function privateAuthResponse(response: Response): Response {
  for (const [name, value] of Object.entries(privateHeaders)) response.headers.set(name, value);
  return response;
}

export async function GET(request: Request) {
  const result = await verifyOwner(request);
  if (!result.ok) {
    return privateAuthResponse(createAuthErrorResponse(result));
  }

  try {
  const assets = await listMediaAssets();
  const fixture = getE2ESyntheticMediaAsset();
  if (fixture) assets.push(fixture);

  return privateResponse({ assets, authorizedActor: result.context.userId });
  } catch {
    return privateResponse({ error: "Private storage is temporarily unavailable." }, 503);
  }

}

export async function POST(request: Request) {
  const result = await verifyOwner(request);
  if (!result.ok) {
    return privateAuthResponse(createAuthErrorResponse(result));
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
        return privateResponse({ error: "Missing file field in multipart form" }, 422);
      }
      buffer = new Uint8Array(await file.arrayBuffer());
      mime = file.type;
      filename = file.name;
    } else {
      // JSON base64 upload fallback
      const body = await request.json();
      if (!body.data || !body.mime) {
        return privateResponse({ error: "Missing data (base64) or mime in JSON payload" }, 422);
      }
      buffer = Buffer.from(body.data, "base64");
      mime = body.mime;
      filename = body.filename || "upload";
    }

    const validated = await validateUpload({ buffer, mime, filename });
    const asset = await registerMediaAsset(validated, result.context);

    return privateResponse({ success: true, action: "media_registered", asset, actor: result.context.userId }, 201);
  } catch (err) {
    if (err instanceof MediaValidationError) {
      return privateResponse({ error: err.message, code: err.code }, 422);
    }
    return privateResponse({ error: "Private storage is temporarily unavailable." }, 503);
  }
}
