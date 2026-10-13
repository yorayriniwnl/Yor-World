import { z } from "zod";
import { ProjectIdSchema, PublishedProjectSchema, type ProjectId, type PublishedProject } from "@/contracts/content";
import { verifyOwner, createAuthErrorResponse } from "@/server/auth/require-owner";
import {
  listProjectDrafts,
  saveProjectDraft,
  getProjectDraft,
  RevisionConflictError,
  ContentValidationError,
} from "@/server/content/revisions";
import { generateProjectReview } from "@/server/content/preview";
import { MediaValidationError } from "@/server/media/validate-upload";

export const dynamic = "force-dynamic";

function privateJson(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "Cache-Control": "private, no-store", Vary: "Authorization, Cookie" } });
}

const ProjectSaveSchema = z.strictObject({
  projectId: ProjectIdSchema,
  expectedRevision: z.number().int().safe().nonnegative(),
  project: PublishedProjectSchema.omit({ revision: true }).extend({ revision: z.number().int().safe().positive().optional() }),
});

export async function GET(request: Request) {
  const owner = await verifyOwner(request);
  if (!owner.ok) {
    const denied = createAuthErrorResponse(owner);
    return privateJson(await denied.json(), denied.status);
  }
  try {
    const drafts = await listProjectDrafts(owner.context);
    const projects = drafts.filter((draft) => draft.projectId !== "candidatex").map((draft) => ({
      id: draft.projectId,
      slug: draft.project.slug,
      title: draft.project.title,
      draftRevision: draft.draftRevision,
    }));
    return privateJson({ projects, drafts, authorizedActor: owner.context.userId });
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
  let body: z.infer<typeof ProjectSaveSchema>;
  try {
    const parsed = ProjectSaveSchema.safeParse(await request.json());
    if (!parsed.success) return privateJson({ error: "projectId, expectedRevision and a strict structured project are required." }, 422);
    body = parsed.data;
  } catch {
    return privateJson({ error: "Request body must be valid JSON." }, 422);
  }

  try {
    const { revision: _clientRevision, ...project } = body.project;
    const saved = await saveProjectDraft(
      { projectId: body.projectId, expectedRevision: body.expectedRevision, project: project as Omit<PublishedProject, "revision"> },
      owner.context,
    );
    return privateJson({
      success: true,
      action: "draft_saved",
      draftRevision: saved.draftRevision,
      project: saved.project,
      actor: owner.context.userId,
    }, 201);
  } catch (error) {
    if (error instanceof RevisionConflictError) {
      const currentDraft = await getProjectDraft(body.projectId as ProjectId, owner.context).catch(() => null);
      const currentReview = await generateProjectReview(body.projectId as ProjectId, owner.context).catch(() => null);
      return privateJson({
        error: error.message,
        code: error.code,
        ...(currentDraft ? { currentDraft } : {}),
        ...(currentReview ? { currentReview: { identity: currentReview.identity, candidateSha256: currentReview.identity.candidateSha256 } } : {}),
      }, 409);
    }
    if (error instanceof ContentValidationError || error instanceof MediaValidationError) {
      return privateJson({ error: error.message, code: error.code }, 422);
    }
    return privateJson({ error: "Private storage is temporarily unavailable." }, 503);
  }
}
