"use client";

import { useState } from "react";
import type { ProjectId, Publication } from "@/contracts/content";
import styles from "@/app/admin/admin.module.css";

interface PrivateDraftReview {
  identity: {
    expectedPublicationRevision: number;
    projects: Array<{ projectId: ProjectId; draftRevision: number }>;
    siteDraftRevision: null;
    media: unknown[];
    candidateSha256: string;
  };
  checks: Array<{
    scope: "project";
    id: ProjectId;
    kind: "schema" | "evidence-records" | "https-links" | "approved-media" | "publication-rules";
    status: "passed" | "failed";
    checkedAt: string;
    reasons: string[];
  }>;
  canPublish: boolean;
}

export interface HistoryItem {
  revision: number;
  actor: string;
  publishedAt: string;
  action: "publish" | "rollback";
  targetRevision?: number;
  rollbackReason?: string;
}

interface PublishReviewProps {
  initialPublication: Publication;
  initialHistory: HistoryItem[];
  initialReview: PrivateDraftReview;
}

interface ApiResult { publication?: Publication & { cacheRefreshed?: boolean; cacheRefreshWarning?: string }; history?: HistoryItem[]; review?: PrivateDraftReview; actor?: string; error?: string; }

async function requestJson(path: string): Promise<ApiResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(path, { cache: "no-store", signal: controller.signal });
    const data = await response.json().catch(() => null) as ApiResult | null;
    if (!response.ok || !data) throw new Error(data?.error || `Refresh failed (${response.status}).`);
    return data;
  } finally { clearTimeout(timer); }
}

async function postJson(path: string, body: unknown): Promise<{ data: ApiResult; status: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: controller.signal });
    const data = await response.json().catch(() => null) as ApiResult | null;
    if (!data) throw new Error(`Request failed (${response.status}) with an invalid response.`);
    return { data, status: response.status };
  } finally { clearTimeout(timer); }
}

export function PublishReview({ initialPublication, initialHistory, initialReview }: PublishReviewProps) {
  const [publication, setPublication] = useState(initialPublication);
  const [history, setHistory] = useState(initialHistory);
  const [review, setReview] = useState(initialReview);
  const [expectedRevision, setExpectedRevision] = useState(initialPublication.revision);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "warning"; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function refreshAfterCommit(successMessage: string) {
    try {
      const [reviewResponse, publicationResponse] = await Promise.all([
        requestJson("/api/admin/preview"),
        requestJson("/api/admin/publish"),
      ]);
      if (!reviewResponse.review || !publicationResponse.publication || !publicationResponse.history) throw new Error("The refreshed review response was incomplete.");
      setReview(reviewResponse.review);
      setPublication(publicationResponse.publication);
      setHistory(publicationResponse.history);
      setExpectedRevision(publicationResponse.publication.revision);
      setFeedback({ type: "success", message: `${successMessage} Review refreshed. CDN/edge not observed.` });
    } catch (error) {
      setFeedback({ type: "success", message: `${successMessage} The change committed, but the follow-up review could not be refreshed${error instanceof Error ? `: ${error.message}` : "."} CDN/edge not observed.` });
    }
  }

  async function refreshReview() {
    setRefreshing(true);
    setFeedback(null);
    try {
      const [reviewResponse, publicationResponse] = await Promise.all([
        requestJson("/api/admin/preview"),
        requestJson("/api/admin/publish"),
      ]);
      if (!reviewResponse.review || !publicationResponse.publication || !publicationResponse.history) throw new Error("The refreshed review response was incomplete.");
      setReview(reviewResponse.review);
      setPublication(publicationResponse.publication);
      setHistory(publicationResponse.history);
      setExpectedRevision(publicationResponse.publication.revision);
      setFeedback({ type: "success", message: "Current draft review and publication state loaded. CDN/edge not observed." });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Could not refresh the review." });
    } finally { setRefreshing(false); }
  }

  async function handlePublish() {
    setBusy(true);
    setFeedback(null);
    try {
      const { data, status } = await postJson("/api/admin/publish", { expectedRevision, review: review.identity });
      if (status === 409) throw new Error(`Stale revision conflict (409): ${data.error || "Refresh the review before publishing."}`);
      if (status === 422) throw new Error(`Validation failed (422): ${data.error || "The reviewed candidate is not publishable."}`);
      if (status >= 400 || !data.publication) throw new Error(data.error || `Publication failed (${status}).`);
      const next = data.publication;
      setPublication(next);
      setExpectedRevision(next.revision);
      setHistory((current) => [...current, { revision: next.revision, actor: data.actor || "owner", publishedAt: next.publishedAt, action: "publish" }]);
      const cacheMessage = next.cacheRefreshWarning ? ` Application cache refresh reported: ${next.cacheRefreshWarning}.` : "";
      await refreshAfterCommit(`Publication revision ${next.revision} committed.${cacheMessage}`);
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Network error publishing the reviewed revision." });
    } finally { setBusy(false); }
  }

  async function handleRollback(targetRevision: number) {
    const reason = window.prompt(`Reason for rolling back to publication revision ${targetRevision} (required):`)?.trim() ?? "";
    if (!reason) return;
    setBusy(true);
    setFeedback(null);
    try {
      const { data, status } = await postJson("/api/admin/rollback", { targetRevision, expectedRevision, reason });
      if (status === 409) throw new Error(`Stale revision conflict (409): ${data.error || "Refresh publication state before rollback."}`);
      if (status === 422) throw new Error(`Rollback rejected (422): ${data.error || "The target snapshot is not valid."}`);
      if (status >= 400 || !data.publication) throw new Error(data.error || `Rollback failed (${status}).`);
      const next = data.publication;
      setPublication(next);
      setExpectedRevision(next.revision);
      setHistory((current) => [...current, { revision: next.revision, actor: data.actor || "owner", publishedAt: next.publishedAt, action: "rollback", targetRevision, rollbackReason: reason }]);
      const cacheMessage = next.cacheRefreshWarning ? ` Application cache refresh reported: ${next.cacheRefreshWarning}.` : "";
      await refreshAfterCommit(`Rollback to revision ${targetRevision} committed as revision ${next.revision}.${cacheMessage}`);
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Network error performing rollback." });
    } finally { setBusy(false); }
  }

  const publishChecksPassed = review.checks.every((check) => check.status === "passed");
  const identityMatches = expectedRevision === review.identity.expectedPublicationRevision;

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <div className={styles.grid}>
        <section className={styles.card}>
          <h2>Active publication</h2>
          <p>Revision <strong>r{publication.revision}</strong> · {new Date(publication.publishedAt).toLocaleString()}</p>
          <p>{publication.projects.length} published projects</p>
        </section>
        <section className={styles.card}>
          <h2>Reviewed draft</h2>
          <p>Expected publication revision: r{review.identity.expectedPublicationRevision}</p>
          <p>{review.identity.projects.length} publishable drafts · {review.identity.media.length} media identities</p>
          <p>Candidate hash: <code>{review.identity.candidateSha256}</code></p>
        </section>
        <section className={styles.card}>
          <h2>Review status</h2>
          <p>{review.canPublish ? "All publish checks passed." : "This candidate cannot be published yet."}</p>
          <p>{review.checks.filter((check) => check.status === "passed").length} passed · {review.checks.filter((check) => check.status === "failed").length} failed</p>
        </section>
      </div>

      {feedback && <div role="status" className={`${styles.feedbackBox} ${feedback.type === "success" ? styles.feedbackSuccess : feedback.type === "warning" ? styles.feedbackWarning : styles.feedbackError}`}>{feedback.message}</div>}

      <section className={styles.sectionBox}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <h2>Project preflight checks</h2>
          <button type="button" onClick={refreshReview} disabled={busy || refreshing} className={styles.buttonSecondary}>{refreshing ? "Refreshing…" : "Refresh review"}</button>
        </div>
        <ul style={{ paddingLeft: "1.25rem" }}>
          {review.checks.map((check) => <li key={`${check.id}-${check.kind}`}>
            <strong>{check.id} / {check.kind}:</strong> {check.status} · checked {new Date(check.checkedAt).toLocaleString()}
            {check.reasons.length > 0 && <ul>{check.reasons.map((reason, index) => <li key={`${check.id}-${check.kind}-${index}`}>{reason}</li>)}</ul>}
          </li>)}
        </ul>
        <p>HTTPS checks validate recorded URL syntax only. This review does not fetch external links or reverify their contents.</p>
        <p>CandidateX remains a private draft. CDN/edge state is not observed by this review.</p>
      </section>

      <section className={styles.sectionBox}>
        <h2>Publish reviewed candidate</h2>
        <p>Publishing uses the current review identity and expected publication revision. A stale review must be refreshed.</p>
        <label htmlFor="pub-expected-rev" className={styles.label}>Expected publication revision</label>
        <input id="pub-expected-rev" type="number" min={1} value={expectedRevision} onChange={(event) => setExpectedRevision(Number(event.target.value))} className={styles.input} style={{ maxWidth: 140 }} />
        <button type="button" onClick={handlePublish} disabled={busy || !review.canPublish || !publishChecksPassed || !identityMatches} className={styles.button}>
          {busy ? "Applying…" : `Publish candidate r${expectedRevision}`}
        </button>
        {!identityMatches && <p role="alert">The expected revision differs from the reviewed identity. Refresh review to continue.</p>}
      </section>

      <section className={styles.sectionBox}>
        <h2>Publication history and rollback</h2>
        <p>Rollback creates a new publication revision and records the supplied reason.</p>
        <table className={styles.table}>
          <thead><tr><th>Revision</th><th>Action</th><th>Published</th><th>Actor</th><th>Reason</th><th>Rollback</th></tr></thead>
          <tbody>{history.slice().reverse().map((item) => <tr key={item.revision}>
            <td>r{item.revision}{item.revision === publication.revision ? " · Active" : ""}</td>
            <td>{item.action === "rollback" ? `Rollback to r${item.targetRevision}` : "Publish"}</td>
            <td>{new Date(item.publishedAt).toLocaleString()}</td>
            <td><code>{item.actor}</code></td>
            <td>{item.rollbackReason ?? "—"}</td>
            <td>{item.revision !== publication.revision ? <button type="button" onClick={() => handleRollback(item.revision)} disabled={busy} className={styles.buttonSecondary}>Rollback to r{item.revision}</button> : "Current snapshot"}</td>
          </tr>)}</tbody>
        </table>
      </section>
    </div>
  );
}
