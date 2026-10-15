import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { CAMERA_PRESETS } from "./CameraDirector";
import { STATIC_BATCH_ORIGINAL_LAYER } from "./LowQualityBatch";
import { configureReferenceMaterials } from "./ProductionLighting";
import { applyReferenceComposition } from "./ReferenceComposition";

export interface TargetRayIntersection {
  object: THREE.Object3D;
  distance: number;
}

export type TargetRayClassification = "target" | "chair" | "resident" | null;
const CAMERA_FOOT_EVIDENCE_NAMES = ["ai_cam_leg_1", "ai_cam_leg_2", "ai_cam_leg_3"] as const;

function isWithin(object: THREE.Object3D, root: THREE.Object3D): boolean {
  for (let current: THREE.Object3D | null = object; current; current = current.parent) {
    if (current === root) return true;
  }
  return false;
}

/**
 * Classify target-region ray intersections against named target geometry.
 * Actor hits count only when closer than a real target-subtree hit; actor-only
 * rays through empty projected-box pixels are ignored.
 */
export function classifyTargetOcclusionRay(
  intersections: readonly TargetRayIntersection[],
  target: THREE.Object3D,
  chair: THREE.Object3D | null,
  residentMeshes: readonly THREE.Object3D[],
): TargetRayClassification {
  const nearestDistance = (matches: (object: THREE.Object3D) => boolean): number => {
    let nearest = Number.POSITIVE_INFINITY;
    for (const intersection of intersections) {
      if (
        Number.isFinite(intersection.distance) &&
        intersection.distance >= 0 &&
        matches(intersection.object)
      ) nearest = Math.min(nearest, intersection.distance);
    }
    return nearest;
  };

  const targetDistance = nearestDistance((object) => isWithin(object, target));
  if (!Number.isFinite(targetDistance)) return null;

  const chairDistance = chair
    ? nearestDistance((object) => isWithin(object, chair))
    : Number.POSITIVE_INFINITY;
  const residentDistance = nearestDistance((object) => residentMeshes.some((root) => isWithin(object, root)));
  if (chairDistance < targetDistance && chairDistance <= residentDistance) return "chair";
  if (residentDistance < targetDistance) return "resident";
  return "target";
}

function boundsRecord(bounds: THREE.Box3) {
  return { min: bounds.min.toArray(), max: bounds.max.toArray() };
}

function boundsFor(object: THREE.Object3D | undefined): THREE.Box3 | null {
  if (!object) return null;
  object.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(object);
  return bounds.isEmpty() ? null : bounds;
}

function collectSupportContacts(scene: THREE.Object3D): PreG7EvidenceSnapshot["supportContacts"] {
  const deskTop = scene.getObjectByName("desk_top");
  const console = scene.getObjectByName("console-code-native");
  const consoleBase = console?.getObjectByName("console-chassis-code-native");
  const consoleSurfaceBounds = boundsFor(deskTop);
  const consoleBaseBounds = boundsFor(consoleBase);
  const microphoneBounds = boundsFor(scene.getObjectByName("talks-microphone"));
  let consoleContact: Record<string, unknown> | null = null;
  if (consoleSurfaceBounds && consoleBaseBounds) {
    const horizontalGapX = Math.max(0, consoleBaseBounds.min.x - (microphoneBounds?.max.x ?? consoleBaseBounds.min.x), (microphoneBounds?.min.x ?? consoleBaseBounds.max.x) - consoleBaseBounds.max.x);
    const horizontalGapZ = Math.max(0, consoleBaseBounds.min.z - (microphoneBounds?.max.z ?? consoleBaseBounds.min.z), (microphoneBounds?.min.z ?? consoleBaseBounds.max.z) - consoleBaseBounds.max.z);
    consoleContact = {
      surfaceNode: deskTop?.name ?? null,
      surfaceTopY: consoleSurfaceBounds.max.y,
      baseBottomY: consoleBaseBounds.min.y,
      contactDeltaY: consoleBaseBounds.min.y - consoleSurfaceBounds.max.y,
      baseBounds: boundsRecord(consoleBaseBounds),
      surfaceBounds: boundsRecord(consoleSurfaceBounds),
      baseFootprintWithinSurface: consoleBaseBounds.min.x >= consoleSurfaceBounds.min.x &&
        consoleBaseBounds.max.x <= consoleSurfaceBounds.max.x &&
        consoleBaseBounds.min.z >= consoleSurfaceBounds.min.z &&
        consoleBaseBounds.max.z <= consoleSurfaceBounds.max.z,
      microphoneBounds: microphoneBounds ? boundsRecord(microphoneBounds) : null,
      horizontalGapToMicrophoneMeters: Math.hypot(horizontalGapX, horizontalGapZ),
      sourcePlacement: console?.userData["supportMetrics"] ?? null,
    };
  }

  const shelf = scene.getObjectByName("shelf_rear_upper");
  const camera = scene.getObjectByName("ai-real-camera");
  const shelfBounds = boundsFor(shelf);
  const cameraFeet = CAMERA_FOOT_EVIDENCE_NAMES.map((name) => ({ name, object: scene.getObjectByName(name) }));
  const footBounds = cameraFeet.map(({ object }) => boundsFor(object));
  let cameraContact: Record<string, unknown> | null = null;
  if (camera && shelfBounds && footBounds.every((bounds): bounds is THREE.Box3 => Boolean(bounds))) {
    const margin = 0.005;
    const feet = cameraFeet.map(({ name }, index) => {
      const bounds = footBounds[index]!;
      return {
        name,
        bounds: boundsRecord(bounds),
        contactDeltaY: bounds.min.y - shelfBounds.max.y,
        insideFootprintWithMargin: bounds.min.x >= shelfBounds.min.x + margin &&
          bounds.max.x <= shelfBounds.max.x - margin &&
          bounds.min.z >= shelfBounds.min.z + margin &&
          bounds.max.z <= shelfBounds.max.z - margin,
      };
    });
    cameraContact = {
      surfaceNode: shelf?.name ?? null,
      surfaceBounds: boundsRecord(shelfBounds),
      surfaceTopY: shelfBounds.max.y,
      verticalToleranceMeters: 0.001,
      footprintMarginMeters: margin,
      feet,
      allFeetSupported: feet.every((foot) =>
        Math.abs(foot.contactDeltaY) <= 0.001 && foot.insideFootprintWithMargin),
      rootPlacement: camera.userData["referenceSupport"] ?? null,
    };
  }
  return { console: consoleContact, shelfCamera: cameraContact };
}

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

  // Preserve the frozen GLB bytes while correcting the visual arrangement at
  // the integration boundary. Named roots stay intact for raycast bindings.
  applyReferenceComposition(rootGroup);
  configureReferenceMaterials(rootGroup);
  capturePreG7Evidence(rootGroup);

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

type PreG7EvidenceAnchor = {
  name: string;
  found: boolean;
  worldPosition?: number[];
  worldScale?: number[];
  worldBounds?: { min: number[]; max: number[] } | null;
  runtimeGeometry?: { sides: number; width: number; height: number; depth: number } | null;
  descendantBounds?: Array<{
    name: string;
    worldBounds: { min: number[]; max: number[] };
    pixelBounds: {
      left: number;
      top: number;
      right: number;
      bottom: number;
      width: number;
      height: number;
      visibleAreaRatio: number;
    } | null;
  }> | undefined;
  pixelBounds?: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
    visibleAreaRatio: number;
  } | null;
  materials?: Array<Record<string, unknown>>;
  sampledRegionHits?: {
    samples: number;
    targetSamples: number;
    target: number;
    chair: number;
    resident: number;
    other: number;
    occluderRatio: number | null;
    rayTrace?: {
      targetRootUuid: string;
      targetRaySamples: number;
      firstHitLineages: Record<string, number>;
      firstTargetPixel: [number, number] | null;
      cameraProbe: Record<string, unknown> | null;
    };
  } | null;
};

type PreG7EvidenceCamera = {
  preset: string;
  position: number[];
  target: number[];
  fov: number;
  aspect: number;
  source: "camera-director" | "preset-fallback";
};

type PreG7EvidenceSnapshot = {
  url: string;
  viewport: { width: number; height: number };
  camera: PreG7EvidenceCamera;
  testPanelScale: number | null;
  diagnosticSpeakerOffsetMeters: number[] | null;
  anchors: PreG7EvidenceAnchor[];
  lights: Array<{
    name: string;
    found: boolean;
    type?: string;
    color?: string;
    intensity?: number;
    position?: number[];
    distance?: number | null;
    decay?: number | null;
  }>;
  supportContacts: {
    console: Record<string, unknown> | null;
    shelfCamera: Record<string, unknown> | null;
  };
};

type PreG7EvidenceWindow = Window & {
  __PRE_G7_13_REFERENCE_DIAGNOSTICS__?: {
    latest: PreG7EvidenceSnapshot;
    refresh: (probePixel?: [number, number] | null) => PreG7EvidenceSnapshot;
  };
};

/** Browser evidence is collected only when the evidence build flag and URL query are both set. */
function capturePreG7Evidence(scene: THREE.Object3D): void {
  if (
    typeof window === "undefined" ||
    process.env.NEXT_PUBLIC_PRE_G7_13_EVIDENCE !== "1"
  ) return;

  const query = new URLSearchParams(window.location.search);
  if (query.get("pre-g7-evidence") !== "1") return;

  let diagnosticSpeakerOffsetMeters: number[] | null = null;
  if (query.get("pre-g7-speaker-sweep") === "1") {
    const offset = (query.get("pre-g7-speaker-offset") ?? "").split(",").map(Number);
    if (
      offset.length !== 3 ||
      offset.some((value) => !Number.isFinite(value)) ||
      Math.abs(offset[0]!) > 0.2 ||
      Math.abs(offset[1]!) > 0.3 ||
      Math.abs(offset[2]!) > 0.1
    ) throw new Error("PRE-G7-13 diagnostic speaker offset is missing or outside its bounded sweep");
    const speaker = scene.getObjectByName("speaker_right_cabinet");
    if (!speaker) throw new Error("PRE-G7-13 diagnostic speaker sweep requires speaker_right_cabinet");
    speaker.position.add(new THREE.Vector3(offset[0]!, offset[1]!, offset[2]!));
    diagnosticSpeakerOffsetMeters = offset;
    scene.updateMatrixWorld(true);
  }

  const testPanelScale = Number(query.get("pre-g7-test-panel-scale"));
  if (Number.isFinite(testPanelScale) && testPanelScale > 0) {
    for (let index = 1; index <= 7; index += 1) {
      scene.getObjectByName(`hex_panel_${index}`)?.scale.setScalar(testPanelScale);
    }
    scene.updateMatrixWorld(true);
  }

  const evidenceWindow = window as PreG7EvidenceWindow;
  const residentVisualMeshes: THREE.SkinnedMesh[] = [];
  scene.traverse((object) => {
    if ((object as THREE.SkinnedMesh).isSkinnedMesh) residentVisualMeshes.push(object as THREE.SkinnedMesh);
  });
  const anchorNames = [
    ...Array.from({ length: 7 }, (_, index) => `hex_panel_${index + 1}`),
    "lightbar_emissive",
    "ai-real-camera",
    "plants",
    "monitor",
    "speaker_left_cabinet",
    "speaker_right_cabinet",
    "talks-microphone",
    "console-code-native",
    "helios-pc",
    "pegboard_system",
    "peg_controller_body",
    "headset-stand-code-native",
    "headset-code-native",
    "desk",
    "desk_top",
    "shelf_rear_upper",
    ...CAMERA_FOOT_EVIDENCE_NAMES,
    "chair-root",
    "chair-base",
    "resident",
  ];
  const occlusionTargets = new Set([
    "ai-real-camera",
    "plants",
    "monitor",
    "speaker_left_cabinet",
    "speaker_right_cabinet",
    "talks-microphone",
    "console-code-native",
    "helios-pc",
    "peg_controller_body",
    "headset-stand-code-native",
    "headset-code-native",
  ]);
  const raycaster = new THREE.Raycaster();
  // Static batches keep original meshes on this reserved layer for interaction
  // geometry and diagnostics raycasts.
  raycaster.layers.enable(STATIC_BATCH_ORIGINAL_LAYER);
  const isBelow = (object: THREE.Object3D, root: THREE.Object3D): boolean => {
    for (let current: THREE.Object3D | null = object; current; current = current.parent) {
      if (current === root) return true;
    }
    return false;
  };

  const summarizeNode = (node: THREE.Object3D) => ({
    name: node.name,
    type: node.type,
    uuid: node.uuid,
    parent: node.parent ? { name: node.parent.name, type: node.parent.type, uuid: node.parent.uuid } : null,
    visible: node.visible,
    layerMask: node.layers.mask,
    children: node.children.length,
    position: node.position.toArray(),
    quaternion: node.quaternion.toArray(),
    scale: node.scale.toArray(),
    matrix: node.matrix.toArray(),
    matrixWorld: node.matrixWorld.toArray(),
  });

  const summarizeNumericArray = (array: ArrayLike<number>) => {
    let hash = 2166136261;
    for (let index = 0; index < array.length; index += 1) {
      hash ^= Math.round(Number(array[index]) * 1_000_000) >>> 0;
      hash = Math.imul(hash, 16777619);
    }
    return { length: array.length, fnv1aMillionths: (hash >>> 0).toString(16).padStart(8, "0") };
  };

  const summarizeMesh = (object: THREE.Object3D) => {
    const mesh = object as THREE.Mesh;
    const position = mesh.geometry?.getAttribute("position");
    const geometryBox = position ? (() => {
      const box = new THREE.Box3().makeEmpty();
      const point = new THREE.Vector3();
      for (let index = 0; index < position.count; index += 1) {
        box.expandByPoint(point.set(position.getX(index), position.getY(index), position.getZ(index)));
      }
      return box;
    })() : null;
    const index = mesh.geometry?.getIndex();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    return {
      ...summarizeNode(mesh),
      geometry: mesh.geometry ? {
        uuid: mesh.geometry.uuid,
        position: position ? {
          count: position.count,
          itemSize: position.itemSize,
          array: summarizeNumericArray(position.array as ArrayLike<number>),
          bounds: geometryBox ? { min: geometryBox.min.toArray(), max: geometryBox.max.toArray() } : null,
        } : null,
        index: index ? { count: index.count, array: summarizeNumericArray(index.array as ArrayLike<number>) } : null,
        boundingBox: mesh.geometry.boundingBox ? {
          min: mesh.geometry.boundingBox.min.toArray(),
          max: mesh.geometry.boundingBox.max.toArray(),
        } : null,
        boundingSphere: mesh.geometry.boundingSphere ? {
          center: mesh.geometry.boundingSphere.center.toArray(),
          radius: mesh.geometry.boundingSphere.radius,
        } : null,
      } : null,
      materials: materials.map((material) => ({
        uuid: material.uuid,
        name: material.name,
        type: material.type,
        visible: material.visible,
        side: material.side,
        transparent: material.transparent,
        opacity: material.opacity,
      })),
    };
  };

  const summarizeTargetSubtree = (target: THREE.Object3D) => {
    const nodes: THREE.Object3D[] = [];
    target.traverse((node) => nodes.push(node));
    const meshStates = nodes
      .filter((node) => (node as THREE.Mesh).isMesh)
      .map(summarizeMesh);
    const layerCounts: Record<string, number> = {};
    for (const node of nodes) layerCounts[String(node.layers.mask)] = (layerCounts[String(node.layers.mask)] ?? 0) + 1;
    const parentage: ReturnType<typeof summarizeNode>[] = [];
    for (let node: THREE.Object3D | null = target; node; node = node.parent) {
      parentage.push(summarizeNode(node));
      if (node === scene) break;
    }
    return { parentage, nodeCount: nodes.length, meshCount: meshStates.length, layerCounts, meshes: meshStates };
  };

  const summarizeSceneTree = () => {
    let nodeCount = 0;
    let meshCount = 0;
    const layerCounts: Record<string, number> = {};
    const directChildren = scene.children.map((child) => ({
      name: child.name,
      type: child.type,
      uuid: child.uuid,
      visible: child.visible,
      layerMask: child.layers.mask,
      children: child.children.length,
    }));
    scene.traverse((node) => {
      nodeCount += 1;
      if ((node as THREE.Mesh).isMesh) meshCount += 1;
      layerCounts[String(node.layers.mask)] = (layerCounts[String(node.layers.mask)] ?? 0) + 1;
    });
    return {
      root: summarizeNode(scene),
      directChildren,
      nodeCount,
      meshCount,
      layerCounts,
    };
  };

  const refresh = (fixedProbePixel?: [number, number] | null): PreG7EvidenceSnapshot => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const presetName = width < 640 ? "home-mobile" : "home-desktop";
    const preset = CAMERA_PRESETS[presetName];
    type RuntimeCameraPose = {
      preset: string;
      position: [number, number, number];
      target: [number, number, number];
      fov: number;
      aspect: number;
    };
    let cameraPose: RuntimeCameraPose | null = null;
    const cameraCanvas = document.querySelector<HTMLCanvasElement>("[data-testid='world-canvas']");
    try {
      const runtimePose: unknown = cameraCanvas?.dataset.preG713RuntimeCamera
        ? JSON.parse(cameraCanvas.dataset.preG713RuntimeCamera)
        : null;
      if (runtimePose && typeof runtimePose === "object") {
        const candidate = runtimePose as Partial<RuntimeCameraPose>;
        if (
          typeof candidate.preset === "string" &&
          Array.isArray(candidate.position) && candidate.position.length === 3 &&
          Array.isArray(candidate.target) && candidate.target.length === 3 &&
          typeof candidate.fov === "number" && Number.isFinite(candidate.fov) &&
          typeof candidate.aspect === "number" && Number.isFinite(candidate.aspect)
        ) cameraPose = candidate as RuntimeCameraPose;
      }
    } catch {
      cameraPose = null;
    }
    const actualCamera = cameraPose ?? {
      preset: presetName,
      position: preset.position,
      target: preset.target,
      fov: preset.fov,
      aspect: width / height,
    };
    const camera = new THREE.PerspectiveCamera(actualCamera.fov, actualCamera.aspect || width / height, 0.05, 30);
    camera.position.set(...actualCamera.position);
    camera.lookAt(new THREE.Vector3(...actualCamera.target));
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    scene.updateMatrixWorld(true);

    const projectWorldBounds = (worldBounds: THREE.Box3) => {
      if (worldBounds.isEmpty()) return null;
      const corners = Array.from({ length: 8 }, (_, mask) => new THREE.Vector3(
        mask & 1 ? worldBounds.max.x : worldBounds.min.x,
        mask & 2 ? worldBounds.max.y : worldBounds.min.y,
        mask & 4 ? worldBounds.max.z : worldBounds.min.z,
      ).applyMatrix4(camera.matrixWorldInverse));
      const clipped: THREE.Vector3[] = [];
      const insideDepth = (point: THREE.Vector3) => -point.z >= camera.near && -point.z <= camera.far;
      for (const corner of corners) if (insideDepth(corner)) clipped.push(corner.clone());

      // Clip bounds edges against camera depth before perspective projection.
      // A single plant descendant sits near the mobile camera, so projecting
      // its whole parent AABB can divide by near-zero w and report thousands
      // of pixels even when the rendered foliage is at the frame edge.
      const edges: ReadonlyArray<readonly [number, number]> = [
        [0, 1], [0, 2], [0, 4], [1, 3], [1, 5], [2, 3],
        [2, 6], [3, 7], [4, 5], [4, 6], [5, 7], [6, 7],
      ];
      for (const [firstIndex, secondIndex] of edges) {
        const first = corners[firstIndex]!;
        const second = corners[secondIndex]!;
        const firstDepth = -first.z;
        const secondDepth = -second.z;
        for (const plane of [camera.near, camera.far]) {
          if ((firstDepth < plane && secondDepth > plane) || (firstDepth > plane && secondDepth < plane)) {
            const amount = (plane - firstDepth) / (secondDepth - firstDepth);
            clipped.push(first.clone().lerp(second, amount));
          }
        }
      }

      const projected = clipped
        .map((point) => point.applyMatrix4(camera.projectionMatrix))
        .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z));
      if (!projected.length) return null;
      const left = (Math.min(...projected.map((point) => point.x)) + 1) * width / 2;
      const right = (Math.max(...projected.map((point) => point.x)) + 1) * width / 2;
      const top = (1 - Math.max(...projected.map((point) => point.y))) * height / 2;
      const bottom = (1 - Math.min(...projected.map((point) => point.y))) * height / 2;
      const projectedArea = Math.max(0, right - left) * Math.max(0, bottom - top);
      const visibleArea = Math.max(0, Math.min(width, right) - Math.max(0, left)) *
        Math.max(0, Math.min(height, bottom) - Math.max(0, top));
      return {
        left,
        top,
        right,
        bottom,
        width: right - left,
        height: bottom - top,
        visibleAreaRatio: projectedArea ? visibleArea / projectedArea : 0,
        ndcPoints: projected,
      };
    };

    const anchorObjects = anchorNames.map((name) => ({ name, object: scene.getObjectByName(name) }));
    const anchors: PreG7EvidenceAnchor[] = anchorObjects.map(({ name, object }) => {
      if (!object) return { name, found: false };

      // The named resident armature is an empty locator; visible body parts are
      // sibling SkinnedMeshes. Union their current-pose bounds without changing
      // the actor tree or weakening the chair/resident occlusion gate.
      const measuredObjects: THREE.Object3D[] = name === "resident" ? residentVisualMeshes : [object];
      const bounds = new THREE.Box3();
      for (const measuredObject of measuredObjects) {
        bounds.union(new THREE.Box3().setFromObject(measuredObject, name === "resident"));
      }
      const worldPosition = object.getWorldPosition(new THREE.Vector3());
      const worldScale = object.getWorldScale(new THREE.Vector3());
      const meshBounds: Array<{
        name: string;
        worldBounds: THREE.Box3;
        projected: NonNullable<ReturnType<typeof projectWorldBounds>>;
      }> = [];
      for (const measuredObject of measuredObjects) {
        measuredObject.traverse((child) => {
          if (!(child as THREE.Mesh).isMesh) return;
          const mesh = child as THREE.Mesh;
          const meshWorldBounds = new THREE.Box3().setFromObject(mesh, name === "resident");
          const meshProjected = projectWorldBounds(meshWorldBounds);
          if (meshProjected) meshBounds.push({ name: mesh.name || mesh.type, worldBounds: meshWorldBounds, projected: meshProjected });
        });
      }
      const descendantBounds = name === "plants" || name === "resident" ? meshBounds.map((mesh) => ({
        name: mesh.name,
        worldBounds: { min: mesh.worldBounds.min.toArray(), max: mesh.worldBounds.max.toArray() },
        pixelBounds: {
          left: mesh.projected.left,
          top: mesh.projected.top,
          right: mesh.projected.right,
          bottom: mesh.projected.bottom,
          width: mesh.projected.width,
          height: mesh.projected.height,
          visibleAreaRatio: mesh.projected.visibleAreaRatio,
        },
      })) : undefined;
      const projected = name === "plants" || name === "resident"
        ? meshBounds.flatMap((mesh) => mesh.projected.ndcPoints)
        : projectWorldBounds(bounds)?.ndcPoints ?? [];
      const pixelBounds = projected.length ? (() => {
        const left = (Math.min(...projected.map((point) => point.x)) + 1) * width / 2;
        const right = (Math.max(...projected.map((point) => point.x)) + 1) * width / 2;
        const top = (1 - Math.max(...projected.map((point) => point.y))) * height / 2;
        const bottom = (1 - Math.min(...projected.map((point) => point.y))) * height / 2;
        const projectedArea = Math.max(0, right - left) * Math.max(0, bottom - top);
        const visibleArea = Math.max(0, Math.min(width, right) - Math.max(0, left)) *
          Math.max(0, Math.min(height, bottom) - Math.max(0, top));
        return { left, top, right, bottom, width: right - left, height: bottom - top, visibleAreaRatio: projectedArea ? visibleArea / projectedArea : 0 };
      })() : null;

      const materials = new Map<string, Record<string, unknown>>();
      for (const measuredObject of measuredObjects) {
        measuredObject.traverse((child) => {
          if (!(child as THREE.Mesh).isMesh) return;
          const mesh = child as THREE.Mesh;
          const slots = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const material of slots) {
            const standard = material as THREE.MeshStandardMaterial;
            materials.set(`${material.name}:${material.uuid}`, {
              name: material.name,
              color: standard.color?.getHexString() ?? null,
              emissive: standard.emissive?.getHexString() ?? null,
              emissiveIntensity: standard.emissiveIntensity ?? null,
            });
          }
        });
      }

      const sampledRegionHits = occlusionTargets.has(name) && pixelBounds ? (() => {
        const chair = scene.getObjectByName("chair-root");
        const resident = residentVisualMeshes;
        const counts = { samples: 0, targetSamples: 0, target: 0, chair: 0, resident: 0, other: 0 };
        const traceCamera = name === "ai-real-camera";
        const firstHitLineages = new Map<string, number>();
        let targetRaySamples = 0;
        let firstTargetPixel: [number, number] | null = null;
        // Denser sampling keeps small named props such as the shelf camera
        // measurable without changing the required visibility/occlusion limits.
        const gridSize = 13;
        for (let y = 0; y < gridSize; y += 1) {
          for (let x = 0; x < gridSize; x += 1) {
            const pixelX = pixelBounds.left + (x + 0.5) / gridSize * pixelBounds.width;
            const pixelY = pixelBounds.top + (y + 0.5) / gridSize * pixelBounds.height;
            if (pixelX < 0 || pixelX >= width || pixelY < 0 || pixelY >= height) continue;
            raycaster.setFromCamera(new THREE.Vector2(pixelX / width * 2 - 1, 1 - pixelY / height * 2), camera);
            const intersections = raycaster.intersectObject(scene, true);
            const firstHit = intersections[0]?.object;
            counts.samples += 1;
            const targetIntersections = intersections.filter(({ object: hit }) => isBelow(hit, object));
            if (traceCamera) {
              if (targetIntersections.length > 0) {
                targetRaySamples += 1;
                firstTargetPixel ??= [pixelX, pixelY];
              }
              if (firstHit) {
                const lineage: string[] = [];
                for (let current: THREE.Object3D | null = firstHit; current; current = current.parent) {
                  lineage.push(current.name || current.type);
                  if (current === scene) break;
                }
                const key = lineage.join(" <- ");
                firstHitLineages.set(key, (firstHitLineages.get(key) ?? 0) + 1);
              }
            }
            if (targetIntersections.length === 0) continue;
            counts.targetSamples += 1;
            const classification = classifyTargetOcclusionRay(intersections, object, chair ?? null, resident);
            if (classification === "chair") counts.chair += 1;
            else if (classification === "resident") counts.resident += 1;
            else if (firstHit && !isBelow(firstHit, object)) counts.other += 1;
            else counts.target += 1;
          }
        }
        const probePixel = fixedProbePixel ?? firstTargetPixel;
        let cameraProbe: Record<string, unknown> | null = null;
        if (traceCamera && probePixel) {
          const ndc = new THREE.Vector2(
            probePixel[0] / width * 2 - 1,
            1 - probePixel[1] / height * 2,
          );
          raycaster.setFromCamera(ndc, camera);
          const rayOrigin = raycaster.ray.origin.toArray();
          const rayDirection = raycaster.ray.direction.toArray();
          const intersections = raycaster.intersectObject(scene, true);
          const directTargetIntersections = raycaster.intersectObject(object, true);
          cameraProbe = {
            pixel: probePixel,
            ndc: ndc.toArray(),
            ray: { origin: rayOrigin, direction: rayDirection },
            raycaster: { near: raycaster.near, far: raycaster.far, layerMask: raycaster.layers.mask },
            intersections: intersections.length,
            directTargetIntersections: directTargetIntersections.length,
            firstHits: intersections.slice(0, 8).map((hit) => ({
              distance: hit.distance,
              point: hit.point.toArray(),
              object: summarizeNode(hit.object),
            })),
            sceneTree: summarizeSceneTree(),
            targetSubtree: summarizeTargetSubtree(object),
          };
        }
        return {
          ...counts,
          occluderRatio: counts.targetSamples ? (counts.chair + counts.resident) / counts.targetSamples : null,
          ...(traceCamera ? {
            rayTrace: {
              targetRootUuid: object.uuid,
              targetRaySamples,
              firstHitLineages: Object.fromEntries(firstHitLineages),
              firstTargetPixel,
              cameraProbe,
            },
          } : {}),
        };
      })() : null;

      return {
        name,
        found: true,
        worldPosition: worldPosition.toArray(),
        worldScale: worldScale.toArray(),
        worldBounds: bounds.isEmpty() ? null : { min: bounds.min.toArray(), max: bounds.max.toArray() },
        runtimeGeometry: (object as THREE.Mesh).isMesh
          ? ((object as THREE.Mesh).geometry.userData["preG7ReferenceHex"] ?? null)
          : null,
        pixelBounds,
        descendantBounds,
        materials: [...materials.values()],
        sampledRegionHits,
      };
    });

    const lightNames = ["Light_CeilingAmbient", "Light_CyanFill", "Light_HexWall"];
    const lights = lightNames.map((name) => {
      const light = scene.getObjectByName(name) as THREE.Light | undefined;
      if (!light) return { name, found: false };
      const positional = light instanceof THREE.PointLight || light instanceof THREE.SpotLight ? light : null;
      return {
        name,
        found: true,
        type: light.type,
        color: (light as THREE.Light & { color?: THREE.Color }).color?.getHexString(),
        intensity: light.intensity,
        position: light.getWorldPosition(new THREE.Vector3()).toArray(),
        distance: positional?.distance ?? null,
        decay: positional?.decay ?? null,
      };
    });

    const snapshot: PreG7EvidenceSnapshot = {
      url: window.location.href,
      viewport: { width, height },
      camera: {
        preset: actualCamera.preset,
        position: actualCamera.position,
        target: actualCamera.target,
        fov: actualCamera.fov,
        aspect: actualCamera.aspect,
        source: cameraPose ? "camera-director" : "preset-fallback",
      },
      testPanelScale: Number.isFinite(testPanelScale) && testPanelScale > 0 ? testPanelScale : null,
      diagnosticSpeakerOffsetMeters,
      anchors,
      lights,
      supportContacts: collectSupportContacts(scene),
    };
    if (evidenceWindow.__PRE_G7_13_REFERENCE_DIAGNOSTICS__) {
      evidenceWindow.__PRE_G7_13_REFERENCE_DIAGNOSTICS__.latest = snapshot;
    }
    return snapshot;
  };

  const diagnostics: NonNullable<PreG7EvidenceWindow["__PRE_G7_13_REFERENCE_DIAGNOSTICS__"]> = {
    latest: null as unknown as PreG7EvidenceSnapshot,
    refresh,
  };
  evidenceWindow.__PRE_G7_13_REFERENCE_DIAGNOSTICS__ = diagnostics;
  diagnostics.latest = refresh();
}
