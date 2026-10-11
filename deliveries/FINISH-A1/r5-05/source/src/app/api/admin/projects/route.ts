import { verifyOwner, createAuthErrorResponse } from "@/server/auth/require-owner";
import { ProjectIdSchema, PublishedProjectSchema, type ProjectId } from "@/contracts/content";
import { z } from "zod";
import { listProjectDrafts, saveProjectDraft, RevisionConflictError, ContentValidationError } from "@/server/content/revisions";
import { MediaValidationError } from "@/server/media/validate-upload";

export const dynamic = "force-dynamic";
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store, no-cache, must-revalidate", Pragma: "no-cache", Expires: "0", Vary: "Authorization, Cookie" };
const SaveSchema = z.strictObject({
  projectId: ProjectIdSchema,
  expectedRevision: z.number().int().refine(Number.isSafeInteger).nonnegative(),
  project: PublishedProjectSchema,
});
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
    const drafts = await listProjectDrafts(auth.context);
    const projects = drafts.filter((draft) => draft.projectId !== "candidatex").map((draft) => ({ id: draft.projectId, slug: draft.project.slug, title: draft.project.title, draftRevision: draft.draftRevision }));
    return privateJson({ projects, drafts, authorizedActor: auth.context.userId });
  } catch {
    return privateJson({ error: "Private storage is temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request): Promise<Response> {
  const auth = await verifyOwner(request);
  if (!auth.ok) return privateAuthError(auth);
  try {
    let body: unknown;
    try { body = await request.json(); } catch { return privateJson({ error: "A valid JSON draft request is required." }, { status: 422 }); }
    const parsed = SaveSchema.safeParse(body);
    if (!parsed.success) return privateJson({ error: "projectId, expectedRevision, and a complete structured project are required." }, { status: 422 });
    const { revision: _submittedRevision, ...project } = parsed.data.project;
    void _submittedRevision;
    const saved = await saveProjectDraft({
      projectId: parsed.data.projectId as ProjectId,
      expectedRevision: parsed.data.expectedRevision,
      project,
    }, auth.context);
    return privateJson({ success: true, action: "draft_saved", draftRevision: saved.draftRevision, project: saved.project, actor: auth.context.userId }, { status: 201 });
  } catch (error) {
    if (error instanceof RevisionConflictError) return privateJson({ error: error.message, code: error.code }, { status: error.status });
    if (error instanceof ContentValidationError || error instanceof MediaValidationError) return privateJson({ error: error.message, code: error.code }, { status: 422 });
    return privateJson({ error: "Private storage is temporarily unavailable." }, { status: 503 });
  }
}