import React from "react";
import Link from "next/link";
import type { PublishedProject, ContentSection } from "@/contracts/content";
import { SafeExternalLink } from "./safe-link";
import styles from "./portfolio.module.css";

export interface CaseStudyPresentation {
  mode: "published" | "draft";
  draftRevision?: number | undefined;
}

interface CaseStudyProps {
  project: PublishedProject;
  approvedMediaUrls?: Readonly<Record<string, string>>;
  presentation?: CaseStudyPresentation;
}

interface AccessibleFigureProps {
  mediaId: string;
  alt: string;
  caption: string;
  approvedUrl?: string | undefined;
  allowDraftProxy?: boolean;
}

export function AccessibleFigure({ mediaId, alt, caption, approvedUrl, allowDraftProxy = false }: AccessibleFigureProps) {
  // If mediaId is not a valid non-empty string or represents an ungenerated mock asset,
  // provide an accessible placeholder figure that never crashes or shows a broken image box.
  let hasValidMedia = false;
  try {
    if (approvedUrl && allowDraftProxy) {
      hasValidMedia = approvedUrl === `/api/admin/preview/media/${encodeURIComponent(mediaId)}`;
    } else if (approvedUrl) {
      hasValidMedia = Boolean(mediaId && new URL(approvedUrl).protocol === "https:");
    }
  } catch { /* Missing/malformed approved URL retains the accessible placeholder. */ }

  return (
    <figure
      className={styles.caseStudyFigure}
      {...(!hasValidMedia ? { role: "img", "aria-label": alt || "Illustration unavailable" } : {})}
    >
      {hasValidMedia ? (
        <picture>
          <img
            src={approvedUrl}
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

function SectionRenderer({ section, approvedMediaUrls, allowDraftProxy }: { section: ContentSection; approvedMediaUrls: Readonly<Record<string, string>>; allowDraftProxy: boolean }) {
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
                <pre
                  key={idx}
                  className={styles.codeBlock}
                  tabIndex={0}
                  role="region"
                  aria-label={`Code block: ${block.language || "code snippet"}`}
                >
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
                  approvedUrl={approvedMediaUrls[block.mediaId]}
                  allowDraftProxy={allowDraftProxy}
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

export function CaseStudy({
  project,
  approvedMediaUrls = {},
  presentation = { mode: "published" },
}: CaseStudyProps) {
  const isDraft = presentation.mode === "draft";
  const displayRevision = isDraft && presentation.draftRevision !== undefined
    ? presentation.draftRevision
    : project.revision;

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
            {isDraft
              ? `Draft preview (Unpublished) · Draft Rev ${displayRevision}`
              : `Verified Case Study · Rev ${project.revision}`}
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

        <section
          className={styles.contributionCard}
          aria-label={isDraft ? "Proposed Role & Contribution" : "Verified Contribution"}
        >
          <h3 className={styles.contributionHeading}>
            {isDraft ? "Proposed Role & Contribution" : "Verified Role & Contribution"}
          </h3>
          <p className={styles.contributionText}>
            {project.contribution}
          </p>
        </section>

        {project.links.length > 0 && (
          <div className={styles.linksBar}>
            <h3 className={styles.linksHeading}>
              {isDraft ? "Project Links:" : "Verified Links:"}
            </h3>
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
          <SectionRenderer key={section.id} section={section} approvedMediaUrls={approvedMediaUrls} allowDraftProxy={isDraft} />
        ))}
      </div>

      <section className={styles.evidenceRegistrySection} aria-labelledby="evidence-heading">
        <h2 id="evidence-heading" className={styles.sectionHeading}>
          {isDraft ? "Evidence Claims (Pending Publication)" : "Evidence Audit & Verification State"}
        </h2>
        <p className={styles.evidenceIntro}>
          {isDraft
            ? "Pre-publication evidence ledger: all claims registered for pre-flight validation."
            : "In accordance with YOR WORLD constraint C01, every metric, deployment claim, and repository reference is registered with verifiable receipts:"}
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
