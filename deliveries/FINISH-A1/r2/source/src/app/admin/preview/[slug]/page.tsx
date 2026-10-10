import { requirePageOwner } from "@/server/auth/page-owner";
export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { generateDraftReview } from "@/server/content/preview";
import { readApprovedDraftMediaUrls } from "@/server/media/manifest";
import { DraftPreview } from "@/features/admin/draft-preview";
import styles from "@/app/admin/admin.module.css";

export const metadata: Metadata = {
  title: "Project Draft Preview | YOR WORLD Administration",
  robots: { index: false, follow: false },
};

export default async function AdminProjectPreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const actor = await requirePageOwner();
  const { slug } = await params;
  const summary = await generateDraftReview(actor);
  const approvedMediaUrls = await readApprovedDraftMediaUrls(summary.projects);

  return (
    <div>
      <header>
        <h1 className={styles.title}>Private Draft Preview: {slug}</h1>
        <p className={styles.subtitle}>
          Owner-only preview showing draft case studies, truthful indicators, and cryptographic candidate review identity.
        </p>
      </header>

      <DraftPreview
        initialReview={summary.review}
        initialChecks={summary.checks}
        initialProjects={summary.projects}
        approvedMediaUrls={approvedMediaUrls}
        selectedSlug={slug}
      />
    </div>
  );
}
