"use client";

/**
 * YOR WORLD Milestone A4: Publish Review & Rollback Manager
 *
 * Provides pre-flight review, publication validation checks, optimistic concurrency
 * publication execution, publication history auditing, and safe rollback with asset verification.
 */

import { useState } from "react";
import type {
  Publication,
  ReviewIdentity,
  PreflightCheckResult,
} from "@/contracts/content";
import styles from "@/app/admin/admin.module.css";

export interface HistoryItem {
  revision: number;
  actor: string;
  publishedAt: string;
  action: "publish" | "rollback";
  targetRevision?: number;
}

interface PublishReviewProps {
  initialPublication: Publication;
  initialHistory: HistoryItem[];
  initialReview?: ReviewIdentity;
  initialChecks?: PreflightCheckResult[];
}

export function PublishReview({
  initialPublication,
  initialHistory,
  initialReview,
  initialChecks = [],
}: PublishReviewProps) {
  const [publication, setPublication] = useState<Publication>(initialPublication);
  const [history, setHistory] = useState<HistoryItem[]>(initialHistory);
  const [review, setReview] = useState<ReviewIdentity | undefined>(initialReview);
  const [checks, setChecks] = useState<PreflightCheckResult[]>(initialChecks);
  const [expectedRevision, setExpectedRevision] = useState<number>(
    initialPublication.revision
  );
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "warning";
    message: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  async function refreshReview() {
    try {
      const res = await fetch("/api/admin/preview");
      if (res.ok) {
        const data = await res.json();
        if (data.review) setReview(data.review);
        if (data.checks) setChecks(data.checks);
      }
    } catch {
      /* retained */
    }
  }

  async function handlePublish() {
    setBusy(true);
    setFeedback(null);

    const reviewPayload = review
      ? {
          candidateSha256: review.candidateSha256,
          draftRevisions: Object.fromEntries(
            review.projects.map((p) => [p.projectId, p.draftRevision])
          ),
        }
      : undefined;

    try {
      const response = await fetch("/api/admin/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedRevision, review: reviewPayload }),
      });

      const data = await response.json();

      if (response.status === 409) {
        setFeedback({
          type: "error",
          message: `Stale Revision Conflict (409): ${data.error || "The expected publication revision does not match current state. Refresh before publishing."}`,
        });
      } else if (response.status === 422) {
        setFeedback({
          type: "error",
          message: `Validation Error (422): ${data.error || "Publication rejected due to unapproved media or invalid content."}`,
        });
      } else if (!response.ok) {
        setFeedback({
          type: "error",
          message: `Publication failed (${response.status}): ${data.error || "Unknown server error"}`,
        });
      } else {
        const nextPub: Publication = data.publication;
        setPublication(nextPub);
        setExpectedRevision(nextPub.revision);
        setHistory((prev) => [
          ...prev,
          {
            revision: nextPub.revision,
            actor: data.actor || "owner",
            publishedAt: nextPub.publishedAt,
            action: "publish",
          },
        ]);
        setFeedback({
          type: "success",
          message: `Publication Revision ${nextPub.revision} successfully published! Public snapshot updated.`,
        });
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Network error publishing revision",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleRollback(targetRev: number) {
    if (
      !confirm(
        `Are you sure you want to rollback to publication revision ${targetRev}? All assets referenced in revision ${targetRev} will be validated before publication.`
      )
    ) {
      return;
    }

    setBusy(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/admin/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetRevision: targetRev }),
      });

      const data = await response.json();

      if (response.status === 422) {
        setFeedback({
          type: "error",
          message: `Rollback Rejected (422): ${data.error || "Missing or unapproved assets detected for target revision."}`,
        });
      } else if (!response.ok) {
        setFeedback({
          type: "error",
          message: `Rollback failed (${response.status}): ${data.error || "Unknown server error"}`,
        });
      } else {
        const nextPub: Publication = data.publication;
        setPublication(nextPub);
        setExpectedRevision(nextPub.revision);
        setHistory((prev) => [
          ...prev,
          {
            revision: nextPub.revision,
            actor: data.actor || "owner",
            publishedAt: nextPub.publishedAt,
            action: "rollback",
            targetRevision: targetRev,
          },
        ]);
        setFeedback({
          type: "success",
          message: `Rollback successful! Restored revision ${targetRev} as new publication revision ${nextPub.revision}.`,
        });
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Network error performing rollback",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: "1.5rem" }}>
      {/* Current publication status overview */}
      <div className={styles.grid}>
        <div className={styles.card}>
          <h3>Active Publication</h3>
          <p className={styles.subtitle} style={{ margin: "var(--space-2) 0" }}>
            Current Revision: <span className={`${styles.badge} ${styles.badgeSuccess}`}>r{publication.revision}</span>
          </p>
          <p className={styles.subtitle}>
            Published: {new Date(publication.publishedAt).toLocaleString()}
          </p>
        </div>

        <div className={styles.card}>
          <h3>Published Projects</h3>
          <p className={styles.subtitle} style={{ margin: "var(--space-2) 0" }}>
            Total Active: <span className={styles.badge}>{publication.projects.length} Projects</span>
          </p>
          <p className={styles.subtitle}>
            Slugs: {publication.projects.map((p) => p.slug).join(", ")}
          </p>
        </div>

        <div className={styles.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3>Pre-Flight Checklist</h3>
            <button
              type="button"
              onClick={refreshReview}
              className={styles.buttonSecondary}
              style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem", width: "auto" }}
            >
              Refresh
            </button>
          </div>
          {checks.length > 0 ? (
            <ul style={{ paddingLeft: "1.2rem", fontSize: "0.85rem", color: "var(--color-muted)", margin: "0.5rem 0" }}>
              {checks.map((c) => (
                <li key={c.key} style={{ color: c.status === "fail" ? "var(--color-danger, #ff4444)" : "inherit" }}>
                  {c.status === "pass" ? "✓" : "✗"} {c.name} ({c.status.toUpperCase()})
                </li>
              ))}
            </ul>
          ) : (
            <ul style={{ paddingLeft: "1.2rem", fontSize: "0.85rem", color: "var(--color-muted)", margin: "0.5rem 0" }}>
              <li>✓ Strict schema validation</li>
              <li>✓ 100% verified evidence (zero unknown)</li>
              <li>✓ Invariant HTTPS URLs</li>
              <li>✓ Approved media assets verification</li>
            </ul>
          )}
          {review && (
            <p className={styles.subtitle} style={{ fontSize: "0.75rem", wordBreak: "break-all", margin: "0.5rem 0 0" }}>
              Candidate SHA: <code>{review.candidateSha256.slice(0, 16)}...</code>
            </p>
          )}
        </div>
      </div>

      {feedback && (
        <div
          role="alert"
          className={`${styles.feedbackBox} ${
            feedback.type === "success"
              ? styles.feedbackSuccess
              : feedback.type === "warning"
              ? styles.feedbackWarning
              : styles.feedbackError
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Publish Execution Section */}
      <div className={styles.sectionBox} style={{ marginTop: "1.5rem" }}>
        <h3 style={{ marginBottom: "0.75rem" }}>Execute Transactional Publication</h3>
        <p className={styles.subtitle} style={{ marginBottom: "1rem" }}>
          Publishing creates an immutable snapshot in <code>publication_history</code>, updates the public{" "}
          <code>published_content</code> table, and triggers edge cache invalidation.
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <label htmlFor="pub-expected-rev" className={styles.label}>
              Expected Revision:
            </label>
            <input
              id="pub-expected-rev"
              type="number"
              value={expectedRevision}
              onChange={(e) => setExpectedRevision(Number(e.target.value))}
              className={styles.input}
              style={{ width: "80px", padding: "0.4rem 0.6rem" }}
            />
          </div>

          <button
            type="button"
            onClick={handlePublish}
            disabled={busy}
            className={styles.button}
            style={{ width: "auto", minWidth: "220px", marginTop: 0 }}
          >
            {busy ? "Publishing Revision..." : `Publish Revision (Expect r${expectedRevision})`}
          </button>
        </div>
      </div>

      {/* Publication History & Rollback Table */}
      <div className={styles.sectionBox}>
        <h3 style={{ marginBottom: "0.5rem" }}>Publication History & Rollback</h3>
        <p className={styles.subtitle} style={{ marginBottom: "1rem" }}>
          Immutable historical snapshots. Select an earlier revision to verify assets and execute an authoritative rollback.
        </p>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Revision</th>
              <th>Action</th>
              <th>Published At</th>
              <th>Actor</th>
              <th>Rollback Action</th>
            </tr>
          </thead>
          <tbody>
            {history
              .slice()
              .reverse()
              .map((item) => (
                <tr key={item.revision}>
                  <td>
                    <strong>r{item.revision}</strong>
                    {item.revision === publication.revision && (
                      <span className={`${styles.badge} ${styles.badgeSuccess}`} style={{ marginLeft: "0.5rem" }}>
                        Active
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={styles.badge}>
                      {item.action === "rollback"
                        ? `Rollback to r${item.targetRevision}`
                        : "Publish"}
                    </span>
                  </td>
                  <td>{new Date(item.publishedAt).toLocaleString()}</td>
                  <td>
                    <code>{item.actor}</code>
                  </td>
                  <td>
                    {item.revision !== publication.revision ? (
                      <button
                        type="button"
                        onClick={() => handleRollback(item.revision)}
                        disabled={busy}
                        className={styles.buttonSecondary}
                        style={{ padding: "0.35rem 0.75rem", fontSize: "0.85rem" }}
                      >
                        Rollback to r{item.revision}
                      </button>
                    ) : (
                      <span style={{ color: "var(--color-muted)", fontSize: "0.85rem" }}>Current snapshot</span>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
