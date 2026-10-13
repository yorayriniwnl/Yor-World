import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { approvedPublication } from "@/content/approved-publication";
import { readServerPublication } from "@/content/server-publication";
import { validatePublication } from "@/content/publication-reader";
import { readPublicPublication } from "@/server/content/publish";
import ProjectsPage from "@/app/(public)/projects/page";
import ProjectDetailPage from "@/app/(public)/projects/[slug]/page";
import { StaticFallback } from "@/features/room/static-fallback";
import { createProjectTiles } from "@/features/monitor/project-tiles";
import { executeTerminalCommand } from "@/features/monitor/commands";
import { AccessibleFigure, CaseStudy } from "@/features/portfolio/case-study";

vi.mock("@/server/content/publish", () => ({ readPublicPublication: vi.fn() }));
vi.mock("@/server/media/manifest", () => ({ readApprovedPublishedMediaUrls: vi.fn().mockResolvedValue({}) }));

afterEach(() => vi.resetAllMocks());

describe("Canonical public snapshot and runtime composition", () => {
  it("renders the durable approved revision in project pages, monitor tiles, and static DOM", async () => {
    const snapshot = structuredClone(approvedPublication);
    snapshot.revision = 2;
    snapshot.projects.find((project) => project.id === "zenith")!.title = "Approved Zenith revision two";
    vi.mocked(readPublicPublication).mockResolvedValue(snapshot);

    const publication = await readServerPublication();
    expect(publication.revision).toBe(2);
    const index = renderToStaticMarkup(await ProjectsPage());
    const detail = renderToStaticMarkup(await ProjectDetailPage({ params: Promise.resolve({ slug: "zenith" }) }));
    const fallback = renderToStaticMarkup(React.createElement(StaticFallback, { projects: publication.projects }));
    expect(index).toContain("Approved Zenith revision two");
    expect(detail).toContain("Approved Zenith revision two");
    expect(fallback).toContain("Approved Zenith revision two");
    expect(createProjectTiles(publication.projects).find((tile) => tile.id === "zenith")?.title).toBe("Approved Zenith revision two");
    const terminal = executeTerminalCommand("projects", publication.projects, publication.revision).output.join("\n");
    expect(terminal).toContain("Publication Rev 2");
    expect(terminal).toContain("Approved Zenith revision two");
  });

  it("renders accepted static projects when durable backend read throws", async () => {
    vi.mocked(readPublicPublication).mockRejectedValue(new Error("database unavailable"));
    expect(await readServerPublication()).toEqual(approvedPublication);
    const detail = renderToStaticMarkup(await ProjectDetailPage({ params: Promise.resolve({ slug: "helios" }) }));
    expect(detail).toContain("Yor Helios");
    expect(detail).not.toContain("database unavailable");
  });

  it("rejects malformed/private payloads rather than serialize them into HTML or the world", async () => {
    vi.mocked(readPublicPublication).mockResolvedValue({
      ...approvedPublication,
      privateDraft: "private-data-canary",
    } as typeof approvedPublication);
    const safe = await readServerPublication();
    expect(safe).toEqual(approvedPublication);
    const fallback = renderToStaticMarkup(React.createElement(StaticFallback, { projects: safe.projects }));
    expect(fallback).not.toContain("private-data-canary");
    expect(fallback).not.toContain("candidatex");
    expect(fallback).not.toContain("Zero-Knowledge Recruiting");
  });

  it("keeps CandidateX unavailable even if a structurally verified backend payload adds it", () => {
    const candidate = { ...approvedPublication.projects[0]!, id: "candidatex" as const, slug: "candidatex" };
    expect(() => validatePublication({ ...approvedPublication, projects: [...approvedPublication.projects, candidate] })).toThrow(/CandidateX is unavailable/);
    expect(createProjectTiles([candidate]).filter((tile) => tile.status === "verified")).toHaveLength(0);
    expect(executeTerminalCommand("open candidatex", [candidate]).action).toBeUndefined();
  });

  it("the allowlisted public terminal cannot open admin/API URLs or invent owner privileges", () => {
    for (const input of ["admin", "open /admin", "open /api/admin/publish", "open https://example.com/admin"]) {
      expect(executeTerminalCommand(input).action).toBeUndefined();
    }
    expect(executeTerminalCommand("whoami").output.join(" ")).toContain("no owner privileges");
    expect(executeTerminalCommand("about").output.join(" ")).not.toContain("MIT Manipal");
    expect(executeTerminalCommand("contact").output.join(" ")).toContain("ayushroy.dev@gmail.com");
  });

  it("public figures never invent URLs for unknown or unapproved media", () => {
    const figure = renderToStaticMarkup(React.createElement(AccessibleFigure, {
      mediaId: "private-draft-canary", alt: "Architecture diagram", caption: "Diagram caption",
    }));
    expect(figure).not.toContain("<img");
    expect(figure).not.toContain("/images/projects/");
    expect(figure).toContain("Diagram / figure pending asset review");
    const unsafe = renderToStaticMarkup(React.createElement(AccessibleFigure, {
      mediaId: "approved-id", approvedUrl: "javascript:alert(1)", alt: "Architecture", caption: "Caption",
    }));
    expect(unsafe).not.toContain("<img");
  });

  it("only the explicit approved public media map supplies a figure URL", () => {
    const helios = approvedPublication.projects.find((project) => project.id === "helios")!;
    const url = "https://approved-storage.example.org/signed/diagram.png?token=public-approved-token";
    const html = renderToStaticMarkup(React.createElement(CaseStudy, {
      project: helios, approvedMediaUrls: { "missing-helios-diagram": url, "unused-private-canary": "https://private.example.org/private.png" },
    }));
    expect(html).toContain("<img");
    expect(html).toContain(url.replace(/&/g, "&amp;"));
    expect(html).not.toContain("unused-private-canary");
    expect(html).not.toContain("https://private.example.org/private.png");
  });
});
