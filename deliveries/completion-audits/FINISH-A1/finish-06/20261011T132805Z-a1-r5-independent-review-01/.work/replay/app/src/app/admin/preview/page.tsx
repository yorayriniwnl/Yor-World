import Link from "next/link";
import type { Metadata } from "next";
import { requirePageOwner } from "@/server/auth/page-owner";
import { generateDraftReview } from "@/server/content/preview";
import styles from "@/app/admin/admin.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Private Draft Previews | YOR WORLD Administration", robots: { index: false, follow: false } };

export default async function AdminPreviewIndexPage() {
  const actor = await requirePageOwner();
  const review = await generateDraftReview(actor);
  return (
    <main>
      <h1 className={styles.title}>Private Draft Previews</h1>
      <p className={styles.subtitle}>Owner-only rendering of saved drafts. Preview images are served through an authenticated private route.</p>
      <ul className={styles.sectionBox}>
        {review.drafts.map((draft) => (
          <li key={draft.projectId}>
            <Link href={`/admin/preview/${encodeURIComponent(draft.projectId)}`}>{draft.project.title} · r{draft.draftRevision}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
