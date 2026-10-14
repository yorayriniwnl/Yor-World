import type { ExperienceIntent } from "../../contracts/experience";

export type PriorityLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface IntentPriorityMap {
  readonly level: PriorityLevel;
  readonly canInterruptLower: boolean;
  readonly dropsWhenBusy: boolean;
}

export interface ArbitrationDecision {
  readonly accepted: boolean;
  readonly reason: string;
  readonly priority: PriorityLevel;
  readonly preemptsCurrent: boolean;
  readonly glanceOnly?: boolean;
}

export class IntentArbitrator {
  private lastResidentGreetingTime = 0;
  private lastResidentGlanceTime = 0;
  private lastPaintingTime = 0;
  private lastPlantTime = 0;
  private lastChairTime = 0;

  public static readonly RESIDENT_FULL_COOLDOWN_MS = 7000;
  public static readonly PAINTING_COALESCE_MS = 250;
  public static readonly PLANT_COALESCE_MS = 500;
  public static readonly CHAIR_COOLDOWN_MS = 5000;

  /**
   * Returns the priority level for any given ExperienceIntent.
   * Priority 1 is highest, 6 is lowest.
   */
  public getIntentPriority(intent: ExperienceIntent): PriorityLevel {
    switch (intent.type) {
      case "ESCAPE":
      case "SKIP":
      case "NAVIGATE":
      case "HIDE":
      case "SHOW":
      case "RENDERER_FAILED":
        return 1;

      case "OPEN_PROJECT":
        return 2;

      case "GREET":
      case "OPEN_PANEL":
      case "ENTER":
        return 3;

      case "SET_LAMP":
      case "SET_BLINDS":
      case "SET_SOUND":
      case "SET_QUALITY":
      case "SET_CLOCK_FORMAT":
      case "SET_PAUSED":
        return 4;

      default:
        return 6;
    }
  }

  public canTiltPainting(now = Date.now()): boolean {
    if (now - this.lastPaintingTime < IntentArbitrator.PAINTING_COALESCE_MS) {
      return false;
    }
    this.lastPaintingTime = now;
    return true;
  }

  public canNudgePlant(now = Date.now()): boolean {
    if (now - this.lastPlantTime < IntentArbitrator.PLANT_COALESCE_MS) {
      return false;
    }
    this.lastPlantTime = now;
    return true;
  }

  public canAdjustChair(now = Date.now()): boolean {
    if (now - this.lastChairTime < IntentArbitrator.CHAIR_COOLDOWN_MS) {
      return false;
    }
    this.lastChairTime = now;
    return true;
  }

  /**
   * Arbitrates an incoming intent against the currently active intent and cooldown timers.
   */
  public arbitrate(
    incomingIntent: ExperienceIntent,
    currentIntent: ExperienceIntent | null,
    isSequenceActive: boolean,
    now = Date.now()
  ): ArbitrationDecision {
    const incomingPriority = this.getIntentPriority(incomingIntent);
    const currentPriority = currentIntent ? this.getIntentPriority(currentIntent) : (isSequenceActive ? 3 : 6);

    // 1. Critical priority (Level 1) ALWAYS preempts everything
    if (incomingPriority === 1) {
      return {
        accepted: true,
        reason: "Critical priority intent accepted",
        priority: 1,
        preemptsCurrent: currentIntent !== null || isSequenceActive,
      };
    }

    // 2. Cooldown checks for resident greeting
    if (incomingIntent.type === "GREET") {
      // Rapid click during active sequence: NEVER queue a second greeting
      if (isSequenceActive && currentIntent?.type === "GREET") {
        return {
          accepted: false,
          reason: "Resident greeting already active; duplicate dropped",
          priority: incomingPriority,
          preemptsCurrent: false,
        };
      }

      // Check 7-second cooldown
      const elapsedSinceGreeting = now - this.lastResidentGreetingTime;
      if (elapsedSinceGreeting < IntentArbitrator.RESIDENT_FULL_COOLDOWN_MS) {
        // Allow a restrained glance if not already glancing
        if (now - this.lastResidentGlanceTime > 1500) {
          this.lastResidentGlanceTime = now;
          return {
            accepted: true,
            reason: "Greeting within 7s cooldown converted to attention_glance",
            priority: incomingPriority,
            preemptsCurrent: currentIntent !== null && currentPriority >= incomingPriority,
            glanceOnly: true,
          };
        } else {
          return {
            accepted: false,
            reason: "Resident greeting in 7s cooldown; glance also rate-limited",
            priority: incomingPriority,
            preemptsCurrent: false,
          };
        }
      }

      // Record successful full greeting start
      this.lastResidentGreetingTime = now;
    }

    // 3. Priority comparison against current intent
    if (!currentIntent) {
      const preemptsActiveSequence = isSequenceActive && incomingPriority < 3;
      return {
        accepted: true,
        reason: preemptsActiveSequence
          ? `Higher priority (${incomingPriority}) preempts active sequence`
          : "No current intent; incoming intent accepted",
        priority: incomingPriority,
        preemptsCurrent: preemptsActiveSequence,
      };
    }

    // If incoming priority is strictly higher (lower number), it preempts current
    if (incomingPriority < currentPriority) {
      return {
        accepted: true,
        reason: `Higher priority (${incomingPriority} vs ${currentPriority}) preempts current intent`,
        priority: incomingPriority,
        preemptsCurrent: true,
      };
    }

    // If equal priority:
    // For OPEN_PROJECT: Project B supersedes Project A
    if (incomingPriority === currentPriority && incomingIntent.type === "OPEN_PROJECT" && currentIntent.type === "OPEN_PROJECT") {
      return {
        accepted: true,
        reason: "Successive project transition supersedes active project transition",
        priority: incomingPriority,
        preemptsCurrent: true,
      };
    }

    // For environment toggles (Level 4): safe to apply immediately
    if (incomingPriority === 4 && currentPriority === 4) {
      return {
        accepted: true,
        reason: "Environment setting updated",
        priority: incomingPriority,
        preemptsCurrent: false,
      };
    }

    // Otherwise, if current intent is active and not interruptible by equal or lower priority:
    return {
      accepted: false,
      reason: `Current intent (${currentIntent.type}, prio ${currentPriority}) blocks incoming intent (${incomingIntent.type}, prio ${incomingPriority})`,
      priority: incomingPriority,
      preemptsCurrent: false,
    };
  }

  public reset(): void {
    this.lastResidentGreetingTime = 0;
    this.lastResidentGlanceTime = 0;
    this.lastPaintingTime = 0;
    this.lastPlantTime = 0;
    this.lastChairTime = 0;
  }
}
