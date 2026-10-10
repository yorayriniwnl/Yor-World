import { verifyOwner, createAuthErrorResponse } from "@/server/auth/require-owner";
import { isDraftTestRegistryEnabled } from "@/server/content/revisions";
import { getTestMediaRegistry } from "@/server/media/validate-upload";
import { getPlatformDb } from "@/server/database";
import { createAdminServiceRoleClient } from "@/server/auth/clients";

export const dynamic = "force-dynamic";

// 1x1 transparent PNG fallback buffer for mocked test media
const FALLBACK_1X1_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await verifyOwner(request);
  if (!result.ok) {
    return createAuthErrorResponse(result);
  }

  const { id } = await params;

  const privateHeaders = {
    "Cache-Control": "private, no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    Vary: "Authorization, Cookie",
  };

  // Test registry mode
  if (isDraftTestRegistryEnabled()) {
    const testRegistry = getTestMediaRegistry();
    const asset = testRegistry.get(id);

    if (!asset || asset.approvalStatus !== "approved") {
      return Response.json(
        { error: "Media asset not found or not approved for preview." },
        { status: 404, headers: privateHeaders }
      );
    }

    const bodyBuffer = FALLBACK_1X1_PNG;
    return new Response(bodyBuffer, {
      status: 200,
      headers: {
        "Content-Type": asset.mime || "image/png",
        "Content-Length": String(bodyBuffer.length),
        ...privateHeaders,
      },
    });
  }

  // Production / durable database mode
  try {
    const db = await getPlatformDb();
    const { rows } = await db.query(
      "SELECT id, object_key, mime, approval_status FROM public.media_assets WHERE id::text = $1 LIMIT 1",
      [id]
    );

    const assetRow = rows[0];
    if (!assetRow || assetRow["approval_status"] !== "approved") {
      return Response.json(
        { error: "Media asset not found or not approved for preview." },
        { status: 404, headers: privateHeaders }
      );
    }

    const bucket = process.env.MEDIA_PRIVATE_BUCKET;
    if (!bucket) {
      return Response.json(
        { error: "Private media storage bucket is not configured." },
        { status: 503, headers: privateHeaders }
      );
    }

    const client = createAdminServiceRoleClient();
    const { data, error } = await client.storage
      .from(bucket)
      .download(String(assetRow["object_key"]));

    if (error || !data) {
      return Response.json(
        { error: "Failed to stream media asset from storage." },
        { status: 502, headers: privateHeaders }
      );
    }

    return new Response(data.stream(), {
      status: 200,
      headers: {
        "Content-Type": String(assetRow["mime"] || "image/png"),
        ...privateHeaders,
      },
    });
  } catch (err) {
    return Response.json(
      {
        error: "Private storage is temporarily unavailable.",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 503, headers: privateHeaders }
    );
  }
}
