import * as THREE from "three";
import { CLIP_DURATIONS } from "./SceneIntegrator";

export interface QueueSegment {
  clip: string;
  from: number;
  to: number;
  elapsed: number;
}

export type DirectorMode = "coding" | "sequence" | "safe-return" | "settled";

export class CharacterDirector {
  private avatarMixer: THREE.AnimationMixer;
  private chairMixer: THREE.AnimationMixer;
  private avatarActions: Record<string, THREE.AnimationAction>;
  private chairActions: Record<string, THREE.AnimationAction>;
  private bodyTurn: THREE.Object3D;
  private chairRoot: THREE.Object3D;
  private restBody: THREE.Quaternion;
  private restChair: THREE.Quaternion;

  public readonly ownerId: string;
  public mode: DirectorMode = "coding";
  public currentClip: string = "";
  public currentTime: number = 0;
  public isDecorativePaused: boolean = false;
  private queue: QueueSegment[] = [];
  public revision: number = 0;
  private isDisposed: boolean = false;

  constructor(
    avatarMixer: THREE.AnimationMixer,
    chairMixer: THREE.AnimationMixer,
    avatarActions: Record<string, THREE.AnimationAction>,
    chairActions: Record<string, THREE.AnimationAction>,
    bodyTurn: THREE.Object3D,
    chairRoot: THREE.Object3D,
    ownerId: string = "primary-character-director"
  ) {
    this.ownerId = ownerId;
    this.avatarMixer = avatarMixer;
    this.chairMixer = chairMixer;
    this.avatarActions = avatarActions;
    this.chairActions = chairActions;
    this.bodyTurn = bodyTurn;
    this.chairRoot = chairRoot;

    this.restBody = bodyTurn.getWorldQuaternion(new THREE.Quaternion());
    this.restChair = chairRoot.getWorldQuaternion(new THREE.Quaternion());

    this.applyClip("coding_idle", 0);
  }

  private applyClip(clip: string, time: number) {
    const duration =
      CLIP_DURATIONS[clip] ??
      (clip === "mouse_idle"
        ? 2.0
        : clip === "attention_glance"
        ? 1.2
        : clip === "breathing_idle"
        ? 4.0
        : undefined);
    if (duration === undefined) {
      throw new Error(`Unknown animation clip: ${clip}`);
    }
    const t = THREE.MathUtils.clamp(time, 0, duration);

    // Apply to avatar
    const aAction = this.avatarActions[clip];
    if (aAction) {
      if (this.currentClip !== clip) {
        this.avatarMixer.stopAllAction();
        aAction.reset().setEffectiveWeight(1).setLoop(THREE.LoopOnce, 1).play();
        aAction.clampWhenFinished = true;
        aAction.paused = true;
      }
      aAction.time = t;
      this.avatarMixer.update(0);
    }

    // Apply to chair
    const cAction = this.chairActions[clip];
    if (cAction) {
      if (this.currentClip !== clip) {
        this.chairMixer.stopAllAction();
        cAction.reset().setEffectiveWeight(1).setLoop(THREE.LoopOnce, 1).play();
        cAction.clampWhenFinished = true;
        cAction.paused = true;
      }
      cAction.time = t;
      this.chairMixer.update(0);
    }

    this.currentClip = clip;
    this.currentTime = t;
  }

  public playGreeting(): number {
    if (this.mode === "sequence") return this.revision;
    this.revision++;
    this.queue = [
      { clip: "notice_visitor", from: 0, to: 0.6, elapsed: 0 },
      { clip: "turn_to_visitor", from: 0, to: 1.2, elapsed: 0 },
      { clip: "greeting_nod", from: 0, to: 0.9, elapsed: 0 },
      { clip: "return_to_work", from: 0, to: 1.3, elapsed: 0 },
    ];
    this.mode = "sequence";
    if (this.queue.length > 0) {
      const first = this.queue[0];
      if (first) this.applyClip(first.clip, first.from);
    }
    return this.revision;
  }

  public cancel(): number {
    if (this.mode === "safe-return" || this.mode === "coding") return this.revision;
    this.revision++;
    const { currentClip, currentTime } = this;
    const segments: QueueSegment[] = [];

    if (currentClip === "notice_visitor") {
      segments.push({ clip: "notice_visitor", from: currentTime, to: 0, elapsed: 0 });
    } else if (currentClip === "turn_to_visitor") {
      segments.push(
        { clip: "turn_to_visitor", from: currentTime, to: 0, elapsed: 0 },
        { clip: "notice_visitor", from: 0.6, to: 0, elapsed: 0 }
      );
    } else if (currentClip === "greeting_nod") {
      segments.push(
        { clip: "greeting_nod", from: currentTime, to: 0, elapsed: 0 },
        { clip: "turn_to_visitor", from: 1.2, to: 0, elapsed: 0 },
        { clip: "notice_visitor", from: 0.6, to: 0, elapsed: 0 }
      );
    } else if (currentClip === "return_to_work") {
      // Return is already moving toward rest pose, so complete the return
      segments.push({ clip: "return_to_work", from: currentTime, to: 1.3, elapsed: 0 });
    }

    this.queue = segments;
    this.mode = segments.length ? "safe-return" : "coding";
    if (this.queue.length > 0) {
      const first = this.queue[0];
      if (first) this.applyClip(first.clip, first.from);
    } else {
      this.applyClip("coding_idle", 0);
    }
    return this.revision;
  }

  /**
   * Instant settlement on Skip, Escape, or immediate route navigation.
   * Settles within 1 frame (≤50ms), bypassing reverse animations.
   */
  public settle(): number {
    this.revision++;
    this.queue = [];
    this.mode = "coding";
    this.applyClip("coding_idle", 0);
    return this.revision;
  }

  public advance(dt: number) {
    if (!Number.isFinite(dt) || dt < 0) return;
    if (this.mode === "coding" && this.isDecorativePaused) return;
    let remaining = dt;

    while (this.queue.length > 0) {
      const seg = this.queue[0];
      if (!seg) break;
      const duration = Math.abs(seg.to - seg.from);
      const take = Math.min(remaining, Math.max(0, duration - seg.elapsed));
      seg.elapsed += take;
      remaining -= take;

      const progress = duration > 0 ? seg.elapsed / duration : 1;
      const sampleTime = seg.from + (seg.to - seg.from) * progress;
      this.applyClip(seg.clip, sampleTime);

      if (seg.elapsed < duration - 1e-6) {
        return;
      }

      this.applyClip(seg.clip, seg.to);
      this.queue.shift();

      if (this.queue.length > 0) {
        const next = this.queue[0];
        if (next) this.applyClip(next.clip, next.from);
      } else {
        this.mode = "coding";
        this.applyClip("coding_idle", 0);
      }

      if (remaining < 1e-6) return;
    }

    if (this.mode === "coding") {
      if (this.isDecorativePaused) return;
      const codingDuration = CLIP_DURATIONS["coding_idle"] || 6.0;
      this.applyClip("coding_idle", (this.currentTime + remaining) % codingDuration);
    }
  }

  public getChairYawDeg(): number {
    const q = this.chairRoot.getWorldQuaternion(new THREE.Quaternion());
    q.multiply(this.restChair.clone().invert());
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    return THREE.MathUtils.radToDeg(Math.atan2(-forward.x, -forward.z));
  }

  public getBodyYawDeg(): number {
    const q = this.bodyTurn.getWorldQuaternion(new THREE.Quaternion());
    q.multiply(this.restBody.clone().invert());
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    return THREE.MathUtils.radToDeg(Math.atan2(-forward.x, -forward.z));
  }

  /**
   * Alias for settle(), compliant with canonical B4/B5 interfaces.
   */
  public settleToWork(): void {
    this.settle();
  }

  public setDecorativePaused(paused: boolean): void {
    this.isDecorativePaused = paused;
  }

  public getDiagnostics() {
    return {
      currentClip: this.currentClip,
      currentTime: this.currentTime,
      mode: this.mode,
      queueLength: this.queue.length,
      chairYawDeg: this.getChairYawDeg(),
      bodyYawDeg: this.getBodyYawDeg(),
      ownerId: this.ownerId,
      isDecorativePaused: this.isDecorativePaused,
    };
  }

  public dispose(): void {
    this.isDisposed = true;
    this.queue = [];
    this.avatarMixer.stopAllAction();
    this.chairMixer.stopAllAction();
    this.avatarMixer.uncacheRoot(this.avatarMixer.getRoot());
    this.chairMixer.uncacheRoot(this.chairMixer.getRoot());
  }
}
