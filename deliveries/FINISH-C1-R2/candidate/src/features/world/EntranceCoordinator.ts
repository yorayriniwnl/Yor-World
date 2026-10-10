import * as THREE from "three";
import { CameraDirector, CAMERA_PRESETS } from "./CameraDirector";
import { CharacterDirector } from "./CharacterDirector";
import type { EntranceDiagnostics } from "./types";

export interface EntranceOptions {
  sessionToken: number;
  isMobile?: boolean | undefined;
  reducedMotion?: boolean | undefined;
  signal?: AbortSignal | undefined;
  durationSec?: number | undefined;
  onPhaseChange?: ((phase: EntranceDiagnostics["phase"], progress: number) => void) | undefined;
}

/** Pass through the production doorway before moving toward HOME. */
export function entrancePositionAt(progress: number, isMobile = false): THREE.Vector3 {
  const travel = Math.max(0, Math.min(progress, 1));
  const hallway = new THREE.Vector3(...CAMERA_PRESETS.hallway.position);
  const doorway = new THREE.Vector3(-1.2, 1.7, 1.5);
  const home = new THREE.Vector3(...CAMERA_PRESETS[isMobile ? "home-mobile" : "home-desktop"].position);
  return travel <= 0.65
    ? hallway.lerp(doorway, travel / 0.65)
    : doorway.lerp(home, (travel - 0.65) / 0.35);
}

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

export class EntranceCoordinator {
  public readonly ownerId: string;
  private cameraDirector: CameraDirector;
  private characterDirector: CharacterDirector;
  private activeEntranceId: number | null = null;
  private activePromise: Promise<void> | null = null;
  private activeResolve: (() => void) | null = null;
  private activeAbortController: AbortController | null = null;
  private rafId: number | null = null;
  private entranceCounter: number = 0;
  private isDisposed: boolean = false;

  private currentDiagnostics: EntranceDiagnostics = {
    phase: "not_started",
    progress: 0,
    elapsedSec: 0,
    durationSec: 5.0,
    active: false,
    skipped: false,
  };

  constructor(
    cameraDirector: CameraDirector,
    characterDirector: CharacterDirector,
    ownerId: string = "primary-entrance-coordinator"
  ) {
    this.ownerId = ownerId;
    this.cameraDirector = cameraDirector;
    this.characterDirector = characterDirector;
  }

  public getOwnerId(): string {
    return this.ownerId;
  }

  public isRunning(): boolean {
    return this.activeEntranceId !== null;
  }

  public getDiagnostics(): EntranceDiagnostics {
    return { ...this.currentDiagnostics };
  }

  public playEntrance(options: EntranceOptions): Promise<void> {
    if (this.isDisposed) return Promise.resolve();

    // Invariant: Only one active entrance exists at any time
    if (this.activePromise !== null) {
      console.warn("[EntranceCoordinator] Entrance already running; returning active entrance promise.");
      return this.activePromise;
    }

    const {
      isMobile = false,
      reducedMotion = false,
      signal,
      durationSec = 5.0,
      onPhaseChange,
    } = options;

    // Bounded duration: must never exceed 8 seconds
    const boundedDurationSec = Math.min(Math.max(durationSec, 1.0), 8.0);
    const entranceId = ++this.entranceCounter;
    this.activeEntranceId = entranceId;

    const localAbort = new AbortController();
    this.activeAbortController = localAbort;

    // Immediate bypass if reduced motion is active
    if (reducedMotion) {
      this.currentDiagnostics = {
        phase: "settled",
        progress: 1.0,
        elapsedSec: 0,
        durationSec: 0,
        active: false,
        skipped: false,
      };
      this.cameraDirector.settleHome(isMobile);
      this.characterDirector.settleToWork();
      this.activeEntranceId = null;
      this.activePromise = null;
      if (onPhaseChange) onPhaseChange("settled", 1.0);
      return Promise.resolve();
    }

    const hallwayConfig = CAMERA_PRESETS.hallway;
    const hallwayPos = new THREE.Vector3(...hallwayConfig.position);
    const homeConfig = CAMERA_PRESETS[isMobile ? "home-mobile" : "home-desktop"];
    const homeTarget = new THREE.Vector3(...homeConfig.target);
    const hallwayTarget = new THREE.Vector3(...hallwayConfig.target);

    // Initial setup at doorway
    this.cameraDirector.setDirect(hallwayPos.toArray() as [number, number, number], hallwayTarget.toArray() as [number, number, number], 60);
    this.characterDirector.settleToWork();

    this.currentDiagnostics = {
      phase: "hallway",
      progress: 0,
      elapsedSec: 0,
      durationSec: boundedDurationSec,
      active: true,
      skipped: false,
    };
    if (onPhaseChange) onPhaseChange("hallway", 0);

    const startTime = performance.now();
    const durationMs = boundedDurationSec * 1000;

    const promise = new Promise<void>((resolve) => {
      this.activeResolve = resolve;
      const step = (now: number) => {
        // Guard against obsolete session, disposal, or cancellation
        if (
          this.isDisposed ||
          this.activeEntranceId !== entranceId ||
          signal?.aborted ||
          localAbort.signal.aborted
        ) {
          this.cleanupActive(entranceId);
          return;
        }

        const elapsedMs = now - startTime;
        const progress = Math.min(elapsedMs / durationMs, 1.0);
        const elapsedSec = elapsedMs / 1000;

        let phase: EntranceDiagnostics["phase"] = "hallway";
        if (progress > 0.15 && progress < 0.75) {
          phase = "travel";
        } else if (progress >= 0.75 && progress < 1.0) {
          phase = "reveal";
        } else if (progress >= 1.0) {
          phase = "settled";
        }

        this.currentDiagnostics = {
          phase,
          progress,
          elapsedSec,
          durationSec: boundedDurationSec,
          active: progress < 1.0,
          skipped: false,
        };

        if (onPhaseChange) onPhaseChange(phase, progress);

        // Smooth camera interpolation along entrance trajectory
        const ease = progress < 0.5
          ? 2 * progress * progress
          : -1 + (4 - 2 * progress) * progress; // Smooth quadratic ease in-out

        const curPos = entrancePositionAt(ease, isMobile);
        const curTarget = new THREE.Vector3().lerpVectors(hallwayTarget, homeTarget, ease);
        const curFov = 60 + (homeConfig.fov - 60) * ease;

        this.cameraDirector.setDirect(
          curPos.toArray() as [number, number, number],
          curTarget.toArray() as [number, number, number],
          curFov
        );

        if (progress >= 1.0) {
          this.cameraDirector.settleHome(isMobile);
          this.characterDirector.settleToWork();
          this.cleanupActive(entranceId);
        } else {
          this.rafId = safeRaf(step);
        }
      };

      this.rafId = safeRaf(step);
    });

    this.activePromise = promise;
    return promise;
  }

  public skip(isMobile: boolean = false): void {
    safeCancelRaf(this.rafId);
    this.rafId = null;
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
    this.currentDiagnostics = {
      ...this.currentDiagnostics,
      phase: "settled",
      progress: 1.0,
      active: false,
      skipped: true,
    };
    this.cameraDirector.settleHome(isMobile);
    this.characterDirector.settleToWork();
    if (this.activeResolve) {
      const res = this.activeResolve;
      this.activeResolve = null;
      res();
    }
    this.activeEntranceId = null;
    this.activePromise = null;
  }

  private cleanupActive(entranceId: number) {
    safeCancelRaf(this.rafId);
    this.rafId = null;
    if (this.activeResolve) {
      const res = this.activeResolve;
      this.activeResolve = null;
      res();
    }
    if (this.activeEntranceId === entranceId) {
      this.activeEntranceId = null;
      this.activePromise = null;
      this.activeAbortController = null;
    }
  }

  public dispose(): void {
    this.isDisposed = true;
    safeCancelRaf(this.rafId);
    this.rafId = null;
    this.skip();
  }
}
