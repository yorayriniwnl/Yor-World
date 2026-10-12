import { verifyOwner, createAuthErrorResponse } from "@/server/auth/require-owner";
import { readApprovedDraftMediaBytes } from "@/server/media/manifest";

export const dynamic = "force-dynamic";
const privateHeaders = { "Cache-Control": "private, no-store, no-cache, must-revalidate", Pragma: "no-cache", Expires: "0", Vary: "Authorization, Cookie", "X-Content-Type-Options": "nosniff" };
function privateAuthResponse(response: Response): Response {
  for (const [name, value] of Object.entries(privateHeaders)) response.headers.set(name, value);
  return response;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const result = await verifyOwner(request);
  if (!result.ok) return privateAuthResponse(createAuthErrorResponse(result));
  const { id } = await context.params;
  if (!id || id.length > 200 || id.includes("/")) {
    return new Response(null, { status: 404, headers: privateHeaders });
  }
  try {
    const media = await readApprovedDraftMediaBytes(id, result.context);
    if (!media) return new Response(null, { status: 404, headers: privateHeaders });
    return new Response(media.bytes.slice().buffer as ArrayBuffer, {
      status: 200,
      headers: {
        ...privateHeaders,
        "Content-Type": media.mime,
        "Content-Length": String(media.bytes.byteLength),
      },
    });
  } catch {
    return new Response(null, { status: 503, headers: privateHeaders });
  }
}
