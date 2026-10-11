import { verifyOwner, createAuthErrorResponse } from "@/server/auth/require-owner";
import { ProjectIdSchema } from "@/contracts/content";
import { generateDraftReview, PrivateDraftReviewSchema } from "@/server/content/preview";

export const dynamic = "force-dynamic";
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store, no-cache, must-revalidate", Pragma: "no-cache", Expires: "0", Vary: "Authorization, Cookie" };
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
    const requested = new URL(request.url).searchParams.get("projectId");
    let projectId: "candidatex" | "helios" | "zenith" | "ai-vs-real" | "talks" | undefined;
    if (requested !== null) {
      const parsed = ProjectIdSchema.safeParse(requested);
      if (!parsed.success) return privateJson({ error: "Unknown private draft ID." }, { status: 404 });
      projectId = parsed.data;
    }
    const summary = await generateDraftReview(auth.context, undefined, projectId);
    if (projectId && !summary.drafts.some((draft) => draft.projectId === projectId)) return privateJson({ error: "Private draft not found." }, { status: 404 });
    const review = PrivateDraftReviewSchema.parse({ identity: summary.identity, drafts: summary.drafts, checks: summary.checks, canPublish: summary.canPublish });
    return privateJson(review);
  } catch {
    return privateJson({ error: "Private review is temporarily unavailable." }, { status: 503 });
  }
}