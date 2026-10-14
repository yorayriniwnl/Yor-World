import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createExperienceController,
  ExperienceController,
  type NavigationAdapter,
  type CameraDirectorAdapter,
  type CharacterDirectorAdapter,
} from "../../src/features/experience/controller";

describe("ExperienceController & Interaction Arbitration (Task C1)", () => {
  let controller: ExperienceController;
  let mockNav: {
    openProject: ReturnType<typeof vi.fn>;
    openRoute: ReturnType<typeof vi.fn>;
  };
  let mockCam: {
    transitionTo: ReturnType<typeof vi.fn>;
    setCameraPreset: ReturnType<typeof vi.fn>;
    setReducedMotion: ReturnType<typeof vi.fn>;
    getCurrentPreset: ReturnType<typeof vi.fn>;
  };
  let mockChar: {
    playGreeting: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
    settle: ReturnType<typeof vi.fn>;
    mode: string;
    currentClip: string;
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    mockNav = {
      openProject: vi.fn(),
      openRoute: vi.fn(),
    };
    mockCam = {
      transitionTo: vi.fn().mockResolvedValue(undefined),
      setCameraPreset: vi.fn(),
      setReducedMotion: vi.fn(),
      getCurrentPreset: vi.fn().mockReturnValue("home-desktop"),
    };
    mockChar = {
      playGreeting: vi.fn().mockReturnValue(1),
      cancel: vi.fn().mockReturnValue(2),
      settle: vi.fn().mockReturnValue(3),
      mode: "coding",
      currentClip: "coding_idle",
    };

    controller = createExperienceController({
      navigation: mockNav as unknown as NavigationAdapter,
      cameraDirector: mockCam as unknown as CameraDirectorAdapter,
      characterDirector: mockChar as unknown as CharacterDirectorAdapter,
    });
  });

  describe("Invariants: Single Owners and High-Level State", () => {
    it("exposes exactly one canonical owner for each subsystem", () => {
      const snap = controller.getSnapshot();
      expect(snap.singleOwners.rendererOwner).toBe("primary-renderer-lifecycle");
      expect(snap.singleOwners.cameraOwner).toBe("primary-camera-director");
      expect(snap.singleOwners.characterActionOwner).toBe("primary-character-director");
      expect(snap.singleOwners.transitionOwner).toBe("primary-transition-coordinator");
      expect(snap.singleOwners.experienceControllerOwner).toBe("primary-experience-controller");
    });

    it("maintains a coherent high-level experience state snapshot", () => {
      const snap = controller.getSnapshot();
      expect(snap.phase).toBe("explore");
      expect(snap.activeProject).toBeNull();
      expect(snap.activePanel).toBeNull();
      expect(snap.world.lampOn).toBe(true);
      expect(snap.world.blindsOpen).toBe(true);
      expect(snap.world.detailFound).toBe(false);
      expect(snap.preferences.clock24h).toBe(true);
      expect(snap.preferences.soundEnabled).toBe(false);
    });

    it("assigns monotonically increasing transition IDs", async () => {
      expect(controller.getSnapshot().currentTransitionId).toBe(0);
      await controller.send({ type: "OPEN_PROJECT", projectId: "candidatex", source: "room" });
      const id1 = controller.getSnapshot().currentTransitionId;
      expect(id1).toBeGreaterThan(0);

      await controller.send({ type: "ESCAPE" });
      await controller.send({ type: "OPEN_PROJECT", projectId: "helios", source: "room" });
      const id2 = controller.getSnapshot().currentTransitionId;
      expect(id2).toBeGreaterThan(id1);
    });
  });

  describe("Attack 1: resident -> resident rapidly", () => {
    it("rejects duplicate greeting clicks during active sequence without queuing", async () => {
      // First click: accepted
      await controller.send({ type: "GREET" });
      expect(mockChar.playGreeting).toHaveBeenCalledTimes(1);

      // Rapid second click within 50ms: duplicate must be dropped
      await controller.send({ type: "GREET" });
      expect(mockChar.playGreeting).toHaveBeenCalledTimes(1);

      // Third rapid click: still dropped
      await controller.send({ type: "GREET" });
      expect(mockChar.playGreeting).toHaveBeenCalledTimes(1);
    });

    it("triggers attention glance when clicked during 7s cooldown after sequence", async () => {
      await controller.send({ type: "GREET" });
      expect(mockChar.playGreeting).toHaveBeenCalledTimes(1);

      // Mark character sequence as completed back to coding
      controller.greeting.update();
      // Character is now in cooldown window
      // Simulate click at 2000ms (within 7s cooldown)
      const spy = vi.spyOn(Date, "now").mockReturnValue(Date.now() + 2000);

      await controller.send({ type: "GREET" });
      // Glance triggers playGreeting briefly
      expect(mockChar.playGreeting).toHaveBeenCalledTimes(2);
      spy.mockRestore();
    });
  });

  describe("Attack 2: resident -> project preemption", () => {
    it("immediately cancels resident greeting and transitions to project", async () => {
      // 1. Start greeting sequence
      await controller.send({ type: "GREET" });
      expect(controller.greeting.isBusy()).toBe(true);

      // 2. Click project prop while greeting is active
      await controller.send({ type: "OPEN_PROJECT", projectId: "candidatex", source: "room" });

      // Character must be settled immediately to safe coding pose (<=50ms)
      expect(mockChar.settle).toHaveBeenCalled();
      expect(controller.greeting.isBusy()).toBe(false);

      // Camera transitions to project target and navigation executes
      expect(mockCam.transitionTo).toHaveBeenCalledWith("monitor", expect.any(Number));
      expect(mockNav.openProject).toHaveBeenCalledWith("candidatex");
    });
  });

  describe("Attack 3: project A -> project B (stale-completion rejection)", () => {
    it("aborts Project A, rejects stale completion, and navigates only to Project B", async () => {
      let resolveProjectA: () => void = () => {};
      let resolveProjectB: () => void = () => {};

      mockCam.transitionTo.mockImplementationOnce(() => {
        return new Promise<void>((res) => {
          resolveProjectA = res;
        });
      });
      mockCam.transitionTo.mockImplementationOnce(() => {
        return new Promise<void>((res) => {
          resolveProjectB = res;
        });
      });

      // 1. User clicks Project A (CandidateX)
      const promiseA = controller.send({ type: "OPEN_PROJECT", projectId: "candidatex", source: "room" });
      const transitionIdA = controller.getSnapshot().currentTransitionId;
      expect(controller.getSnapshot().activeProject).toBe("candidatex");

      // 2. User quickly clicks Project B (Helios) while Project A is in flight
      const promiseB = controller.send({ type: "OPEN_PROJECT", projectId: "helios", source: "room" });
      const transitionIdB = controller.getSnapshot().currentTransitionId;
      expect(transitionIdB).toBeGreaterThan(transitionIdA);
      expect(controller.getSnapshot().activeProject).toBe("helios");

      // 3. Project A's delayed camera transition finally resolves (stale!)
      resolveProjectA();
      await promiseA;

      // Crucial: Obsolete async work for Project A must NEVER navigate!
      expect(mockNav.openProject).not.toHaveBeenCalledWith("candidatex");

      // 4. Project B's camera transition resolves
      resolveProjectB();
      await promiseB;

      // Project B navigates cleanly!
      expect(mockNav.openProject).toHaveBeenCalledWith("helios");
      expect(mockNav.openProject).toHaveBeenCalledTimes(1);
    });
  });

  describe("Attack 4: painting during camera movement", () => {
    it("drops or coalesces decorative painting drag during active project transition", async () => {
      let resolveCam: () => void = () => {};
      mockCam.transitionTo.mockImplementationOnce(() => new Promise<void>((res) => (resolveCam = res)));

      // Start project transition (Priority 2)
      const projectPromise = controller.send({ type: "OPEN_PROJECT", projectId: "zenith", source: "room" });

      // Try to tilt painting (Priority 5) while camera is moving
      const tilted = controller.tiltPainting(5.0);
      expect(tilted).toBe(false);

      // Painting tilt was dropped because higher priority transition is active
      expect(controller.getSnapshot().paintingAngleDeg).toBe(0);

      resolveCam();
      await projectPromise;
    });
  });

  describe("Attack 5: Escape during interaction (safe base-state restoration)", () => {
    it("cancels project focus, restores explore phase, and preserves base preferences", async () => {
      // Setup base state: lamp off, blinds closed
      await controller.send({ type: "SET_LAMP", enabled: false });
      await controller.send({ type: "SET_BLINDS", open: false });
      expect(controller.getSnapshot().world.lampOn).toBe(false);
      expect(controller.getSnapshot().world.blindsOpen).toBe(false);

      // Begin project transition
      let resolveCam: () => void = () => {};
      mockCam.transitionTo.mockImplementationOnce(() => new Promise<void>((res) => (resolveCam = res)));
      const projectPromise = controller.send({ type: "OPEN_PROJECT", projectId: "candidatex", source: "room" });

      // User presses Escape during transition
      await controller.send({ type: "ESCAPE" });

      // Resolve stale camera transition
      resolveCam();
      await projectPromise;

      // State verification
      const snap = controller.getSnapshot();
      expect(snap.phase).toBe("explore");
      expect(snap.activeProject).toBeNull();
      expect(snap.world.lampOn).toBe(false);
      expect(snap.world.blindsOpen).toBe(false);
      expect(mockNav.openProject).not.toHaveBeenCalled();
      expect(mockChar.settle).toHaveBeenCalled();
      expect(mockCam.setCameraPreset).toHaveBeenCalledWith("home-desktop");
    });
  });

  describe("Attack 6: Back & route navigation during interaction", () => {
    it("aborts active interaction and navigates to route without hanging promises", async () => {
      let resolveCam: () => void = () => {};
      mockCam.transitionTo.mockImplementationOnce(() => new Promise<void>((res) => (resolveCam = res)));
      const projectPromise = controller.send({ type: "OPEN_PROJECT", projectId: "candidatex", source: "room" });

      // User triggers route navigation (e.g. clicks About link or browser Back)
      await controller.send({ type: "NAVIGATE", path: "/about", source: "dom", camera: null });

      resolveCam();
      await projectPromise;

      expect(mockNav.openRoute).toHaveBeenCalledWith("/about");
      expect(mockNav.openProject).not.toHaveBeenCalled();
      expect(controller.getSnapshot().phase).toBe("static");
    });
  });

  describe("Attack 7: hide/show visibility suspension", () => {
    it("sets suspended state on HIDE and restores on SHOW without time leaps", async () => {
      expect(controller.getSnapshot().suspended).toBe(false);

      await controller.send({ type: "HIDE" });
      expect(controller.getSnapshot().suspended).toBe(true);

      // While suspended, advance does not advance controllers
      controller.advance(0.1);

      await controller.send({ type: "SHOW" });
      expect(controller.getSnapshot().suspended).toBe(false);
    });
  });

  describe("Attack 8: renderer failure", () => {
    it("transitions cleanly to static fallback and aborts in-flight work on RENDERER_FAILED", async () => {
      let resolveCam: () => void = () => {};
      mockCam.transitionTo.mockImplementationOnce(() => new Promise<void>((res) => (resolveCam = res)));
      const projectPromise = controller.send({ type: "OPEN_PROJECT", projectId: "helios", source: "room" });

      await controller.send({ type: "RENDERER_FAILED", code: "CONTEXT_LOST" });

      resolveCam();
      await projectPromise;

      const snap = controller.getSnapshot();
      expect(snap.phase).toBe("static");
      expect(snap.activeProject).toBeNull();
      expect(mockNav.openProject).not.toHaveBeenCalled();
    });
  });

  describe("Attack 9: unmount cleanup", () => {
    it("disposes cancellation coordinator and settles character on stop()", () => {
      controller.stop();
      expect(mockChar.settle).toHaveBeenCalled();
      expect(controller.cancellation.isCurrent(1)).toBe(false);
    });
  });

  describe("Attack 10: reduced motion", () => {
    it("bypasses camera travel and opens project immediately under reduced motion", async () => {
      controller.setReducedMotion(true);

      await controller.send({ type: "OPEN_PROJECT", projectId: "candidatex", source: "room" });

      // transitionTo with duration should NOT be called; instant preset set instead
      expect(mockCam.setCameraPreset).toHaveBeenCalledWith("monitor");
      expect(mockNav.openProject).toHaveBeenCalledWith("candidatex");
    });
  });
});
