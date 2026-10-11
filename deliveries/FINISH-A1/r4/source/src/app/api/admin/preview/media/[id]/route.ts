import { verifyOwner } from "@/server/auth/require-owner";
import { listProjectDrafts } from "@/server/content/revisions";
import { readPrivateDraftMedia } from "@/server/media/manifest";

export const dynamic = "force-dynamic";
const privateHeaders = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
  Vary: "Authorization, Cookie",
};

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyOwner(request);
  if (!auth.ok) return Response.json({ error: auth.message, code: auth.code }, { status: auth.status, headers: privateHeaders });
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) {
    return Response.json({ error: "Invalid media identifier." }, { status: 404, headers: privateHeaders });
  }

  try {
    const drafts = await listProjectDrafts(auth.context);
    const referenced = drafts.some((draft) => draft.project.sections.some((section) => section.blocks.some(
      (block) => block.type === "image" && block.mediaId === id,
    )));
    if (!referenced) return Response.json({ error: "Media is not referenced by a private draft." }, { status: 404, headers: privateHeaders });

    const media = await readPrivateDraftMedia(id);
    return new Response(Uint8Array.from(media.bytes), {
      status: 200,
      headers: { ...privateHeaders, "Content-Type": media.mime, "X-Content-Type-Options": "nosniff" },
    });
  } catch (error) {
    const status = error && typeof error === "object" && "status" in error ? Number(error.status) :
      error instanceof Error && error.name === "MediaValidationError" ? 422 : 503;
    return Response.json({ error: status === 503 ? "Private media is temporarily unavailable." : error instanceof Error ? error.message : "Media preview failed." },
      { status: status === 404 || status === 422 ? status : 503, headers: privateHeaders });
  }
}
