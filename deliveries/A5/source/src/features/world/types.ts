export type CameraPreset = "home-desktop" | "home-mobile" | "monitor" | "reverse-doorway";

export type CharacterState =
  | "coding"
  | "notice"
  | "turn"
  | "nod"
  | "return"
  | "canceled"
  | "settled";

export interface Diagnostics {
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
}

export interface CameraConfig {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}
