import * as THREE from "three";
import type { CameraConfig, CameraPreset } from "./types";

export const CAMERA_PRESETS: Record<CameraPreset, CameraConfig> = {
  "home-desktop": {
    position: [-2.15, 1.7, 1.55],
    target: [0.12, 1.25, -1.15],
    fov: 60,
  },
  "home-mobile": {
    position: [-1.25, 1.48, 1.15],
    target: [0.16, 1.08, -0.95],
    fov: 52,
  },
  monitor: {
    position: [0.0, 1.08, -0.5],
    target: [0.0, 1.08, -1.35],
    fov: 50,
  },
  "reverse-doorway": {
    position: [0.2, 1.25, -1.0],
    target: [-1.2, 1.1, 1.8],
    fov: 56,
  },
  hallway: {
    position: [-2.15, 1.7, 3.2],
    target: [0.12, 1.25, -1.15],
    fov: 60,
  },
  entry: {
    position: [-2.15, 1.7, 2.5],
    target: [0.12, 1.25, -1.15],
    fov: 60,
  },
};

const safeRaf = (cb: (time: number) => void): number => {
  if (typeof requestAnimationFrame !== "undefined") {
    return requestAnimationFrame(cb);
  }
  return setTimeout(() => cb(performance.now()), 16) as unknown as number;
};

const safeCancelRaf = (handle: number | null): void => {
  if (handle === null) return;
  if (typeof cancelAnimationFrame !== "undefined") {
    cancelAnimationFrame(handle);
  } else {
    clearTimeout(handle as unknown as ReturnType<typeof setTimeout>);
  }
};

export class CameraDirector {
  public readonly ownerId: string;
  public camera: THREE.PerspectiveCamera;
  public currentPreset: CameraPreset = "home-desktop";
  public reducedMotion: boolean = false;
  private currentTarget: THREE.Vector3 = new THREE.Vector3();
  private activeTransitionAbort: AbortController | null = null;
  private transitionRafId: number | null = null;
  private isDisposed: boolean = false;

  constructor(camera: THREE.PerspectiveCamera, initialPreset?: CameraPreset, ownerId: string = "primary-camera-director") {
    this.ownerId = ownerId;
    this.camera = camera;
    const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
    const preset = initialPreset ?? (isMobile ? "home-mobile" : "home-desktop");
    this.setPreset(preset, true);
  }

  public getOwnerId(): string {
    return this.ownerId;
  }

  public setReducedMotion(enabled: boolean) {
    this.reducedMotion = enabled;
  }

  public setPreset(preset: CameraPreset, immediate: boolean = false) {
    const config = CAMERA_PRESETS[preset];
    if (!config) throw new Error(`Unknown camera preset: ${preset}`);

    this.currentPreset = preset;
    const targetVec = new THREE.Vector3(...config.target);

    if (this.reducedMotion || immediate) {
      this.camera.position.set(...config.position);
      this.camera.fov = config.fov;
      this.currentTarget.copy(targetVec);
      this.camera.lookAt(targetVec);
      this.camera.updateProjectionMatrix();
    } else {
      this.camera.position.set(...config.position);
      this.camera.fov = config.fov;
      this.currentTarget.copy(targetVec);
      this.camera.lookAt(targetVec);
      this.camera.updateProjectionMatrix();
    }
  }

  public setDirect(pos: [number, number, number], target: [number, number, number], fov: number) {
    this.camera.position.set(...pos);
    this.currentTarget.set(...target);
    this.camera.fov = fov;
    this.camera.lookAt(this.currentTarget);
    this.camera.updateProjectionMatrix();
  }

  public async transitionTo(
    preset: CameraPreset,
    signal?: AbortSignal,
    durationMs: number = 600
  ): Promise<void> {
    if (this.isDisposed) return;

    const config = CAMERA_PRESETS[preset];
    if (!config) throw new Error(`Unknown camera preset: ${preset}`);

    this.currentPreset = preset;

    // If reduced motion is active, transition is ALWAYS instantaneous
    if (this.reducedMotion || durationMs <= 0) {
      this.setPreset(preset, true);
      return;
    }

    // Cancel any ongoing transition
    safeCancelRaf(this.transitionRafId);
    this.transitionRafId = null;
    if (this.activeTransitionAbort) {
      this.activeTransitionAbort.abort();
      this.activeTransitionAbort = null;
    }

    const localAbort = new AbortController();
    this.activeTransitionAbort = localAbort;

    const startPos = this.camera.position.clone();
    const endPos = new THREE.Vector3(...config.position);
    const startTarget = this.currentTarget.clone();
    const endTarget = new THREE.Vector3(...config.target);
    const startFov = this.camera.fov;
    const endFov = config.fov;

    const startTime = performance.now();

    return new Promise<void>((resolve) => {
      const step = (now: number) => {
        if (this.isDisposed || signal?.aborted || localAbort.signal.aborted) {
          // Instantly settle to target
          this.setPreset(preset, true);
          resolve();
          return;
        }

        const elapsed = now - startTime;
        const rawProgress = Math.min(elapsed / durationMs, 1.0);
        // Smooth cubic ease in-out
        const ease = rawProgress < 0.5
          ? 4 * rawProgress * rawProgress * rawProgress
          : 1 - Math.pow(-2 * rawProgress + 2, 3) / 2;

        this.camera.position.lerpVectors(startPos, endPos, ease);
        this.currentTarget.lerpVectors(startTarget, endTarget, ease);
        this.camera.fov = startFov + (endFov - startFov) * ease;
        this.camera.lookAt(this.currentTarget);
        this.camera.updateProjectionMatrix();

        if (rawProgress >= 1.0) {
          this.setPreset(preset, true);
          if (this.activeTransitionAbort === localAbort) {
            this.activeTransitionAbort = null;
          }
          resolve();
        } else {
          this.transitionRafId = safeRaf(step);
        }
      };

      this.transitionRafId = safeRaf(step);
    });
  }

  public settleHome(isMobile: boolean = false) {
    safeCancelRaf(this.transitionRafId);
    this.transitionRafId = null;
    if (this.activeTransitionAbort) {
      this.activeTransitionAbort.abort();
      this.activeTransitionAbort = null;
    }
    const preset: CameraPreset = isMobile ? "home-mobile" : "home-desktop";
    this.setPreset(preset, true);
  }

  public resize(width: number, height: number) {
    if (width <= 0 || height <= 0 || this.isDisposed) return;
    this.camera.aspect = width / height;

    const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
    if (isMobile && this.currentPreset === "home-desktop") {
      this.setPreset("home-mobile", true);
    } else if (!isMobile && this.currentPreset === "home-mobile") {
      this.setPreset("home-desktop", true);
    } else {
      this.camera.updateProjectionMatrix();
    }
  }

  public getDiagnostics() {
    return {
      preset: this.currentPreset,
      position: this.camera.position.toArray() as [number, number, number],
      target: this.currentTarget.toArray() as [number, number, number],
      fov: this.camera.fov,
      aspect: this.camera.aspect,
      reducedMotion: this.reducedMotion,
      ownerId: this.ownerId,
    };
  }

  public dispose() {
    this.isDisposed = true;
    safeCancelRaf(this.transitionRafId);
    this.transitionRafId = null;
    if (this.activeTransitionAbort) {
      this.activeTransitionAbort.abort();
      this.activeTransitionAbort = null;
    }
  }
}
