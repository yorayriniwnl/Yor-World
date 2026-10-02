import type { Metadata } from "next";
import { PageIntro } from "@/features/portfolio/page-intro";
import { draftIdentity } from "@/features/portfolio/public-content";
import styles from "@/features/portfolio/portfolio.module.css";

export const metadata: Metadata = { title: "About" };
export default function AboutPage() {
  return (
    <>
      <PageIntro eyebrow="The person behind the studio" title="About"><p>{draftIdentity.name}</p><p>{draftIdentity.role}</p><p className={styles.small}>Draft identity. {draftIdentity.note}</p></PageIntro>
      <div className={styles.contentRows}>
        <section><h2>Background</h2><p>A verified biography is not available yet. This preview does not make claims about employment, education, or project authorship.</p></section>
        <section id="skills"><h2>Skills</h2><p>Skills and supporting work are awaiting review. Confirmed examples will be linked here when they are ready.</p></section>
        <section id="research"><h2>Research &amp; education</h2><p>No research, qualifications, or certifications have been verified for publication.</p></section>
      </div>
    </>
  );
}
