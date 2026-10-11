import { requirePageOwner } from "@/server/auth/page-owner";
export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { generateDraftReview } from "@/server/content/preview";
import { readApprovedDraftMediaUrls } from "@/server/media/manifest";
import { DraftPreview } from "@/features/admin/draft-preview";
import styles from "@/app/admin/admin.module.css";

export const metadata: Metadata = {
  title: "Draft Preview & Pre-Flight Checks | YOR WORLD Administration",
  robots: { index: false, follow: false },
};

export default async function AdminPreviewPage() {
  const actor = await requirePageOwner();
  const summary = await generateDraftReview(actor);
  const drafts = summary.drafts.map((draft) => draft.project);
  const approvedMediaUrls = await readApprovedDraftMediaUrls(drafts);

  return (
    <div>
      <header>
        <h1 className={styles.title}>Private Draft Preview &amp; Pre-Flight Checks</h1>
        <p className={styles.subtitle}>
          Owner-only preview showing draft case studies, truthful indicators, and cryptographic candidate review identity.
        </p>
      </header>

      <DraftPreview
        initialReview={summary.identity}
        initialChecks={summary.checks}
        initialProjects={drafts}
        initialDraftRevisions={Object.fromEntries(summary.drafts.map((draft) => [draft.projectId,draft.draftRevision]))}
        canPublish={summary.canPublish}
        approvedMediaUrls={approvedMediaUrls}
      />
    </div>
  );
}
