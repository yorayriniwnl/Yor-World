import { z } from "zod";
import { verifyOwner, createAuthErrorResponse } from "@/server/auth/require-owner";
import { rollbackPublication } from "@/server/content/publish";
import { RevisionConflictError, ContentValidationError } from "@/server/content/revisions";
import { MediaValidationError } from "@/server/media/validate-upload";

export const dynamic = "force-dynamic";

function privateJson(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Authorization, Cookie" },
  });
}

const RollbackRequestSchema = z.strictObject({
  targetRevision: z.number().int().positive(),
  expectedRevision: z.number().int().positive(),
  reason: z.string().trim().min(3).max(500),
});

export async function POST(request: Request) {
  const owner = await verifyOwner(request);
  if (!owner.ok) {
    const denied = createAuthErrorResponse(owner);
    return privateJson(await denied.json(), denied.status);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return privateJson({ error: "A valid JSON rollback request is required." }, 422);
  }
  const parsed = RollbackRequestSchema.safeParse(body);
  if (!parsed.success) return privateJson({ error: "targetRevision, expectedRevision, and a rollback reason are required." }, 422);

  try {
    const publication = await rollbackPublication(parsed.data, owner.context);
    return privateJson({ success: true, action: "publication_rollback", publication, actor: owner.context.userId });
  } catch (error) {
    if (error instanceof RevisionConflictError) return privateJson({ error: error.message, code: error.code }, 409);
    if (error instanceof ContentValidationError || error instanceof MediaValidationError) {
      return privateJson({ error: error.message, code: "UNPROCESSABLE_ENTITY" }, 422);
    }
    return privateJson({ error: "Private storage is temporarily unavailable." }, 503);
  }
}
