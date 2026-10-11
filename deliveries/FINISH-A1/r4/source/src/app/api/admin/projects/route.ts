import { verifyOwner, createAuthErrorResponse } from "@/server/auth/require-owner";
import {
  listProjectDrafts,
  saveProjectDraft,
  RevisionConflictError,
  ContentValidationError,
} from "@/server/content/revisions";
import { ProjectIdSchema, PublishedProjectSchema } from "@/contracts/content";
import { MediaValidationError } from "@/server/media/validate-upload";
import { generateDraftReview } from "@/server/content/preview";
import { z } from "zod";

export const dynamic = "force-dynamic";
const privateHeaders = { "Cache-Control": "private, no-store, no-cache, must-revalidate", Pragma: "no-cache", Expires: "0", Vary: "Authorization, Cookie" };
const projectSaveBody = z.strictObject({
  projectId: ProjectIdSchema,
  expectedRevision: z.number().int().nonnegative(),
  project: PublishedProjectSchema,
});

function privateAuthFailure(result: Exclude<Awaited<ReturnType<typeof verifyOwner>>, { ok: true }>) {
  const response = createAuthErrorResponse(result);
  for (const [name, value] of Object.entries(privateHeaders)) response.headers.set(name, value);
  return response;
}

export async function GET(request: Request) {
  const result = await verifyOwner(request);
  if (!result.ok) {
    return privateAuthFailure(result);
  }

  try {
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
      headers: privateHeaders,
    }
  );
  } catch {
  return Response.json({ error: "Private storage is temporarily unavailable." },{ status: 503,headers: privateHeaders });
  }

}

export async function POST(request: Request) {
  const result = await verifyOwner(request);
  if (!result.ok) {
    return privateAuthFailure(result);
  }

  let requestedProjectId: z.infer<typeof ProjectIdSchema> | null = null;
  try {
    const body: unknown = await request.json().catch(() => null);
    const parsed = projectSaveBody.safeParse(body);
    if (!parsed.success) return Response.json({ error: "A JSON body with projectId, expectedRevision, and a complete project is required." }, { status: 422, headers: privateHeaders });
    const input = parsed.data;
    requestedProjectId = input.projectId;

    const saved = await saveProjectDraft(
      {
        projectId: input.projectId,
        expectedRevision: input.expectedRevision,
        project: input.project,
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
      { status: 201, headers: privateHeaders }
    );
  } catch (err) {
    if (err instanceof RevisionConflictError) {
      let currentDraft = null;
      let currentReview = null;
      try {
        const drafts = await listProjectDrafts(result.context);
        currentDraft = drafts.find((draft) => draft.projectId === requestedProjectId) ?? null;
        currentReview = (await generateDraftReview(result.context)).identity;
      } catch { /* Return the conflict without private details if a refresh read fails. */ }
      return Response.json({ error: err.message, code: err.code, currentDraft, currentReview }, { status: err.status, headers: privateHeaders });
    }
    if (err instanceof ContentValidationError) {
      return Response.json(
        { error: err.message, code: err.code },
        { status: err.status, headers: privateHeaders } // 422
      );
    }
    if (err instanceof MediaValidationError) return Response.json({ error: err.message, code: "UNPROCESSABLE_ENTITY" }, { status: 422, headers: privateHeaders });
    return Response.json(
      { error: "Private storage is temporarily unavailable." },
      { status: 503, headers: privateHeaders }
    );
  }
}
