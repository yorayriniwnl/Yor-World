import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  chooseInitialTier,
  updateTier,
  filterNoisySamples,
  AdaptiveQualityController,
} from "../../src/features/room/quality-policy";
import { AudioController } from "../../src/features/experience/audio";
import { ReducedMotionController } from "../../src/features/experience/reduced-motion";
import { PreferencesStore } from "../../src/features/experience/preferences-store";

describe("C3 Adaptive Quality Policy & chooseInitialTier", () => {
  it("starts software rendering conservatively while preserving explicit choices and measured adaptation", () => {
    expect(chooseInitialTier({ hasWebGL: true, isSoftwareRenderer: true })).toBe("low");
    expect(chooseInitialTier({ hasWebGL: true, isSoftwareRenderer: true, userPreference: "high" })).toBe("high");
    const controller = new AdaptiveQualityController({ hasWebGL: true, isSoftwareRenderer: true });
    for (let window = 0; window < 10; window++) {
      for (let frame = 0; frame < 120; frame++) controller.recordFrame(10);
      controller.evaluateWindow();
    }
    expect(controller.getTier()).toBe("medium");
  });
  it("returns 'static' when WebGL is unavailable", () => {
    const tier = chooseInitialTier({ hasWebGL: false });
    expect(tier).toBe("static");
  });

  it("returns 'static' when WebGL is unavailable even if user preferred 'high'", () => {
    const tier = chooseInitialTier({ hasWebGL: false, userPreference: "high" });
    expect(tier).toBe("static");
  });

  it("honors explicit user preference when WebGL is available", () => {
    expect(chooseInitialTier({ hasWebGL: true, userPreference: "low" })).toBe("low");
    expect(chooseInitialTier({ hasWebGL: true, userPreference: "medium" })).toBe("medium");
    expect(chooseInitialTier({ hasWebGL: true, userPreference: "high" })).toBe("high");
    expect(chooseInitialTier({ hasWebGL: true, userPreference: "static" })).toBe("static");
  });

  it("returns 'low' when saveData is active", () => {
    const tier = chooseInitialTier({ hasWebGL: true, saveData: true });
    expect(tier).toBe("low");
  });

  it("returns 'low' when GPU maxTextureSize is constrained (< 4096)", () => {
    const tier = chooseInitialTier({ hasWebGL: true, maxTextureSize: 2048 });
    expect(tier).toBe("low");
  });

  it("returns 'low' on constrained mobile devices (<= 3GB RAM or <= 4 cores)", () => {
    const lowRamMobile = chooseInitialTier({
      hasWebGL: true,
      isMobile: true,
      deviceMemoryGb: 3,
      hardwareConcurrency: 8,
    });
    expect(lowRamMobile).toBe("low");

    const lowCoresMobile = chooseInitialTier({
      hasWebGL: true,
      isMobile: true,
      deviceMemoryGb: 6,
      hardwareConcurrency: 4,
    });
    expect(lowCoresMobile).toBe("low");
  });

  it("returns 'medium' on capable mobile devices (> 3GB RAM and > 4 cores)", () => {
    const capableMobile = chooseInitialTier({
      hasWebGL: true,
      isMobile: true,
      deviceMemoryGb: 6,
      hardwareConcurrency: 8,
    });
    expect(capableMobile).toBe("medium");
  });

  it("returns 'low' on constrained desktop devices (< 4GB RAM or <= 2 cores)", () => {
    const lowRamDesktop = chooseInitialTier({
      hasWebGL: true,
      isMobile: false,
      deviceMemoryGb: 2,
      hardwareConcurrency: 4,
    });
    expect(lowRamDesktop).toBe("low");

    const lowCoresDesktop = chooseInitialTier({
      hasWebGL: true,
      isMobile: false,
      deviceMemoryGb: 8,
      hardwareConcurrency: 2,
    });
    expect(lowCoresDesktop).toBe("low");
  });

  it("returns 'high' on capable desktop systems (>= 8GB RAM, > 4 cores)", () => {
    const tier = chooseInitialTier({
      hasWebGL: true,
      isMobile: false,
      deviceMemoryGb: 16,
      hardwareConcurrency: 8,
    });
    expect(tier).toBe("high");
  });

  it("defaults to 'medium' on mid-tier desktop systems", () => {
    const tier = chooseInitialTier({
      hasWebGL: true,
      isMobile: false,
      deviceMemoryGb: 6,
      hardwareConcurrency: 4,
    });
    expect(tier).toBe("medium");
  });
});

describe("C3 Frame Timing & updateTier Invariants", () => {
  it("filters noisy frame-time samples and discards extreme outlier GC spikes", () => {
    // Normal 60fps frames (~16.6ms) with an occasional 120ms GC spike
    const rawSamples = [16.2, 16.5, 16.7, 16.3, 16.8, 120.0, 16.4, 16.6, 16.5];
    const { median, p95, filtered } = filterNoisySamples(rawSamples);

    expect(median).toBeCloseTo(16.5, 1);
    expect(filtered).not.toContain(120.0);
    expect(p95).toBeLessThan(120.0);
  });

  it("preserves explicit user quality preference regardless of frame timings", () => {
    // Very slow frame times (50ms = 20fps), but user requested 'high'
    const slowSamples = [50, 52, 48, 55, 60];
    const tier = updateTier(slowSamples, "high", "high", {
      consecutiveSlowWindows: 5,
    });
    expect(tier).toBe("high");
  });

  it("does not downgrade on fewer than three consecutive slow windows", () => {
    const slowSamples = [35, 36, 38, 40];
    // 1 slow window
    const tier1 = updateTier(slowSamples, "high", "auto", {
      consecutiveSlowWindows: 1,
      consecutiveSlowWindowsToDowngrade: 3,
    });
    expect(tier1).toBe("high");

    // 2 slow windows
    const tier2 = updateTier(slowSamples, "high", "auto", {
      consecutiveSlowWindows: 2,
      consecutiveSlowWindowsToDowngrade: 3,
    });
    expect(tier2).toBe("high");
  });

  it("downgrades tier after three consecutive slow windows (HIGH -> MEDIUM -> LOW -> STATIC)", () => {
    const slowSamples = [35, 36, 38, 40];

    // High downgrades to Medium
    const tierMedium = updateTier(slowSamples, "high", "auto", {
      consecutiveSlowWindows: 3,
      consecutiveSlowWindowsToDowngrade: 3,
    });
    expect(tierMedium).toBe("medium");

    // Medium downgrades to Low
    const tierLow = updateTier(slowSamples, "medium", "auto", {
      consecutiveSlowWindows: 3,
      consecutiveSlowWindowsToDowngrade: 3,
    });
    expect(tierLow).toBe("low");

    // Low downgrades to Static
    const tierStatic = updateTier(slowSamples, "low", "auto", {
      consecutiveSlowWindows: 3,
      consecutiveSlowWindowsToDowngrade: 3,
    });
    expect(tierStatic).toBe("static");
  });

  it("does NOT upgrade tier when state is NOT safe HOME (e.g. during intro or focus)", () => {
    const fastSamples = [10, 11, 12, 11, 10]; // Excellent headroom (< 14ms)

    // Even with 15 headroom windows, if in 'intro' or 'focus', no upgrade allowed
    const tierIntro = updateTier(fastSamples, "medium", "auto", {
      currentPhase: "intro",
      isSafeHomeState: false,
      consecutiveHeadroomWindows: 15,
      consecutiveHeadroomWindowsToUpgrade: 10,
    });
    expect(tierIntro).toBe("medium");

    const tierFocus = updateTier(fastSamples, "medium", "auto", {
      currentPhase: "focus",
      isSafeHomeState: false,
      consecutiveHeadroomWindows: 15,
      consecutiveHeadroomWindowsToUpgrade: 10,
    });
    expect(tierFocus).toBe("medium");
  });

  it("upgrades tier after 20 seconds of stable headroom ONLY at safe HOME state", () => {
    const fastSamples = [11, 12, 11, 12, 10]; // Headroom < 14ms

    // Safe HOME state with 10 consecutive headroom windows (20s) -> upgrades medium to high
    const tierHigh = updateTier(fastSamples, "medium", "auto", {
      currentPhase: "home",
      isSafeHomeState: true,
      consecutiveHeadroomWindows: 10,
      consecutiveHeadroomWindowsToUpgrade: 10,
    });
    expect(tierHigh).toBe("high");

    // Upgrades low to medium
    const tierMedium = updateTier(fastSamples, "low", "auto", {
      currentPhase: "explore",
      isSafeHomeState: true,
      consecutiveHeadroomWindows: 10,
      consecutiveHeadroomWindowsToUpgrade: 10,
    });
    expect(tierMedium).toBe("medium");
  });

  it("AdaptiveQualityController statefully tracks windows and triggers onTierChange", () => {
    const onTierChange = vi.fn();
    const ctrl = new AdaptiveQualityController(
      { hasWebGL: true, isMobile: false, deviceMemoryGb: 16, hardwareConcurrency: 8 },
      { onTierChange }
    );

    expect(ctrl.getTier()).toBe("high");

    // Feed 3 consecutive slow windows (> 25ms)
    for (let w = 0; w < 3; w++) {
      for (let f = 0; f < 30; f++) {
        ctrl.recordFrame(35.0);
      }
      ctrl.evaluateWindow();
    }

    expect(ctrl.getTier()).toBe("medium");
    expect(onTierChange).toHaveBeenCalledWith("medium");

    // Reset and test user manual preference
    ctrl.setUserPreference("low");
    expect(ctrl.getTier()).toBe("low");
    expect(onTierChange).toHaveBeenCalledWith("low");
  });
});

describe("C3 AudioController Opt-in, Denial & Disposal", () => {
  let originalAudioContext: unknown;

  beforeEach(() => {
    originalAudioContext = (globalThis as unknown as { AudioContext: unknown }).AudioContext;
  });

  afterEach(() => {
    (globalThis as unknown as { AudioContext: unknown }).AudioContext = originalAudioContext;
  });

  it("initializes with audio disabled by default", () => {
    const audio = new AudioController();
    expect(audio.isEnabled()).toBe(false);
  });

  it("enables audio when browser AudioContext resumes successfully", async () => {
    const mockResume = vi.fn().mockResolvedValue(undefined);
    class MockAudioContext {
      public state = "suspended";
      public currentTime = 0;
      public resume() {
        this.state = "running";
        return mockResume();
      }
      public suspend() {
        this.state = "suspended";
        return Promise.resolve();
      }
      public close() {
        this.state = "closed";
        return Promise.resolve();
      }
    }

    (globalThis as unknown as { AudioContext: unknown }).AudioContext = MockAudioContext;

    const audio = new AudioController();
    const result = await audio.setEnabled(true);

    expect(result).toBe(true);
    expect(audio.isEnabled()).toBe(true);
    expect(mockResume).toHaveBeenCalled();
  });

  it("reports actual disabled state (false) when browser denies audio activation", async () => {
    // Autoplay policy rejection
    const mockResume = vi.fn().mockRejectedValue(new Error("Autoplay not allowed without user interaction"));
    class DeniedAudioContext {
      public state = "suspended";
      public resume() {
        return mockResume();
      }
      public close() {
        return Promise.resolve();
      }
    }

    (globalThis as unknown as { AudioContext: unknown }).AudioContext = DeniedAudioContext;

    const audio = new AudioController();
    const result = await audio.setEnabled(true);

    expect(result).toBe(false);
    expect(audio.isEnabled()).toBe(false);
  });

  it("handles setEnabled(false) to mute audio cleanly", async () => {
    const mockSuspend = vi.fn().mockResolvedValue(undefined);
    class MockAudioContext {
      public state = "running";
      public suspend() {
        this.state = "suspended";
        return mockSuspend();
      }
      public close() {
        return Promise.resolve();
      }
    }

    (globalThis as unknown as { AudioContext: unknown }).AudioContext = MockAudioContext;

    const audio = new AudioController();
    // Simulate active then mute
    await audio.setEnabled(false);
    expect(audio.isEnabled()).toBe(false);
  });

  it("idempotently disposes AudioController and cleans up resources", async () => {
    const mockClose = vi.fn().mockResolvedValue(undefined);
    class MockAudioContext {
      public state = "running";
      public close() {
        return mockClose();
      }
    }

    (globalThis as unknown as { AudioContext: unknown }).AudioContext = MockAudioContext;

    const audio = new AudioController();
    await audio.setEnabled(true);

    audio.dispose();
    expect(audio.isEnabled()).toBe(false);
    expect(mockClose).toHaveBeenCalled();

    // Second call is safe and idempotent
    expect(() => audio.dispose()).not.toThrow();
  });
});

describe("C3 ReducedMotionController Invariants", () => {
  it("removes camera travel by returning 0ms transition duration", () => {
    const ctrl = new ReducedMotionController(true);
    expect(ctrl.isReducedMotion()).toBe(true);

    // Standard duration is 800ms, but reduced motion MUST return 0ms
    const duration = ctrl.getCameraTransitionDuration(800);
    expect(duration).toBe(0);
  });

  it("removes pointer parallax completely by returning 0.0 parallax factor", () => {
    const ctrl = new ReducedMotionController(true);
    expect(ctrl.getParallaxFactor(1.0)).toBe(0.0);
  });

  it("allows standard duration and parallax when reduced motion is false", () => {
    const ctrl = new ReducedMotionController(false);
    expect(ctrl.getCameraTransitionDuration(800)).toBe(800);
    expect(ctrl.getParallaxFactor(1.0)).toBe(1.0);
  });

  it("toggles decorative paused state independently", () => {
    const ctrl = new ReducedMotionController(false);
    expect(ctrl.isDecorativePaused()).toBe(false);
    ctrl.setDecorativePaused(true);
    expect(ctrl.isDecorativePaused()).toBe(true);
  });
});

describe("C3 Storage Resilience (Denied & Corrupt localStorage)", () => {
  let originalStorage: Storage | undefined;

  beforeEach(() => {
    originalStorage = globalThis.window?.localStorage;
  });

  afterEach(() => {
    if (globalThis.window && originalStorage) {
      Object.defineProperty(globalThis.window, "localStorage", {
        value: originalStorage,
        configurable: true,
      });
    }
  });

  it("falls back to in-memory preferences when localStorage access throws SecurityError (storage denied)", () => {
    if (typeof window !== "undefined") {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("The operation is insecure.", "SecurityError");
        },
        configurable: true,
      });
    }

    const store = new PreferencesStore({ soundEnabled: false });
    const prefs = store.get();
    expect(prefs.soundEnabled).toBe(false);

    // Update should safely modify in-memory copy without throwing
    const updated = store.update({ soundEnabled: true });
    expect(updated.soundEnabled).toBe(true);
  });

  it("resets to defaults when localStorage contains corrupt or invalid JSON data", () => {
    if (typeof window !== "undefined") {
      const mockStorage: Record<string, string> = {
        yor_world_preferences_v1: "{ corrupt_json: [[invalid",
      };

      Object.defineProperty(window, "localStorage", {
        value: {
          getItem: (key: string) => mockStorage[key] || null,
          setItem: (key: string, val: string) => {
            mockStorage[key] = val;
          },
          removeItem: (key: string) => {
            delete mockStorage[key];
          },
        },
        configurable: true,
      });
    }

    const store = new PreferencesStore();
    const prefs = store.get();
    expect(prefs.version).toBe(1);
    expect(prefs.quality).toBe("auto");
    expect(prefs.soundEnabled).toBe(false);
  });

  it("resets to defaults when localStorage schema validation fails (schema mismatch)", () => {
    if (typeof window !== "undefined") {
      const mockStorage: Record<string, string> = {
        yor_world_preferences_v1: JSON.stringify({
          version: 999, // Incompatible version
          unknownField: true,
        }),
      };

      Object.defineProperty(window, "localStorage", {
        value: {
          getItem: (key: string) => mockStorage[key] || null,
          setItem: (key: string, val: string) => {
            mockStorage[key] = val;
          },
        },
        configurable: true,
      });
    }

    const store = new PreferencesStore();
    const prefs = store.get();
    expect(prefs.version).toBe(1);
    expect(prefs.quality).toBe("auto");
  });
});
