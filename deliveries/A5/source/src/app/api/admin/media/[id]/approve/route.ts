import { verifyOwner, createAuthErrorResponse } from "@/server/auth/require-owner";
import { approveMediaAsset, MediaValidationError } from "@/server/media/validate-upload";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await verifyOwner(request);
  if (!result.ok) {
    return createAuthErrorResponse(result);
  }

  const { id } = await params;

  try {
    const approved = await approveMediaAsset(id, result.context);
    return Response.json(
      {
        success: true,
        action: "media_approved",
        asset: approved,
        actor: result.context.userId,
      },
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof MediaValidationError) {
      return Response.json({ error: err.message, code: err.code }, { status: 422 });
    }
    return Response.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
