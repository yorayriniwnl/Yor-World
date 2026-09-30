import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/features/portfolio/page-intro";
import { publishedProjects } from "@/features/portfolio/public-content";
import styles from "@/features/portfolio/portfolio.module.css";

export const metadata: Metadata = { title: "Projects" };
export default function ProjectsPage() {
  return (
    <>
      <PageIntro eyebrow="Work, with context" title="Projects"><p>A place for the problem, the decisions, and the evidence behind each project.</p></PageIntro>
      <section className={styles.emptyState} aria-labelledby="project-status">
        <span className={styles.emptySymbol} aria-hidden="true">↗</span>
        <div><p className={styles.eyebrow}>{publishedProjects.length} published projects</p><h2 id="project-status">Case studies are being prepared.</h2><p>No projects have been verified for publication yet. This page will show work once its contribution, links, and supporting evidence have been checked.</p><Link href="/about" prefetch={false}>Read about this portfolio <span aria-hidden="true">→</span></Link></div>
      </section>
    </>
  );
}
