import { requirePageOwner } from "@/server/auth/page-owner";
export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
  const draft = summary.drafts.find((item) => item.project.slug === slug);
  if (!draft) notFound();
  const previewProjects = [draft.project];
  const approvedMediaUrls = await readApprovedDraftMediaUrls(previewProjects);

  return (
    <div>
      <header>
        <h1 className={styles.title}>Private Draft Preview: {slug}</h1>
        <p className={styles.subtitle}>
          Owner-only preview showing draft case studies, truthful indicators, and cryptographic candidate review identity.
        </p>
      </header>

      <DraftPreview
        initialReview={summary.identity}
        initialChecks={summary.checks}
        initialProjects={previewProjects}
        initialDraftRevisions={{ [draft.projectId]: draft.draftRevision }}
        canPublish={draft.projectId !== "candidatex" && summary.canPublish}
        approvedMediaUrls={approvedMediaUrls}
        selectedSlug={slug}
      />
    </div>
  );
}
