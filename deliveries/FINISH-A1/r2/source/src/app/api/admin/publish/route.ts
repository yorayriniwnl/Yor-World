import { verifyOwner, createAuthErrorResponse } from "@/server/auth/require-owner";
import {
  publishRevision,
  readPublicPublication,
  readPublicationHistory,
} from "@/server/content/publish";
import { RevisionConflictError, ContentValidationError } from "@/server/content/revisions";
import { MediaValidationError } from "@/server/media/validate-upload";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const result = await verifyOwner(request);
  if (!result.ok) {
    return createAuthErrorResponse(result);
  }

  try {
  const active = await readPublicPublication();
  if (!active) return Response.json({ error: "Publication storage is unavailable." },{ status: 503 });
  const history = await readPublicationHistory();

  return Response.json(
    {
      currentRevision: active.revision,
      activePublication: active,
      history,
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
    const body = await request.json();

    if (typeof body.expectedRevision !== "number") {
      return Response.json(
        { error: "expectedRevision (number) is required" },
        { status: 422 }
      );
    }

    const publication = await publishRevision(
      {
        expectedRevision: body.expectedRevision,
        projectId: body.projectId,
        review: body.review,
      },
      result.context
    );

    return Response.json(
      {
        success: true,
        action: "publication_published",
        publication,
        actor: result.context.userId,
      },
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof RevisionConflictError) {
      return Response.json(
        { error: err.message, code: err.code },
        { status: 409 }
      );
    }
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
