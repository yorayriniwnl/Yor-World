/**
 * CancellationCoordinator manages explicit transition identities,
 * monotonically increasing transition IDs, active AbortControllers,
 * and stale-completion rejection guards.
 */

export type CancellationReason =
  | "SUPERSEDED_BY_NEW_INTENT"
  | "ESCAPE_REQUESTED"
  | "NAVIGATE_REQUESTED"
  | "RENDERER_FAILED"
  | "UNMOUNT"
  | "TIMED_OUT"
  | "EXPLICIT_CANCEL"
  | "RESTORE_SAFE_SNAPSHOT";

export interface TransitionToken {
  readonly id: number;
  readonly signal: AbortSignal;
  readonly label: string;
  readonly createdAt: number;
}

export class CancellationCoordinator {
  public readonly ownerId = "primary-transition-coordinator";
  private currentId = 0;
  private activeController: AbortController | null = null;
  private activeLabel = "idle";
  private cancellationHistory: Array<{ id: number; label: string; reason: string; timestamp: number }> = [];

  /**
   * Starts a new transition session.
   * Immediately aborts any previous transition with reason "SUPERSEDED_BY_NEW_INTENT".
   */
  public startTransition(label: string): TransitionToken {
    if (this.activeController) {
      this.abortCurrent("SUPERSEDED_BY_NEW_INTENT");
    }

    this.currentId++;
    const controller = new AbortController();
    this.activeController = controller;
    this.activeLabel = label;

    return {
      id: this.currentId,
      signal: controller.signal,
      label,
      createdAt: Date.now(),
    };
  }

  /**
   * Aborts the currently active transition with an explicit cancellation reason.
   */
  public abortCurrent(reason: CancellationReason): void {
    if (!this.activeController) return;

    const id = this.currentId;
    const label = this.activeLabel;
    this.cancellationHistory.push({
      id,
      label,
      reason,
      timestamp: Date.now(),
    });

    try {
      this.activeController.abort(new Error(`Transition ${id} (${label}) aborted: ${reason}`));
    } catch {
      // Ignore abort errors
    }

    this.activeController = null;
    this.activeLabel = "idle";
  }

  /**
   * Verifies if a transition ID and optional AbortSignal are still valid and active.
   * If the ID is obsolete or signal is aborted, this returns false.
   */
  public isCurrent(id: number, signal?: AbortSignal): boolean {
    if (id !== this.currentId) return false;
    if (signal && signal.aborted) return false;
    if (this.activeController && this.activeController.signal.aborted) return false;
    return true;
  }

  /**
   * Guards an asynchronous callback from executing if its transition is stale or aborted.
   * Obsolete work must NEVER:
   * - navigate
   * - restart animation
   * - change camera
   * - restore an old state
   * - reopen UI
   */
  public guard<T>(id: number, signal: AbortSignal, action: () => T): T | null {
    if (!this.isCurrent(id, signal)) {
      return null;
    }
    return action();
  }

  public getCurrentId(): number {
    return this.currentId;
  }

  public getActiveLabel(): string {
    return this.activeLabel;
  }

  public getHistory(): ReadonlyArray<{ id: number; label: string; reason: string; timestamp: number }> {
    return [...this.cancellationHistory];
  }

  public dispose(): void {
    this.abortCurrent("UNMOUNT");
    this.cancellationHistory = [];
  }
}
