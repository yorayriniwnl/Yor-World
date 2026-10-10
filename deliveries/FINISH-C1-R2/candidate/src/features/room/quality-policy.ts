import { QualityTier } from "../../contracts/experience";

export interface DeviceCapabilities {
  hasWebGL: boolean;
  isMobile?: boolean;
  deviceMemoryGb?: number;
  hardwareConcurrency?: number;
  saveData?: boolean;
  prefersReducedMotion?: boolean;
  maxTextureSize?: number;
  isSoftwareRenderer?: boolean;
  userPreference?: QualityTier | "auto";
}

export interface UpdateTierOptions {
  currentPhase?: string; // "explore" | "home" | "intro" | "focus" | "panel" | "static"
  targetFps?: 60 | 30;
  slowThresholdMs?: number; // default: 25ms (for 60fps) or 33.3ms (for 30fps)
  headroomThresholdMs?: number; // default: 14ms
  consecutiveSlowWindows?: number; // number of observed consecutive slow windows
  consecutiveHeadroomWindows?: number; // number of observed consecutive headroom windows
  consecutiveSlowWindowsToDowngrade?: number; // default 3
  consecutiveHeadroomWindowsToUpgrade?: number; // default 10 (20s at 2s/window)
  isSafeHomeState?: boolean; // whether current state is safe for upgrade
}

/**
 * Filter noisy frame time samples:
 * Removes single-frame anomalous spikes (e.g. GC pauses or tab backgrounding)
 * using a trimmed/percentile approach to ensure robust decision-making.
 */
export function filterNoisySamples(samples: number[]): { median: number; p95: number; filtered: number[] } {
  if (!samples || samples.length === 0) {
    return { median: 16.67, p95: 16.67, filtered: [] };
  }

  const sorted = [...samples].filter((s) => Number.isFinite(s) && s >= 0).sort((a, b) => a - b);
  if (sorted.length === 0) {
    return { median: 16.67, p95: 16.67, filtered: [] };
  }

  const mid = Math.floor(sorted.length / 2);
  const midVal = sorted[mid] ?? 16.67;
  const midPrev = sorted[mid - 1] ?? midVal;
  const median = sorted.length % 2 !== 0 ? midVal : (midPrev + midVal) / 2;

  // Discard extreme outlier frames (> 3.5x median and > 60ms) when calculating stable metrics
  const filtered = sorted.filter((s) => s <= Math.max(median * 3.5, 60));
  const effective = filtered.length > 0 ? filtered : sorted;
  const p95Index = Math.min(Math.floor(effective.length * 0.95), effective.length - 1);
  const p95 = effective[p95Index] ?? median;

  return { median, p95, filtered: effective };
}

/**
 * chooseInitialTier:
 * Determines the baseline quality tier given client/hardware capabilities.
 * Order of checks:
 * 1. Explicit user preference honored if WebGL is supported; missing WebGL forces static.
 * 2. Missing WebGL -> STATIC
 * 3. Actual software renderer or saveData -> LOW
 * 4. maxTextureSize < 4096 -> LOW
 * 5. Mobile devices -> LOW if constrained RAM/cores, else MEDIUM.
 * 6. Desktop devices -> HIGH if capable, else MEDIUM or LOW.
 */
export function chooseInitialTier(capabilities: DeviceCapabilities): QualityTier {
  // If WebGL is not available, static is non-negotiable
  if (!capabilities.hasWebGL) {
    return "static";
  }

  // Explicit user preference takes precedence when WebGL is available
  if (capabilities.userPreference && capabilities.userPreference !== "auto") {
    return capabilities.userPreference;
  }

  // Software rasterization is a conservative startup hint; measured windows
  // still drive the unchanged adaptive policy and explicit choices stay authoritative.
  if (capabilities.isSoftwareRenderer) return "low";

  // Network / data saving preference
  if (capabilities.saveData) {
    return "low";
  }

  // GPU texture capability constraint
  if (capabilities.maxTextureSize !== undefined && capabilities.maxTextureSize < 4096) {
    return "low";
  }

  // Mobile device policy
  if (capabilities.isMobile) {
    const lowMem = capabilities.deviceMemoryGb !== undefined && capabilities.deviceMemoryGb <= 3;
    const lowCores = capabilities.hardwareConcurrency !== undefined && capabilities.hardwareConcurrency <= 4;
    if (lowMem || lowCores) {
      return "low";
    }
    return "medium";
  }

  // Desktop device policy
  const constrainedMem = capabilities.deviceMemoryGb !== undefined && capabilities.deviceMemoryGb < 4;
  const constrainedCores = capabilities.hardwareConcurrency !== undefined && capabilities.hardwareConcurrency <= 2;
  if (constrainedMem || constrainedCores) {
    return "low";
  }

  const highMem = capabilities.deviceMemoryGb === undefined || capabilities.deviceMemoryGb >= 8;
  const highCores = capabilities.hardwareConcurrency === undefined || capabilities.hardwareConcurrency > 4;

  if (highMem && highCores) {
    return "high";
  }

  return "medium";
}

/**
 * updateTier:
 * Adapts quality tier according to measured frame times.
 * Invariants:
 * - User explicit preference ("high" | "medium" | "low" | "static") is NEVER overridden by automated scaling.
 * - Downgrade occurs after 3 consecutive slow windows (> slowThresholdMs, e.g. 25ms for 60fps / 33.3ms for 30fps).
 * - Upgrades require 20 seconds of stable headroom (< headroomThresholdMs, e.g. 14ms) AND safe HOME state.
 * - Upgrades never occur during active transitions, focus, intro, or non-home camera states.
 * - Static mode is not automatically upgraded if WebGL is unavailable.
 */
export function updateTier(
  samples: number[],
  currentTier: QualityTier,
  userPreference?: QualityTier | "auto",
  options?: UpdateTierOptions
): QualityTier {
  // 1. Preserve explicit user quality preference
  if (userPreference && userPreference !== "auto") {
    return userPreference;
  }

  // 2. Static tier does not auto-upgrade
  if (currentTier === "static") {
    return "static";
  }

  if (!samples || samples.length === 0) {
    return currentTier;
  }

  const slowCount = options?.consecutiveSlowWindows ?? 0;
  const headroomCount = options?.consecutiveHeadroomWindows ?? 0;
  const slowRequired = options?.consecutiveSlowWindowsToDowngrade ?? 3;
  const headroomRequired = options?.consecutiveHeadroomWindowsToUpgrade ?? 10; // 10 x 2s = 20s

  // Check downgrade:
  // Trigger downgrade when consecutive slow windows threshold is satisfied
  if (slowCount >= slowRequired) {
    // Order of reductions: high -> medium -> low -> static
    if (currentTier === "high") return "medium";
    if (currentTier === "medium") return "low";
    if (currentTier === "low") return "static";
    return "static";
  }

  // Check upgrade:
  // Upgrades require stable headroom (< headroomThreshold), required headroom windows (20s),
  // AND safe HOME / explore state.
  const phase = options?.currentPhase ?? "home";
  const isSafeHome = options?.isSafeHomeState ?? (phase === "home" || phase === "explore");

  if (isSafeHome && headroomCount >= headroomRequired) {
    // Upgrade order: low -> medium -> high
    if (currentTier === "low") return "medium";
    if (currentTier === "medium") return "high";
    return "high";
  }

  return currentTier;
}

/**
 * AdaptiveQualityController:
 * Stateful coordinator for sampling windows, tracking consecutive slow/headroom
 * periods, and triggering safe quality-tier transitions.
 */
export class AdaptiveQualityController {
  private currentTier: QualityTier;
  private userPreference: QualityTier | "auto";
  private consecutiveSlowWindows: number = 0;
  private consecutiveHeadroomWindows: number = 0;
  private currentPhase: string = "home";
  private isSafeHome: boolean = true;
  private readonly slowThresholdMs: number;
  private readonly headroomThresholdMs: number;
  private readonly slowWindowsToDowngrade: number = 3;
  private readonly headroomWindowsToUpgrade: number = 10; // 20 seconds at 2s intervals
  private windowSamples: number[] = [];
  private onTierChange?: ((tier: QualityTier) => void) | undefined;

  constructor(
    initialCapabilities: DeviceCapabilities,
    options?: {
      onTierChange?: (tier: QualityTier) => void;
      targetFps?: 60 | 30;
      slowThresholdMs?: number;
      headroomThresholdMs?: number;
    }
  ) {
    this.userPreference = initialCapabilities.userPreference ?? "auto";
    this.currentTier = chooseInitialTier(initialCapabilities);
    this.slowThresholdMs = options?.slowThresholdMs ?? (options?.targetFps === 30 ? 33.3 : 25.0);
    this.headroomThresholdMs = options?.headroomThresholdMs ?? 14.0;
    this.onTierChange = options?.onTierChange;
  }

  public getTier(): QualityTier {
    return this.currentTier;
  }

  public setUserPreference(pref: QualityTier | "auto"): void {
    this.userPreference = pref;
    if (pref !== "auto") {
      this.currentTier = pref;
      this.consecutiveSlowWindows = 0;
      this.consecutiveHeadroomWindows = 0;
      this.onTierChange?.(this.currentTier);
    }
  }

  public getUserPreference(): QualityTier | "auto" {
    return this.userPreference;
  }

  public setPhase(phase: string, isSafeHome: boolean = false): void {
    this.currentPhase = phase;
    this.isSafeHome = isSafeHome || phase === "home" || phase === "explore";
    // Non-safe states immediately reset headroom accumulation to prevent unsafe upgrades
    if (!this.isSafeHome) {
      this.consecutiveHeadroomWindows = 0;
    }
  }

  public recordFrame(frameDurationMs: number): void {
    if (Number.isFinite(frameDurationMs) && frameDurationMs > 0) {
      this.windowSamples.push(frameDurationMs);
    }
  }

  /**
   * Finalizes a 2-second sampling window and updates tier if necessary.
   */
  public evaluateWindow(): QualityTier {
    if (this.windowSamples.length === 0) {
      return this.currentTier;
    }

    const { p95 } = filterNoisySamples(this.windowSamples);
    this.windowSamples = [];

    // Check slow window
    if (p95 > this.slowThresholdMs) {
      this.consecutiveSlowWindows += 1;
      this.consecutiveHeadroomWindows = 0;
    } else if (p95 < this.headroomThresholdMs) {
      this.consecutiveSlowWindows = 0;
      if (this.isSafeHome) {
        this.consecutiveHeadroomWindows += 1;
      } else {
        this.consecutiveHeadroomWindows = 0;
      }
    } else {
      // Normal range: reset consecutive counters
      this.consecutiveSlowWindows = 0;
      this.consecutiveHeadroomWindows = 0;
    }

    const newTier = updateTier(
      [p95],
      this.currentTier,
      this.userPreference,
      {
        currentPhase: this.currentPhase,
        isSafeHomeState: this.isSafeHome,
        slowThresholdMs: this.slowThresholdMs,
        headroomThresholdMs: this.headroomThresholdMs,
        consecutiveSlowWindows: this.consecutiveSlowWindows,
        consecutiveHeadroomWindows: this.consecutiveHeadroomWindows,
        consecutiveSlowWindowsToDowngrade: this.slowWindowsToDowngrade,
        consecutiveHeadroomWindowsToUpgrade: this.headroomWindowsToUpgrade,
      }
    );

    if (newTier !== this.currentTier) {
      this.currentTier = newTier;
      this.consecutiveSlowWindows = 0;
      this.consecutiveHeadroomWindows = 0;
      this.onTierChange?.(newTier);
    }

    return this.currentTier;
  }

  public getConsecutiveSlowWindows(): number {
    return this.consecutiveSlowWindows;
  }

  public getConsecutiveHeadroomWindows(): number {
    return this.consecutiveHeadroomWindows;
  }

  public reset(): void {
    this.consecutiveSlowWindows = 0;
    this.consecutiveHeadroomWindows = 0;
    this.windowSamples = [];
  }
}
