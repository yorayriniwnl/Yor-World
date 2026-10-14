import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { EntranceCoordinator } from "../../src/features/world/EntranceCoordinator";
import { CameraDirector } from "../../src/features/world/CameraDirector";
import { CharacterDirector } from "../../src/features/world/CharacterDirector";

describe("EntranceCoordinator - Single Active Entrance and Bounded Duration", () => {
  function createTestDirectors() {
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.05, 30);
    const cameraDirector = new CameraDirector(camera, "home-desktop");

    const rootObj = new THREE.Object3D();
    const bodyTurn = new THREE.Object3D();
    const chairRoot = new THREE.Object3D();
    rootObj.add(bodyTurn);
    rootObj.add(chairRoot);

    const avatarMixer = new THREE.AnimationMixer(rootObj);
    const chairMixer = new THREE.AnimationMixer(chairRoot);

    const characterDirector = new CharacterDirector(
      avatarMixer,
      chairMixer,
      {},
      {},
      bodyTurn,
      chairRoot
    );

    return { cameraDirector, characterDirector };
  }

  it("exposes single owner ID", () => {
    const { cameraDirector, characterDirector } = createTestDirectors();
    const coordinator = new EntranceCoordinator(cameraDirector, characterDirector, "primary-entrance-coordinator");
    expect(coordinator.getOwnerId()).toBe("primary-entrance-coordinator");
  });

  it("PROVE: only one active entrance exists at any time", async () => {
    const { cameraDirector, characterDirector } = createTestDirectors();
    const coordinator = new EntranceCoordinator(cameraDirector, characterDirector);

    // Start first entrance
    const p1 = coordinator.playEntrance({
      sessionToken: 1,
      durationSec: 5.0,
      reducedMotion: false,
    });

    expect(coordinator.isRunning()).toBe(true);

    // Attempt to start a second entrance concurrently
    const p2 = coordinator.playEntrance({
      sessionToken: 1,
      durationSec: 5.0,
      reducedMotion: false,
    });

    // p2 must be the exact same promise instance as p1
    expect(p2).toBe(p1);

    // Skip settles both cleanly
    coordinator.skip();
    await p1;
    expect(coordinator.isRunning()).toBe(false);
  });

  it("reduced motion bypasses camera travel directly to settled HOME", async () => {
    const { cameraDirector, characterDirector } = createTestDirectors();
    const coordinator = new EntranceCoordinator(cameraDirector, characterDirector);

    await coordinator.playEntrance({
      sessionToken: 1,
      durationSec: 5.0,
      reducedMotion: true,
    });

    const diag = coordinator.getDiagnostics();
    expect(diag.phase).toBe("settled");
    expect(diag.progress).toBe(1.0);
    expect(diag.active).toBe(false);
    expect(cameraDirector.currentPreset).toBe("home-desktop");
  });

  it("skip settles camera to home and resident to coding pose within <=50ms", async () => {
    const { cameraDirector, characterDirector } = createTestDirectors();
    const coordinator = new EntranceCoordinator(cameraDirector, characterDirector);

    const p = coordinator.playEntrance({
      sessionToken: 1,
      durationSec: 6.0,
      reducedMotion: false,
    });

    const startTime = performance.now();
    coordinator.skip();
    await p;
    const elapsed = performance.now() - startTime;

    expect(elapsed).toBeLessThanOrEqual(50);
    expect(cameraDirector.currentPreset).toBe("home-desktop");
    expect(characterDirector.currentClip).toBe("coding_idle");
  });

  it("enforces maximum bounded duration of <=8.0 seconds", async () => {
    const { cameraDirector, characterDirector } = createTestDirectors();
    const coordinator = new EntranceCoordinator(cameraDirector, characterDirector);

    // Attempt to request a 20-second entrance
    const p = coordinator.playEntrance({
      sessionToken: 1,
      durationSec: 20.0,
      reducedMotion: false,
    });

    const diag = coordinator.getDiagnostics();
    expect(diag.durationSec).toBe(8.0); // Bounded at 8.0s max

    coordinator.skip();
    await p;
  });
});
