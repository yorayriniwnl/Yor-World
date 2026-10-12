import type { WorldLifecycleState, LoadingProgress, EntranceDiagnostics } from "./types";
import type { AssetSessionId } from "./asset-resources";
import type { RequiredProgressActivity } from "./types";

export type StateChangeListener = (
  state: WorldLifecycleState,
  prevState: WorldLifecycleState,
  sessionToken: number
) => void;

const WATCHDOG_MS = 15_000;
const REQUIRED_ASSET_IDS = ["room", "resident", "fixture"] as const;
const REQUIRED_STAGE_IDS = new Set(["decode:room", "decode:resident", "decode:fixture", "integration"]);

export class LifecycleManager {
  private static generationSequence = 0;

  private currentState: WorldLifecycleState = "STATIC";
  private sessionToken = 0;
  private sessionGeneration: number;
  private isDisposed = false;
  private watchdogTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners: Set<StateChangeListener> = new Set();
  private readonly requiredByteHighWater = new Map<string, number>();
  private readonly completedRequiredStages = new Set<string>();
  private loadingProgress: LoadingProgress;

  private entranceDiagnostics: EntranceDiagnostics = {
    phase: "not_started",
    progress: 0,
    elapsedSec: 0,
    durationSec: 5.0,
    active: false,
    skipped: false,
  };

  private failureReason: string | null = null;
  private retryCount = 0;
  public readonly maxRetries = 3; // Up to 3 explicit UI recreations per mounted launcher

  constructor() {
    this.sessionGeneration = LifecycleManager.allocateGeneration();
    this.loadingProgress = this.initialProgress();
  }

  private static allocateGeneration(): number {
    LifecycleManager.generationSequence += 1;
    return LifecycleManager.generationSequence;
  }

  private initialProgress(): LoadingProgress {
    return {
      session: { generation: this.sessionGeneration, token: this.sessionToken },
      stage: "Ready",
      bytes: { kind: "indeterminate", reason: "initial-state" },
      requiredLoaded: 0,
      requiredTotal: 3,
      optionalLoaded: 0,
      optionalTotal: 2,
      retryCount: 0,
      maxRetries: 2,
      attempt: 1,
    };
  }

  public getState(): WorldLifecycleState {
    return this.currentState;
  }

  public getSessionToken(): number {
    return this.sessionToken;
  }

  public getSessionGeneration(): number {
    return this.sessionGeneration;
  }

  public getSessionId(): AssetSessionId {
    return { generation: this.sessionGeneration, token: this.sessionToken };
  }

  public isCurrentSession(session: AssetSessionId): boolean {
    return !this.isDisposed
      && session.generation === this.sessionGeneration
      && session.token === this.sessionToken;
  }

  public getFailureReason(): string | null {
    return this.failureReason;
  }

  public getLoadingProgress(): LoadingProgress {
    return { ...this.loadingProgress, session: { ...this.loadingProgress.session }, bytes: { ...this.loadingProgress.bytes } };
  }

  public getEntranceDiagnostics(): EntranceDiagnostics {
    return { ...this.entranceDiagnostics };
  }

  public subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(prevState: WorldLifecycleState): void {
    for (const listener of this.listeners) {
      try {
        listener(this.currentState, prevState, this.sessionToken);
      } catch (err) {
        console.error("[LifecycleManager] Error in listener:", err);
      }
    }
  }

  private beginNewGeneration(): void {
    this.sessionGeneration = LifecycleManager.allocateGeneration();
    this.requiredByteHighWater.clear();
    this.completedRequiredStages.clear();
  }

  /** Request to enter 3D studio. Every entry gets an identity never shared by another manager. */
  public requestEntry(): number {
    if (this.isDisposed) {
      console.warn("[LifecycleManager] Cannot request entry: manager is disposed.");
      return this.sessionToken;
    }
    if (["ENTRY_REQUESTED", "LOADING", "ENTRANCE", "HOME", "TRANSITION"].includes(this.currentState)) {
      return this.sessionToken;
    }

    const prevState = this.currentState;
    this.clearWatchdog();
    this.beginNewGeneration();
    this.sessionToken++;
    this.failureReason = null;
    this.loadingProgress = this.initialProgress();
    this.currentState = "ENTRY_REQUESTED";
    this.notify(prevState);
    return this.sessionToken;
  }

  public startLoading(token: number): boolean {
    if (this.isStale(token) || this.currentState !== "ENTRY_REQUESTED") return false;

    const prevState = this.currentState;
    this.clearWatchdog();
    this.requiredByteHighWater.clear();
    this.completedRequiredStages.clear();
    this.loadingProgress = {
      session: { generation: this.sessionGeneration, token },
      stage: "Connecting to asset service...",
      bytes: { kind: "indeterminate", reason: "initial-connect" },
      requiredLoaded: 0,
      requiredTotal: 3,
      optionalLoaded: 0,
      optionalTotal: 2,
      retryCount: 0,
      maxRetries: 2,
      attempt: 1,
    };
    this.currentState = "LOADING";
    this.armWatchdog(this.getSessionId());
    this.notify(prevState);
    return true;
  }

  public updateLoadingProgress(token: number, progress: LoadingProgress): boolean {
    if (this.isStale(token) || this.currentState !== "LOADING") return false;
    if (!this.isCurrentSession(progress.session)) return false;

    this.loadingProgress = { ...progress, session: { ...progress.session }, bytes: { ...progress.bytes } };
    if (progress.activity && this.acceptMeaningfulActivity(progress.activity)) {
      this.armWatchdog(progress.session);
    }
    return true;
  }

  /** Records decode/integration work that is real forward progress, independent of byte totals. */
  public recordRequiredStage(session: AssetSessionId, id: Extract<RequiredProgressActivity, { kind: "required-stage" }>['id'], label: string): boolean {
    if (!this.isCurrentSession(session) || this.currentState !== "LOADING") return false;
    if (!this.acceptMeaningfulActivity({ kind: "required-stage", id })) return false;
    this.loadingProgress = { ...this.loadingProgress, session: { ...session }, stage: label, activity: { kind: "required-stage", id } };
    this.armWatchdog(session);
    return true;
  }

  private acceptMeaningfulActivity(activity: RequiredProgressActivity): boolean {
    if (activity.kind === "required-bytes") {
      if (!(REQUIRED_ASSET_IDS as readonly string[]).includes(activity.assetId)
        || !Number.isSafeInteger(activity.loaded) || activity.loaded <= 0) return false;
      const previous = this.requiredByteHighWater.get(activity.assetId) ?? 0;
      if (activity.loaded <= previous) return false;
      this.requiredByteHighWater.set(activity.assetId, activity.loaded);
      return true;
    }
    if (activity.kind !== "required-stage"
      || !REQUIRED_STAGE_IDS.has(activity.id)
      || this.completedRequiredStages.has(activity.id)) return false;
    this.completedRequiredStages.add(activity.id);
    return true;
  }

  private armWatchdog(session: AssetSessionId): void {
    this.clearWatchdog();
    this.watchdogTimer = setTimeout(() => {
      this.watchdogTimer = null;
      if (this.currentState === "LOADING" && this.isCurrentSession(session)) {
        this.fail("Asset loading timed out after 15 seconds without required progress", session.token);
      }
    }, WATCHDOG_MS);
  }

  public startEntrance(token: number, reducedMotion = false): boolean {
    if (this.isStale(token)) return false;
    if (this.currentState !== "LOADING" && this.currentState !== "ENTRY_REQUESTED") return false;
    this.clearWatchdog();

    const prevState = this.currentState;
    if (reducedMotion) {
      this.currentState = "HOME";
      this.entranceDiagnostics = {
        phase: "settled", progress: 1, elapsedSec: 0, durationSec: 0, active: false, skipped: false,
      };
    } else {
      this.currentState = "ENTRANCE";
      this.entranceDiagnostics = {
        phase: "hallway", progress: 0, elapsedSec: 0, durationSec: 5, active: true, skipped: false,
      };
    }
    this.notify(prevState);
    return true;
  }

  public updateEntranceDiagnostics(token: number, diag: EntranceDiagnostics): boolean {
    if (this.isStale(token) || this.currentState !== "ENTRANCE") return false;
    this.entranceDiagnostics = { ...diag };
    return true;
  }

  public completeEntrance(token: number): boolean {
    if (this.isStale(token) || this.currentState !== "ENTRANCE") return false;
    const prevState = this.currentState;
    this.currentState = "HOME";
    this.entranceDiagnostics = { ...this.entranceDiagnostics, phase: "settled", progress: 1, active: false };
    this.notify(prevState);
    return true;
  }

  public skip(token?: number): boolean {
    if (token !== undefined && this.isStale(token)) return false;
    if (this.currentState === "ENTRANCE" || this.currentState === "TRANSITION") {
      const prevState = this.currentState;
      this.currentState = "HOME";
      this.entranceDiagnostics = { ...this.entranceDiagnostics, phase: "settled", progress: 1, active: false, skipped: true };
      this.notify(prevState);
      return true;
    }
    if (this.currentState === "LOADING") return this.continueWithPortfolio();
    return false;
  }

  public escape(token?: number): boolean {
    if (token !== undefined && this.isStale(token)) return false;
    if (this.currentState === "ENTRANCE" || this.currentState === "TRANSITION") return this.skip(token);
    if (this.currentState === "LOADING" || this.currentState === "FAILURE") return this.continueWithPortfolio();
    return false;
  }

  public startTransition(token: number): boolean {
    if (this.isStale(token) || this.currentState !== "HOME") return false;
    const prevState = this.currentState;
    this.currentState = "TRANSITION";
    this.notify(prevState);
    return true;
  }

  public completeTransition(token: number): boolean {
    if (this.isStale(token) || this.currentState !== "TRANSITION") return false;
    const prevState = this.currentState;
    this.currentState = "HOME";
    this.notify(prevState);
    return true;
  }

  public fail(reason: string, token?: number): boolean {
    if (token !== undefined && this.isStale(token)) return false;
    if (["DISPOSING", "STATIC"].includes(this.currentState)) return false;
    this.clearWatchdog();
    const prevState = this.currentState;
    this.failureReason = reason;
    this.currentState = "FAILURE";
    this.notify(prevState);
    return true;
  }

  public retry(): boolean {
    if (this.currentState !== "FAILURE" || this.isDisposed) return false;
    if (this.retryCount >= this.maxRetries) {
      console.warn("[LifecycleManager] Bounded retry limit reached.");
      return false;
    }
    this.clearWatchdog();
    this.retryCount++;
    this.beginNewGeneration();
    const prevState = this.currentState;
    this.sessionToken++;
    this.failureReason = null;
    this.loadingProgress = this.initialProgress();
    this.currentState = "ENTRY_REQUESTED";
    this.notify(prevState);
    return true;
  }

  public continueWithPortfolio(): boolean {
    if (this.isDisposed || this.currentState === "STATIC" || this.currentState === "DISPOSING") return false;
    this.clearWatchdog();
    const prevState = this.currentState;
    this.beginNewGeneration();
    this.sessionToken++;
    this.failureReason = null;
    this.currentState = "STATIC";
    this.notify(prevState);
    return true;
  }

  public dispose(): void {
    if (this.isDisposed) return;
    this.clearWatchdog();
    this.isDisposed = true;
    const prevState = this.currentState;
    this.beginNewGeneration();
    this.sessionToken++;
    this.currentState = "DISPOSING";
    this.notify(prevState);
    const finalPrev = this.currentState;
    this.currentState = "STATIC";
    this.notify(finalPrev);
    this.listeners.clear();
  }

  private clearWatchdog(): void {
    if (this.watchdogTimer !== null) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  public isStale(token: number): boolean {
    return this.isDisposed || token !== this.sessionToken;
  }
}
