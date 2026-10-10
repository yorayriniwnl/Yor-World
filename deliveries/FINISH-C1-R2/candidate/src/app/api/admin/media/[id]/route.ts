import { verifyOwner, createAuthErrorResponse } from "@/server/auth/require-owner";
import { getMediaAsset } from "@/server/media/validate-upload";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Enforce authoritative owner authentication and MFA (AAL2)
  const result = await verifyOwner(request);
  if (!result.ok) {
    // Non-owner / unauthenticated visitor access strictly denied (401 or 403)
    return createAuthErrorResponse(result);
  }

  try {
  const { id } = await params;
  const asset = await getMediaAsset(id);

  if (!asset) {
    return Response.json({ error: `Media asset '${id}' not found` }, { status: 404 });
  }

  return Response.json(
    {
      asset,
      authorizedActor: result.context.userId,
    },
    {
      headers: {
        "Cache-Control": "no-store, private",
        Vary: "Authorization, Cookie",
      },
    }
  );
  } catch {
    return Response.json({ error: "Private storage is temporarily unavailable." },{ status: 503,headers: { "Cache-Control": "no-store, private",Vary: "Authorization, Cookie" } });
  }

}
