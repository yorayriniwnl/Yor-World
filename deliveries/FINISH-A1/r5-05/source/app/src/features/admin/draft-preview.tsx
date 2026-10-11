import Link from "next/link";
import type { ProjectId, PublishedProject } from "@/contracts/content";
import { CaseStudy } from "@/features/portfolio/case-study";
import styles from "@/app/admin/admin.module.css";

interface PreviewDraft {
  projectId: ProjectId;
  draftRevision: number;
  project: PublishedProject;
  updatedAt: string;
  updatedBy: string;
}

export function DraftPreview({ draft, mediaUrls }: { draft: PreviewDraft; mediaUrls: Readonly<Record<string, string>> }) {
  return (
    <main>
      <header className={styles.sectionBox}>
        <p className={styles.badge}>Private draft preview · Revision {draft.draftRevision}</p>
        <p className={styles.subtitle}>Updated {new Date(draft.updatedAt).toLocaleString()} by <code>{draft.updatedBy}</code>.</p>
        {draft.projectId === "candidatex" && <p role="note">CandidateX remains private and excluded from publication. Replace synthetic seed text with owner-authored content and evidence.</p>}
        <Link href="/admin/editor" className={styles.buttonSecondary}>Return to editor</Link>
      </header>
      <CaseStudy project={draft.project} approvedMediaUrls={mediaUrls} presentation={{ mode: "draft", draftRevision: draft.draftRevision }} />
    </main>
  );
}
