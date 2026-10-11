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
const publishBodySchema = z.strictObject({ expectedRevision: z.number().int().positive().safe(), review: ReviewIdentitySchema });
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
  const active = await readPublicPublication();
  if (!active) return privateResponse({ error: "Publication storage is unavailable." }, 503);
  const history = await readPublicationHistory();

  return privateResponse({ currentRevision: active.revision, activePublication: active, history, authorizedActor: result.context.userId });
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
    const parsed = publishBodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return privateResponse({ error: "A positive expectedRevision and complete current review are required." }, 422);

    const publication = await publishRevision(
      {
        expectedRevision: parsed.data.expectedRevision,
        review: parsed.data.review,
      },
      result.context
    );

    return privateResponse({ success: true, action: "publication_published", publication, actor: result.context.userId });
  } catch (err) {
    if (err instanceof RevisionConflictError) {
      return privateResponse({ error: err.message, code: err.code }, 409);
    }
    if (err instanceof ContentValidationError || err instanceof MediaValidationError) {
      return privateResponse({ error: err.message, code: "UNPROCESSABLE_ENTITY" }, 422);
    }
    return privateResponse({ error: "Private storage is temporarily unavailable." }, 503);
  }
}
