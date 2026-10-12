import { verifyOwner, createAuthErrorResponse } from "@/server/auth/require-owner";
import { rollbackPublication } from "@/server/content/publish";
import { ContentValidationError, RevisionConflictError } from "@/server/content/revisions";
import { MediaValidationError } from "@/server/media/validate-upload";
import { z } from "zod";

export const dynamic = "force-dynamic";
const privateHeaders = { "Cache-Control": "private, no-store, no-cache, must-revalidate", Pragma: "no-cache", Expires: "0", Vary: "Authorization, Cookie" };
const rollbackBodySchema = z.strictObject({ targetRevision: z.number().int().positive().safe(), expectedRevision: z.number().int().positive().safe(), reason: z.string().trim().min(1).max(500) });
function privateResponse(body: unknown, status = 200) { return Response.json(body, { status, headers: privateHeaders }); }
function privateAuthResponse(response: Response): Response {
  for (const [name, value] of Object.entries(privateHeaders)) response.headers.set(name, value);
  return response;
}

export async function POST(request: Request) {
  const result = await verifyOwner(request);
  if (!result.ok) {
    return privateAuthResponse(createAuthErrorResponse(result));
  }

  try {
    const parsed = rollbackBodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return privateResponse({ error: "targetRevision, expectedRevision and a rollback reason of 1-500 characters are required." }, 422);

    const publication = await rollbackPublication(parsed.data.targetRevision, parsed.data.expectedRevision, parsed.data.reason, result.context);

    return privateResponse({ success: true, action: "publication_rollback", publication, actor: result.context.userId, reason: parsed.data.reason.trim() });
  } catch (err) {
    if (err instanceof RevisionConflictError) return privateResponse({ error: err.message, code: err.code }, 409);
    if (err instanceof ContentValidationError || err instanceof MediaValidationError) {
      return privateResponse({ error: err.message, code: "UNPROCESSABLE_ENTITY" }, 422);
    }
    return privateResponse({ error: "Private storage is temporarily unavailable." }, 503);
  }
}
