import { verifyOwner, createAuthErrorResponse } from "@/server/auth/require-owner";
import { generateDraftReview } from "@/server/content/preview";
import { readApprovedDraftMediaUrls } from "@/server/media/manifest";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const result = await verifyOwner(request);
  if (!result.ok) {
    return createAuthErrorResponse(result);
  }

  try {
    const summary = await generateDraftReview(result.context);
    const approvedMediaUrls = await readApprovedDraftMediaUrls(summary.projects);

    return Response.json(
      {
        review: summary.review,
        checks: summary.checks,
        projects: summary.projects,
        candidatePublication: summary.candidatePublication,
        approvedMediaUrls,
        actor: result.context.userId,
      },
      {
        headers: {
          "Cache-Control": "private, no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
          Vary: "Authorization, Cookie",
        },
      }
    );
  } catch (err) {
    return Response.json(
      {
        error: "Draft preview is temporarily unavailable.",
        message: err instanceof Error ? err.message : String(err),
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "private, no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
          Vary: "Authorization, Cookie",
        },
      }
    );
  }
}
