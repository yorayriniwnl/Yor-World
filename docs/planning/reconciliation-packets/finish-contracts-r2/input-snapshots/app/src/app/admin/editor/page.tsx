import { requirePageOwner } from "@/server/auth/page-owner";
export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { ProjectEditor } from "@/features/admin/project-editor";
import { listProjectDrafts } from "@/server/content/revisions";
import styles from "@/app/admin/admin.module.css";

export const metadata: Metadata = {
  title: "Project Editor | YOR WORLD Administration",
  robots: { index: false, follow: false },
};

export default async function AdminEditorPage() {
  const actor = await requirePageOwner();
  const drafts = await listProjectDrafts(actor);
  return (
    <div>
      <header>
        <h1 className={styles.title}>Project Content & Draft Editor</h1>
        <p className={styles.subtitle}>
          Authoritative owner editing for project metadata, structured sections, evidence, and media references.
        </p>
      </header>

      <ProjectEditor initialProjects={drafts.filter((draft) => draft.projectId !== "candidatex").map((draft) => draft.project)} />
    </div>
  );
}
