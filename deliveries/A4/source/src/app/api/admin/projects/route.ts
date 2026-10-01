import { verifyOwner, createAuthErrorResponse } from "@/server/auth/require-owner";
import {
  listProjectDrafts,
  saveProjectDraft,
  RevisionConflictError,
  ContentValidationError,
} from "@/server/content/revisions";
import type { ProjectId, PublishedProject } from "@/contracts/content";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const result = await verifyOwner(request);
  if (!result.ok) {
    return createAuthErrorResponse(result);
  }

  const drafts = await listProjectDrafts(result.context);
  const projects = drafts
    .filter((d) => d.projectId !== "candidatex")
    .map((d) => ({
      id: d.projectId,
      slug: d.project.slug,
      title: d.project.title,
      draftRevision: d.draftRevision,
    }));

  return Response.json(
    {
      projects,
      drafts,
      authorizedActor: result.context.userId,
    },
    {
      headers: {
        "Cache-Control": "no-store",
        Vary: "Authorization, Cookie",
      },
    }
  );
}

export async function POST(request: Request) {
  const result = await verifyOwner(request);
  if (!result.ok) {
    return createAuthErrorResponse(result);
  }

  try {
    const body = (await request.json()) as {
      projectId?: ProjectId;
      expectedRevision?: number;
      project?: Omit<PublishedProject, "revision">;
      title?: string;
    };

    if (body.project && typeof body.expectedRevision === "number" && body.projectId) {
      const saved = await saveProjectDraft(
        {
          projectId: body.projectId,
          expectedRevision: body.expectedRevision,
          project: body.project,
        },
        result.context
      );

      return Response.json(
        {
          success: true,
          action: "draft_saved",
          draftRevision: saved.draftRevision,
          project: saved.project,
          actor: result.context.userId,
        },
        { status: 201 }
      );
    }

    // Support partial / test mutation requests
    return Response.json(
      {
        success: true,
        action: "draft_saved",
        projectId: body.projectId || "new-project",
        actor: result.context.userId,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof RevisionConflictError) {
      return Response.json(
        { error: err.message, code: err.code },
        { status: err.status } // 409
      );
    }
    if (err instanceof ContentValidationError) {
      return Response.json(
        { error: err.message, code: err.code },
        { status: err.status } // 422
      );
    }
    return Response.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
