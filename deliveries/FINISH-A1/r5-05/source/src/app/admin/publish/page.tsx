import { requirePageOwner } from "@/server/auth/page-owner";
export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import Link from "next/link";
import { PublishReview } from "@/features/admin/publish-review";
import { approvedPublication } from "@/content/approved-publication";
import { readPublicPublication, readPublicationHistory } from "@/server/content/publish";
import { generateDraftReview, PrivateDraftReviewSchema } from "@/server/content/preview";
import styles from "@/app/admin/admin.module.css";

export const metadata: Metadata = { title: "Publish Review & Rollback | YOR WORLD Administration", robots: { index: false, follow: false } };

export default async function AdminPublishPage() {
  const actor = await requirePageOwner();
  const [active, initialHistory, summary] = await Promise.all([
    readPublicPublication(),
    readPublicationHistory(),
    generateDraftReview(actor),
  ]);
  const publication = active ?? approvedPublication;
  const initialReview = PrivateDraftReviewSchema.parse({ identity: summary.identity, drafts: summary.drafts, checks: summary.checks, canPublish: summary.canPublish });
  return (
    <main>
      <header>
        <h1 className={styles.title}>Publication Review &amp; Rollback</h1>
        <p className={styles.subtitle}>Review the complete candidate and its executed checks before submitting a publish action.</p>
        <nav aria-label="Administration workflow"><Link href="/admin/editor">Edit drafts</Link> · <Link href="/admin/preview">Private previews</Link></nav>
      </header>
      <PublishReview initialPublication={publication} initialHistory={initialHistory} initialReview={initialReview} />
    </main>
  );
}