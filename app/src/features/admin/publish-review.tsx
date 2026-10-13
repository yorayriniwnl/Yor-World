"use client";

import { useEffect, useState } from "react";
import type { Publication } from "@/contracts/content";
import styles from "@/app/admin/admin.module.css";

interface ClientReviewIdentity {
  expectedPublicationRevision: number;
  projects: Array<{ projectId: string; draftRevision: number }>;
  siteDraftRevision: null;
  media: Array<Record<string, unknown>>;
  candidateSha256: string;
}

interface ClientReviewCheck {
  scope: "project" | "site";
  id: string;
  kind: string;
  status: "passed" | "failed";
  checkedAt: string;
  reasons: string[];
}

interface PrivateDraftReview {
  identity: ClientReviewIdentity;
  checks: ClientReviewCheck[];
  canPublish: boolean;
}

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
}

type Feedback = { type: "success" | "error" | "warning"; message: string } | null;

export function PublishReview({ initialPublication, initialHistory }: PublishReviewProps) {
  const [publication, setPublication] = useState<Publication>(initialPublication);
  const [history, setHistory] = useState<HistoryItem[]>(initialHistory);
  const [review, setReview] = useState<PrivateDraftReview | null>(null);
  const [rollbackReason, setRollbackReason] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  async function refreshReview() {
    const response = await fetch("/api/admin/preview", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "The current draft review is unavailable.");
    setReview(data as PrivateDraftReview);
  }

  useEffect(() => {
    void refreshReview().catch((error: unknown) => {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "The current draft review is unavailable." });
    });
  }, []);

  async function handlePublish() {
    if (!review) return;
    setBusy(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/admin/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedRevision: review.identity.expectedPublicationRevision,
          review: review.identity,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setFeedback({ type: "error", message: `Publish rejected (${response.status}): ${data.error || "Refresh and review the current candidate."}` });
        if (response.status === 409) await refreshReview().catch(() => undefined);
        return;
      }

      const next: Publication = data.publication;
      setPublication(next);
      setHistory((previous) => [...previous, {
        revision: next.revision,
        actor: data.actor || "owner",
        publishedAt: next.publishedAt,
        action: "publish",
      }]);
      let visibleRevision: number | null = null;
      try {
        const origin = await fetch("/api/admin/publish", { cache: "no-store" });
        if (origin.ok) visibleRevision = Number((await origin.json()).currentRevision);
      } catch { /* A missing origin observation remains UNKNOWN in the displayed result. */ }
      setFeedback({
        type: "success",
        message: `Published r${next.revision}. ${visibleRevision === null ? "Origin read was not observed." : `Origin read observed r${visibleRevision}.`} CDN/edge cache visibility was not observed.`,
      });
      await refreshReview().catch(() => undefined);
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Network error publishing revision." });
    } finally {
      setBusy(false);
    }
  }

  async function handleRollback(targetRevision: number) {
    if (rollbackReason.trim().length < 3) {
      setFeedback({ type: "error", message: "Enter a rollback reason of at least 3 characters." });
      return;
    }
    if (!confirm(`Are you sure you want to rollback to publication revision ${targetRevision}?`)) return;
    setBusy(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/admin/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRevision,
          expectedRevision: publication.revision,
          reason: rollbackReason.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setFeedback({ type: "error", message: `Rollback rejected (${response.status}): ${data.error || "Refresh before retrying."}` });
        return;
      }
      const next: Publication = data.publication;
      setPublication(next);
      setHistory((previous) => [...previous, {
        revision: next.revision,
        actor: data.actor || "owner",
        publishedAt: next.publishedAt,
        action: "rollback",
        targetRevision,
      }]);
      setFeedback({ type: "success", message: `Rollback committed as r${next.revision}. Reason: ${rollbackReason.trim()}` });
      setRollbackReason("");
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Network error performing rollback." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <div className={styles.grid}>
        <div className={styles.card}>
          <h3>Active Publication</h3>
          <p className={styles.subtitle} style={{ margin: "var(--space-2) 0" }}>
            Current Revision: <span className={`${styles.badge} ${styles.badgeSuccess}`}>r{publication.revision}</span>
          </p>
          <p className={styles.subtitle}>Published: {new Date(publication.publishedAt).toLocaleString()}</p>
        </div>
        <div className={styles.card}>
          <h3>Published Projects</h3>
          <p className={styles.subtitle} style={{ margin: "var(--space-2) 0" }}>
            Total Active: <span className={styles.badge}>{publication.projects.length} Projects</span>
          </p>
          <p className={styles.subtitle}>Slugs: {publication.projects.map((project) => project.slug).join(", ")}</p>
        </div>
        <div className={styles.card}>
          <h3>Review Identity</h3>
          {review ? <>
            <p className={styles.subtitle}>Expected publication revision: r{review.identity.expectedPublicationRevision}</p>
            <p className={styles.subtitle}>Candidate SHA-256: <code>{review.identity.candidateSha256}</code></p>
            <p className={styles.subtitle}>Draft checks evaluated: {review.checks.length}; {review.canPublish ? "all passed" : "publication blocked"}</p>
          </> : <p className={styles.subtitle}>Loading current private review…</p>}
        </div>
      </div>

      {feedback && (
        <div role="alert" className={`${styles.feedbackBox} ${feedback.type === "success" ? styles.feedbackSuccess : feedback.type === "warning" ? styles.feedbackWarning : styles.feedbackError}`}>
          {feedback.message}
        </div>
      )}

      <section className={styles.sectionBox} style={{ marginTop: "1.5rem" }} aria-labelledby="candidate-review-title">
        <h3 id="candidate-review-title">Executed Candidate Review</h3>
        <p className={styles.subtitle}>
          Checks validate stored evidence records and HTTPS URL syntax. They do not claim fresh link checks or independently verify evidence metrics.
        </p>
        {review && <>
          <p className={styles.subtitle}>Reviewed at: {review.checks[0]?.checkedAt ?? "No checks ran"}</p>
          <ul aria-label="Candidate review checks">
            {review.checks.map((check) => (
              <li key={`${check.scope}:${check.id}:${check.kind}`}>
                <strong>{check.status === "passed" ? "PASS" : "FAIL"}</strong> · {check.id} · {check.kind}
                {check.reasons.length > 0 && <ul>{check.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}
              </li>
            ))}
          </ul>
        </>}
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" onClick={() => void refreshReview().catch((error: unknown) => setFeedback({ type: "error", message: error instanceof Error ? error.message : "Review refresh failed." }))} disabled={busy} className={styles.buttonSecondary}>
            Refresh Review
          </button>
          <button type="button" onClick={() => void handlePublish()} disabled={busy || !review?.canPublish} className={styles.button} style={{ width: "auto", minWidth: "220px", marginTop: 0 }}>
            {busy ? "Publishing…" : "Publish Revision"}
          </button>
        </div>
      </section>

      <section className={styles.sectionBox} aria-labelledby="rollback-title">
        <h3 id="rollback-title">Publication History &amp; Rollback</h3>
        <p className={styles.subtitle}>Rollback appends a new revision. Each request checks the current publication revision and records the supplied reason.</p>
        <div style={{ margin: "0.75rem 0" }}>
          <label htmlFor="rollback-reason" className={styles.label}>Rollback reason</label>
          <input id="rollback-reason" value={rollbackReason} onChange={(event) => setRollbackReason(event.target.value)} minLength={3} maxLength={500} className={styles.input} />
        </div>
        <table className={styles.table}>
          <thead><tr><th>Revision</th><th>Action</th><th>Published At</th><th>Actor</th><th>Rollback Action</th></tr></thead>
          <tbody>
            {history.slice().reverse().map((item) => (
              <tr key={item.revision}>
                <td><strong>r{item.revision}</strong>{item.revision === publication.revision && <span className={`${styles.badge} ${styles.badgeSuccess}`} style={{ marginLeft: "0.5rem" }}>Active</span>}</td>
                <td><span className={styles.badge}>{item.action === "rollback" ? `Rollback to r${item.targetRevision}` : "Publish"}</span></td>
                <td>{new Date(item.publishedAt).toLocaleString()}</td>
                <td><code>{item.actor}</code></td>
                <td>{item.revision !== publication.revision ? <button type="button" onClick={() => void handleRollback(item.revision)} disabled={busy} className={styles.buttonSecondary}>Rollback to r{item.revision}</button> : <span>Current snapshot</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
