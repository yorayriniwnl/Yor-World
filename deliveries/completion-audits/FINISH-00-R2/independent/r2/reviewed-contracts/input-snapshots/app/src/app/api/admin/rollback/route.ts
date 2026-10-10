import { verifyOwner, createAuthErrorResponse } from "@/server/auth/require-owner";
import { rollbackPublication } from "@/server/content/publish";
import { ContentValidationError } from "@/server/content/revisions";
import { MediaValidationError } from "@/server/media/validate-upload";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const result = await verifyOwner(request);
  if (!result.ok) {
    return createAuthErrorResponse(result);
  }

  try {
    const body = await request.json();

    if (typeof body.targetRevision !== "number") {
      return Response.json(
        { error: "targetRevision (number) is required" },
        { status: 422 }
      );
    }

    const publication = await rollbackPublication(body.targetRevision, result.context);

    return Response.json(
      {
        success: true,
        action: "publication_rollback",
        publication,
        actor: result.context.userId,
      },
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof ContentValidationError || err instanceof MediaValidationError) {
      return Response.json(
        { error: err.message, code: "UNPROCESSABLE_ENTITY" },
        { status: 422 }
      );
    }
    return Response.json(
      { error: "Private storage is temporarily unavailable." },
      { status: 503 }
    );
  }
}
