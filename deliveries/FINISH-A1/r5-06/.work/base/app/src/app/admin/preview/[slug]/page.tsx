import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectIdSchema } from "@/contracts/content";
import { requirePageOwner } from "@/server/auth/page-owner";
import { DraftNotFoundError, generateDraftReview } from "@/server/content/preview";
import { readApprovedDraftMediaUrls } from "@/server/media/manifest";
import { DraftPreview } from "@/features/admin/draft-preview";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Private Draft Preview | YOR WORLD Administration", robots: { index: false, follow: false } };

export default async function AdminProjectPreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const actor = await requirePageOwner();
  const parsed = ProjectIdSchema.safeParse((await params).slug);
  if (!parsed.success) notFound();
  let review;
  try {
    review = await generateDraftReview(actor, undefined, parsed.data);
  } catch (error) {
    if (error instanceof DraftNotFoundError) notFound();
    throw error;
  }
  const draft = review.drafts[0];
  if (!draft || draft.projectId !== parsed.data) notFound();
  const mediaUrls = await readApprovedDraftMediaUrls(draft, actor).catch(() => ({}));
  return <DraftPreview draft={draft} mediaUrls={mediaUrls} />;
}
