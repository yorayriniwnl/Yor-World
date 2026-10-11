import { z } from "zod";
import { verifyOwner, createAuthErrorResponse } from "@/server/auth/require-owner";
import { publishRevision, readPublicPublication, readPublicationHistory } from "@/server/content/publish";
import { RevisionConflictError, ContentValidationError } from "@/server/content/revisions";
import { MediaValidationError } from "@/server/media/validate-upload";
import { ReviewIdentitySchema } from "@/server/content/preview";

export const dynamic = "force-dynamic";
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store, no-cache, must-revalidate", Pragma: "no-cache", Expires: "0", Vary: "Authorization, Cookie" };
const PublishSchema = z.strictObject({
  expectedRevision: z.number().int().refine(Number.isSafeInteger).positive(),
  review: ReviewIdentitySchema,
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

export async function GET(request: Request): Promise<Response> {
  const auth = await verifyOwner(request);
  if (!auth.ok) return privateAuthError(auth);
  try {
    const activePublication = await readPublicPublication();
    if (!activePublication) return privateJson({ error: "Publication storage is unavailable." }, { status: 503 });
    const history = await readPublicationHistory();
    return privateJson({ currentRevision: activePublication.revision, activePublication, history, authorizedActor: auth.context.userId });
  } catch {
    return privateJson({ error: "Private storage is temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request): Promise<Response> {
  const auth = await verifyOwner(request);
  if (!auth.ok) return privateAuthError(auth);
  try {
    let body: unknown;
    try { body = await request.json(); } catch { return privateJson({ error: "A complete review identity is required." }, { status: 422 }); }
    const parsed = PublishSchema.safeParse(body);
    if (!parsed.success) return privateJson({ error: "expectedRevision and the complete current review identity are required." }, { status: 422 });
    const publication = await publishRevision({ expectedRevision: parsed.data.expectedRevision, review: parsed.data.review }, auth.context);
    return privateJson({ success: true, action: "publication_published", publication, actor: auth.context.userId });
  } catch (error) {
    if (error instanceof RevisionConflictError) return privateJson({ error: error.message, code: error.code }, { status: 409 });
    if (error instanceof ContentValidationError || error instanceof MediaValidationError) return privateJson({ error: error.message, code: error.code }, { status: 422 });
    return privateJson({ error: "Private storage is temporarily unavailable." }, { status: 503 });
  }
}