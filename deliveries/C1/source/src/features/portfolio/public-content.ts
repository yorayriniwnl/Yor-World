import type { PublishedProject } from "@/contracts/content";

// No projects have passed evidence review. Candidate names are not public cards.
export const publishedProjects: readonly PublishedProject[] = [];
export const draftIdentity = {
  name: "Ayush Roy / YOR",
  role: "Software engineer — proposed title",
  note: "Name and professional title await owner confirmation.",
} as const;
