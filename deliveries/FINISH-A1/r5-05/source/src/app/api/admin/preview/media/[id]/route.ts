import { verifyOwner, createAuthErrorResponse } from "@/server/auth/require-owner";
import { MediaValidationError } from "@/server/media/validate-upload";
import { readPrivateDraftMedia } from "@/server/media/manifest";

export const dynamic = "force-dynamic";
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store, no-cache, must-revalidate", Pragma: "no-cache", Expires: "0", Vary: "Authorization, Cookie" };
function privateJson(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: PRIVATE_HEADERS });
}
function privateAuthError(failure: Parameters<typeof createAuthErrorResponse>[0]): Response {
  const response = createAuthErrorResponse(failure);
  response.headers.set("Cache-Control", PRIVATE_HEADERS["Cache-Control"]);
  response.headers.set("Vary", PRIVATE_HEADERS.Vary);
  return response;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const auth = await verifyOwner(request);
  if (!auth.ok) return privateAuthError(auth);
  try {
    const { id } = await params;
    if (!id || id.length > 200 || id.includes("/") || id.includes("\\") || id.includes("..")) return privateJson({ error: "Private media was not found." }, 404);
    const media = await readPrivateDraftMedia(id, auth.context);
    return new Response(Buffer.from(media.bytes), {
      status: 200,
      headers: {
        ...PRIVATE_HEADERS,
        "Content-Type": media.mime,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Content-Disposition": "inline",
      },
    });
  } catch (error) {
    if (error && typeof error === "object" && "status" in error && error.status === 404) return privateJson({ error: "Private media was not found." }, 404);
    if (error instanceof MediaValidationError) return privateJson({ error: "Private media could not be validated." }, 422);
    return privateJson({ error: "Private media is temporarily unavailable." }, 503);
  }
}