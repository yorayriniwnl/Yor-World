import type { PublishedProject } from "@/contracts/content";
import { approvedPublication } from "@/content/approved-publication";

/**
 * Public verified projects sourced directly from the approved publication snapshot.
 */
export const publishedProjects: readonly PublishedProject[] = approvedPublication.projects;

/**
 * Verified Owner Identity & Links grounded in https://github.com/yorayriniwnl
 */
export const ownerIdentity = {
  name: "Ayush Roy",
  handle: "yorayriniwnl",
  role: "Full-Stack & Systems Developer",
  tagline: "Building realtime systems, 3D product interfaces, and applied ML.",
  location: "Bhubaneswar, Odisha, India",
  email: "ayushroy.dev@gmail.com",
  education: "B.Tech in Computer Science and Communication Engineering, KIIT Deemed to be University (2023–2027 expected)",
  experience: "Telecom & Data Network Intern at Bharat Sanchar Nigam Limited (BSNL), June 2026 (RGMTTC-certified)",
  links: {
    github: "https://github.com/yorayriniwnl",
    linkedin: "https://linkedin.com/in/yorayriniwnl",
    devpost: "https://devpost.com/yorayriniwnl",
    website: "https://www.yorayriniwnl.in",
    steam: "https://steamcommunity.com/id/yorayriniwnl/",
  },
} as const;

// Backward compatibility alias for any existing consumer
export const draftIdentity = {
  name: ownerIdentity.name,
  role: ownerIdentity.role,
  note: "Verified identity grounded in owner repository and profile receipts.",
} as const;
