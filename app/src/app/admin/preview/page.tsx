import Link from "next/link";
import type { Metadata } from "next";
import { requirePageOwner } from "@/server/auth/page-owner";
import { generateDraftReview } from "@/server/content/preview";
import { listProjectDrafts } from "@/server/content/revisions";
import styles from "@/app/admin/admin.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Private Draft Previews | YOR WORLD Administration",
  robots: { index: false, follow: false },
};

export default async function AdminDraftPreviewIndex() {
  const actor = await requirePageOwner();
  const [drafts, review] = await Promise.all([
    listProjectDrafts(actor),
    generateDraftReview(actor),
  ]);
  return (
    <div>
      <header>
        <h1 className={styles.title}>Private Draft Previews</h1>
        <p className={styles.subtitle}>Owner-only authored content and executed checks. Drafts remain unpublished.</p>
      </header>
      <section className={styles.sectionBox} aria-label="Publication review identity">
        <h2>Candidate review</h2>
        <p>Current publication: r{review.identity.expectedPublicationRevision}</p>
        <p>Candidate SHA-256: <code>{review.identity.candidateSha256}</code></p>
        <p>{review.canPublish ? "All executed checks passed." : "Publication is blocked by failed checks."}</p>
        <ul>
          {review.checks.map((check) => (
            <li key={check.scope + ":" + check.id + ":" + check.kind}>
              {check.id} · {check.kind} · {check.status}
              {check.reasons.length > 0 ? " — " + check.reasons.join("; ") : ""}
            </li>
          ))}
        </ul>
      </section>
      <section className={styles.grid} aria-label="Project drafts">
        {drafts.map((draft) => (
          <article className={styles.card} key={draft.projectId}>
            <h2>{draft.project.title}</h2>
            <p>{draft.projectId} · draft r{draft.draftRevision} · Unpublished preview</p>
            <Link href={"/admin/preview/" + encodeURIComponent(draft.project.slug)}>Open private preview</Link>
          </article>
        ))}
      </section>
    </div>
  );
}
