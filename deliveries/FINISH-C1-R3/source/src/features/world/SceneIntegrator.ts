import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

export interface IntegratedSceneResult {
  scene: THREE.Group;
  resident: THREE.Object3D;
  residentBody: THREE.SkinnedMesh;
  chairRoot: THREE.Object3D;
  chairBase: THREE.Object3D;
  bodyTurn: THREE.Object3D;
  head: THREE.Object3D;
  desk: THREE.Object3D;
  avatarMixer: THREE.AnimationMixer;
  chairMixer: THREE.AnimationMixer;
  avatarActions: Record<string, THREE.AnimationAction>;
  chairActions: Record<string, THREE.AnimationAction>;
  removedW1Nodes: string[];
  discardedW2Nodes: string[];
  nodeCounts: {
    residentCount: number;
    chairRootCount: number;
    chairBaseCount: number;
    deskCount: number;
    fixtureStaticCount: number;
  };
}

export const CLIP_DURATIONS: Readonly<Record<string, number>> = {
  coding_idle: 6.0,
  notice_visitor: 0.6,
  turn_to_visitor: 1.2,
  greeting_nod: 0.9,
  return_to_work: 1.3,
};

export function integrateScene(
  w1Gltf: GLTF,
  avatarGltf: GLTF,
  fixtureGltf: GLTF
): IntegratedSceneResult {
  const rootGroup = new THREE.Group();
  rootGroup.name = "yor-world-root";

  // 1. Prepare W1 Environment Scene
  const w1Scene = w1Gltf.scene;
  const removedW1NodesSet = new Set<string>();

  // Identify nodes to remove per W1 asset register contract:
  // - "resident" proxy tree
  // - "chair" static chair tree
  // - "chair-root" W1 locator
  const w1NodesToRemove: THREE.Object3D[] = [];
  w1Scene.traverse((obj) => {
    if (obj.name === "chair-root" || obj.name === "chair" || obj.name === "resident") {
      w1NodesToRemove.push(obj);
    }
  });

  for (const node of w1NodesToRemove) {
    if (node.parent) {
      node.traverse((child) => {
        if (child.name) removedW1NodesSet.add(child.name);
      });
      node.parent.remove(node);
    }
  }
  const removedW1Nodes = Array.from(removedW1NodesSet);

  // Add pruned W1 environment
  rootGroup.add(w1Scene);

  // 2. Prepare W2 Fixture (Chair) Scene
  const fixtureScene = fixtureGltf.scene;
  const discardedW2NodesSet = new Set<string>();

  // Discard "fixture-static" (desk, keyboard, floor proof fixture)
  const fixtureStatic = fixtureScene.getObjectByName("fixture-static");
  if (fixtureStatic && fixtureStatic.parent) {
    fixtureStatic.traverse((child) => {
      if (child.name) discardedW2NodesSet.add(child.name);
    });
    fixtureStatic.parent.remove(fixtureStatic);
  }
  const discardedW2Nodes = Array.from(discardedW2NodesSet);

  const chairRoot = fixtureScene.getObjectByName("chair-root");
  const chairBase = fixtureScene.getObjectByName("chair-base");

  if (!chairRoot || !chairBase) {
    throw new Error("W2 fixture-proof is missing required chair-root or chair-base");
  }

  // Mount fixtureScene at identity
  fixtureScene.position.set(0, 0, 0);
  fixtureScene.rotation.set(0, 0, 0);
  fixtureScene.scale.set(1, 1, 1);
  rootGroup.add(fixtureScene);

  // 3. Prepare W2 Avatar Scene
  const avatarScene = avatarGltf.scene;
  const resident = avatarScene.getObjectByName("resident");
  const bodyTurn = avatarScene.getObjectByName("body-turn");
  const head = avatarScene.getObjectByName("head");

  let residentBody: THREE.SkinnedMesh | null = null;
  avatarScene.traverse((obj) => {
    if ((obj as THREE.SkinnedMesh).isSkinnedMesh) {
      residentBody = obj as THREE.SkinnedMesh;
      residentBody.frustumCulled = false;
    }
  });

  if (!resident || !bodyTurn || !head || !residentBody) {
    throw new Error("W2 avatar-proof is missing resident armature or skinned mesh");
  }

  // Mount avatarScene at identity
  avatarScene.position.set(0, 0, 0);
  avatarScene.rotation.set(0, 0, 0);
  avatarScene.scale.set(1, 1, 1);
  rootGroup.add(avatarScene);

  // 4. Verification and Node Count Auditing
  let residentCount = 0;
  let chairRootCount = 0;
  let chairBaseCount = 0;
  let deskCount = 0;
  let fixtureStaticCount = 0;
  let foundDesk: THREE.Object3D | null = null;

  rootGroup.traverse((obj) => {
    if (obj.name === "resident") residentCount++;
    if (obj.name === "chair-root") chairRootCount++;
    if (obj.name === "chair-base") chairBaseCount++;
    if (obj.name === "desk") {
      deskCount++;
      foundDesk = obj;
    }
    if (obj.name === "fixture-static") fixtureStaticCount++;
  });

  if (residentCount !== 1) {
    throw new Error(`Integration error: Expected exactly 1 resident, found ${residentCount}`);
  }
  if (chairRootCount !== 1) {
    throw new Error(`Integration error: Expected exactly 1 chair-root, found ${chairRootCount}`);
  }
  if (chairBaseCount !== 1) {
    throw new Error(`Integration error: Expected exactly 1 chair-base, found ${chairBaseCount}`);
  }
  if (deskCount !== 1 || !foundDesk) {
    throw new Error(`Integration error: Expected exactly 1 desk, found ${deskCount}`);
  }
  if (fixtureStaticCount !== 0) {
    throw new Error(`Integration error: fixture-static must be 0, found ${fixtureStaticCount}`);
  }

  // 5. Setup Paired Animation Mixers
  const avatarMixer = new THREE.AnimationMixer(avatarScene);
  const chairMixer = new THREE.AnimationMixer(fixtureScene);

  const avatarActions: Record<string, THREE.AnimationAction> = {};
  for (const clip of avatarGltf.animations) {
    if (clip.name in CLIP_DURATIONS) {
      avatarActions[clip.name] = avatarMixer.clipAction(clip);
    }
  }

  const chairActions: Record<string, THREE.AnimationAction> = {};
  for (const clip of fixtureGltf.animations) {
    if (clip.name in CLIP_DURATIONS) {
      chairActions[clip.name] = chairMixer.clipAction(clip);
    }
  }

  // Ensure all 5 standard clips exist on both actors
  for (const clipName of Object.keys(CLIP_DURATIONS)) {
    if (!avatarActions[clipName] || !chairActions[clipName]) {
      throw new Error(`Missing paired animation clip: ${clipName}`);
    }
  }

  return {
    scene: rootGroup,
    resident,
    residentBody,
    chairRoot,
    chairBase,
    bodyTurn,
    head,
    desk: foundDesk,
    avatarMixer,
    chairMixer,
    avatarActions,
    chairActions,
    removedW1Nodes,
    discardedW2Nodes,
    nodeCounts: {
      residentCount,
      chairRootCount,
      chairBaseCount,
      deskCount,
      fixtureStaticCount,
    },
  };
}
