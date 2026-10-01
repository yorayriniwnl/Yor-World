import type { Metadata } from "next";
import { PublishReview } from "@/features/admin/publish-review";
import { approvedPublication } from "@/content/approved-publication";
import styles from "@/app/admin/admin.module.css";

export const metadata: Metadata = {
  title: "Publish Review & Rollback | YOR WORLD Administration",
  robots: { index: false, follow: false },
};

export default function AdminPublishPage() {
  const initialHistory = [
    {
      revision: 1,
      actor: "system-seed",
      publishedAt: approvedPublication.publishedAt,
      action: "publish" as const,
    },
  ];

  return (
    <main>
      <header>
        <h1 className={styles.title}>Publication Review & Rollback</h1>
        <p className={styles.subtitle}>
          Pre-flight evidence and media checks, optimistic concurrency publication, and authoritative rollback.
        </p>
      </header>

      <PublishReview
        initialPublication={approvedPublication}
        initialHistory={initialHistory}
      />
    </main>
  );
}
