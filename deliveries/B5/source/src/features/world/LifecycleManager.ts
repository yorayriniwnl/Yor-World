import type { WorldLifecycleState, LoadingProgress, EntranceDiagnostics } from "./types";

export type StateChangeListener = (
  state: WorldLifecycleState,
  prevState: WorldLifecycleState,
  sessionToken: number
) => void;

export class LifecycleManager {
  private currentState: WorldLifecycleState = "STATIC";
  private sessionToken: number = 0;
  private isDisposed: boolean = false;
  private listeners: Set<StateChangeListener> = new Set();

  private loadingProgress: LoadingProgress = {
    stage: "Ready",
    progress: 0,
    requiredLoaded: 0,
    requiredTotal: 3,
    optionalLoaded: 0,
    optionalTotal: 2,
    retryCount: 0,
    maxRetries: 3,
  };

  private entranceDiagnostics: EntranceDiagnostics = {
    phase: "not_started",
    progress: 0,
    elapsedSec: 0,
    durationSec: 5.0,
    active: false,
    skipped: false,
  };

  private failureReason: string | null = null;
  private retryCount: number = 0;
  public readonly maxRetries: number = 3;

  public getState(): WorldLifecycleState {
    return this.currentState;
  }

  public getSessionToken(): number {
    return this.sessionToken;
  }

  public getFailureReason(): string | null {
    return this.failureReason;
  }

  public getLoadingProgress(): LoadingProgress {
    return { ...this.loadingProgress };
  }

  public getEntranceDiagnostics(): EntranceDiagnostics {
    return { ...this.entranceDiagnostics };
  }

  public subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(prevState: WorldLifecycleState) {
    for (const listener of this.listeners) {
      try {
        listener(this.currentState, prevState, this.sessionToken);
      } catch (err) {
        console.error("[LifecycleManager] Error in listener:", err);
      }
    }
  }

  /**
   * Request to enter 3D studio.
   * Increments sessionToken so all prior async tasks become obsolete.
   */
  public requestEntry(): number {
    if (this.isDisposed) {
      console.warn("[LifecycleManager] Cannot request entry: manager is disposed.");
      return this.sessionToken;
    }

    // Ignore repeated request if already entering or active
    if (
      this.currentState === "ENTRY_REQUESTED" ||
      this.currentState === "LOADING" ||
      this.currentState === "ENTRANCE" ||
      this.currentState === "HOME" ||
      this.currentState === "TRANSITION"
    ) {
      return this.sessionToken;
    }

    const prevState = this.currentState;
    this.sessionToken++;
    this.failureReason = null;
    this.currentState = "ENTRY_REQUESTED";
    this.notify(prevState);
    return this.sessionToken;
  }

  public startLoading(token: number): boolean {
    if (this.isStale(token)) return false;
    if (this.currentState !== "ENTRY_REQUESTED") return false;

    const prevState = this.currentState;
    this.currentState = "LOADING";
    this.loadingProgress = {
      stage: "Connecting to asset service...",
      progress: 0.05,
      requiredLoaded: 0,
      requiredTotal: 3,
      optionalLoaded: 0,
      optionalTotal: 2,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
    };
    this.notify(prevState);
    return true;
  }

  public updateLoadingProgress(token: number, progress: LoadingProgress): boolean {
    if (this.isStale(token)) return false;
    if (this.currentState !== "LOADING") return false;

    this.loadingProgress = { ...progress };
    return true;
  }

  public startEntrance(token: number, reducedMotion: boolean = false): boolean {
    if (this.isStale(token)) return false;
    if (this.currentState !== "LOADING" && this.currentState !== "ENTRY_REQUESTED") return false;

    const prevState = this.currentState;
    if (reducedMotion) {
      // Reduced motion bypasses camera travel directly to HOME
      this.currentState = "HOME";
      this.entranceDiagnostics = {
        phase: "settled",
        progress: 1.0,
        elapsedSec: 0,
        durationSec: 0,
        active: false,
        skipped: false,
      };
    } else {
      this.currentState = "ENTRANCE";
      this.entranceDiagnostics = {
        phase: "hallway",
        progress: 0,
        elapsedSec: 0,
        durationSec: 5.0,
        active: true,
        skipped: false,
      };
    }
    this.notify(prevState);
    return true;
  }

  public updateEntranceDiagnostics(token: number, diag: EntranceDiagnostics): boolean {
    if (this.isStale(token)) return false;
    if (this.currentState !== "ENTRANCE") return false;

    this.entranceDiagnostics = { ...diag };
    return true;
  }

  public completeEntrance(token: number): boolean {
    if (this.isStale(token)) return false;
    if (this.currentState !== "ENTRANCE") return false;

    const prevState = this.currentState;
    this.currentState = "HOME";
    this.entranceDiagnostics = {
      ...this.entranceDiagnostics,
      phase: "settled",
      progress: 1.0,
      active: false,
    };
    this.notify(prevState);
    return true;
  }

  public skip(token?: number): boolean {
    if (token !== undefined && this.isStale(token)) return false;

    if (this.currentState === "ENTRANCE" || this.currentState === "TRANSITION") {
      const prevState = this.currentState;
      this.currentState = "HOME";
      this.entranceDiagnostics = {
        ...this.entranceDiagnostics,
        phase: "settled",
        progress: 1.0,
        active: false,
        skipped: true,
      };
      this.notify(prevState);
      return true;
    }

    if (this.currentState === "LOADING") {
      // Cancels loading and returns to STATIC
      return this.continueWithPortfolio();
    }

    return false;
  }

  public escape(token?: number): boolean {
    if (this.currentState === "ENTRANCE" || this.currentState === "TRANSITION") {
      return this.skip(token);
    }
    if (this.currentState === "LOADING") {
      return this.continueWithPortfolio();
    }
    if (this.currentState === "FAILURE") {
      return this.continueWithPortfolio();
    }
    return false;
  }

  public startTransition(token: number): boolean {
    if (this.isStale(token)) return false;
    if (this.currentState !== "HOME") return false;

    const prevState = this.currentState;
    this.currentState = "TRANSITION";
    this.notify(prevState);
    return true;
  }

  public completeTransition(token: number): boolean {
    if (this.isStale(token)) return false;
    if (this.currentState !== "TRANSITION") return false;

    const prevState = this.currentState;
    this.currentState = "HOME";
    this.notify(prevState);
    return true;
  }

  public fail(reason: string, token?: number): boolean {
    if (token !== undefined && this.isStale(token)) return false;
    if (this.currentState === "DISPOSING" || this.currentState === "STATIC") return false;

    const prevState = this.currentState;
    this.failureReason = reason;
    this.currentState = "FAILURE";
    this.notify(prevState);
    return true;
  }

  public retry(): boolean {
    if (this.currentState !== "FAILURE") return false;
    if (this.retryCount >= this.maxRetries) {
      console.warn("[LifecycleManager] Bounded retry limit reached.");
      return false;
    }

    this.retryCount++;
    const prevState = this.currentState;
    this.sessionToken++;
    this.failureReason = null;
    this.currentState = "ENTRY_REQUESTED";
    this.notify(prevState);
    return true;
  }

  public continueWithPortfolio(): boolean {
    const prevState = this.currentState;
    this.sessionToken++;
    this.failureReason = null;
    this.currentState = "STATIC";
    this.notify(prevState);
    return true;
  }

  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;
    const prevState = this.currentState;
    this.sessionToken++; // Invalidate all pending operations
    this.currentState = "DISPOSING";
    this.notify(prevState);

    // Transition to STATIC once cleanup complete
    const finalPrev = this.currentState;
    this.currentState = "STATIC";
    this.notify(finalPrev);
    this.listeners.clear();
  }

  public isStale(token: number): boolean {
    return this.isDisposed || token !== this.sessionToken;
  }
}
