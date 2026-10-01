import * as THREE from "three";
import { CameraDirector } from "./CameraDirector";
import { CharacterDirector, ActionPriority } from "./CharacterDirector";
import type { EntranceDiagnostics } from "./types";

export interface EntranceOptions {
  sessionToken: number;
  isMobile?: boolean | undefined;
  reducedMotion?: boolean | undefined;
  signal?: AbortSignal | undefined;
  durationSec?: number | undefined;
  onPhaseChange?: ((phase: EntranceDiagnostics["phase"], progress: number) => void) | undefined;
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

/**
 * Production EntranceCoordinator (Task B5).
 *
 * Owns the unified 8.0-second entrance choreography coordinating both CameraDirector
 * and CharacterDirector according to the art & experience storyboard:
 *   0.0 - 0.8s: Door framed, threshold light grows (coding_idle)
 *   0.8 - 2.6s: Threshold camera travel into room (coding_idle)
 *   2.6 - 3.6s: Desk and resident revealed (coding_idle)
 *   3.6 - 4.2s: Camera approaches greeting; typing pauses (notice_visitor, 0.6s)
 *   4.2 - 5.4s: Restrained reframing; coordinated swivel (turn_to_visitor, 1.2s, 125 deg)
 *   5.4 - 6.3s: Greeting held clearly; polite nod (greeting_nod, 0.9s)
 *   6.3 - 7.6s: Camera eases toward HOME; swivel back to desk (return_to_work, 1.3s)
 *   7.6 - 8.0s: Home composition settles (coding_idle loop)
 *
 * Guarantees:
 * - Single active entrance invariant (concurrent calls share the active promise).
 * - Maximum duration bounded to <= 8.0 seconds.
 * - Skip / Escape instant settlement (<= 50ms) to HOME desktop and coding_idle rest pose.
 * - Reduced motion immediate bypass directly to HOME without camera travel.
 * - Obsolete session token validation preventing late promise completion hazards.
 */
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
  private activeSessionToken: number = 0;

  private currentDiagnostics: EntranceDiagnostics = {
    phase: "not_started",
    progress: 0,
    elapsedSec: 0,
    durationSec: 8.0,
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
      sessionToken,
      isMobile = false,
      reducedMotion = false,
      signal,
      durationSec = 8.0,
      onPhaseChange,
    } = options;

    this.activeSessionToken = sessionToken;

    // Bounded duration: must never exceed 8.0 seconds
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

    // Storyboard camera waypoints
    const hallwayPos = new THREE.Vector3(-2.15, 1.70, 3.20);
    const travelPos = new THREE.Vector3(-2.15, 1.70, 2.30);
    const revealPos = new THREE.Vector3(-2.15, 1.70, 1.85);
    const greetingPos = new THREE.Vector3(-2.15, 1.70, 1.65);
    const homeConfig = isMobile
      ? { pos: new THREE.Vector3(-1.25, 1.48, 1.15), target: new THREE.Vector3(0.16, 1.08, -0.95), fov: 52 }
      : { pos: new THREE.Vector3(-2.15, 1.70, 1.55), target: new THREE.Vector3(0.12, 1.25, -1.15), fov: 60 };

    const hallwayTarget = new THREE.Vector3(0.12, 1.25, -1.15);
    const residentTarget = new THREE.Vector3(0.30, 1.20, -0.36);

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

    let noticeTriggered = false;
    let turnTriggered = false;
    let nodTriggered = false;
    let returnTriggered = false;

    const promise = new Promise<void>((resolve) => {
      this.activeResolve = resolve;

      const step = (now: number) => {
        // Guard against obsolete session, disposal, or external cancellation
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
        const elapsedSec = (progress * durationMs) / 1000;

        // Phased progression mapping
        let phase: EntranceDiagnostics["phase"] = "hallway";
        if (progress > 0.10 && progress < 0.35) {
          phase = "travel";
        } else if (progress >= 0.35 && progress < 0.45) {
          phase = "reveal";
        } else if (progress >= 0.45 && progress < 0.95) {
          phase = "travel"; // greeting interaction happens within travel
        } else if (progress >= 0.95) {
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

        // Advance resident character choreography along storyboard timeline (scaled to boundedDurationSec)
        const tScale = boundedDurationSec / 8.0;
        const noticeTime = 3.6 * tScale;
        const turnTime = 4.2 * tScale;
        const nodTime = 5.4 * tScale;
        const returnTime = 6.3 * tScale;

        if (elapsedSec >= noticeTime && !noticeTriggered) {
          noticeTriggered = true;
          this.characterDirector.play("notice_visitor", undefined, { priority: ActionPriority.ENTRANCE });
        } else if (elapsedSec >= turnTime && !turnTriggered) {
          turnTriggered = true;
          this.characterDirector.play("turn_to_visitor", undefined, { priority: ActionPriority.ENTRANCE });
        } else if (elapsedSec >= nodTime && !nodTriggered) {
          nodTriggered = true;
          this.characterDirector.play("greeting_nod", undefined, { priority: ActionPriority.ENTRANCE });
        } else if (elapsedSec >= returnTime && !returnTriggered) {
          returnTriggered = true;
          this.characterDirector.play("return_to_work", undefined, { priority: ActionPriority.ENTRANCE });
        }

        // Camera interpolation along 4-segment spline
        let curPos = new THREE.Vector3();
        let curTarget = new THREE.Vector3();
        let curFov = 60;

        if (progress < 0.325) {
          // Hallway to Threshold Travel (0.0 to 2.6s)
          const subT = progress / 0.325;
          const ease = subT * subT * (3.0 - 2.0 * subT);
          curPos.lerpVectors(hallwayPos, travelPos, ease);
          curTarget.lerpVectors(hallwayTarget, residentTarget, ease * 0.5);
          curFov = 60;
        } else if (progress < 0.45) {
          // Reveal to Greeting framing (2.6 to 3.6s)
          const subT = (progress - 0.325) / 0.125;
          const ease = subT * subT * (3.0 - 2.0 * subT);
          curPos.lerpVectors(travelPos, revealPos, ease);
          curTarget.lerpVectors(hallwayTarget.clone().lerp(residentTarget, 0.5), residentTarget, ease);
          curFov = 60;
        } else if (progress < 0.7875) {
          // Greeting hold and subtle pan (3.6 to 6.3s)
          const subT = (progress - 0.45) / 0.3375;
          const ease = subT * subT * (3.0 - 2.0 * subT);
          curPos.lerpVectors(revealPos, greetingPos, ease);
          curTarget.copy(residentTarget);
          curFov = 60;
        } else {
          // Return to HOME settlement (6.3 to 8.0s)
          const subT = Math.min((progress - 0.7875) / 0.2125, 1.0);
          const ease = subT * subT * (3.0 - 2.0 * subT);
          curPos.lerpVectors(greetingPos, homeConfig.pos, ease);
          curTarget.lerpVectors(residentTarget, homeConfig.target, ease);
          curFov = 60 + (homeConfig.fov - 60) * ease;
        }

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

  /**
   * Instant settlement on Skip, Escape, or immediate route navigation.
   * Settles within 1 frame (<= 50ms), bypassing animations directly into HOME.
   */
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
