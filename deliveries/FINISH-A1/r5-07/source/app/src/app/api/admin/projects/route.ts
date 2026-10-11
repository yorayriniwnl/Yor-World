import { verifyOwner, createAuthErrorResponse } from "@/server/auth/require-owner";
import {
  listProjectDrafts,
  saveProjectDraft,
  RevisionConflictError,
  ContentValidationError,
} from "@/server/content/revisions";
import { ProjectIdSchema, PublishedProjectSchema } from "@/contracts/content";
import { z } from "zod";
import { MediaValidationError } from "@/server/media/validate-upload";

export const dynamic = "force-dynamic";
const privateHeaders = { "Cache-Control": "private, no-store, no-cache, must-revalidate", Pragma: "no-cache", Expires: "0", Vary: "Authorization, Cookie" };
const saveBodySchema = z.strictObject({
  projectId: ProjectIdSchema,
  expectedRevision: z.number().int().positive().safe(),
  project: PublishedProjectSchema,
});

function privateResponse(body: unknown, status = 200) {
  return Response.json(body, { status, headers: privateHeaders });
}

function privateAuthResponse(response: Response): Response {
  for (const [name, value] of Object.entries(privateHeaders)) response.headers.set(name, value);
  return response;
}

export async function GET(request: Request) {
  const result = await verifyOwner(request);
  if (!result.ok) {
    return privateAuthResponse(createAuthErrorResponse(result));
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

  return privateResponse(
    {
      projects,
      drafts,
      authorizedActor: result.context.userId,
    }
  );
  } catch {
    return privateResponse({ error: "Private storage is temporarily unavailable." }, 503);
  }

}

export async function POST(request: Request) {
  const result = await verifyOwner(request);
  if (!result.ok) {
    return privateAuthResponse(createAuthErrorResponse(result));
  }

  try {
    const parsed = saveBodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return privateResponse({ error: "projectId, positive expectedRevision and a complete project are required." }, 422);
    const { revision: _revision, ...project } = parsed.data.project;
    void _revision;
    const saved = await saveProjectDraft({ projectId: parsed.data.projectId, expectedRevision: parsed.data.expectedRevision, project }, result.context);
    return privateResponse({ success: true, action: "draft_saved", draftRevision: saved.draftRevision, project: saved.project, actor: result.context.userId }, 201);
  } catch (err) {
    if (err instanceof RevisionConflictError) {
      return privateResponse({ error: err.message, code: err.code, currentDraft: err.currentDraft }, err.status);
    }
    if (err instanceof ContentValidationError || err instanceof MediaValidationError) {
      return privateResponse({ error: err.message, code: err.code }, err.status);
    }
    return privateResponse({ error: "Private storage is temporarily unavailable." }, 503);
  }
}
