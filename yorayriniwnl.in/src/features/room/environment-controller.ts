import { WorldSnapshot, defaultWorldSnapshot } from "../../contracts/experience";

export interface EnvironmentState {
  lampOn: boolean;
  lampIntensity: number; // 0.0 to 1.0 (for 250ms smooth ease)
  blindsOpen: boolean;
  blindsFactor: number;  // 0.0 to 1.0
  detailFound: boolean;
}

export type EnvironmentListener = (state: Readonly<EnvironmentState>) => void;

export class EnvironmentController {
  private lampOn: boolean;
  private lampIntensity: number;
  private blindsOpen: boolean;
  private blindsFactor: number;
  private detailFound: boolean;
  private reducedMotion: boolean = false;

  private listeners = new Set<EnvironmentListener>();

  constructor(initial?: Partial<WorldSnapshot>, reducedMotion = false) {
    const base = { ...defaultWorldSnapshot, ...(initial || {}) };
    this.lampOn = base.lampOn;
    this.lampIntensity = base.lampOn ? 1.0 : 0.0;
    this.blindsOpen = base.blindsOpen;
    this.blindsFactor = base.blindsOpen ? 1.0 : 0.0;
    this.detailFound = base.detailFound;
    this.reducedMotion = reducedMotion;
  }

  public setReducedMotion(enabled: boolean): void {
    this.reducedMotion = enabled;
  }

  public subscribe(listener: EnvironmentListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const s = this.getState();
    for (const l of this.listeners) {
      try {
        l(s);
      } catch (err) {
        console.error("[EnvironmentController] Error in listener:", err);
      }
    }
  }

  public getState(): Readonly<EnvironmentState> {
    return {
      lampOn: this.lampOn,
      lampIntensity: this.lampIntensity,
      blindsOpen: this.blindsOpen,
      blindsFactor: this.blindsFactor,
      detailFound: this.detailFound,
    };
  }

  public getWorldSnapshot(): WorldSnapshot {
    return {
      version: 1,
      lampOn: this.lampOn,
      blindsOpen: this.blindsOpen,
      detailFound: this.detailFound,
    };
  }

  public setLamp(enabled: boolean): void {
    this.lampOn = enabled;
    if (this.reducedMotion) {
      this.lampIntensity = enabled ? 1.0 : 0.0;
    }
    this.notify();
  }

  public setBlinds(open: boolean): void {
    this.blindsOpen = open;
    if (this.reducedMotion) {
      this.blindsFactor = open ? 1.0 : 0.0;
    }
    this.notify();
  }

  public setDetailFound(found: boolean): void {
    this.detailFound = found;
    this.notify();
  }

  /**
   * Advances 250ms ease animation towards target intensities.
   */
  public advance(dt: number): void {
    if (this.reducedMotion) return;

    const targetLamp = this.lampOn ? 1.0 : 0.0;
    const targetBlinds = this.blindsOpen ? 1.0 : 0.0;
    const speed = 4.0; // 1 / 0.25s = 4 units per second

    let changed = false;

    if (Math.abs(this.lampIntensity - targetLamp) > 0.001) {
      const step = speed * dt;
      if (this.lampIntensity < targetLamp) {
        this.lampIntensity = Math.min(targetLamp, this.lampIntensity + step);
      } else {
        this.lampIntensity = Math.max(targetLamp, this.lampIntensity - step);
      }
      changed = true;
    }

    if (Math.abs(this.blindsFactor - targetBlinds) > 0.001) {
      const step = speed * dt;
      if (this.blindsFactor < targetBlinds) {
        this.blindsFactor = Math.min(targetBlinds, this.blindsFactor + step);
      } else {
        this.blindsFactor = Math.max(targetBlinds, this.blindsFactor - step);
      }
      changed = true;
    }

    if (changed) {
      this.notify();
    }
  }

  /**
   * Restores persistent base snapshot.
   */
  public restore(snapshot: WorldSnapshot): void {
    this.lampOn = snapshot.lampOn;
    this.blindsOpen = snapshot.blindsOpen;
    this.detailFound = snapshot.detailFound;
    this.lampIntensity = snapshot.lampOn ? 1.0 : 0.0;
    this.blindsFactor = snapshot.blindsOpen ? 1.0 : 0.0;
    this.notify();
  }
}
