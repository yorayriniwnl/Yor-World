import { requirePageOwner } from "@/server/auth/page-owner";
export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { PublishReview } from "@/features/admin/publish-review";
import { approvedPublication } from "@/content/approved-publication";
import { readPublicPublication, readPublicationHistory } from "@/server/content/publish";
import { generateDraftReview } from "@/server/content/preview";
import styles from "@/app/admin/admin.module.css";

export const metadata: Metadata = {
  title: "Publish Review & Rollback | YOR WORLD Administration",
  robots: { index: false, follow: false },
};

export default async function AdminPublishPage() {
  const actor = await requirePageOwner();
  const publication = await readPublicPublication() ?? approvedPublication;
  const initialHistory = await readPublicationHistory();
  const draftSummary = await generateDraftReview(actor);

  return (
    <div>
      <header>
        <h1 className={styles.title}>Publication Review & Rollback</h1>
        <p className={styles.subtitle}>
          Pre-flight evidence and media checks, optimistic concurrency publication, and authoritative rollback.
        </p>
      </header>

      <PublishReview
        initialPublication={publication}
        initialHistory={initialHistory}
        initialReview={draftSummary.review}
        initialChecks={draftSummary.checks}
      />
    </div>
  );
}
