import { verifyOwner, createAuthErrorResponse } from "@/server/auth/require-owner";
import { generateDraftReview } from "@/server/content/preview";
import { ProjectIdSchema } from "@/contracts/content";

export const dynamic = "force-dynamic";
const privateHeaders = { "Cache-Control": "private, no-store, no-cache, must-revalidate", Pragma: "no-cache", Expires: "0", Vary: "Authorization, Cookie" };
function privateResponse(body: unknown, status = 200) { return Response.json(body, { status, headers: privateHeaders }); }
function privateAuthResponse(response: Response): Response {
  for (const [name, value] of Object.entries(privateHeaders)) response.headers.set(name, value);
  return response;
}

export async function GET(request: Request) {
  const result = await verifyOwner(request);
  if (!result.ok) return privateAuthResponse(createAuthErrorResponse(result));
  const rawProjectId = new URL(request.url).searchParams.get("projectId");
  const projectId = rawProjectId === null ? null : ProjectIdSchema.safeParse(rawProjectId);
  if (projectId !== null && !projectId.success) return privateResponse({ error: "Invalid project ID." }, 422);
  try {
    const review = await generateDraftReview(result.context, undefined, projectId?.data ?? null);
    if (projectId && !review.drafts.some((draft) => draft.projectId === projectId.data)) {
      return privateResponse({ error: "Draft not found." }, 404);
    }
    return privateResponse({ review, authorizedActor: result.context.userId });
  } catch {
    return privateResponse({ error: "Private review is temporarily unavailable." }, 503);
  }
}
