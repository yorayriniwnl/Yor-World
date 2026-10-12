import { verifyOwner, createAuthErrorResponse } from "@/server/auth/require-owner";
import { generateDraftReview, PrivateDraftReviewSchema } from "@/server/content/preview";
import { readApprovedDraftMediaUrls } from "@/server/media/manifest";
import { ProjectIdSchema } from "@/contracts/content";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const result = await verifyOwner(request);
  if (!result.ok) {
    const response = createAuthErrorResponse(result);
    for (const [name, value] of Object.entries(privateHeaders)) response.headers.set(name, value);
    return response;
  }

  try {
    const summary = await generateDraftReview(result.context);
    const requestedProject = new URL(request.url).searchParams.get("projectId");
    if (requestedProject && !ProjectIdSchema.safeParse(requestedProject).success) {
      return Response.json({ error: "Unknown project id." }, { status: 422, headers: privateHeaders });
    }
    const requestedDraft = requestedProject ? summary.drafts.find((draft) => draft.projectId === requestedProject) : null;
    if (requestedProject && !requestedDraft) return Response.json({ error: "Draft not found." }, { status: 404, headers: privateHeaders });
    const previewProjects = requestedDraft ? [requestedDraft.project] : summary.projects;
    const approvedMediaUrls = await readApprovedDraftMediaUrls(previewProjects);
    const privateReview = PrivateDraftReviewSchema.parse({
      identity: summary.identity,
      drafts: summary.drafts,
      checks: summary.checks,
      canPublish: requestedDraft?.projectId === "candidatex" ? false : summary.canPublish,
    });

    return Response.json(
      {
        ...privateReview,
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

const privateHeaders = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
  Vary: "Authorization, Cookie",
};
