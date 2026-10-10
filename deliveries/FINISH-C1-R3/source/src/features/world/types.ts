import type { AssetSessionId } from "./asset-resources";

export type WorldLifecycleState =
  | "STATIC"
  | "ENTRY_REQUESTED"
  | "LOADING"
  | "ENTRANCE"
  | "HOME"
  | "TRANSITION"
  | "FAILURE"
  | "DISPOSING";

export type CameraPreset =
  | "home-desktop"
  | "home-mobile"
  | "monitor"
  | "reverse-doorway"
  | "hallway"
  | "entry"
  | "pc"
  | "energy"
  | "scanner"
  | "microphone"
  | "about"
  | "contact";

export type CharacterState =
  | "coding"
  | "notice"
  | "turn"
  | "nod"
  | "return"
  | "canceled"
  | "settled";

export type ByteProgress =
  | { kind: "indeterminate"; reason: string }
  | { kind: "determinate"; scope: "required-session"; loaded: number; total: number };

export type RequiredProgressActivity =
  | { kind: "required-bytes"; assetId: "room" | "resident" | "fixture"; loaded: number }
  | { kind: "required-stage"; id: "decode:room" | "decode:resident" | "decode:fixture" | "integration" };

export interface LoadingProgress {
  session: AssetSessionId;
  stage: string;
  /** Present only when the complete required-session representation is trusted. */
  progress?: number | undefined;
  bytes: ByteProgress;
  requiredLoaded: number;
  requiredTotal: number;
  optionalLoaded: number;
  optionalTotal: number;
  retryCount: number;
  maxRetries: number;
  attempt?: 1 | 2 | 3 | undefined;
  failedAsset?: string | undefined;
  activity?: RequiredProgressActivity | undefined;
  bytesLoaded?: number | undefined;
  bytesTotal?: number | undefined;
}

export interface EntranceDiagnostics {
  phase: "not_started" | "hallway" | "travel" | "reveal" | "settled";
  progress: number; // 0.0 to 1.0
  elapsedSec: number;
  durationSec: number;
  active: boolean;
  skipped: boolean;
}

export interface SingleOwnersDiagnostics {
  rendererOwner: string;
  cameraOwner: string;
  transitionOwner: string;
  characterActionOwner: string;
  assetLoadingSessionOwner: string;
  activeSessionToken: number;
  activeSessionGeneration?: number | undefined;
}

export interface Diagnostics {
  renderedFrames?: number | undefined;
  lastRenderedAt?: number | undefined;
  renderCalls?: number | undefined;
  renderedTriangles?: number | undefined;
  renderPixelRatio?: number | undefined;
  interactions?: { boundProductionTargets: number; frozenHitProxyCount: number; lastActivatedId: string | null } | undefined;
  lifecycleState: WorldLifecycleState;
  residentCount: number;
  chairCount: number;
  movingChairCount: number;
  deskCount: number;
  fixtureStaticDiscarded: boolean;
  residentPosition: [number, number, number];
  chairPosition: [number, number, number];
  chairYawDeg: number;
  bodyYawDeg: number;
  activeClip: string;
  currentTime: number;
  cameraPreset: CameraPreset;
  cameraPosition: [number, number, number];
  cameraFov: number;
  soundEnabled: boolean;
  reducedMotion: boolean;
  webglRenderer: string;
  mode: string;
  loadingProgress?: LoadingProgress | undefined;
  entrance?: EntranceDiagnostics | undefined;
  singleOwners?: SingleOwnersDiagnostics | undefined;
  canvasCount?: number | undefined;
  experienceSnapshot?: import("../../contracts/experience").ExperienceSnapshot | undefined;
  qualityTier?: import("../../contracts/experience").QualityTier | undefined;
}

export const WORLD_RENDERED_FRAME_EVENT = "yor-world-rendered-frame";

/** Emitted only after the production renderer has rendered the integrated world. */
export interface RenderedWorldFrame {
  frame: number;
  timestamp: number;
  durationMs: number;
  qualityTier: import("../../contracts/experience").QualityTier;
  activeClip: string;
  activeClipTimeSec: number;
  characterMode: string;
  cameraPreset: CameraPreset;
  lifecycleState: WorldLifecycleState;
  optionalTextureTargets: Readonly<Partial<Record<"deskmat" | "wallpaper", readonly string[]>>>;
  renderCalls: number;
  renderedTriangles: number;
}

export interface CameraConfig {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}
