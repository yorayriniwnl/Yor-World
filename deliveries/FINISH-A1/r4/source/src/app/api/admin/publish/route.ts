import { verifyOwner, createAuthErrorResponse } from "@/server/auth/require-owner";
import {
  publishRevision,
  readPublicPublication,
  readPublicationHistory,
} from "@/server/content/publish";
import { RevisionConflictError, ContentValidationError } from "@/server/content/revisions";
import { MediaValidationError } from "@/server/media/validate-upload";
import { ReviewIdentitySchema } from "@/server/content/preview";
import { z } from "zod";

export const dynamic = "force-dynamic";
const privateHeaders = { "Cache-Control": "private, no-store, no-cache, must-revalidate", Pragma: "no-cache", Expires: "0", Vary: "Authorization, Cookie" };
const publishBody = z.strictObject({
  expectedRevision: z.number().int().positive(),
  review: ReviewIdentitySchema,
});

function privateAuthFailure(result: Exclude<Awaited<ReturnType<typeof verifyOwner>>, { ok: true }>) {
  const response = createAuthErrorResponse(result);
  for (const [name, value] of Object.entries(privateHeaders)) response.headers.set(name, value);
  return response;
}

export async function GET(request: Request) {
  const result = await verifyOwner(request);
  if (!result.ok) {
    return privateAuthFailure(result);
  }

  try {
  const active = await readPublicPublication();
  if (!active) return Response.json({ error: "Publication storage is unavailable." },{ status: 503, headers: privateHeaders });
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
        ...privateHeaders,
      },
    }
  );
  } catch {
    return Response.json({ error: "Private storage is temporarily unavailable." },{ status: 503,headers: privateHeaders });
  }

}

export async function POST(request: Request) {
  const result = await verifyOwner(request);
  if (!result.ok) {
    return privateAuthFailure(result);
  }

  try {
    const body: unknown = await request.json().catch(() => null);
    const parsed = publishBody.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "expectedRevision and the complete current review identity are required." },
        { status: 422, headers: privateHeaders }
      );
    }
    const input = parsed.data;

    const publication = await publishRevision(
      {
        expectedRevision: input.expectedRevision,
        review: input.review,
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
      { status: 200, headers: privateHeaders }
    );
  } catch (err) {
    if (err instanceof RevisionConflictError) {
      return Response.json(
        { error: err.message, code: err.code },
        { status: 409, headers: privateHeaders }
      );
    }
    if (err instanceof ContentValidationError || err instanceof MediaValidationError) {
      return Response.json(
        { error: err.message, code: "UNPROCESSABLE_ENTITY" },
        { status: 422, headers: privateHeaders }
      );
    }
    return Response.json(
      { error: "Private storage is temporarily unavailable." },
      { status: 503, headers: privateHeaders }
    );
  }
}
