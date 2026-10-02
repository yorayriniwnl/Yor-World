import React from "react";
import Link from "next/link";
import type { PublishedProject, ContentSection } from "@/contracts/content";
import { SafeExternalLink } from "./safe-link";
import styles from "./portfolio.module.css";

interface CaseStudyProps {
  project: PublishedProject;
}

interface AccessibleFigureProps {
  mediaId: string;
  alt: string;
  caption: string;
}

export function AccessibleFigure({ mediaId, alt, caption }: AccessibleFigureProps) {
  // If mediaId is not a valid non-empty string or represents an ungenerated mock asset,
  // provide an accessible placeholder figure that never crashes or shows a broken image box.
  const hasValidMedia = Boolean(mediaId && mediaId.trim().length > 0 && !mediaId.startsWith("missing"));

  return (
    <figure
      className={styles.caseStudyFigure}
      {...(!hasValidMedia ? { role: "img", "aria-label": alt || "Illustration unavailable" } : {})}
    >
      {hasValidMedia ? (
        <picture>
          <img
            src={`/images/projects/${mediaId}.png`}
            alt={alt}
            className={styles.caseStudyImage}
            loading="lazy"
          />
        </picture>
      ) : (
        <div
          className={styles.figureFallback}
          role="img"
          aria-label={alt || "Illustration unavailable"}
        >
          <span className={styles.figureFallbackIcon} aria-hidden="true">
            📊
          </span>
          <span className={styles.figureFallbackText}>
            Diagram / figure pending asset review
          </span>
        </div>
      )}
      {caption && (
        <figcaption className={styles.caseStudyFigcaption}>
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

function SectionRenderer({ section }: { section: ContentSection }) {
  return (
    <section id={section.id} className={styles.caseStudySection} aria-labelledby={`heading-${section.id}`}>
      <h2 id={`heading-${section.id}`} className={styles.sectionHeading}>
        {section.heading}
      </h2>
      <div className={styles.sectionBlocks}>
        {section.blocks.map((block, idx) => {
          switch (block.type) {
            case "paragraph":
              return (
                <p key={idx} className={styles.paragraph}>
                  {block.text}
                </p>
              );
            case "list":
              return (
                <ul key={idx} className={styles.blockList}>
                  {block.items.map((item, itemIdx) => (
                    <li key={itemIdx}>{item}</li>
                  ))}
                </ul>
              );
            case "code":
              return (
                <pre key={idx} className={styles.codeBlock}>
                  <code className={`language-${block.language}`}>
                    {block.text}
                  </code>
                </pre>
              );
            case "image":
              return (
                <AccessibleFigure
                  key={idx}
                  mediaId={block.mediaId}
                  alt={block.alt}
                  caption={block.caption}
                />
              );
            default:
              return null;
          }
        })}
      </div>
    </section>
  );
}

export function CaseStudy({ project }: CaseStudyProps) {
  return (
    <article className={styles.caseStudyContainer}>
      <nav aria-label="Breadcrumb" className={styles.breadcrumbNav}>
        <Link href="/projects" prefetch={false} className={styles.backLink}>
          <span aria-hidden="true">←</span> Back to Projects
        </Link>
      </nav>

      <header className={styles.caseStudyHeader}>
        <div className={styles.metaBadgeStrip}>
          <span className={styles.statusBadge}>
            Verified Case Study · Rev {project.revision}
          </span>
          <span className={styles.projectIdBadge}>
            ID: {project.id}
          </span>
        </div>

        <h1 className={styles.caseStudyTitle}>
          {project.title}
        </h1>

        <p className={styles.caseStudySummary}>
          {project.summary}
        </p>

        <section className={styles.contributionCard} aria-label="Verified Contribution">
          <h3 className={styles.contributionHeading}>
            Verified Role &amp; Contribution
          </h3>
          <p className={styles.contributionText}>
            {project.contribution}
          </p>
        </section>

        {project.links.length > 0 && (
          <div className={styles.linksBar}>
            <h3 className={styles.linksHeading}>Verified Links:</h3>
            <ul className={styles.linksList}>
              {project.links.map((link) => (
                <li key={link.url}>
                  <SafeExternalLink href={link.url} className={styles.projectExternalLink}>
                    {link.label}
                  </SafeExternalLink>
                </li>
              ))}
            </ul>
          </div>
        )}
      </header>

      <div className={styles.caseStudyBody}>
        {project.sections.map((section) => (
          <SectionRenderer key={section.id} section={section} />
        ))}
      </div>

      <section className={styles.evidenceRegistrySection} aria-labelledby="evidence-heading">
        <h2 id="evidence-heading" className={styles.sectionHeading}>
          Evidence Audit &amp; Verification State
        </h2>
        <p className={styles.evidenceIntro}>
          In accordance with YOR WORLD constraint C01, every metric, deployment claim, and repository reference is registered with verifiable receipts:
        </p>
        <ul className={styles.evidenceList}>
          {project.evidence.map((ev) => (
            <li key={ev.id} className={styles.evidenceItem}>
              <span className={styles.evidenceStatusBadge}>
                {ev.status}
              </span>
              <div className={styles.evidenceDetails}>
                <strong>{ev.kind.toUpperCase()}:</strong> {ev.note}
                {ev.url && (
                  <div className={styles.evidenceUrl}>
                    <SafeExternalLink href={ev.url}>
                      {ev.url}
                    </SafeExternalLink>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <footer className={styles.caseStudyFooter} style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <Link href="/projects" prefetch={false} className={styles.backLink}>
          <span aria-hidden="true">←</span> Back to Projects
        </Link>
        <Link
          href="/?studio=return"
          prefetch={false}
          className={styles.backLink}
          data-testid="return-to-studio-link"
        >
          <span aria-hidden="true">🏠</span> Return to Studio
        </Link>
      </footer>
    </article>
  );
}
