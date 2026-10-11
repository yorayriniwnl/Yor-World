"use client";

import { useState } from "react";
import type { Publication } from "@/contracts/content";
import styles from "@/app/admin/admin.module.css";

type PrivateDraftReview = {
  identity: {
    expectedPublicationRevision: number;
    projects: Array<{ projectId: string; draftRevision: number }>;
    siteDraftRevision: null;
    media: unknown[];
    candidateSha256: string;
  };
  checks: Array<{ scope: "project" | "site"; id: string; kind: string; status: "passed" | "failed"; checkedAt: string; reasons: string[] }>;
  canPublish: boolean;
};

export interface HistoryItem {
  revision: number;
  actor: string;
  publishedAt: string;
  action: "publish" | "rollback";
  targetRevision?: number;
  reason?: string;
}

export function PublishReview({ initialPublication, initialHistory, initialReview }: {
  initialPublication: Publication;
  initialHistory: HistoryItem[];
  initialReview: PrivateDraftReview;
}) {
  const [publication, setPublication] = useState(initialPublication);
  const [history, setHistory] = useState(initialHistory);
  const [review, setReview] = useState(initialReview);
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function refreshReview() {
    const response = await fetch("/api/admin/preview", { cache: "no-store" });
    const data = await response.json() as PrivateDraftReview & { error?: string };
    if (!response.ok) throw new Error(data.error ?? "The current private review could not be refreshed.");
    setReview(data);
    return data;
  }

  async function handlePublish() {
    setBusy(true);
    setFeedback(null);
    try {
      const currentReview = await refreshReview();
      if (!currentReview.canPublish) throw new Error("The current candidate has failed review checks and cannot be published.");
      const response = await fetch("/api/admin/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedRevision: currentReview.identity.expectedPublicationRevision, review: currentReview.identity }),
      });
      const data = await response.json() as { error?: string; publication?: Publication; actor?: string };
      if (!response.ok || !data.publication) throw new Error(data.error ?? `Publication failed (${response.status}).`);
      setPublication(data.publication);
      setHistory((previous) => [...previous, { revision: data.publication!.revision, actor: data.actor ?? "owner", publishedAt: data.publication!.publishedAt, action: "publish" }]);
      await refreshReview();
      setFeedback({ type: "success", message: `Publication revision ${data.publication.revision} was recorded. Public delivery/cache state remains separately reported.` });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Publication failed." });
    } finally { setBusy(false); }
  }

  async function handleRollback(targetRevision: number) {
    if (!reason.trim()) { setFeedback({ type: "error", message: "Enter a specific rollback reason before continuing." }); return; }
    if (!confirm(`Restore publication revision ${targetRevision} as a new revision?`)) return;
    setBusy(true);
    setFeedback(null);
    try {
      const currentReview = await refreshReview();
      const response = await fetch("/api/admin/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetRevision, expectedRevision: currentReview.identity.expectedPublicationRevision, reason: reason.trim() }),
      });
      const data = await response.json() as { error?: string; publication?: Publication; actor?: string; reason?: string };
      if (!response.ok || !data.publication) throw new Error(data.error ?? `Rollback failed (${response.status}).`);
      setPublication(data.publication);
      setHistory((previous) => [...previous, { revision: data.publication!.revision, actor: data.actor ?? "owner", publishedAt: data.publication!.publishedAt, action: "rollback", targetRevision, reason: data.reason ?? reason.trim() }]);
      setReason("");
      await refreshReview();
      setFeedback({ type: "success", message: `Revision ${targetRevision} was restored as publication revision ${data.publication.revision}.` });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Rollback failed." });
    } finally { setBusy(false); }
  }

  return (
    <section aria-label="Publication review">
      <h2>Current active publication</h2>
      <p>Revision {publication.revision} · recorded {publication.publishedAt} · {publication.projects.length} public projects</p>
      <p>Review identity for publication revision {review.identity.expectedPublicationRevision}.</p>
      <p>Candidate SHA-256: <code>{review.identity.candidateSha256}</code></p>
      <p>The hash binds the candidate project documents and their array order, the media review vector, and the asset-manifest revision.</p>

      <section aria-labelledby="review-checks-heading">
        <h2 id="review-checks-heading">Executed candidate checks</h2>
        <p>{review.canPublish ? "All current checks passed." : "The candidate has failures or no publishable public projects."}</p>
        <ul>
          {review.checks.map((check) => (
            <li key={`${check.scope}:${check.id}:${check.kind}`}>
              <strong>{check.scope} {check.id} · {check.kind}: {check.status}</strong>
              <time dateTime={check.checkedAt}> · {check.checkedAt}</time>
              {check.reasons.length > 0 && <ul>{check.reasons.map((value, index) => <li key={`${check.kind}-${index}`}>{value}</li>)}</ul>}
            </li>
          ))}
        </ul>
        <p>HTTPS checks validate recorded URL syntax. They do not claim a fresh live-link, metric, or deployment check.</p>
        <button type="button" onClick={() => void refreshReview().catch((error) => setFeedback({ type: "error", message: error instanceof Error ? error.message : "Review refresh failed." }))} disabled={busy}>Refresh review</button>
      </section>

      <button type="button" onClick={() => void handlePublish()} disabled={busy || !review.canPublish}>{busy ? "Working…" : "Publish reviewed candidate"}</button>

      <section aria-labelledby="history-heading">
        <h2 id="history-heading">Publication history</h2>
        <label>Rollback reason<textarea aria-label="Rollback reason" maxLength={1000} value={reason} onChange={(event) => setReason(event.currentTarget.value)} /></label>
        <ul>
          {history.map((item) => (
            <li key={`${item.revision}-${item.action}`}>
              <strong>Revision {item.revision} · {item.action}</strong> · {item.publishedAt} · {item.actor}
              {item.targetRevision !== undefined && <> · restored {item.targetRevision} · {item.reason}</>}
              {item.revision < publication.revision && <button type="button" onClick={() => void handleRollback(item.revision)} disabled={busy || !reason.trim()}>Restore revision {item.revision}</button>}
            </li>
          ))}
        </ul>
      </section>
      {feedback && <p role="status" aria-live="polite" className={feedback.type === "error" ? styles.error : styles.success}>{feedback.message}</p>}
    </section>
  );
}
