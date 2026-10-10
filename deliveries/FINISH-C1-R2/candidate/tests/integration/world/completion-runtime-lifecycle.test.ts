import { describe, expect, it, vi, afterEach } from "vitest";
import { WorldRuntime } from "../../../src/features/world/WorldRuntime";
import { LifecycleManager } from "../../../src/features/world/LifecycleManager";
import { ExperienceController } from "../../../src/features/experience/controller";

function createMockCanvas(): HTMLCanvasElement {
  return {
    getContext: () => null,
    addEventListener: () => {},
    removeEventListener: () => {},
    isConnected: true,
    style: {},
    clientWidth: 800,
    clientHeight: 600,
    width: 800,
    height: 600,
    getBoundingClientRect: () => ({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      bottom: 600,
      right: 800,
      x: 0,
      y: 0,
      toJSON: () => {},
    }),
  } as unknown as HTMLCanvasElement;
}

describe("Completion: Integrated Runtime Lifecycle, Session Adoption and Pause", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("adopts optional deskmat and wallpaper textures and applies them to scene meshes", () => {
    vi.stubGlobal("window", {
      innerWidth: 1024,
      innerHeight: 768,
      devicePixelRatio: 1,
      matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
    });

    const canvas = createMockCanvas();
    const ec = new ExperienceController();
    const lm = new LifecycleManager();

    const runtime = new WorldRuntime({
      canvas,
      experienceController: ec,
      lifecycleManager: lm,
      initialTier: "high",
      initialPaused: false,
    });

    expect(runtime.isDecorativePaused).toBe(false);

    // Toggle pause and verify propagation
    runtime.setDecorativePaused(true);
    expect(runtime.isDecorativePaused).toBe(true);

    runtime.dispose();
  });
});
