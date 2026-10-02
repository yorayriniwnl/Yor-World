// Test-only verbatim value types from engineering section 4; input hash in evidence.
export type ProjectId = "candidatex" | "helios" | "zenith" | "ai-vs-real" | "talks";
export type QualityTier = "high" | "medium" | "low" | "static";
export type PublicRoute =
  | "/" | "/projects" | "/about" | "/about#research"
  | "/about#skills" | "/contact" | "/resume";
export type CharacterAction =
  | "coding_idle" | "mouse_idle" | "notice_visitor" | "turn_to_visitor"
  | "greeting_nod" | "return_to_work" | "attention_glance" | "breathing_idle";
export type CameraId =
  | "hallway" | "entry" | "reveal" | "greeting" | "home-desktop"
  | "home-mobile" | "monitor" | "pc" | "energy" | "scanner"
  | "microphone" | "about" | "contact";

export type EvidenceStatus = "verified" | "unknown" | "not-measured" | "not-applicable";
export type EvidenceRef = {
  id: string; kind: "repository" | "deployment" | "measurement" | "document";
  url: string | null; checkedAt: string | null; status: EvidenceStatus;
  note: string;
};
export type PublishedProject = {
  id: ProjectId; slug: string; title: string; summary: string;
  contribution: string; sections: ContentSection[];
  links: { label: string; url: string; checkedAt: string }[];
  evidence: EvidenceRef[]; revision: number;
};
export type ContentSection = {
  id: string; heading: string;
  blocks: Array<
    | { type: "paragraph"; text: string }
    | { type: "image"; mediaId: string; alt: string; caption: string }
    | { type: "list"; items: string[] }
    | { type: "code"; language: string; text: string }
  >;
};
export type Publication = {
  revision: number; publishedAt: string;
  projects: PublishedProject[]; assetManifestRevision: string;
};
export type WorldSnapshot = {
  version: 1; lampOn: boolean; blindsOpen: boolean; detailFound: boolean;
};
export type Preferences = {
  version: 1; introCompleted: boolean; soundEnabled: boolean;
  quality: QualityTier | "auto"; clock24h: boolean;
};
export type ExperienceIntent =
  | { type: "ENTER"; replay: boolean }
  | { type: "SKIP" }
  | { type: "GREET" }
  | { type: "OPEN_PROJECT"; projectId: ProjectId; source: "room" | "dom" }
  | { type: "NAVIGATE"; path: PublicRoute; source: "room" | "dom"; camera: CameraId | null }
  | { type: "OPEN_PANEL"; panel: "launcher" | "room-controls" | "replay" }
  | { type: "SET_LAMP"; enabled: boolean }
  | { type: "SET_BLINDS"; open: boolean }
  | { type: "SET_SOUND"; enabled: boolean }
  | { type: "SET_QUALITY"; quality: QualityTier | "auto" }
  | { type: "SET_CLOCK_FORMAT"; clock24h: boolean }
  | { type: "SET_PAUSED"; paused: boolean }
  | { type: "ESCAPE" }
  | { type: "HIDE" }
  | { type: "SHOW" }
  | { type: "RENDERER_FAILED"; code: string };
export type AssetManifest = {
  revision: string; schemaVersion: 1;
  groups: Array<{
    id: string; tier: QualityTier; url: string; sha256: string;
    bytes: number; triangles: number; materials: number;
    estimatedGpuBytes: number; clips: string[];
    provenanceId: string; approved: boolean;
  }>;
};
