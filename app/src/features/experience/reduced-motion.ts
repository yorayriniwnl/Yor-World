/**
 * ReducedMotionController:
 * Enforces strict WCAG 2.2 AA reduced motion invariants across the runtime.
 *
 * Core Invariant:
 * - Reduced motion must REMOVE cinematic camera travel and pointer parallax entirely.
 * - It must NOT merely slow animations down.
 * - In reduced motion mode:
 *   - Camera travel duration is 0ms (immediate preset snap/cut).
 *   - Pointer parallax angle and damping are forced to 0.0.
 *   - The entrance sequence is bypassed directly to settled HOME state.
 *   - A visible decorative pause control stops background rotations and pulsing.
 */
export class ReducedMotionController {
  private prefersReducedMotion: boolean = false;
  private decorativePaused: boolean = false;
  private listeners: Set<(reduced: boolean) => void> = new Set();
  private mql: MediaQueryList | null = null;
  private mqlListener: ((e: MediaQueryListEvent) => void) | null = null;

  constructor(initialOverride?: boolean) {
    if (initialOverride !== undefined) {
      this.prefersReducedMotion = initialOverride;
    } else if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      this.mql = window.matchMedia("(prefers-reduced-motion: reduce)");
      this.prefersReducedMotion = this.mql.matches;
      this.mqlListener = (e: MediaQueryListEvent) => {
        this.setPrefersReducedMotion(e.matches);
      };
      this.mql.addEventListener("change", this.mqlListener);
    }
  }

  public isReducedMotion(): boolean {
    return this.prefersReducedMotion;
  }

  public setPrefersReducedMotion(reduced: boolean): void {
    if (this.prefersReducedMotion === reduced) return;
    this.prefersReducedMotion = reduced;
    this.notify();
  }

  public isDecorativePaused(): boolean {
    return this.decorativePaused;
  }

  public setDecorativePaused(paused: boolean): void {
    this.decorativePaused = paused;
  }

  public toggleDecorativePaused(): boolean {
    this.decorativePaused = !this.decorativePaused;
    return this.decorativePaused;
  }

  /**
   * Returns camera transition duration in milliseconds.
   * If reduced motion is active, returns 0ms (removing camera travel).
   * Otherwise returns the normal authored duration (capped at max 1400ms).
   */
  public getCameraTransitionDuration(standardDurationMs: number = 800): number {
    if (this.prefersReducedMotion) {
      return 0; // Travel completely removed, instant cut
    }
    return Math.min(standardDurationMs, 1400);
  }

  /**
   * Returns effective parallax multiplier.
   * In reduced motion mode, returns 0.0 (parallax completely disabled).
   */
  public getParallaxFactor(standardFactor: number = 1.0): number {
    if (this.prefersReducedMotion) {
      return 0.0;
    }
    return standardFactor;
  }

  public subscribe(listener: (reduced: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.prefersReducedMotion);
      } catch (err) {
        console.error("[ReducedMotionController] Listener error:", err);
      }
    }
  }

  public dispose(): void {
    if (this.mql && this.mqlListener) {
      this.mql.removeEventListener("change", this.mqlListener);
      this.mqlListener = null;
    }
    this.listeners.clear();
  }
}
