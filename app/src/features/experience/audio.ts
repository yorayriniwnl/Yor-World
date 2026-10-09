/**
 * AudioController:
 * Manages spatial and ambient audio opt-in, state tracking, and lifecycle cleanup.
 *
 * Invariants:
 * - Audio remains OFF by default.
 * - setEnabled(true) returns a Promise<boolean> reflecting ACTUAL enabled state.
 * - Browser denial (e.g. autoplay rejection, missing user gesture, or blocked permission)
 *   catches gracefully and returns false, leaving audio disabled.
 * - dispose() closes AudioContext and tears down all nodes idempotently.
 */
export class AudioController {
  private enabled: boolean = false;
  private audioCtx: AudioContext | null = null;
  private isDisposed: boolean = false;
  private requestVersion = 0;
  private desiredEnabled = false;
  private listeners: Set<(enabled: boolean) => void> = new Set();

  constructor() {
    this.enabled = false;
  }

  /**
   * Reports whether audio is currently enabled and functional.
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Subscribes a listener to audio state changes.
   */
  public subscribe(listener: (enabled: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.enabled);
      } catch (err) {
        console.error("[AudioController] Listener notification error:", err);
      }
    }
  }

  /**
   * Sets audio enabled state.
   * If enabling, attempts to initialize and resume AudioContext.
   * If browser rejects or denies activation, captures rejection, leaves enabled as false,
   * and returns false.
   */
  public async setEnabled(enabled: boolean): Promise<boolean> {
    if (this.isDisposed) return false;
    const request = ++this.requestVersion;
    this.desiredEnabled = enabled;
    if (!enabled) {
      this.enabled = false;
      this.notify();
    }
    try {
      if (enabled && (!this.audioCtx || this.audioCtx.state === "closed")) {
        const Context = typeof window !== "undefined"
          ? window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
          : (globalThis as unknown as { AudioContext?: typeof AudioContext }).AudioContext;
        if (!Context) return false;
        this.audioCtx = new Context();
      }
      const context = this.audioCtx;
      if (!context) return false;
      if (enabled && context.state === "suspended") await context.resume();
      if (!enabled && context.state === "running") await context.suspend();
      if (this.isDisposed || context !== this.audioCtx) return false;
      // An older resume/suspend can finish after a newer explicit request.
      // Reconcile engine state to the latest request, never publish the old one.
      if (request !== this.requestVersion) {
        if (!this.desiredEnabled && context.state === "running") await context.suspend();
        if (this.desiredEnabled && context.state === "suspended") await context.resume();
        return this.enabled;
      }
      this.enabled = this.desiredEnabled && context.state === "running";
      this.notify();
      return this.enabled;
    } catch (error) {
      if (!this.isDisposed && request === this.requestVersion) {
        this.enabled = false;
        this.desiredEnabled = false;
        this.notify();
        console.warn("[AudioController] Browser denied audio activation:", error);
      }
      return false;
    }
  }

  /**
   * Synthesizes a subtle, non-intrusive UI interaction chime or beep if audio is active.
   */
  public playTone(freq: number = 440, durationMs: number = 100): void {
    if (!this.enabled || !this.audioCtx || this.audioCtx.state !== "running" || this.isDisposed) {
      return;
    }

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + durationMs / 1000);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + durationMs / 1000);
    } catch (err) {
      console.warn("[AudioController] Tone playback error:", err);
    }
  }

  /**
   * Idempotently releases AudioContext resources.
   */
  public dispose(): void {
    if (this.isDisposed) {
      return;
    }

    this.isDisposed = true;
    ++this.requestVersion;
    this.desiredEnabled = false;
    this.enabled = false;
    this.notify();
    this.listeners.clear();

    if (this.audioCtx) {
      try {
        if (this.audioCtx.state !== "closed") {
          this.audioCtx.close().catch(() => {});
        }
      } catch {
        // Safe disposal ignore
      }
      this.audioCtx = null;
    }
  }
}
