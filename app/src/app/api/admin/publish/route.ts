import { z } from "zod";
import { verifyOwner, createAuthErrorResponse } from "@/server/auth/require-owner";
import { publishRevision, readPublicPublication, readPublicationHistory } from "@/server/content/publish";
import { ReviewIdentitySchema } from "@/server/content/preview";
import { RevisionConflictError, ContentValidationError } from "@/server/content/revisions";
import { MediaValidationError } from "@/server/media/validate-upload";

export const dynamic = "force-dynamic";

function privateJson(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Authorization, Cookie" },
  });
}

const PublishRequestSchema = z.strictObject({
  expectedRevision: z.number().int().positive(),
  review: ReviewIdentitySchema,
});

export async function GET(request: Request) {
  const owner = await verifyOwner(request);
  if (!owner.ok) {
    const denied = createAuthErrorResponse(owner);
    return privateJson(await denied.json(), denied.status);
  }
  try {
    const active = await readPublicPublication();
    if (!active) return privateJson({ error: "Publication storage is unavailable." }, 503);
    const history = await readPublicationHistory();
    return privateJson({ currentRevision: active.revision, activePublication: active, history, authorizedActor: owner.context.userId });
  } catch {
    return privateJson({ error: "Private storage is temporarily unavailable." }, 503);
  }
}

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
    return privateJson({ error: "A valid JSON publish request is required." }, 422);
  }
  const parsed = PublishRequestSchema.safeParse(body);
  if (!parsed.success) return privateJson({ error: "expectedRevision and a complete review identity are required." }, 422);
  if (parsed.data.expectedRevision !== parsed.data.review.expectedPublicationRevision) {
    return privateJson({ error: "expectedRevision must match review.expectedPublicationRevision." }, 422);
  }

  try {
    const publication = await publishRevision(parsed.data, owner.context);
    return privateJson({ success: true, action: "publication_published", publication, actor: owner.context.userId });
  } catch (error) {
    if (error instanceof RevisionConflictError) return privateJson({ error: error.message, code: error.code }, 409);
    if (error instanceof ContentValidationError || error instanceof MediaValidationError) {
      return privateJson({ error: error.message, code: "UNPROCESSABLE_ENTITY" }, 422);
    }
    return privateJson({ error: "Private storage is temporarily unavailable." }, 503);
  }
}
