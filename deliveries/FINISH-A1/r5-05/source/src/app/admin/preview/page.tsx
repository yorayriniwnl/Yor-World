import type { Metadata } from "next";
import Link from "next/link";
import { requirePageOwner } from "@/server/auth/page-owner";
import { listProjectDrafts } from "@/server/content/revisions";
import styles from "@/app/admin/admin.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Private Draft Previews | YOR WORLD Administration", robots: { index: false, follow: false } };

export default async function AdminPrivatePreviewIndex() {
  const actor = await requirePageOwner();
  const drafts = await listProjectDrafts(actor);
  return (
    <main>
      <header>
        <h1 className={styles.title}>Private Draft Previews</h1>
        <p className={styles.subtitle}>Owner-only views of saved drafts. Unpublished content stays private.</p>
      </header>
      {drafts.length === 0 ? <p>No saved drafts are available.</p> : (
        <ul>
          {drafts.map((draft) => (
            <li key={draft.projectId}>
              <Link href={`/admin/preview/${encodeURIComponent(draft.projectId)}`} prefetch={false}>{draft.project.title}</Link>
              <span> · {draft.projectId === "candidatex" ? "Private; not publishable" : `Draft revision ${draft.draftRevision}`}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}