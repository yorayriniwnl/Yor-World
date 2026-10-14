import { describe, expect, it } from "vitest";
import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { integrateScene, CLIP_DURATIONS } from "../../src/features/world/SceneIntegrator";

function createMockClip(name: string, duration: number): THREE.AnimationClip {
  const track = new THREE.VectorKeyframeTrack(".position", [0, duration], [0, 0, 0, 0, 0, 0]);
  return new THREE.AnimationClip(name, duration, [track]);
}

function buildMockW1(): GLTF {
  const scene = new THREE.Group();
  scene.name = "w1-scene";

  // Room environment nodes
  const roomShell = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  roomShell.name = "room-shell";
  scene.add(roomShell);

  const desk = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  desk.name = "desk";
  desk.position.set(0, 0.75, -1.15);
  scene.add(desk);

  // W1 proxy resident and static chair under chair-root locator
  const chairRoot = new THREE.Group();
  chairRoot.name = "chair-root";
  chairRoot.position.set(0.3, 0, -0.36);

  const chair = new THREE.Group();
  chair.name = "chair";
  const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  chairSeat.name = "chair_seat_cushion";
  chair.add(chairSeat);
  chairRoot.add(chair);

  const resident = new THREE.Group();
  resident.name = "resident";
  const residentPelvis = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  residentPelvis.name = "resident_pelvis";
  resident.add(residentPelvis);
  chairRoot.add(resident);

  scene.add(chairRoot);

  return {
    scene,
    scenes: [scene],
    animations: [],
    cameras: [],
    asset: {},
    parser: {} as unknown as GLTF["parser"],
    userData: {},
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

  // Skinned mesh sibling
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
    parser: {} as unknown as GLTF["parser"],
    userData: {},
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

  // Proof fixture to discard
  const fixtureStatic = new THREE.Group();
  fixtureStatic.name = "fixture-static";
  const proofDesk = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  proofDesk.name = "proof-desk";
  fixtureStatic.add(proofDesk);
  scene.add(fixtureStatic);

  const animations = Object.entries(CLIP_DURATIONS).map(([name, dur]) =>
    createMockClip(name, dur)
  );

  return {
    scene,
    scenes: [scene],
    animations,
    cameras: [],
    asset: {},
    parser: {} as unknown as GLTF["parser"],
    userData: {},
  };
}

describe("SceneIntegrator", () => {
  it("verifies clip durations match engineering specification", () => {
    expect(CLIP_DURATIONS["coding_idle"]).toBe(6.0);
    expect(CLIP_DURATIONS["notice_visitor"]).toBe(0.6);
    expect(CLIP_DURATIONS["turn_to_visitor"]).toBe(1.2);
    expect(CLIP_DURATIONS["greeting_nod"]).toBe(0.9);
    expect(CLIP_DURATIONS["return_to_work"]).toBe(1.3);
  });

  it("removes W1 proxy resident and static chair, discards fixture-static, and yields exactly 1 resident and 1 chair", () => {
    const w1 = buildMockW1();
    const avatar = buildMockAvatar();
    const fixture = buildMockFixture();

    const result = integrateScene(w1, avatar, fixture);

    expect(result.nodeCounts.residentCount).toBe(1);
    expect(result.nodeCounts.chairRootCount).toBe(1);
    expect(result.nodeCounts.chairBaseCount).toBe(1);
    expect(result.nodeCounts.deskCount).toBe(1);
    expect(result.nodeCounts.fixtureStaticCount).toBe(0);

    expect(result.removedW1Nodes).toContain("chair-root");
    expect(result.removedW1Nodes).toContain("chair");
    expect(result.removedW1Nodes).toContain("chair_seat_cushion");
    expect(result.removedW1Nodes).toContain("resident");
    expect(result.removedW1Nodes).toContain("resident_pelvis");

    expect(result.discardedW2Nodes).toContain("fixture-static");
    expect(result.discardedW2Nodes).toContain("proof-desk");

    // Verify positions match F1 coordinates without double-offsets
    expect(result.resident.position.x).toBeCloseTo(0.3);
    expect(result.resident.position.y).toBeCloseTo(0);
    expect(result.resident.position.z).toBeCloseTo(-0.36);

    expect(result.chairRoot.position.x).toBeCloseTo(0.3);
    expect(result.chairRoot.position.z).toBeCloseTo(-0.36);

    expect(result.chairBase.position.x).toBeCloseTo(0.3);
    expect(result.chairBase.position.z).toBeCloseTo(-0.36);

    // Verify all 5 clips are initialized in both mixers
    for (const clipName of Object.keys(CLIP_DURATIONS)) {
      expect(result.avatarActions[clipName]).toBeDefined();
      expect(result.chairActions[clipName]).toBeDefined();
    }
  });
});
