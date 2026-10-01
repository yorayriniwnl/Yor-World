import type { Metadata } from "next";
import { ProjectEditor } from "@/features/admin/project-editor";
import { approvedPublication } from "@/content/approved-publication";
import styles from "@/app/admin/admin.module.css";

export const metadata: Metadata = {
  title: "Project Editor | YOR WORLD Administration",
  robots: { index: false, follow: false },
};

export default function AdminEditorPage() {
  return (
    <main>
      <header>
        <h1 className={styles.title}>Project Content & Draft Editor</h1>
        <p className={styles.subtitle}>
          Authoritative owner editing for project metadata, structured sections, evidence, and media references.
        </p>
      </header>

      <ProjectEditor initialProjects={approvedPublication.projects} />
    </main>
  );
}
