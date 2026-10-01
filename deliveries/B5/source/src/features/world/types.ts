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
  | "entry";

export type CharacterState =
  | "coding"
  | "notice"
  | "turn"
  | "nod"
  | "return"
  | "canceled"
  | "settled";

export interface LoadingProgress {
  stage: string;
  progress: number; // 0.0 to 1.0
  requiredLoaded: number;
  requiredTotal: number;
  optionalLoaded: number;
  optionalTotal: number;
  retryCount: number;
  maxRetries: number;
  failedAsset?: string | undefined;
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
}

export interface Diagnostics {
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
}

export interface CameraConfig {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}
