"use client";

import { useState } from "react";
import Link from "next/link";
import type {
  PublishedProject,
  ReviewIdentity,
  PreflightCheckResult,
} from "@/contracts/content";
import { CaseStudy } from "@/features/portfolio/case-study";
import styles from "@/app/admin/admin.module.css";

interface DraftPreviewProps {
  initialReview: ReviewIdentity;
  initialChecks: PreflightCheckResult[];
  initialProjects: PublishedProject[];
  approvedMediaUrls?: Record<string, string>;
  selectedSlug?: string;
}

export function DraftPreview({
  initialReview,
  initialChecks,
  initialProjects,
  approvedMediaUrls = {},
  selectedSlug,
}: DraftPreviewProps) {
  const [activeSlug, setActiveSlug] = useState<string>(
    selectedSlug || initialProjects[0]?.slug || ""
  );

  const selectedProject = initialProjects.find((p) => p.slug === activeSlug);
  const selectedDraftRev = initialReview.projects.find(
    (p) => p.projectId === selectedProject?.id
  )?.draftRevision;

  return (
    <div style={{ marginTop: "1.5rem" }}>
      {/* Review Identity Banner */}
      <div className={styles.card} style={{ marginBottom: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <h3>Candidate Publication Review Identity</h3>
            <p className={styles.subtitle} style={{ margin: "var(--space-2) 0" }}>
              Target Revision:{" "}
              <span className={`${styles.badge} ${styles.badgeSuccess}`}>
                r{initialReview.expectedPublicationRevision + 1}
              </span>{" "}
              (from base r{initialReview.expectedPublicationRevision})
            </p>
            <p
              className={styles.subtitle}
              style={{
                wordBreak: "break-all",
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "0.85rem",
              }}
            >
              Review Candidate SHA-256: <code>{initialReview.candidateSha256}</code>
            </p>
          </div>
          <div>
            <Link
              href="/admin/publish"
              className={styles.button}
              style={{
                display: "inline-block",
                textDecoration: "none",
                textAlign: "center",
                width: "auto",
                padding: "0.6rem 1.2rem",
              }}
            >
              Proceed to Publication →
            </Link>
          </div>
        </div>
      </div>

      {/* Pre-flight Checks Grid */}
      <div className={styles.sectionBox} style={{ marginBottom: "1.5rem" }}>
        <h3 style={{ marginBottom: "0.75rem" }}>Pre-Flight Verification Checks</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1rem",
          }}
        >
          {initialChecks.map((check) => (
            <div
              key={check.key}
              style={{
                border: "1px solid var(--color-border, #333)",
                borderRadius: "var(--radius-sm, 6px)",
                padding: "1rem",
                backgroundColor: "var(--color-surface, #1e1e1e)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.5rem",
                }}
              >
                <strong>{check.name}</strong>
                <span
                  className={`${styles.badge} ${
                    check.status === "pass"
                      ? styles.badgeSuccess
                      : check.status === "warn"
                      ? ""
                      : styles.badgeDanger
                  }`}
                >
                  {check.status.toUpperCase()}
                </span>
              </div>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "var(--color-muted, #aaa)",
                  margin: 0,
                }}
              >
                {check.message}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Project Selector Navigation */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          marginBottom: "1.5rem",
          borderBottom: "1px solid var(--color-border, #333)",
          paddingBottom: "0.5rem",
        }}
      >
        {initialProjects.map((p) => {
          const isActive = p.slug === activeSlug;
          return (
            <button
              key={p.slug}
              type="button"
              onClick={() => setActiveSlug(p.slug)}
              className={isActive ? styles.button : styles.buttonSecondary}
              style={{ padding: "0.4rem 0.8rem", fontSize: "0.9rem" }}
            >
              {p.title} ({p.slug})
            </button>
          );
        })}
      </div>

      {/* Interactive Truthful Draft Case Study Rendering */}
      {selectedProject ? (
        <div
          style={{
            border: "2px dashed var(--color-border, #444)",
            borderRadius: "var(--radius-md, 8px)",
            padding: "1.5rem",
            backgroundColor: "var(--color-bg, #121212)",
          }}
        >
          <div
            style={{
              marginBottom: "1rem",
              padding: "0.5rem 1rem",
              backgroundColor: "rgba(255, 193, 7, 0.1)",
              borderLeft: "4px solid #ffc107",
              borderRadius: "4px",
            }}
          >
            <strong>Authentic Private Preview Mode:</strong> This view renders the
            draft using the truthful draft presentation layer. Unapproved media
            displays fallback indicators, links are checked, and verified claim badges
            are neutral until published.
          </div>
          <CaseStudy
            project={selectedProject}
            approvedMediaUrls={approvedMediaUrls}
            presentation={{
              mode: "draft",
              draftRevision: selectedDraftRev,
            }}
          />
        </div>
      ) : (
        <p className={styles.subtitle}>No draft project selected.</p>
      )}
    </div>
  );
}
