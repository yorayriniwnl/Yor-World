import { CameraDirector } from "./CameraDirector";
import { CharacterDirector } from "./CharacterDirector";
import type { CameraPreset } from "./types";

export class TransitionCoordinator {
  public readonly ownerId: string;
  private cameraDirector: CameraDirector;
  private characterDirector: CharacterDirector;
  private activeAbortController: AbortController | null = null;
  private isDisposed: boolean = false;
  private transitionCounter: number = 0;

  constructor(
    cameraDirector: CameraDirector,
    characterDirector: CharacterDirector,
    ownerId: string = "primary-transition-coordinator"
  ) {
    this.ownerId = ownerId;
    this.cameraDirector = cameraDirector;
    this.characterDirector = characterDirector;
  }

  public getOwnerId(): string {
    return this.ownerId;
  }

  public isTransitioning(): boolean {
    return this.activeAbortController !== null;
  }

  public async transitionCamera(preset: CameraPreset, durationMs: number = 600): Promise<void> {
    if (this.isDisposed) return;

    // Abort existing transition
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }

    const abortController = new AbortController();
    this.activeAbortController = abortController;
    this.transitionCounter++;

    try {
      await this.cameraDirector.transitionTo(preset, abortController.signal, durationMs);
    } finally {
      if (this.activeAbortController === abortController) {
        this.activeAbortController = null;
      }
    }
  }

  public async playActionSequence(action: "greet"): Promise<void> {
    if (this.isDisposed) return;

    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }

    const abortController = new AbortController();
    this.activeAbortController = abortController;

    if (action === "greet") {
      this.characterDirector.playGreeting();
    }
  }

  public skip(): void {
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
    this.characterDirector.settleToWork();
  }

  public dispose(): void {
    this.isDisposed = true;
    this.skip();
  }
}
