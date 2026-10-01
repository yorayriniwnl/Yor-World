import * as THREE from "three";
import { CLIP_DURATIONS } from "./SceneIntegrator";
import type { CharacterAction } from "../../contracts/experience";

export type DirectorMode = "coding" | "ambient" | "sequence" | "safe-return" | "settled";

export enum ActionPriority {
  IDLE = 0,        // Default loops (coding_idle, breathing_idle)
  AMBIENT = 1,     // Secondary gestures (mouse_idle, attention_glance)
  INTERACTION = 2, // Full-body sequence (notice -> turn -> nod -> return)
  ENTRANCE = 3,    // Entrance choreography
  EMERGENCY = 4,   // Immediate skip / escape / settle
}

export interface QueueSegment {
  clip: string;
  from: number;
  to: number;
  elapsed: number;
  priority: ActionPriority;
  onComplete?: (() => void) | undefined;
}

export interface PlayOptions {
  priority?: ActionPriority | undefined;
  crossfadeMs?: number | undefined;
  loop?: boolean | undefined;
}

export interface CancelOptions {
  immediate?: boolean | undefined;
  blendMs?: number | undefined;
}

/**
 * Production CharacterDirector (Task B4 / B5).
 *
 * Single full-body action owner for the resident avatar and chair.
 * Manages full 8 V1 clips, finite-action completion promises, loop ownership,
 * priority arbitration, crossfade, and 150-250ms smooth cancellation blending
 * that eliminates the W2 velocity discontinuity while maintaining >= 0.15m desk clearance.
 */
export class CharacterDirector {
  public readonly ownerId: string;

  private avatarMixer: THREE.AnimationMixer;
  private chairMixer: THREE.AnimationMixer;
  private avatarActions: Record<string, THREE.AnimationAction>;
  private chairActions: Record<string, THREE.AnimationAction>;
  private bodyTurn: THREE.Object3D;
  private chairRoot: THREE.Object3D;
  private restBody: THREE.Quaternion;
  private restChair: THREE.Quaternion;

  public mode: DirectorMode = "coding";
  public currentClip: string = "coding_idle";
  public currentTime: number = 0;
  public activePriority: ActionPriority = ActionPriority.IDLE;
  public revision: number = 0;

  private queue: QueueSegment[] = [];
  private activeSequencePromise: Promise<void> | null = null;
  private activeSequenceResolve: (() => void) | null = null;
  private isDisposed: boolean = false;

  // Smooth blending state for cancellation to prevent velocity discontinuity
  private isBlending: boolean = false;
  private blendDuration: number = 0.20; // 200ms default bounded blend window (150-250ms spec)
  private blendElapsed: number = 0.0;
  private blendSourceClip: string = "";
  private blendSourceTime: number = 0.0;
  private blendTargetClip: string = "";
  private blendTargetTime: number = 0.0;

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

  public getOwnerId(): string {
    return this.ownerId;
  }

  private applyClip(clip: string, time: number) {
    const duration = CLIP_DURATIONS[clip];
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

  /**
   * Smoothly interpolate between source and target clip poses across a bounded 150-250ms window.
   * Fixes W2 cancellation velocity discontinuity.
   */
  private applyBlend(alpha: number) {
    const a = THREE.MathUtils.clamp(alpha, 0, 1);
    const ease = a * a * (3.0 - 2.0 * a); // Smoothstep easing continuous in velocity

    const aSrc = this.avatarActions[this.blendSourceClip];
    const aTgt = this.avatarActions[this.blendTargetClip];
    const cSrc = this.chairActions[this.blendSourceClip];
    const cTgt = this.chairActions[this.blendTargetClip];

    if (aSrc && aTgt) {
      aSrc.enabled = true;
      aTgt.enabled = true;
      aSrc.setEffectiveWeight(1.0 - ease);
      aTgt.setEffectiveWeight(ease);
      aSrc.time = this.blendSourceTime;
      aTgt.time = this.blendTargetTime;
      this.avatarMixer.update(0);
    }

    if (cSrc && cTgt) {
      cSrc.enabled = true;
      cTgt.enabled = true;
      cSrc.setEffectiveWeight(1.0 - ease);
      cTgt.setEffectiveWeight(ease);
      cSrc.time = this.blendSourceTime;
      cTgt.time = this.blendTargetTime;
      this.chairMixer.update(0);
    }

    this.currentTime = this.blendTargetTime;
  }

  /**
   * Priority arbitration check.
   * Returns true if incoming request can pre-empt the active action.
   */
  public canPlay(priority: ActionPriority): boolean {
    return priority >= this.activePriority;
  }

  /**
   * Plays a single clip or action with priority arbitration and completion contract.
   * Loops resolve immediately once started; finite actions resolve upon completion.
   */
  public play(
    action: CharacterAction,
    signal?: AbortSignal,
    options?: PlayOptions
  ): Promise<void> {
    if (this.isDisposed) return Promise.resolve();

    const priority = options?.priority ?? ActionPriority.AMBIENT;
    if (!this.canPlay(priority)) {
      console.warn(`[CharacterDirector] Request "${action}" rejected by priority arbitration (${priority} < ${this.activePriority})`);
      return Promise.reject(new Error(`Action ${action} rejected: lower priority than current action`));
    }

    if (signal?.aborted) {
      return Promise.resolve();
    }

    const duration = CLIP_DURATIONS[action];
    if (duration === undefined) {
      return Promise.reject(new Error(`Unknown clip ${action}`));
    }

    this.revision++;
    this.activePriority = priority;
    this.queue = [];
    this.isBlending = false;

    // Is loop clip?
    const isLoop = options?.loop ?? (action === "coding_idle" || action === "breathing_idle");
    if (isLoop) {
      this.mode = action === "coding_idle" ? "coding" : "ambient";
      this.applyClip(action, 0);
      return Promise.resolve();
    }

    // Finite clip: resolve when duration completes
    return new Promise<void>((resolve) => {
      this.mode = "ambient";
      this.activeSequenceResolve = resolve;

      this.queue = [
        {
          clip: action,
          from: 0,
          to: duration,
          elapsed: 0,
          priority,
          onComplete: () => {
            this.mode = "coding";
            this.activePriority = ActionPriority.IDLE;
            this.applyClip("coding_idle", 0);
            resolve();
          },
        },
      ];

      this.applyClip(action, 0);

      if (signal) {
        signal.addEventListener("abort", () => {
          this.cancel({ immediate: false });
        }, { once: true });
      }
    });
  }

  /**
   * Full-body visitor greeting choreography:
   * notice_visitor (0.6s) -> turn_to_visitor (1.2s) -> greeting_nod (0.9s) -> return_to_work (1.3s).
   * Total duration: 4.0s.
   */
  public playGreeting(signal?: AbortSignal, priority: ActionPriority = ActionPriority.INTERACTION): number {
    if (!this.canPlay(priority)) {
      return this.revision;
    }

    this.revision++;
    this.activePriority = priority;
    this.isBlending = false;

    const promise = new Promise<void>((resolve) => {
      this.activeSequenceResolve = resolve;
    });
    this.activeSequencePromise = promise;

    this.queue = [
      { clip: "notice_visitor", from: 0, to: 0.6, elapsed: 0, priority },
      { clip: "turn_to_visitor", from: 0, to: 1.2, elapsed: 0, priority },
      { clip: "greeting_nod", from: 0, to: 0.9, elapsed: 0, priority },
      {
        clip: "return_to_work",
        from: 0,
        to: 1.3,
        elapsed: 0,
        priority,
        onComplete: () => {
          this.mode = "coding";
          this.activePriority = ActionPriority.IDLE;
          this.applyClip("coding_idle", 0);
          if (this.activeSequenceResolve) {
            const res = this.activeSequenceResolve;
            this.activeSequenceResolve = null;
            res();
          }
        },
      },
    ];

    this.mode = "sequence";
    if (this.queue.length > 0) {
      const first = this.queue[0];
      if (first) this.applyClip(first.clip, first.from);
    }

    if (signal) {
      signal.addEventListener("abort", () => {
        this.cancel({ immediate: false });
      }, { once: true });
    }

    return this.revision;
  }

  /**
   * Subtle attention glance toward visitor for repeated interaction.
   * Duration: 1.2s.
   */
  public playAttentionGlance(signal?: AbortSignal): Promise<void> {
    return this.play("attention_glance", signal, { priority: ActionPriority.AMBIENT, loop: false });
  }

  /**
   * Mouse interaction clip.
   * Duration: 2.0s.
   */
  public playMouseIdle(signal?: AbortSignal): Promise<void> {
    return this.play("mouse_idle", signal, { priority: ActionPriority.AMBIENT, loop: false });
  }

  /**
   * Safe cancellation fixing the W2 velocity discontinuity limitation.
   * Uses 150-250ms bounded transition blending without sudden velocity inversion.
   * Maintains collision safety: hands remain inside lap (>= 0.15m from desk apron)
   * while chair smoothly eases back to desk-facing orientation.
   */
  public cancel(options?: CancelOptions): number {
    if (this.mode === "safe-return" || this.mode === "coding") {
      return this.revision;
    }

    this.revision++;
    const immediate = options?.immediate ?? false;
    const blendMs = THREE.MathUtils.clamp(options?.blendMs ?? 200, 150, 250);
    this.blendDuration = blendMs / 1000;

    if (immediate) {
      return this.settle();
    }

    const { currentClip, currentTime } = this;
    const segments: QueueSegment[] = [];

    if (currentClip === "notice_visitor") {
      // Hands were lifting off keys; start smooth 200ms blend directly back to coding_idle
      this.isBlending = true;
      this.blendElapsed = 0.0;
      this.blendSourceClip = "notice_visitor";
      this.blendSourceTime = currentTime;
      this.blendTargetClip = "coding_idle";
      this.blendTargetTime = 0.0;
      this.mode = "safe-return";
      this.queue = [];
      return this.revision;
    } else if (currentClip === "turn_to_visitor") {
      // Mid-turn: calculate current yaw progress
      const turnProgress = THREE.MathUtils.clamp(currentTime / 1.2, 0, 1);
      // Map smoothly into return_to_work corresponding return phase without abrupt velocity jump
      // return_to_work swivel phase occupies 0 to 0.975s (0.75 of 1.3s)
      const returnStart = THREE.MathUtils.clamp((1.0 - turnProgress) * 0.975, 0, 0.975);

      this.isBlending = true;
      this.blendElapsed = 0.0;
      this.blendSourceClip = "turn_to_visitor";
      this.blendSourceTime = currentTime;
      this.blendTargetClip = "return_to_work";
      this.blendTargetTime = returnStart;

      segments.push({
        clip: "return_to_work",
        from: returnStart,
        to: 1.3,
        elapsed: 0,
        priority: ActionPriority.INTERACTION,
        onComplete: () => {
          this.mode = "coding";
          this.activePriority = ActionPriority.IDLE;
          this.applyClip("coding_idle", 0);
          if (this.activeSequenceResolve) {
            const res = this.activeSequenceResolve;
            this.activeSequenceResolve = null;
            res();
          }
        },
      });
    } else if (currentClip === "greeting_nod") {
      // In greeting: transition smoothly into return_to_work
      segments.push({
        clip: "return_to_work",
        from: 0,
        to: 1.3,
        elapsed: 0,
        priority: ActionPriority.INTERACTION,
        onComplete: () => {
          this.mode = "coding";
          this.activePriority = ActionPriority.IDLE;
          this.applyClip("coding_idle", 0);
          if (this.activeSequenceResolve) {
            const res = this.activeSequenceResolve;
            this.activeSequenceResolve = null;
            res();
          }
        },
      });
    } else if (currentClip === "return_to_work") {
      // Already returning: complete the return
      segments.push({
        clip: "return_to_work",
        from: currentTime,
        to: 1.3,
        elapsed: 0,
        priority: ActionPriority.INTERACTION,
        onComplete: () => {
          this.mode = "coding";
          this.activePriority = ActionPriority.IDLE;
          this.applyClip("coding_idle", 0);
          if (this.activeSequenceResolve) {
            const res = this.activeSequenceResolve;
            this.activeSequenceResolve = null;
            res();
          }
        },
      });
    } else if (currentClip === "attention_glance" || currentClip === "mouse_idle") {
      // Ambient clips: smooth 200ms blend back to coding_idle
      this.isBlending = true;
      this.blendElapsed = 0.0;
      this.blendSourceClip = currentClip;
      this.blendSourceTime = currentTime;
      this.blendTargetClip = "coding_idle";
      this.blendTargetTime = 0.0;
      this.mode = "safe-return";
      this.queue = [];
      return this.revision;
    }

    this.queue = segments;
    this.mode = segments.length ? "safe-return" : "coding";
    return this.revision;
  }

  /**
   * Instant settlement on Skip, Escape, or immediate route navigation.
   * Settles within 1 frame (<= 50ms), bypassing reverse animations.
   */
  public settle(): number {
    this.revision++;
    this.queue = [];
    this.isBlending = false;
    this.mode = "coding";
    this.activePriority = ActionPriority.IDLE;
    this.applyClip("coding_idle", 0);

    if (this.activeSequenceResolve) {
      const res = this.activeSequenceResolve;
      this.activeSequenceResolve = null;
      res();
    }
    return this.revision;
  }

  /**
   * Alias for settle(), compliant with canonical B4/B5 interfaces.
   */
  public settleToWork(): void {
    this.settle();
  }

  /**
   * Advances simulation time.
   */
  public advance(dt: number) {
    if (!Number.isFinite(dt) || dt < 0) return;
    let remaining = dt;

    // Handle active smooth blend window (150-250ms)
    if (this.isBlending) {
      const needed = this.blendDuration - this.blendElapsed;
      const take = Math.min(remaining, needed);
      this.blendElapsed += take;
      remaining -= take;
      const alpha = this.blendDuration > 0 ? Math.min(this.blendElapsed / this.blendDuration, 1.0) : 1.0;
      this.applyBlend(alpha);

      if (alpha >= 1.0) {
        this.isBlending = false;
        this.applyClip(this.blendTargetClip, this.blendTargetTime);
        if (this.queue.length === 0) {
          this.mode = "coding";
          this.activePriority = ActionPriority.IDLE;
          this.applyClip("coding_idle", 0);
          if (this.activeSequenceResolve) {
            const res = this.activeSequenceResolve;
            this.activeSequenceResolve = null;
            res();
          }
        }
      }
      if (remaining < 1e-6) return;
    }

    // Process queued animation segments
    while (this.queue.length > 0) {
      const seg = this.queue[0];
      if (!seg) break;
      const duration = Math.abs(seg.to - seg.from);
      const take = Math.min(remaining, Math.max(0, duration - seg.elapsed));
      seg.elapsed += take;
      remaining -= take;

      const progress = duration > 0 ? seg.elapsed / duration : 1.0;
      const sampleTime = seg.from + (seg.to - seg.from) * progress;
      this.applyClip(seg.clip, sampleTime);

      if (seg.elapsed < duration - 1e-6) {
        return;
      }

      this.applyClip(seg.clip, seg.to);
      if (seg.onComplete) {
        seg.onComplete();
      }
      this.queue.shift();

      if (this.queue.length > 0) {
        const next = this.queue[0];
        if (next) this.applyClip(next.clip, next.from);
      } else {
        this.mode = "coding";
        this.activePriority = ActionPriority.IDLE;
        this.applyClip("coding_idle", 0);
      }

      if (remaining < 1e-6) return;
    }

    // Default loop advance
    if (this.mode === "coding") {
      const codingDuration = CLIP_DURATIONS["coding_idle"] || 6.0;
      this.applyClip("coding_idle", (this.currentTime + remaining) % codingDuration);
    } else if (this.mode === "ambient" && this.currentClip === "breathing_idle") {
      const breathingDuration = CLIP_DURATIONS["breathing_idle"] || 4.0;
      this.applyClip("breathing_idle", (this.currentTime + remaining) % breathingDuration);
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

  public getDiagnostics() {
    return {
      currentClip: this.currentClip,
      currentTime: this.currentTime,
      mode: this.mode,
      activePriority: this.activePriority,
      queueLength: this.queue.length,
      isBlending: this.isBlending,
      chairYawDeg: this.getChairYawDeg(),
      bodyYawDeg: this.getBodyYawDeg(),
      ownerId: this.ownerId,
    };
  }

  public dispose(): void {
    this.isDisposed = true;
    this.queue = [];
    this.isBlending = false;
    if (this.activeSequenceResolve) {
      const res = this.activeSequenceResolve;
      this.activeSequenceResolve = null;
      res();
    }
    this.avatarMixer.stopAllAction();
    this.chairMixer.stopAllAction();
    this.avatarMixer.uncacheRoot(this.avatarMixer.getRoot());
    this.chairMixer.uncacheRoot(this.chairMixer.getRoot());
  }
}
