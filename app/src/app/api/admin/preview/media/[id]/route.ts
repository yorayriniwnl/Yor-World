import { verifyOwner, createAuthErrorResponse } from "@/server/auth/require-owner";
import { readReviewedMedia } from "@/server/media/manifest";

export const dynamic = "force-dynamic";

function privateHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  headers.set("Cache-Control", "private, no-store");
  headers.set("Vary", "Authorization, Cookie");
  headers.set("X-Content-Type-Options", "nosniff");
  return headers;
}

function privateJson(data: unknown, status: number): Response {
  return Response.json(data, { status, headers: privateHeaders() });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const owner = await verifyOwner(request);
  if (!owner.ok) {
    const denied = createAuthErrorResponse(owner);
    return privateJson(await denied.json(), denied.status);
  }
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return privateJson({ error: "Invalid media identity." }, 404);
  }
  try {
    const read = await readReviewedMedia([id]);
    const bytes = read.bytesById.get(id);
    if (!bytes) {
      const missing = read.media.some((item) => item.kind === "missing" && item.mediaId === id);
      return privateJson({ error: missing ? "Media not found." : "Private image failed integrity verification." }, missing ? 404 : 422);
    }
    const item = read.media.find((media) => media.kind === "asset" && media.mediaId === id);
    if (!item || item.kind !== "asset") return privateJson({ error: "Media not found." }, 404);
    return new Response(Uint8Array.from(bytes).buffer, {
      status: 200,
      headers: privateHeaders({
        "Content-Type": item.mime,
        "Content-Length": String(bytes.byteLength),
      }),
    });
  } catch {
    return privateJson({ error: "Private image is temporarily unavailable." }, 503);
  }
}
