/**
 * YOR WORLD Gate G6 Release Candidate: Content & Publication Release Snapshot
 *
 * Verifies:
 * 1. Exact accepted publication revision is Revision 1
 * 2. Exactly four verified public projects are reachable:
 *    - ai-vs-real (AI vs. Real Image Detector)
 *    - helios (Helios Microgrid Optimizer)
 *    - zenith (Zenith Stratospheric Telemetry)
 *    - talks (Technical Keynotes & Talks)
 * 3. CandidateX remains unavailable publicly (findPublishedProject returns null)
 * 4. Unsupported claims remain unpublished
 * 5. Public snapshot is internally consistent
 * 6. Asset / publication revision relationship can be bound by C4
 */

import { describe, expect, it } from "vitest";
import { approvedPublication } from "../../src/content/approved-publication";
import { readPublication, findPublishedProject } from "../../src/content/publication-reader";

describe("G6-RC: Content & Publication Release Snapshot", () => {
  it("6.1 Verifies exact accepted publication revision is Revision 1", () => {
    expect(approvedPublication.revision).toBe(1);
    expect(approvedPublication.publishedAt).toBe("2026-10-01T12:00:00Z");
    expect(approvedPublication.assetManifestRevision).toBe("manifest-20261001-r1");
  });

  it("6.2 Verifies exactly four verified public projects are published and reachable", async () => {
    const pub = await readPublication();
    expect(pub.projects.length).toBe(4);

    const slugs = pub.projects.map((p) => p.slug);
    expect(slugs).toContain("ai-vs-real");
    expect(slugs).toContain("helios");
    expect(slugs).toContain("zenith");
    expect(slugs).toContain("talks");

    for (const slug of slugs) {
      const project = findPublishedProject(pub, slug);
      expect(project).toBeDefined();
      expect(project?.slug).toBe(slug);
      expect(project?.title.length).toBeGreaterThan(0);
      expect(project?.summary.length).toBeGreaterThan(0);
      expect(project?.contribution.length).toBeGreaterThan(0);
      expect(project?.evidence.length).toBeGreaterThan(0);
      expect(project?.sections.length).toBeGreaterThan(0);
    }
  });

  it("6.3 Confirms CandidateX remains unavailable publicly and returns null", async () => {
    const pub = await readPublication();
    const candidateX = findPublishedProject(pub, "candidatex");
    expect(candidateX).toBeNull();

    const candidateXSlug = approvedPublication.projects.find((p) => p.slug === "candidatex");
    expect(candidateXSlug).toBeUndefined();

    const candidateXId = approvedPublication.projects.find((p) => p.id === "candidatex");
    expect(candidateXId).toBeUndefined();
  });

  it("6.4 Verifies evidence and links across all published projects are verified without ungrounded claims", () => {
    for (const project of approvedPublication.projects) {
      // Every link must have a valid checked timestamp and https protocol
      for (const link of project.links) {
        expect(link.url.startsWith("https://")).toBe(true);
        expect(link.checkedAt).toBe("2026-10-01T12:00:00Z");
      }

      // Every evidence item must have verified status
      for (const ev of project.evidence) {
        expect(ev.status).toBe("verified");
        expect(ev.note.length).toBeGreaterThan(10);
      }
    }
  });

  it("6.5 Verifies asset / publication revision relationship can be bound by C4", () => {
    expect(approvedPublication.assetManifestRevision).toBe("manifest-20261001-r1");
    expect(approvedPublication.revision).toBe(1);
  });
});
