import type { AdaptiveQualityController } from "../room/quality-policy";

/** Connect actual foreground RAF deltas to the accepted 2-second quality policy. */
export class RuntimeQualitySampler {
  private windowStartedAt: number | null = null;
  private stopped = false;

  constructor(private readonly controller: AdaptiveQualityController) {}

  public recordFrame(durationMs: number, timestamp: number, state: {
    visible: boolean;
    lifecycle: string;
    phase: string;
    camera: string;
    panel: string | null;
  }): void {
    if (this.stopped) return;
    if (!state.visible || !["HOME", "TRANSITION", "ENTRANCE"].includes(state.lifecycle)) {
      this.pause();
      return;
    }
    const safeHome = state.lifecycle === "HOME" && state.phase === "explore" && state.panel === null
      && ["home-desktop", "home-mobile"].includes(state.camera);
    // The pure policy treats phase=explore as safe; non-home explore must be labeled focus here.
    this.controller.setPhase(safeHome ? "home" : state.phase === "explore" ? "focus" : state.phase, safeHome);
    this.controller.recordFrame(durationMs);
    this.windowStartedAt ??= timestamp;
    if (timestamp - this.windowStartedAt >= 2000) {
      this.controller.evaluateWindow();
      this.windowStartedAt = timestamp;
    }
  }

  public pause(): void {
    this.windowStartedAt = null;
    this.controller.reset();
  }

  public stop(): void {
    this.pause();
    this.stopped = true;
  }
}
