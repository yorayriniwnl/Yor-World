export interface GreetingState {
  readonly isGreetingActive: boolean;
  readonly lastGreetingTime: number;
  readonly lastGlanceTime: number;
  readonly isGlancing: boolean;
}

export interface GreetingCharacterTarget {
  playGreeting: () => number;
  cancel: () => number;
  settle: () => number;
  mode?: string;
  currentClip?: string;
}

export class GreetingController {
  private characterDirector: GreetingCharacterTarget | null = null;
  private isGreetingActive = false;
  private isGlancing = false;
  private lastGreetingTime = 0;
  private lastGlanceTime = 0;

  public setCharacterDirector(director: GreetingCharacterTarget | null): void {
    this.characterDirector = director;
  }

  public isBusy(): boolean {
    return this.isGreetingActive || this.isGlancing;
  }

  public getState(): GreetingState {
    return {
      isGreetingActive: this.isGreetingActive,
      lastGreetingTime: this.lastGreetingTime,
      lastGlanceTime: this.lastGlanceTime,
      isGlancing: this.isGlancing,
    };
  }

  /**
   * Starts the full greeting sequence: notice -> turn -> nod -> return.
   */
  public startGreeting(): boolean {
    if (this.isGreetingActive) {
      return false; // drop duplicate rapid click
    }

    if (this.characterDirector) {
      this.characterDirector.playGreeting();
      this.isGreetingActive = true;
      this.lastGreetingTime = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Starts a brief attention glance (during 7s cooldown).
   */
  public startGlance(): boolean {
    if (this.isGreetingActive) return false;

    if (this.characterDirector) {
      // Notice visitor clip serves as the brief glance
      this.characterDirector.playGreeting();
      this.isGlancing = true;
      this.lastGlanceTime = Date.now();

      // Automatically cancel back after 0.5s to create glance effect
      setTimeout(() => {
        if (this.isGlancing && this.characterDirector) {
          this.characterDirector.cancel();
          this.isGlancing = false;
        }
      }, 500);

      return true;
    }
    return false;
  }

  /**
   * Immediately settles the character into safe coding pose within <= 50ms.
   * Used by Skip, Escape, project transition preemption, or unmount.
   */
  public settle(): void {
    this.isGreetingActive = false;
    this.isGlancing = false;
    if (this.characterDirector) {
      this.characterDirector.settle();
    }
  }

  /**
   * Safe return along reverse path.
   */
  public cancel(): void {
    this.isGreetingActive = false;
    this.isGlancing = false;
    if (this.characterDirector) {
      this.characterDirector.cancel();
    }
  }

  public update(): void {
    if (!this.characterDirector) return;
    if (this.characterDirector.mode === "coding" && this.isGreetingActive) {
      this.isGreetingActive = false;
    }
  }

  public reset(): void {
    this.settle();
    this.lastGreetingTime = 0;
    this.lastGlanceTime = 0;
  }
}
