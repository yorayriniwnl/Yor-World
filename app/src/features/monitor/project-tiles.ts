import type { ProjectId, PublishedProject } from "@/contracts/content";
import { PROJECT_MOTIFS } from "../experience/project-transition";

export interface ProjectTile {
  id: ProjectId;
  slug: string;
  title: string;
  summary: string;
  status: "verified" | "unpublished";
  motif: string;
  accent: string;
}

/** UI metadata comes from the approved snapshot; motifs keep the frozen runtime IDs. */
export function createProjectTiles(projects: readonly PublishedProject[]): ProjectTile[] {
  const tiles: ProjectTile[] = projects
    .filter((project) => project.id !== "candidatex" && project.slug !== "candidatex")
    .map((project) => ({
      id: project.id,
      slug: project.slug,
      title: project.title,
      summary: project.summary,
      status: "verified",
      motif: PROJECT_MOTIFS[project.id].motifStyle,
      accent: PROJECT_MOTIFS[project.id].accentColor,
    }));
  tiles.push({
    id: "candidatex", slug: "candidatex", title: "CandidateX (Unavailable)",
    summary: "Public case study unavailable pending evidence verification.",
    status: "unpublished", motif: "unverified-alert", accent: "#ef4444",
  });
  return tiles;
}
