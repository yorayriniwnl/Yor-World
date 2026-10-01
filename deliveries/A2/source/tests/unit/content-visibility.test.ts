import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  readPublication,
  findPublishedProject,
  validatePublication,
  PublicationValidationError,
} from "@/content/publication-reader";
import { approvedPublication } from "@/content/approved-publication";
import { CaseStudy, AccessibleFigure } from "@/features/portfolio/case-study";
import { SafeExternalLink, isSafeHttpsUrl } from "@/features/portfolio/safe-link";
import type { Publication, PublishedProject } from "@/contracts/content";

describe("Content Visibility & Publication Contracts (Milestone A2)", () => {
  it("loads the approved publication with exactly the verified candidate projects", async () => {
    const publication = await readPublication();
    expect(publication.revision).toBeGreaterThanOrEqual(1);
    expect(publication.publishedAt).toBeDefined();

    const slugs = publication.projects.map((p) => p.slug);
    expect(slugs).toContain("ai-vs-real");
    expect(slugs).toContain("zenith");
    expect(slugs).toContain("helios");
    expect(slugs).toContain("talks");
    expect(publication.projects).toHaveLength(4);
  });

  describe("Verified Projects Lookup", () => {
    it("successfully finds verified project 'ai-vs-real' with all required case-study blocks", async () => {
      const publication = await readPublication();
      const project = findPublishedProject(publication, "ai-vs-real");
      expect(project).not.toBeNull();
      expect(project?.id).toBe("ai-vs-real");
      expect(project?.title).toBe("AI vs. Real Image Detector");
      expect(project?.summary).toContain("probability-aware image classifier");
      expect(project?.contribution).toContain("Sole developer");
      expect(project?.sections.length).toBeGreaterThanOrEqual(3);

      // Verify empirical metric claim is present and backed by evidence
      const accuracyEvidence = project?.evidence.find((e) => e.kind === "measurement");
      expect(accuracyEvidence).toBeDefined();
      expect(accuracyEvidence?.status).toBe("verified");
      expect(accuracyEvidence?.note).toContain("78.5%");
    });

    it("successfully finds verified project 'zenith'", async () => {
      const publication = await readPublication();
      const project = findPublishedProject(publication, "zenith");
      expect(project).not.toBeNull();
      expect(project?.title).toBe("Yor Zenith");
      expect(project?.links.some((l) => l.url.includes("zenith"))).toBe(true);
    });

    it("successfully finds verified project 'helios'", async () => {
      const publication = await readPublication();
      const project = findPublishedProject(publication, "helios");
      expect(project).not.toBeNull();
      expect(project?.title).toBe("Yor Helios");
      expect(project?.evidence.some((e) => e.note.includes("Docker Compose"))).toBe(true);
    });

    it("successfully finds verified project 'talks'", async () => {
      const publication = await readPublication();
      const project = findPublishedProject(publication, "talks");
      expect(project).not.toBeNull();
      expect(project?.title).toBe("Yor Talks V2");
      expect(project?.links.some((l) => l.url.includes("yor-talks"))).toBe(true);
    });
  });

  describe("Unpublished Candidate & Unknown Slug Behavior", () => {
    it("returns null for unpublished candidate CandidateX", async () => {
      const publication = await readPublication();
      // CandidateX is held internally; it MUST NOT be in public publication
      const project = findPublishedProject(publication, "candidatex");
      expect(project).toBeNull();
    });

    it("returns null for completely unknown / arbitrary slugs", async () => {
      const publication = await readPublication();
      expect(findPublishedProject(publication, "non-existent-project")).toBeNull();
      expect(findPublishedProject(publication, "")).toBeNull();
      expect(findPublishedProject(publication, "undefined")).toBeNull();
    });
  });

  describe("Unsupported Claim Rejection", () => {
    it("rejects publication fixtures containing unverified evidence status ('unknown')", () => {
      const invalidPublication: Publication = {
        revision: 1,
        publishedAt: "2026-10-01T12:00:00Z",
        assetManifestRevision: "manifest-r1",
        projects: [
          {
            id: "candidatex",
            slug: "candidatex",
            title: "CandidateX Synthetic Test",
            summary: "Synthetic summary claiming unverified results.",
            contribution: "Claimed authorship without proof.",
            revision: 1,
            links: [
              {
                label: "Unverified Link",
                url: "https://example.com/unverified",
                checkedAt: "2026-10-01T12:00:00Z",
              },
            ],
            evidence: [
              {
                id: "ev-base",
                kind: "repository",
                url: "https://example.com/repo",
                checkedAt: "2026-10-01T12:00:00Z",
                status: "verified",
                note: "Verified baseline evidence.",
              },
              {
                id: "ev-unverified",
                kind: "deployment",
                url: "https://example.com/unverified",
                checkedAt: "2026-10-01T12:00:00Z",
                status: "unknown", // <--- UNVERIFIED STATUS
                note: "Unchecked claims cannot enter publication.",
              },
            ],
            sections: [
              {
                id: "sec-1",
                heading: "Heading",
                blocks: [{ type: "paragraph", text: "Unsupported claim text." }],
              },
            ],
          },
        ],
      };

      expect(() => validatePublication(invalidPublication)).toThrow(PublicationValidationError);
      expect(() => validatePublication(invalidPublication)).toThrow(
        /contains unverified claim 'ev-unverified' with status 'unknown'/
      );
    });

    it("rejects publication fixtures with projects lacking any verified evidence", () => {
      const noVerifiedEvidenceProject: Publication = {
        revision: 1,
        publishedAt: "2026-10-01T12:00:00Z",
        assetManifestRevision: "manifest-r1",
        projects: [
          {
            id: "talks",
            slug: "talks",
            title: "Talks Without Evidence",
            summary: "Summary",
            contribution: "Contribution",
            revision: 1,
            links: [{ label: "Demo", url: "https://example.com", checkedAt: "2026-10-01T12:00:00Z" }],
            evidence: [
              {
                id: "ev-na",
                kind: "document",
                url: null,
                checkedAt: null,
                status: "not-applicable",
                note: "Only not-applicable evidence, zero verified evidence.",
              },
            ],
            sections: [],
          },
        ],
      };

      expect(() => validatePublication(noVerifiedEvidenceProject)).toThrow(
        /has no verified evidence/
      );
    });

    it("rejects publication fixtures with duplicate slugs", () => {
      const p1 = approvedPublication.projects[0]!;
      const p2 = approvedPublication.projects[1]!;
      const duplicateSlugPublication: Publication = {
        ...approvedPublication,
        projects: [
          p1,
          { ...p2, slug: p1.slug },
        ],
      };

      expect(() => validatePublication(duplicateSlugPublication)).toThrow(
        /Duplicate project slug detected/
      );
    });

    it("rejects insecure or non-HTTPS links in project evidence or links", () => {
      const p1 = approvedPublication.projects[0]!;
      const insecureLinkProject: Publication = {
        ...approvedPublication,
        projects: [
          {
            ...p1,
            links: [
              {
                label: "Insecure Link",
                url: "http://insecure-site.org" as `https://${string}`,
                checkedAt: "2026-10-01T12:00:00Z",
              },
            ],
          },
        ],
      };

      expect(() => validatePublication(insecureLinkProject)).toThrow(
        /Invalid URL|insecure link URL|Only https:\/\/ URLs are allowed/
      );
    });
  });

  describe("Accessible Figures & Missing Media Handling", () => {
    it("renders figure markup cleanly when mediaId is provided", () => {
      const html = renderToStaticMarkup(
        React.createElement(AccessibleFigure, {
          mediaId: "forensic-chart-1",
          alt: "LBP texture distribution graph",
          caption: "Fig 1: Texture feature distribution across 8 orientations.",
        })
      );

      expect(html).toContain("<figure");
      expect(html).toContain("<figcaption");
      expect(html).toContain("LBP texture distribution graph");
      expect(html).toContain("Fig 1: Texture feature distribution");
    });

    it("renders accessible non-crashing fallback placeholder when mediaId is missing or empty", () => {
      const html = renderToStaticMarkup(
        React.createElement(AccessibleFigure, {
          mediaId: "",
          alt: "Expected architecture diagram",
          caption: "Fig 2: Architecture diagram under review.",
        })
      );

      expect(html).toContain("<figure");
      expect(html).toContain('role="img"');
      expect(html).toContain('aria-label="Expected architecture diagram"');
      expect(html).toContain("Diagram / figure pending asset review");
      expect(html).toContain("<figcaption");
      expect(html).not.toContain("<img"); // Zero broken image tags
    });
  });

  describe("Long Title & Typography Resilience", () => {
    it("renders case study with an unusually long title without throwing or breaking structure", () => {
      const p1 = approvedPublication.projects[0]!;
      const longTitleProject: PublishedProject = {
        ...p1,
        title: "Supercalifragilisticexpialidocious Ultra-Extensible Distributed Synchronous Asynchronous Deep-Learning Resilient Texture Forensic Evaluation Platform for Complex Multimodal Forensic Systems",
      };

      const html = renderToStaticMarkup(
        React.createElement(CaseStudy, { project: longTitleProject })
      );
      expect(html).toContain("<article");
      expect(html).toContain(longTitleProject.title);
      expect(html).toContain("Verified Role &amp; Contribution");
    });
  });

  describe("Safe External Links & Security", () => {
    it("validates HTTPS URLs correctly and rejects dangerous protocols", () => {
      expect(isSafeHttpsUrl("https://github.com/yorayriniwnl")).toBe(true);
      expect(isSafeHttpsUrl("https://zenith-xi-snowy.vercel.app")).toBe(true);
      expect(isSafeHttpsUrl("http://insecure.com")).toBe(false);
      expect(isSafeHttpsUrl("javascript:alert(1)")).toBe(false);
      expect(isSafeHttpsUrl("data:text/html,<html>")).toBe(false);
      expect(isSafeHttpsUrl("vbscript:msgbox")).toBe(false);
      expect(isSafeHttpsUrl("not-a-url")).toBe(false);
    });

    it("renders external links with target='_blank' and rel='noopener noreferrer'", () => {
      const html = renderToStaticMarkup(
        React.createElement(
          SafeExternalLink,
          {
            href: "https://github.com/yorayriniwnl/Yor-Zenith",
            children: "Source Repository",
          }
        )
      );

      expect(html).toContain('href="https://github.com/yorayriniwnl/Yor-Zenith"');
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
      expect(html).toContain("(opens in a new tab)");
    });

    it("renders disabled fallback if an unsafe URL is passed to SafeExternalLink", () => {
      const html = renderToStaticMarkup(
        React.createElement(
          SafeExternalLink,
          {
            href: "javascript:alert('pwned')",
            children: "Dangerous Link",
          }
        )
      );

      expect(html).not.toContain("<a ");
      expect(html).toContain("[link disabled: non-https]");
    });
  });
});
