import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/features/portfolio/page-intro";
import { readPublication } from "@/content/publication-reader";
import { SafeExternalLink } from "@/features/portfolio/safe-link";
import styles from "@/features/portfolio/portfolio.module.css";

export const metadata: Metadata = {
  title: "Projects",
  description: "Verified software engineering case studies, systems architecture, and empirical results by Ayush Roy.",
  alternates: {
    canonical: "/projects",
  },
};

export default async function ProjectsPage() {
  const publication = await readPublication();
  const projects = publication.projects;

  return (
    <>
      <PageIntro eyebrow="Verified Systems &amp; Case Studies" title="Projects">
        <p className={styles.lead}>
          Architectural decisions, forensic implementations, and empirical results backed by verified repository and deployment evidence.
        </p>
      </PageIntro>

      <div className={styles.contentWrap}>
        <div className={styles.projectCountBar}>
          <p className={styles.eyebrow}>
            {projects.length} verified projects published.
          </p>
        </div>

        <ul className={styles.projectsGrid} aria-label="Published Projects List">
          {projects.map((project) => (
            <li key={project.slug} className={styles.projectCard}>
              <div className={styles.projectCardTop}>
                <div className={styles.projectCardBadgeStrip}>
                  <span className={styles.statusBadge}>
                    Verified · Rev {project.revision}
                  </span>
                  <span className={styles.projectIdBadge}>
                    {project.id}
                  </span>
                </div>

                <h2 className={styles.projectCardTitle}>
                  <Link href={`/projects/${project.slug}`} prefetch={false}>
                    {project.title}
                  </Link>
                </h2>

                <p className={styles.projectCardSummary}>
                  {project.summary}
                </p>

                <div className={styles.projectCardContribution}>
                  <strong>Role:</strong> {project.contribution}
                </div>
              </div>

              <div className={styles.projectCardLinks}>
                <span
                  className={styles.caseStudyCta}
                  aria-hidden="true"
                >
                  Read Case Study <span aria-hidden="true">→</span>
                </span>

                <div className={styles.cardExternalLinks}>
                  {project.links.map((link) => (
                    <SafeExternalLink
                      key={link.url}
                      href={link.url}
                      className={styles.externalLinkMini}
                    >
                      {link.label}
                    </SafeExternalLink>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className={styles.evidenceDisclosureCard} aria-labelledby="disclosure-heading">
          <h3 id="disclosure-heading" className={styles.eyebrow}>
            Publication &amp; Verification Policy
          </h3>
          <p className={styles.small}>
            In accordance with constraint C01, projects appear on this index only after repository ownership, technical contributions, and empirical claims are verified. Candidate projects (including internal candidate <em>CandidateX</em>) remain unpublished until full evidence verification is complete.
          </p>
        </aside>
      </div>
    </>
  );
}
