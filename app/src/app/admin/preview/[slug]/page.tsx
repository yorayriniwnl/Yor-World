import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectIdSchema } from "@/contracts/content";
import { requirePageOwner } from "@/server/auth/page-owner";
import { generateProjectReview } from "@/server/content/preview";
import { resolveDraftMediaUrls } from "@/server/media/manifest";
import { DraftPreview } from "@/features/admin/draft-preview";
import styles from "@/app/admin/admin.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Private Draft Preview | YOR WORLD Administration",
  robots: { index: false, follow: false },
};

export default async function AdminDraftPreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const actor = await requirePageOwner();
  const { slug } = await params;
  const parsed = ProjectIdSchema.safeParse(slug);
  if (!parsed.success) notFound();
  const review = await generateProjectReview(parsed.data, actor);
  const draft = review?.drafts.find((item) => item.projectId === parsed.data);
  if (!review || !draft) notFound();
  const approvedMediaUrls = await resolveDraftMediaUrls(draft, actor);
  return (
    <div>
      <header>
        <h1 className={styles.title}>Private Draft Preview: {draft.project.title}</h1>
        <p className={styles.subtitle}>This owner-only view renders the stored draft revision; it does not change public content.</p>
      </header>
      <DraftPreview draft={draft} checks={review.checks} approvedMediaUrls={approvedMediaUrls} />
    </div>
  );
}
