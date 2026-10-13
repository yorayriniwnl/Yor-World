import { ProjectIdSchema } from "@/contracts/content";
import { verifyOwner, createAuthErrorResponse } from "@/server/auth/require-owner";
import { generateDraftReview, generateProjectReview } from "@/server/content/preview";

export const dynamic = "force-dynamic";

function privateJson(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      Vary: "Authorization, Cookie",
    },
  });
}

export async function GET(request: Request) {
  const owner = await verifyOwner(request);
  if (!owner.ok) {
    const denied = createAuthErrorResponse(owner);
    return privateJson(await denied.json(), denied.status);
  }
  try {
    const projectIdValue = new URL(request.url).searchParams.get("projectId");
    if (projectIdValue !== null) {
      const parsed = ProjectIdSchema.safeParse(projectIdValue);
      if (!parsed.success) return privateJson({ error: "Unknown project identity." }, 422);
      const review = await generateProjectReview(parsed.data, owner.context);
      if (!review) return privateJson({ error: "Draft not found." }, 404);
      return privateJson(review);
    }
    return privateJson(await generateDraftReview(owner.context));
  } catch {
    return privateJson({ error: "Private review is temporarily unavailable." }, 503);
  }
}
