import { z } from "zod";
import { verifyOwner, createAuthErrorResponse } from "@/server/auth/require-owner";
import { rollbackPublication } from "@/server/content/publish";
import { ContentValidationError, RevisionConflictError } from "@/server/content/revisions";
import { MediaValidationError } from "@/server/media/validate-upload";

export const dynamic = "force-dynamic";
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store, no-cache, must-revalidate", Pragma: "no-cache", Expires: "0", Vary: "Authorization, Cookie" };
const RollbackSchema = z.strictObject({
  targetRevision: z.number().int().refine(Number.isSafeInteger).positive(),
  expectedRevision: z.number().int().refine(Number.isSafeInteger).positive(),
  reason: z.string().trim().min(1).max(1000),
});
function privateJson(body: unknown, init: ResponseInit = {}): Response {
  return Response.json(body, { ...init, headers: { ...PRIVATE_HEADERS, ...(init.headers as Record<string, string> | undefined) } });
}
function privateAuthError(failure: Parameters<typeof createAuthErrorResponse>[0]): Response {
  const response = createAuthErrorResponse(failure);
  response.headers.set("Cache-Control", PRIVATE_HEADERS["Cache-Control"]);
  response.headers.set("Vary", PRIVATE_HEADERS.Vary);
  return response;
}

export async function POST(request: Request): Promise<Response> {
  const auth = await verifyOwner(request);
  if (!auth.ok) return privateAuthError(auth);
  try {
    let body: unknown;
    try { body = await request.json(); } catch { return privateJson({ error: "A valid rollback request is required." }, { status: 422 }); }
    const parsed = RollbackSchema.safeParse(body);
    if (!parsed.success) return privateJson({ error: "targetRevision, expectedRevision, and a reason are required." }, { status: 422 });
    const publication = await rollbackPublication(parsed.data, auth.context);
    return privateJson({ success: true, action: "publication_rollback", publication, targetRevision: parsed.data.targetRevision, reason: parsed.data.reason, actor: auth.context.userId });
  } catch (error) {
    if (error instanceof RevisionConflictError) return privateJson({ error: error.message, code: error.code }, { status: error.status });
    if (error instanceof ContentValidationError || error instanceof MediaValidationError) return privateJson({ error: error.message, code: error.code }, { status: 422 });
    return privateJson({ error: "Private storage is temporarily unavailable." }, { status: 503 });
  }
}