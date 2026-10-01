import { verifyOwner, createAuthErrorResponse } from "@/server/auth/require-owner";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const result = await verifyOwner(request);
  if (!result.ok) {
    return createAuthErrorResponse(result);
  }

  // Returns protected project administrative metadata
  return Response.json(
    {
      projects: [
        { id: "proj-1", slug: "ai-vs-real", title: "AI vs. Real Image Detector", draftRevision: 1 },
        { id: "proj-2", slug: "zenith", title: "Yor Zenith", draftRevision: 1 },
        { id: "proj-3", slug: "helios", title: "Yor Helios", draftRevision: 1 },
        { id: "proj-4", slug: "talks", title: "Yor Talks V2", draftRevision: 1 },
      ],
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
    const body = await request.json();
    return Response.json(
      {
        success: true,
        action: "draft_saved",
        projectId: body.projectId || "new-project",
        actor: result.context.userId,
      },
      { status: 201 }
    );
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}
