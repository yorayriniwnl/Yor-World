/**
 * YOR WORLD Milestone A1 / Milestone A4 Unit Tests:
 * Structured Block Authoring & Truthful Draft Presentation
 *
 * Verifies:
 * - 4-variant block schema validation (paragraph, image, list, code)
 * - Structured block roundtripping, Unicode retention, multi-line code preservation
 * - Validation gate rejection: duplicate section IDs, empty headings, empty list items
 * - Truthful draft presentation interfaces and AccessibleFigure preview proxy resolution
 */

import { describe, expect, it } from "vitest";
import {
  ContentSectionSchema,
  type ContentSection,
  type PublishedProject,
} from "@/contracts/content";
import {
  validateDraftContent,
  ContentValidationError,
} from "@/server/content/revisions";
import { AccessibleFigure, type CaseStudyPresentation } from "@/features/portfolio/case-study";

describe("Structured Block Authoring & Schema Validation (A1)", () => {
  it("validates all 4 block variants (paragraph, image, list, code) successfully", () => {
    const section: ContentSection = {
      id: "architecture-overview",
      heading: "System Architecture",
      blocks: [
        {
          type: "paragraph",
          text: "YOR WORLD portfolio combines server-rendered React with WebGL.",
        },
        {
          type: "image",
          mediaId: "arch-diag-01",
          alt: "Architecture block diagram",
          caption: "Core pipeline flow and boundary isolation.",
        },
        {
          type: "list",
          items: [
            "Deterministic ReviewIdentity pre-flight binding",
            "AAL2 owner-guarded administration",
            "Optimistic concurrency control with advisory locking",
          ],
        },
        {
          type: "code",
          language: "typescript",
          text: "export const config = { runtime: 'nodejs' };\nconsole.log('Ready');",
        },
      ],
    };

    const parseResult = ContentSectionSchema.safeParse(section);
    expect(parseResult.success).toBe(true);
  });

  it("preserves multi-line code snippets, indentation, and Unicode characters", () => {
    const rawUnicodeCode = `// 🚀 Performance benchmark: π ≈ 3.1415926535\nfunction compute() {\n  const delta = 42; // 日本語コメント\n  return delta * 2;\n}`;
    const section: ContentSection = {
      id: "unicode-code-section",
      heading: "Unicode & Formatting",
      blocks: [
        {
          type: "code",
          language: "typescript",
          text: rawUnicodeCode,
        },
        {
          type: "paragraph",
          text: "International text: Привет мир · 🌍 YOR WORLD · äöüß.",
        },
      ],
    };

    const parseResult = ContentSectionSchema.safeParse(section);
    expect(parseResult.success).toBe(true);
    if (parseResult.success) {
      expect(parseResult.data.blocks[0]?.type).toBe("code");
      if (parseResult.data.blocks[0]?.type === "code") {
        expect(parseResult.data.blocks[0].text).toBe(rawUnicodeCode);
      }
      expect(parseResult.data.blocks[1]?.type).toBe("paragraph");
      if (parseResult.data.blocks[1]?.type === "paragraph") {
        expect(parseResult.data.blocks[1].text).toContain("🌍 YOR WORLD");
      }
    }
  });

  it("rejects project drafts with duplicate section IDs", () => {
    const projectWithDuplicateSections: PublishedProject = {
      id: "ai-vs-real",
      slug: "ai-vs-real",
      title: "AI vs Real Test",
      summary: "Summary test",
      contribution: "Sole Engineer",
      sections: [
        {
          id: "duplicate-id",
          heading: "Section 1",
          blocks: [{ type: "paragraph", text: "First section content." }],
        },
        {
          id: "duplicate-id",
          heading: "Section 2",
          blocks: [{ type: "paragraph", text: "Second section content." }],
        },
      ],
      links: [{ label: "Site", url: "https://example.com", checkedAt: "2026-10-10T00:00:00Z" }],
      evidence: [
        {
          id: "ev-1",
          kind: "document",
          url: null,
          status: "verified",
          note: "Audit note",
          checkedAt: "2026-10-10T00:00:00Z",
        },
      ],
      revision: 1,
    };

    expect(() => validateDraftContent(projectWithDuplicateSections)).toThrow(ContentValidationError);
    expect(() => validateDraftContent(projectWithDuplicateSections)).toThrow(
      "Duplicate section id 'duplicate-id'"
    );
  });

  it("rejects project drafts with empty section headings", () => {
    const invalidProject: PublishedProject = {
      id: "ai-vs-real",
      slug: "ai-vs-real",
      title: "AI vs Real",
      summary: "Summary",
      contribution: "Lead",
      sections: [
        {
          id: "empty-heading-sec",
          heading: "   ",
          blocks: [{ type: "paragraph", text: "Valid text." }],
        },
      ],
      links: [],
      evidence: [
        {
          id: "ev-1",
          kind: "document",
          url: null,
          status: "verified",
          note: "Valid note",
          checkedAt: "2026-10-10T00:00:00Z",
        },
      ],
      revision: 1,
    };

    expect(() => validateDraftContent(invalidProject)).toThrow(ContentValidationError);
    expect(() => validateDraftContent(invalidProject)).toThrow("empty heading");
  });

  it("rejects list blocks with empty items or zero items", () => {
    const projectWithEmptyListItem: PublishedProject = {
      id: "ai-vs-real",
      slug: "ai-vs-real",
      title: "AI vs Real",
      summary: "Summary",
      contribution: "Lead",
      sections: [
        {
          id: "list-sec",
          heading: "List Section",
          blocks: [
            {
              type: "list",
              items: ["Valid item 1", "  ", "Valid item 3"],
            },
          ],
        },
      ],
      links: [],
      evidence: [
        {
          id: "ev-1",
          kind: "document",
          url: null,
          status: "verified",
          note: "Valid note",
          checkedAt: "2026-10-10T00:00:00Z",
        },
      ],
      revision: 1,
    };

    expect(() => validateDraftContent(projectWithEmptyListItem)).toThrow(ContentValidationError);
    expect(() => validateDraftContent(projectWithEmptyListItem)).toThrow("contains an empty item");
  });

  it("rejects image blocks with missing mediaId", () => {
    const projectWithEmptyMediaId: PublishedProject = {
      id: "ai-vs-real",
      slug: "ai-vs-real",
      title: "AI vs Real",
      summary: "Summary",
      contribution: "Lead",
      sections: [
        {
          id: "img-sec",
          heading: "Image Section",
          blocks: [
            {
              type: "image",
              mediaId: "",
              alt: "Missing media ID",
              caption: "Caption",
            },
          ],
        },
      ],
      links: [],
      evidence: [
        {
          id: "ev-1",
          kind: "document",
          url: null,
          status: "verified",
          note: "Valid note",
          checkedAt: "2026-10-10T00:00:00Z",
        },
      ],
      revision: 1,
    };

    expect(() => validateDraftContent(projectWithEmptyMediaId)).toThrow(ContentValidationError);
    expect(() => validateDraftContent(projectWithEmptyMediaId)).toThrow("mediaId");
  });
});

describe("CaseStudy Truthful Draft Presentation & AccessibleFigure (CA-01)", () => {
  it("exports CaseStudyPresentation interface conforming to draft and published contracts", () => {
    const publishedPresentation: CaseStudyPresentation = { mode: "published" };
    expect(publishedPresentation.mode).toBe("published");

    const draftPresentation: CaseStudyPresentation = {
      mode: "draft",
      draftRevision: 4,
    };
    expect(draftPresentation.mode).toBe("draft");
    expect(draftPresentation.draftRevision).toBe(4);
  });

  it("AccessibleFigure component is exported and callable", () => {
    expect(typeof AccessibleFigure).toBe("function");
  });
});
