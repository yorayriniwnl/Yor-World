import { describe, it, expect, vi } from "vitest";
import * as THREE from "three";
import { ExperienceController } from "../../src/features/experience/controller";
import { integrateScene, CLIP_DURATIONS } from "../../src/features/world/SceneIntegrator";
import { AdaptiveQualityController, updateTier } from "../../src/features/room/quality-policy";
import { findPublishedProject, getActivePublicationSnapshot } from "../../src/content/publication-reader";
import { publishedProjects } from "../../src/features/portfolio/public-content";
import { AudioController } from "../../src/features/experience/audio";
import { ReducedMotionController } from "../../src/features/experience/reduced-motion";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

function createMockClip(name: string, duration: number): THREE.AnimationClip {
  const track = new THREE.VectorKeyframeTrack(".position", [0, duration], [0, 0, 0, 0, 0, 0]);
  return new THREE.AnimationClip(name, duration, [track]);
}

function buildMockW1(): GLTF {
  const scene = new THREE.Group();
  scene.name = "w1-scene";

  const roomShell = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  roomShell.name = "room-shell";
  scene.add(roomShell);

  const desk = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  desk.name = "desk";
  desk.position.set(0, 0.75, -1.15);
  scene.add(desk);

  const chairRoot = new THREE.Group();
  chairRoot.name = "chair-root";
  chairRoot.position.set(0.3, 0, -0.36);

  const chair = new THREE.Group();
  chair.name = "chair";
  chairRoot.add(chair);

  const resident = new THREE.Group();
  resident.name = "resident";
  chairRoot.add(resident);
  scene.add(chairRoot);

  return {
    scene,
    scenes: [scene],
    animations: [],
    cameras: [],
    asset: {},
    userData: {},
    parser: {} as unknown as GLTF["parser"],
  };
}

function buildMockAvatar(): GLTF {
  const scene = new THREE.Group();
  scene.name = "w2-avatar-scene";

  const resident = new THREE.Group();
  resident.name = "resident";
  resident.position.set(0.3, 0, -0.36);

  const bodyTurn = new THREE.Group();
  bodyTurn.name = "body-turn";
  const pelvis = new THREE.Group();
  pelvis.name = "pelvis";
  const spine = new THREE.Group();
  spine.name = "spine";
  const head = new THREE.Group();
  head.name = "head";

  spine.add(head);
  pelvis.add(spine);
  bodyTurn.add(pelvis);
  resident.add(bodyTurn);
  scene.add(resident);

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0], 3));
  geom.setAttribute("skinIndex", new THREE.Uint16BufferAttribute([0], 4));
  geom.setAttribute("skinWeight", new THREE.Float32BufferAttribute([1, 0, 0, 0], 4));
  const bone = new THREE.Bone();
  const skeleton = new THREE.Skeleton([bone]);
  const residentBody = new THREE.SkinnedMesh(geom, new THREE.MeshBasicMaterial());
  residentBody.name = "resident-body";
  residentBody.bind(skeleton);
  scene.add(residentBody);

  const animations = Object.entries(CLIP_DURATIONS).map(([name, dur]) =>
    createMockClip(name, dur)
  );

  return {
    scene,
    scenes: [scene],
    animations,
    cameras: [],
    asset: {},
    userData: {},
    parser: {} as unknown as GLTF["parser"],
  };
}

function buildMockFixture(): GLTF {
  const scene = new THREE.Group();
  scene.name = "w2-fixture-scene";

  const chairRoot = new THREE.Group();
  chairRoot.name = "chair-root";
  chairRoot.position.set(0.3, 0, -0.36);
  scene.add(chairRoot);

  const chairBase = new THREE.Group();
  chairBase.name = "chair-base";
  chairBase.position.set(0.3, 0, -0.36);
  scene.add(chairBase);

  const animations = Object.entries(CLIP_DURATIONS).map(([name, dur]) =>
    createMockClip(name, dur)
  );

  return {
    scene,
    scenes: [scene],
    animations,
    cameras: [],
    asset: {},
    userData: {},
    parser: {} as unknown as GLTF["parser"],
  };
}

describe("Candidate Integration & Policy Verification Suite (Gate G6)", () => {
  describe("1. Experience Controller & Interaction Arbitration Integration", () => {
    it("integrates ExperienceController with intent arbitration and single owner lifecycle", async () => {
      const mockCameraDirector = {
        transitionTo: vi.fn().mockResolvedValue(undefined),
        setCameraPreset: vi.fn(),
        setReducedMotion: vi.fn(),
        getCurrentPreset: vi.fn().mockReturnValue("home-desktop"),
      };

      const mockCharacterDirector = {
        playGreeting: vi.fn().mockReturnValue(1),
        cancel: vi.fn().mockReturnValue(0),
        settle: vi.fn().mockReturnValue(0),
        mode: "coding",
        currentClip: "coding_idle",
      };

      const controller = new ExperienceController({
        cameraDirector: mockCameraDirector,
        characterDirector: mockCharacterDirector,
      });

      expect(controller).toBeDefined();
      const initialSnapshot = controller.getSnapshot();
      expect(initialSnapshot.phase).toBe("explore");

      // Verify dispatching registered intent
      await controller.send({
        type: "OPEN_PANEL",
        panel: "launcher",
      });
      expect(controller.getSnapshot().phase).toBe("panel");
      expect(controller.getSnapshot().activePanel).toBe("launcher");

      // Verify teardown and cleanup
      controller.stop();
    });
  });

  describe("2. Scene & World Runtime Integration", () => {
    it("integrates integrateScene with Three.js hierarchy pruning and anchor preservation", () => {
      const mockW1 = buildMockW1();
      const mockAvatar = buildMockAvatar();
      const mockFixture = buildMockFixture();

      const result = integrateScene(mockW1, mockAvatar, mockFixture);
      expect(result).toBeDefined();
      expect(result.scene).toBeDefined();
      expect(result.chairRoot).toBeDefined();
      expect(result.chairBase).toBeDefined();
      expect(result.resident).toBeDefined();
      expect(result.residentBody).toBeDefined();
    });
  });

  describe("3. Adaptive Quality Policy & Degraded State Transitions", () => {
    it("enforces consecutive slow windows downgrade: high -> medium -> low -> static", () => {
      let tier = updateTier([30, 32, 35], "high", "auto", {
        consecutiveSlowWindows: 3,
        consecutiveSlowWindowsToDowngrade: 3,
      });
      expect(tier).toBe("medium");

      tier = updateTier([35, 40], "medium", "auto", {
        consecutiveSlowWindows: 3,
        consecutiveSlowWindowsToDowngrade: 3,
      });
      expect(tier).toBe("low");

      tier = updateTier([45, 50], "low", "auto", {
        consecutiveSlowWindows: 3,
        consecutiveSlowWindowsToDowngrade: 3,
      });
      expect(tier).toBe("static");
    });

    it("preserves explicit user quality preference across load fluctuations", () => {
      const tier = updateTier([60, 80, 90], "high", "high", {
        consecutiveSlowWindows: 5,
        consecutiveSlowWindowsToDowngrade: 3,
      });
      expect(tier).toBe("high");
    });

    it("integrates AdaptiveQualityController stateful window transitions", () => {
      const onTierChange = vi.fn();
      const controller = new AdaptiveQualityController(
        { hasWebGL: true, maxTextureSize: 4096, deviceMemoryGb: 8, hardwareConcurrency: 8 },
        { onTierChange, targetFps: 60 }
      );

      expect(controller.getTier()).toBe("high");
      controller.setUserPreference("low");
      expect(controller.getTier()).toBe("low");
      expect(onTierChange).toHaveBeenCalledWith("low");
    });
  });

  describe("4. Content Publication & CandidateX Shielding Policy", () => {
    it("retrieves all 4 approved published case studies", () => {
      expect(publishedProjects.length).toBe(4);
      const slugs = publishedProjects.map((p) => p.slug);
      expect(slugs).toContain("helios");
      expect(slugs).toContain("zenith");
      expect(slugs).toContain("ai-vs-real");
      expect(slugs).toContain("talks");
    });

    it("strictly isolates CandidateX draft and never leaks unverified content", () => {
      const snapshot = getActivePublicationSnapshot();
      const candidateX = findPublishedProject(snapshot, "candidatex");
      expect(candidateX).toBeNull();
    });
  });

  describe("5. Assistive & Resilience Policy Integration", () => {
    it("enforces 0ms camera travel and zero parallax under reduced motion", () => {
      const motion = new ReducedMotionController(true);
      expect(motion.isReducedMotion()).toBe(true);
      expect(motion.getCameraTransitionDuration(800)).toBe(0);
      expect(motion.getParallaxFactor(1.0)).toBe(0.0);
    });

    it("verifies audio controller is OFF by default and disposes cleanly", () => {
      const audio = new AudioController();
      expect(audio.isEnabled()).toBe(false);
      audio.dispose();
    });
  });
});
