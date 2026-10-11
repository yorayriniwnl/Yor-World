import { verifyOwner, createAuthErrorResponse } from "@/server/auth/require-owner";
import { rollbackPublication } from "@/server/content/publish";
import { RevisionConflictError, ContentValidationError } from "@/server/content/revisions";
import { MediaValidationError } from "@/server/media/validate-upload";
import { z } from "zod";

export const dynamic = "force-dynamic";
const privateHeaders = { "Cache-Control": "private, no-store, no-cache, must-revalidate", Pragma: "no-cache", Expires: "0", Vary: "Authorization, Cookie" };
const rollbackBody = z.strictObject({
  targetRevision: z.number().int().positive(),
  expectedRevision: z.number().int().positive(),
  reason: z.string().trim().min(1).max(500),
});

function privateAuthFailure(result: Exclude<Awaited<ReturnType<typeof verifyOwner>>, { ok: true }>) {
  const response = createAuthErrorResponse(result);
  for (const [name, value] of Object.entries(privateHeaders)) response.headers.set(name, value);
  return response;
}

export async function POST(request: Request) {
  const auth = await verifyOwner(request);
  if (!auth.ok) {
    return privateAuthFailure(auth);
  }
  try {
    const body: unknown = await request.json().catch(() => null);
    const parsed = rollbackBody.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "targetRevision, expectedRevision and a rollback reason of 1-500 characters are required." },
        { status: 422, headers: privateHeaders });
    }
    const input = parsed.data;
    const publication = await rollbackPublication(input.targetRevision, input.expectedRevision, input.reason, auth.context);
    return Response.json({ success: true, action: "publication_rollback", publication, actor: auth.context.userId,
      visibility: publication.visibility }, { status: 200, headers: privateHeaders });
  } catch (error) {
    if (error instanceof RevisionConflictError) return Response.json({ error: error.message, code: error.code }, { status: 409, headers: privateHeaders });
    if (error instanceof ContentValidationError || error instanceof MediaValidationError) {
      return Response.json({ error: error.message, code: "UNPROCESSABLE_ENTITY" }, { status: 422, headers: privateHeaders });
    }
    return Response.json({ error: "Private storage is temporarily unavailable." }, { status: 503, headers: privateHeaders });
  }
}
