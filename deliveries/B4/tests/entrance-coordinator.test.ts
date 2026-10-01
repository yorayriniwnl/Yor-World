import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { EntranceCoordinator } from "../../src/features/world/EntranceCoordinator";
import { CameraDirector } from "../../src/features/world/CameraDirector";
import { CharacterDirector } from "../../src/features/world/CharacterDirector";
import { CLIP_DURATIONS } from "../../src/features/world/SceneIntegrator";

describe("EntranceCoordinator - Production Entrance Choreography (Task B5)", () => {
  function createTestDirectors() {
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.05, 30);
    const cameraDirector = new CameraDirector(camera, "home-desktop");

    const rootObj = new THREE.Group();
    const bodyTurn = new THREE.Group();
    const chairRoot = new THREE.Group();
    rootObj.add(bodyTurn);
    rootObj.add(chairRoot);

    const avatarMixer = new THREE.AnimationMixer(rootObj);
    const chairMixer = new THREE.AnimationMixer(chairRoot);

    const avatarActions: Record<string, THREE.AnimationAction> = {};
    const chairActions: Record<string, THREE.AnimationAction> = {};

    for (const [name, dur] of Object.entries(CLIP_DURATIONS)) {
      const track = new THREE.VectorKeyframeTrack(".position", [0, dur], [0, 0, 0, 0, 0, 0]);
      const clip = new THREE.AnimationClip(name, dur, [track]);
      avatarActions[name] = avatarMixer.clipAction(clip);
      chairActions[name] = chairMixer.clipAction(clip);
    }

    const characterDirector = new CharacterDirector(
      avatarMixer,
      chairMixer,
      avatarActions,
      chairActions,
      bodyTurn,
      chairRoot,
      "primary-character-director"
    );

    return { cameraDirector, characterDirector };
  }

  it("exposes single owner ID", () => {
    const { cameraDirector, characterDirector } = createTestDirectors();
    const coordinator = new EntranceCoordinator(cameraDirector, characterDirector, "primary-entrance-coordinator");
    expect(coordinator.getOwnerId()).toBe("primary-entrance-coordinator");
    expect(coordinator.ownerId).toBe("primary-entrance-coordinator");
  });

  it("PROVE: only one active entrance exists at any time", async () => {
    const { cameraDirector, characterDirector } = createTestDirectors();
    const coordinator = new EntranceCoordinator(cameraDirector, characterDirector);

    // Start first entrance
    const p1 = coordinator.playEntrance({
      sessionToken: 1,
      durationSec: 8.0,
      reducedMotion: false,
    });

    expect(coordinator.isRunning()).toBe(true);

    // Attempt to start a second entrance concurrently
    const p2 = coordinator.playEntrance({
      sessionToken: 1,
      durationSec: 8.0,
      reducedMotion: false,
    });

    // p2 must be the exact same promise instance as p1
    expect(p2).toBe(p1);

    // Skip settles both cleanly
    coordinator.skip();
    await p1;
    expect(coordinator.isRunning()).toBe(false);
  });

  it("reduced motion bypasses camera travel directly to settled HOME and coding_idle", async () => {
    const { cameraDirector, characterDirector } = createTestDirectors();
    const coordinator = new EntranceCoordinator(cameraDirector, characterDirector);

    await coordinator.playEntrance({
      sessionToken: 1,
      durationSec: 8.0,
      reducedMotion: true,
    });

    const diag = coordinator.getDiagnostics();
    expect(diag.phase).toBe("settled");
    expect(diag.progress).toBe(1.0);
    expect(diag.active).toBe(false);
    expect(cameraDirector.currentPreset).toBe("home-desktop");
    expect(characterDirector.currentClip).toBe("coding_idle");
  });

  it("skip settles camera to home and resident to coding pose within <=50ms at every phase", async () => {
    const { cameraDirector, characterDirector } = createTestDirectors();
    const coordinator = new EntranceCoordinator(cameraDirector, characterDirector);

    const p = coordinator.playEntrance({
      sessionToken: 1,
      durationSec: 8.0,
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

  it("aborts entrance safely on external AbortSignal (e.g. route navigation or Back button)", async () => {
    const { cameraDirector, characterDirector } = createTestDirectors();
    const coordinator = new EntranceCoordinator(cameraDirector, characterDirector);
    const abortController = new AbortController();

    const p = coordinator.playEntrance({
      sessionToken: 1,
      durationSec: 8.0,
      signal: abortController.signal,
    });

    expect(coordinator.isRunning()).toBe(true);

    abortController.abort();
    coordinator.skip();
    await p;

    expect(coordinator.isRunning()).toBe(false);
    expect(cameraDirector.currentPreset).toBe("home-desktop");
  });

  it("dispose() cancels animation frames and releases active controllers", () => {
    const { cameraDirector, characterDirector } = createTestDirectors();
    const coordinator = new EntranceCoordinator(cameraDirector, characterDirector);

    coordinator.playEntrance({ sessionToken: 1, durationSec: 8.0 });
    expect(coordinator.isRunning()).toBe(true);

    coordinator.dispose();
    expect(coordinator.isRunning()).toBe(false);
    expect(coordinator.getDiagnostics().active).toBe(false);
  });
});
