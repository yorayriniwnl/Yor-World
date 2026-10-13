import type { PublishedProject } from "@/contracts/content";
import { CaseStudy } from "@/features/portfolio/case-study";

interface DraftPreviewRecord {
  project: PublishedProject;
  draftRevision: number;
  updatedAt: string;
  updatedBy: string;
}

interface DraftPreviewCheck {
  scope: "project" | "site";
  id: string;
  kind: string;
  status: "passed" | "failed";
  checkedAt: string;
  reasons: string[];
}

export async function DraftPreview({
  draft,
  checks,
  approvedMediaUrls,
}: {
  draft: DraftPreviewRecord;
  checks: DraftPreviewCheck[];
  approvedMediaUrls: Readonly<Record<string, string>>;
}) {
  return (
    <div>
      <section aria-label="Private draft review">
        <h2>Draft preview · Unpublished</h2>
        <p>
          Draft revision r{draft.draftRevision} · Updated {draft.updatedAt} · Author {draft.updatedBy}
        </p>
        {checks.map((check) => (
          <article key={check.scope + ":" + check.id + ":" + check.kind}>
            <h3>{check.kind}: {check.status}</h3>
            <p>Checked {check.checkedAt}</p>
            {check.reasons.length > 0 && (
              <ul>{check.reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul>
            )}
          </article>
        ))}
      </section>
      <CaseStudy
        project={draft.project}
        approvedMediaUrls={approvedMediaUrls}
        presentation={{ mode: "draft", draftRevision: draft.draftRevision }}
      />
    </div>
  );
}
