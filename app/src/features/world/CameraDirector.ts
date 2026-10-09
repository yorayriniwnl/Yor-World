import * as THREE from "three";
import type { CameraConfig, CameraPreset } from "./types";

export const CAMERA_PRESETS: Record<CameraPreset, CameraConfig> = {
  "home-desktop": {
    // The frozen production room's left wall occupies x=-2.20..-2.10.
    // C3's blockout camera at -2.15 was inside that wall.
    position: [-1.9, 1.7, 1.55],
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
    position: [-1.2, 1.7, 2.65],
    target: [0.12, 1.25, -1.15],
    fov: 60,
  },
  entry: {
    position: [-1.2, 1.7, 2.5],
    target: [0.12, 1.25, -1.15],
    fov: 60,
  },
  pc: {
    position: [0.8, 1.15, -0.6],
    target: [0.95, 1.0, -1.2],
    fov: 48,
  },
  energy: {
    position: [-0.6, 1.1, -0.6],
    target: [-0.75, 0.95, -1.15],
    fov: 48,
  },
  scanner: {
    position: [-1.1, 1.35, -0.8],
    target: [-0.9, 1.25, -1.2],
    fov: 48,
  },
  microphone: {
    position: [0.2, 1.15, -0.6],
    target: [0.25, 0.95, -0.9],
    fov: 48,
  },
  about: {
    position: [-0.5, 1.4, -0.2],
    target: [-0.2, 1.5, -1.75],
    fov: 52,
  },
  contact: {
    position: [-0.3, 1.05, -0.7],
    target: [-0.35, 0.8, -1.1],
    fov: 48,
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
  private finishTransition: ((settle: boolean) => void) | null = null;
  private transitionRafId: number | null = null;
  private isDisposed: boolean = false;

  constructor(camera: THREE.PerspectiveCamera, initialPreset?: CameraPreset, ownerId: string = "primary-camera-director") {
    this.ownerId = ownerId;
    this.camera = camera;
    const preset = initialPreset ?? "home-desktop";
    this.setPreset(preset, true);
  }

  public getOwnerId(): string {
    return this.ownerId;
  }

  public getCurrentPreset(): CameraPreset {
    return this.currentPreset;
  }

  public setCameraPreset(preset: CameraPreset | string, immediate: boolean = false) {
    this.setPreset(preset, immediate);
  }

  public setReducedMotion(enabled: boolean) {
    this.reducedMotion = enabled;
    if (enabled) this.finishTransition?.(true);
  }

  private configFor(preset: CameraPreset | string): CameraConfig {
    const config = CAMERA_PRESETS[preset as CameraPreset] ?? CAMERA_PRESETS["home-desktop"];
    if (!String(preset).startsWith("home-")) return config;
    // Preserve vertical composition on wide stages; portrait stages need enough
    // horizontal field of view for the workstation and chair rather than clipping.
    const minHorizontal = THREE.MathUtils.degToRad(62);
    const fittedFov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(minHorizontal / 2) / Math.max(this.camera.aspect, 0.25)));
    return { ...config, fov: Math.min(100, Math.max(config.fov, fittedFov)) };
  }

  public setPreset(preset: CameraPreset | string, immediate: boolean = false) {
    if (this.isDisposed) return;
    this.finishTransition?.(false);
    const config = this.configFor(preset);

    this.currentPreset = preset as CameraPreset;
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
    if (this.isDisposed) return;
    this.finishTransition?.(false);
    this.camera.position.set(...pos);
    this.currentTarget.set(...target);
    this.camera.fov = fov;
    this.camera.lookAt(this.currentTarget);
    this.camera.updateProjectionMatrix();
  }

  public async transitionTo(
    preset: CameraPreset | string,
    signalOrDuration?: AbortSignal | number,
    durationMsParam: number = 600
  ): Promise<void> {
    if (this.isDisposed) return;

    let signal: AbortSignal | undefined;
    let durationMs = durationMsParam;
    if (typeof signalOrDuration === "number") {
      durationMs = signalOrDuration > 10 ? signalOrDuration : signalOrDuration * 1000;
    } else if (signalOrDuration) {
      signal = signalOrDuration as AbortSignal;
    }

    if (signal?.aborted) return;
    const config = this.configFor(preset);

    this.currentPreset = preset as CameraPreset;

    // If reduced motion is active, transition is ALWAYS instantaneous
    if (this.reducedMotion || durationMs <= 0) {
      this.setPreset(preset, true);
      return;
    }

    // Resolve superseded promises immediately, even when their RAF never runs.
    this.finishTransition?.(false);

    const startPos = this.camera.position.clone();
    const endPos = new THREE.Vector3(...config.position);
    const startTarget = this.currentTarget.clone();
    const endTarget = new THREE.Vector3(...config.target);
    const startFov = this.camera.fov;
    const endFov = config.fov;

    const startTime = performance.now();

    return new Promise<void>((resolve) => {
      let finished = false;
      const abort = () => finish(true);
      const finish = (settle: boolean) => {
        if (finished) return;
        finished = true;
        safeCancelRaf(this.transitionRafId);
        this.transitionRafId = null;
        signal?.removeEventListener("abort", abort);
        if (this.finishTransition === finish) this.finishTransition = null;
        if (settle && !this.isDisposed) this.setPreset(preset, true);
        resolve();
      };
      this.finishTransition = finish;
      signal?.addEventListener("abort", abort, { once: true });
      const step = (now: number) => {
        if (finished) return;
        if (this.isDisposed || signal?.aborted) { finish(!this.isDisposed); return; }

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
          finish(true);
        } else {
          this.transitionRafId = safeRaf(step);
        }
      };

      this.transitionRafId = safeRaf(step);
    });
  }

  public settleHome(isMobile: boolean = false) {
    this.finishTransition?.(false);
    const preset: CameraPreset = isMobile ? "home-mobile" : "home-desktop";
    this.setPreset(preset, true);
  }

  public resize(width: number, height: number) {
    if (width <= 0 || height <= 0 || this.isDisposed) return;
    this.camera.aspect = width / height;

    const isMobile = width < 640;
    if (isMobile && this.currentPreset === "home-desktop") {
      this.setPreset("home-mobile", true);
    } else if (!isMobile && this.currentPreset === "home-mobile") {
      this.setPreset("home-desktop", true);
    } else {
      if (this.currentPreset.startsWith("home-")) this.setPreset(this.currentPreset, true);
      else this.camera.updateProjectionMatrix();
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
    this.finishTransition?.(false);
  }
}
