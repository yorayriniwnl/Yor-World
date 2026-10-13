"use client";

import { useState } from "react";
import Link from "next/link";
import type {
  PublishedProject,
} from "@/contracts/content";
type ReviewIdentity = { expectedPublicationRevision: number; projects: Array<{ projectId: string; draftRevision: number }>; siteDraftRevision: null; media: unknown[]; candidateSha256: string };
type ReviewCheck = { scope: "project" | "site"; id: string; kind: "schema" | "evidence-records" | "https-links" | "approved-media" | "publication-rules"; status: "passed" | "failed"; checkedAt: string; reasons: string[] };
import { CaseStudy } from "@/features/portfolio/case-study";
import styles from "@/app/admin/admin.module.css";

interface DraftPreviewProps {
  initialReview: ReviewIdentity;
  initialChecks: ReviewCheck[];
  initialProjects: PublishedProject[];
  initialDraftRevisions?: Record<string, number>;
  canPublish: boolean;
  approvedMediaUrls?: Record<string, string>;
  selectedSlug?: string;
}

export function DraftPreview({
  initialReview,
  initialChecks,
  initialProjects,
  initialDraftRevisions = {},
  canPublish,
  approvedMediaUrls = {},
  selectedSlug,
}: DraftPreviewProps) {
  const [activeSlug, setActiveSlug] = useState<string>(
    selectedSlug || initialProjects[0]?.slug || ""
  );

  const selectedProject = initialProjects.find((p) => p.slug === activeSlug);
  const selectedDraftRev = initialReview.projects.find(
    (p) => p.projectId === selectedProject?.id
  )?.draftRevision ?? (selectedProject ? initialDraftRevisions[selectedProject.id] ?? selectedProject.revision : undefined);

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
            <h3>{selectedProject?.id === "candidatex" ? "Private CandidateX Draft Identity" : "Candidate Publication Review Identity"}</h3>
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
            {selectedProject?.id !== "candidatex" && (
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
                Review Publication →
              </Link>
            )}
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
              key={`${check.scope}:${check.id}:${check.kind}`}
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
                <strong>{check.scope}: {check.id} · {check.kind}</strong>
                <span
                  className={`${styles.badge} ${
                    check.status === "passed"
                      ? styles.badgeSuccess
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
                {check.reasons.length ? check.reasons.join(" ") : "All checks for this category passed."}
              </p>
              <p style={{ fontSize: "0.75rem", color: "var(--color-muted, #aaa)", margin: "0.5rem 0 0" }}>
                Checked {new Date(check.checkedAt).toLocaleString()}
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
          {selectedProject.id === "candidatex" && <p role="status">Private CandidateX content is preview-only, cannot be published, and is excluded from the public publication.</p>}
          {!canPublish && selectedProject.id !== "candidatex" && <p role="status">The current public draft set has failed preflight checks and cannot be published.</p>}
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
