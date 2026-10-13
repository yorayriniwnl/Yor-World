import type { ExperienceIntent } from "../../contracts/experience";

export type InteractionCategory =
  | "resident"
  | "monitor"
  | "project"
  | "environment"
  | "decorative"
  | "navigation";

export interface InteractiveCatalogEntry {
  readonly id: string;
  readonly label: string;
  readonly category: InteractionCategory;
  readonly accessibleControlLabel: string;
  readonly accessibleControlType: "button" | "switch" | "link";
  readonly cameraPreset: string | null;
  readonly cooldownMs: number;
  readonly reducedMotionBehavior: string;
  readonly destinationRoute: string | null;
  readonly createIntent: () => ExperienceIntent;
}

export const FROZEN_V1_CATALOG: ReadonlyArray<InteractiveCatalogEntry> = Object.freeze([
  {
    id: "entrance-door",
    label: "Entrance Door",
    category: "navigation",
    accessibleControlLabel: "Enter Studio / Replay Entrance",
    accessibleControlType: "button",
    cameraPreset: "entry",
    cooldownMs: 0,
    reducedMotionBehavior: "Direct settle to home-desktop without camera travel",
    destinationRoute: null,
    createIntent: (): ExperienceIntent => ({ type: "ENTER", replay: false }),
  },
  {
    id: "resident",
    label: "Creator Avatar",
    category: "resident",
    accessibleControlLabel: "Greet the creator",
    accessibleControlType: "button",
    cameraPreset: null,
    cooldownMs: 7000,
    reducedMotionBehavior: "Brief acknowledgment nod without heavy yaw rotation",
    destinationRoute: null,
    createIntent: (): ExperienceIntent => ({ type: "GREET" }),
  },
  {
    id: "wall-painting",
    label: "Wall Painting",
    category: "decorative",
    accessibleControlLabel: "Inspect wall painting & reveal room detail",
    accessibleControlType: "button",
    cameraPreset: null,
    cooldownMs: 250,
    reducedMotionBehavior: "Instant subtle border response; reveal secret mark without tilt animation",
    destinationRoute: null,
    createIntent: (): ExperienceIntent => ({ type: "OPEN_PANEL", panel: "room-controls" }),
  },
  {
    id: "main-monitor",
    label: "Main Workstation Monitor",
    category: "monitor",
    accessibleControlLabel: "Open studio project launcher",
    accessibleControlType: "button",
    cameraPreset: "monitor",
    cooldownMs: 0,
    reducedMotionBehavior: "Instantly open launcher panel without camera approach",
    destinationRoute: null,
    createIntent: (): ExperienceIntent => ({ type: "OPEN_PANEL", panel: "launcher" }),
  },
  {
    id: "candidatex-launcher",
    label: "CandidateX Project Display",
    category: "project",
    accessibleControlLabel: "Open CandidateX case study",
    accessibleControlType: "link",
    cameraPreset: "monitor",
    cooldownMs: 0,
    reducedMotionBehavior: "Direct navigation to /projects/candidatex",
    destinationRoute: "/projects/candidatex",
    createIntent: (): ExperienceIntent => ({ type: "OPEN_PROJECT", projectId: "candidatex", source: "room" }),
  },
  {
    id: "helios-pc",
    label: "Helios Custom PC Rig",
    category: "project",
    accessibleControlLabel: "Open Helios case study",
    accessibleControlType: "link",
    cameraPreset: "pc",
    cooldownMs: 0,
    reducedMotionBehavior: "Direct navigation to /projects/helios",
    destinationRoute: "/projects/helios",
    createIntent: (): ExperienceIntent => ({ type: "OPEN_PROJECT", projectId: "helios", source: "room" }),
  },
  {
    id: "zenith-model",
    label: "Zenith Energy Architecture Model",
    category: "project",
    accessibleControlLabel: "Open Zenith case study",
    accessibleControlType: "link",
    cameraPreset: "energy",
    cooldownMs: 0,
    reducedMotionBehavior: "Direct navigation to /projects/zenith",
    destinationRoute: "/projects/zenith",
    createIntent: (): ExperienceIntent => ({ type: "OPEN_PROJECT", projectId: "zenith", source: "room" }),
  },
  {
    id: "ai-real-camera",
    label: "AI Scanner Camera Rig",
    category: "project",
    accessibleControlLabel: "Open AI Scanner case study",
    accessibleControlType: "link",
    cameraPreset: "scanner",
    cooldownMs: 0,
    reducedMotionBehavior: "Direct navigation to /projects/ai-camera",
    destinationRoute: "/projects/ai-camera",
    createIntent: (): ExperienceIntent => ({ type: "OPEN_PROJECT", projectId: "ai-vs-real", source: "room" }),
  },
  {
    id: "talks-microphone",
    label: "Broadcast Microphone",
    category: "project",
    accessibleControlLabel: "Open Yor Talks case study",
    accessibleControlType: "link",
    cameraPreset: "microphone",
    cooldownMs: 0,
    reducedMotionBehavior: "Direct navigation to /projects/yor-talks",
    destinationRoute: "/projects/yor-talks",
    createIntent: (): ExperienceIntent => ({ type: "OPEN_PROJECT", projectId: "talks", source: "room" }),
  },
  {
    id: "desk-lamp",
    label: "Desk Task Lamp",
    category: "environment",
    accessibleControlLabel: "Toggle desk lamp",
    accessibleControlType: "switch",
    cameraPreset: null,
    cooldownMs: 0,
    reducedMotionBehavior: "Instant toggle without 250ms ease",
    destinationRoute: null,
    createIntent: (): ExperienceIntent => ({ type: "SET_LAMP", enabled: false }),
  },
  {
    id: "window-blinds",
    label: "Window Studio Blinds",
    category: "environment",
    accessibleControlLabel: "Toggle window blinds",
    accessibleControlType: "switch",
    cameraPreset: null,
    cooldownMs: 0,
    reducedMotionBehavior: "Instant toggle without 250ms ease",
    destinationRoute: null,
    createIntent: (): ExperienceIntent => ({ type: "SET_BLINDS", open: false }),
  },
  {
    id: "desk-clock",
    label: "Asia/Kolkata Desk Clock",
    category: "environment",
    accessibleControlLabel: "Toggle 12h / 24h clock format",
    accessibleControlType: "switch",
    cameraPreset: null,
    cooldownMs: 0,
    reducedMotionBehavior: "Format toggle unchanged",
    destinationRoute: null,
    createIntent: (): ExperienceIntent => ({ type: "SET_CLOCK_FORMAT", clock24h: false }),
  },
  {
    id: "plant-leaves",
    label: "Potted Desk Plant",
    category: "decorative",
    accessibleControlLabel: "Nudge plant leaves",
    accessibleControlType: "button",
    cameraPreset: null,
    cooldownMs: 500,
    reducedMotionBehavior: "Immediate settle without swaying motion",
    destinationRoute: null,
    createIntent: (): ExperienceIntent => ({ type: "SET_PAUSED", paused: false }),
  },
  {
    id: "keyboard",
    label: "Mechanical Keyboard",
    category: "monitor",
    accessibleControlLabel: "Focus monitor via keyboard",
    accessibleControlType: "button",
    cameraPreset: "monitor",
    cooldownMs: 0,
    reducedMotionBehavior: "Directly open launcher panel",
    destinationRoute: null,
    createIntent: (): ExperienceIntent => ({ type: "OPEN_PANEL", panel: "launcher" }),
  },
  {
    id: "mouse",
    label: "Ergonomic Desk Mouse",
    category: "monitor",
    accessibleControlLabel: "Focus monitor via mouse",
    accessibleControlType: "button",
    cameraPreset: "monitor",
    cooldownMs: 0,
    reducedMotionBehavior: "Directly open launcher panel",
    destinationRoute: null,
    createIntent: (): ExperienceIntent => ({ type: "OPEN_PANEL", panel: "launcher" }),
  },
  {
    id: "chair",
    label: "Blue Ergonomic Swivel Chair",
    category: "resident",
    accessibleControlLabel: "Adjust chair posture",
    accessibleControlType: "button",
    cameraPreset: null,
    cooldownMs: 5000,
    reducedMotionBehavior: "Instant subtle adjustment without yaw swing",
    destinationRoute: null,
    createIntent: (): ExperienceIntent => ({ type: "GREET" }),
  },
  {
    id: "door-inside",
    label: "Studio Exit Door (Interior)",
    category: "navigation",
    accessibleControlLabel: "Return to Static Portfolio / Replay Entrance",
    accessibleControlType: "button",
    cameraPreset: null,
    cooldownMs: 0,
    reducedMotionBehavior: "Directly return to static portfolio",
    destinationRoute: "/",
    createIntent: (): ExperienceIntent => ({ type: "OPEN_PANEL", panel: "replay" }),
  },
  {
    id: "speakers",
    label: "Studio Audio Monitors",
    category: "environment",
    accessibleControlLabel: "Toggle studio sound effects",
    accessibleControlType: "switch",
    cameraPreset: null,
    cooldownMs: 0,
    reducedMotionBehavior: "Toggle audio setting without sound cue",
    destinationRoute: null,
    createIntent: (): ExperienceIntent => ({ type: "SET_SOUND", enabled: true }),
  },
  {
    id: "skills-board",
    label: "Pegboard Skills Reference",
    category: "navigation",
    accessibleControlLabel: "View verified skill catalog",
    accessibleControlType: "link",
    cameraPreset: "about",
    cooldownMs: 0,
    reducedMotionBehavior: "Direct link to /about#skills",
    destinationRoute: "/about#skills",
    createIntent: (): ExperienceIntent => ({ type: "NAVIGATE", path: "/about#skills", source: "room", camera: "about" }),
  },
  {
    id: "research-books",
    label: "Research Library Bookshelf",
    category: "navigation",
    accessibleControlLabel: "View published research",
    accessibleControlType: "link",
    cameraPreset: null,
    cooldownMs: 0,
    reducedMotionBehavior: "Direct link to /about#research",
    destinationRoute: "/about#research",
    createIntent: (): ExperienceIntent => ({ type: "NAVIGATE", path: "/about#research", source: "room", camera: null }),
  },
  {
    id: "contact-phone",
    label: "Desk Smartphone (Contact)",
    category: "navigation",
    accessibleControlLabel: "Open contact channel",
    accessibleControlType: "link",
    cameraPreset: "contact",
    cooldownMs: 0,
    reducedMotionBehavior: "Direct link to /contact",
    destinationRoute: "/contact",
    createIntent: (): ExperienceIntent => ({ type: "NAVIGATE", path: "/contact", source: "room", camera: "contact" }),
  },
]);

export class InteractionRegistry {
  private entries = new Map<string, InteractiveCatalogEntry>();

  constructor() {
    for (const entry of FROZEN_V1_CATALOG) {
      this.entries.set(entry.id, entry);
    }
  }

  public get(id: string): InteractiveCatalogEntry | undefined {
    return this.entries.get(id);
  }

  public getAll(): ReadonlyArray<InteractiveCatalogEntry> {
    return FROZEN_V1_CATALOG;
  }

  public getAccessibleControls(): ReadonlyArray<InteractiveCatalogEntry> {
    return FROZEN_V1_CATALOG;
  }
}
