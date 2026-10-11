import Link from "next/link";
import type { PublishedProject } from "@/contracts/content";
import { CaseStudy } from "@/features/portfolio/case-study";

type DraftCheck = { scope: "project" | "site"; id: string; kind: string; status: "passed" | "failed"; checkedAt: string; reasons: string[] };
type DraftRecord = { projectId: string; draftRevision: number; project: PublishedProject; updatedAt: string; updatedBy: string };
type PrivateDraftReview = { checks: DraftCheck[]; canPublish: boolean };

export function DraftPreview({ draft, review, mediaUrls }: { draft: DraftRecord; review: PrivateDraftReview; mediaUrls: Readonly<Record<string, string>> }) {
  const checks = review.checks.filter((check) => check.scope === "project" && check.id === draft.projectId);
  return (
    <>
      <p role="status">Draft preview · Unpublished · Revision {draft.draftRevision}. Visible only to the authorized owner.</p>
      <p>Last saved {draft.updatedAt} by {draft.updatedBy}.</p>
      <p>{review.canPublish ? "The current candidate passes its recorded local review checks." : "This draft is not publishable from the current review."}</p>
      <section aria-labelledby="private-review-heading">
        <h2 id="private-review-heading">Executed draft checks</h2>
        <ul>
          {checks.map((check) => (
            <li key={`${check.scope}:${check.id}:${check.kind}`}>
              <strong>{check.kind}: {check.status}</strong>
              <time dateTime={check.checkedAt}> · {check.checkedAt}</time>
              {check.reasons.length > 0 && <ul>{check.reasons.map((reason, index) => <li key={`${check.kind}-${index}`}>{reason}</li>)}</ul>}
            </li>
          ))}
        </ul>
        <p>HTTPS checks validate the recorded URL format; they do not claim that a link is live or current.</p>
      </section>
      <CaseStudy project={draft.project} approvedMediaUrls={mediaUrls} presentation={{ mode: "draft", draftRevision: draft.draftRevision }} />
      <p><Link href="/admin/preview" prefetch={false}>Back to private drafts</Link></p>
    </>
  );
}
