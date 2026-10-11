import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePageOwner } from "@/server/auth/page-owner";
import { ProjectIdSchema } from "@/contracts/content";
import { DraftPreview } from "@/features/admin/draft-preview";
import { getProjectDraft } from "@/server/content/revisions";
import { generateDraftReview, PrivateDraftReviewSchema } from "@/server/content/preview";
import { readApprovedDraftMediaUrls } from "@/server/media/manifest";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Private Draft Preview | YOR WORLD Administration", robots: { index: false, follow: false } };

export default async function AdminPrivateDraftPage({ params }: { params: Promise<{ slug: string }> }) {
  const actor = await requirePageOwner();
  const { slug } = await params;
  const parsedId = ProjectIdSchema.safeParse(slug);
  if (!parsedId.success) notFound();
  const draft = await getProjectDraft(parsedId.data, actor);
  if (!draft) notFound();
  const summary = await generateDraftReview(actor, undefined, parsedId.data);
  const review = PrivateDraftReviewSchema.parse({ identity: summary.identity, drafts: summary.drafts, checks: summary.checks, canPublish: summary.canPublish });
  const mediaUrls = await readApprovedDraftMediaUrls([draft.project]);
  return <DraftPreview draft={draft} review={review} mediaUrls={mediaUrls} />;
}