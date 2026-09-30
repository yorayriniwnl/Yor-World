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
};

export class CameraDirector {
  public camera: THREE.PerspectiveCamera;
  public currentPreset: CameraPreset = "home-desktop";
  public reducedMotion: boolean = false;
  private currentTarget: THREE.Vector3 = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera, initialPreset: CameraPreset = "home-desktop") {
    this.camera = camera;
    this.setPreset(initialPreset, true);
  }

  public setReducedMotion(enabled: boolean) {
    this.reducedMotion = enabled;
  }

  public setPreset(preset: CameraPreset, immediate: boolean = false) {
    const config = CAMERA_PRESETS[preset];
    if (!config) throw new Error(`Unknown camera preset: ${preset}`);

    this.currentPreset = preset;
    const targetVec = new THREE.Vector3(...config.target);

    // With reducedMotion active, transitions are ALWAYS immediate (no cinematic travel)
    if (this.reducedMotion || immediate) {
      this.camera.position.set(...config.position);
      this.camera.fov = config.fov;
      this.currentTarget.copy(targetVec);
      this.camera.lookAt(targetVec);
      this.camera.updateProjectionMatrix();
    } else {
      // Direct positioning per proof specification
      this.camera.position.set(...config.position);
      this.camera.fov = config.fov;
      this.currentTarget.copy(targetVec);
      this.camera.lookAt(targetVec);
      this.camera.updateProjectionMatrix();
    }
  }

  public resize(width: number, height: number) {
    if (width <= 0 || height <= 0) return;
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
    };
  }
}
