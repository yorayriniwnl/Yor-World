import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { CAMERA_PRESETS } from "./CameraDirector";
import { configureReferenceMaterials } from "./ProductionLighting";
import { applyReferenceComposition } from "./ReferenceComposition";

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
  geometry?: Record<string, unknown>;
  sampledRegionHits?: {
    samples: number;
    target: number;
    targetSurface: number;
    chair: number;
    resident: number;
    other: number;
    noRenderableHit: number;
    occluderRatio: number | null;
    centerRay?: {
      pixel: [number, number];
      targetDirectHitCount: number;
      targetDirectHitNames: string[];
      firstSceneHitName: string | null;
      firstSceneHitBelongsToTarget: boolean;
      renderedFirstHit: Record<string, unknown> | null;
      ndc: number[];
      rayOrigin: number[];
      rayDirection: number[];
      meshCenterRay: {
        meshName: string;
        worldCenter: number[];
        pixel: number[];
        ndc: number[];
        directRaycastHitCount: number;
        directRaycastHitNames: string[];
        rendererSceneHits: Array<Record<string, unknown>>;
        sceneIdentity: Record<string, unknown>;
        ancestorQueries: Array<Record<string, unknown>>;
      } | null;
    };
  } | null;
};

type PreG7RendererCameraProbe = {
  architecture: "WorldRuntime-WebGLRenderer";
  rendererCameraUuid: string;
  rendererCameraType: string;
  cameraDirectorUuid: string | null;
  cameraObjectIdentityMatchesDirector: boolean;
  rendererCameraLayerMask: number;
  cameraDirectorLayerMask: number | null;
  rendererCameraSeesPanelMeshLayer: boolean | null;
  sceneUuid: string;
  sceneType: string;
  sceneHasPanelNode: boolean;
  panelNode: { id: number; uuid: string; name: string; type: string; layerMask: number; isMesh: boolean } | null;
  panelMesh: { id: number; uuid: string; name: string; type: string; layerMask: number } | null;
  panelBatchMemberships: Array<{
    batchObjectId: number;
    batchUuid: string;
    batchVisible: boolean;
    batchLayerMask: number;
    batchInstanceIndex: number;
    panelOriginalLayerMask: number;
  }>;
  hexPanelBatchMemberships: Array<{
    panelName: string;
    panelUuid: string | null;
    panelLayerMask: number | null;
    batches: Array<{
      batchObjectId: number;
      batchUuid: string;
      batchVisible: boolean;
      batchLayerMask: number;
      batchInstanceIndex: number;
      panelOriginalLayerMask: number;
    }>;
  }>;
  visibleLowQualityBatches: Array<{ id: number; uuid: string; layerMask: number }>;
  rendererCanvasMatchesWorldCanvas: boolean;
  rendererFrame: number | null;
  rendererCalls: number | null;
  rendererTriangles: number | null;
  contextLost: boolean | null;
  qualityTier: string;
};

type PreG7RuntimeSceneProbe = {
  scene: THREE.Object3D;
  batchEntries: Array<{
    batch: THREE.BatchedMesh;
    originals: Array<{ mesh: THREE.Object3D; layerMask: number }>;
  }>;
};

type PreG7EvidenceSnapshot = {
  url: string;
  viewport: { width: number; height: number };
  canvas: {
    count: number;
    cssRect: { x: number; y: number; width: number; height: number } | null;
    drawingBuffer: { width: number; height: number } | null;
    devicePixelRatio: number;
  };
  camera: {
    source: "active-runtime-camera" | "preset-reconstruction";
    activeRuntime: {
      preset: string;
      position: number[];
      target: number[];
      quaternion: number[];
      layerMask: number;
      fov: number;
      aspect: number;
      projectionMatrix: number[];
      worldMatrix: number[];
    } | null;
    activeWorldMatrixMatches: boolean | null;
    activeProjectionMatrixMatches: boolean | null;
    preset: string;
    position: number[];
    target: number[];
    fov: number;
    aspect: number;
    projectionMatrix: number[];
    worldMatrix: number[];
  };
  rendererCamera: PreG7RendererCameraProbe | null;
  raycastScene: {
    source: "live-renderer-scene" | "composition-root";
    id: number;
    uuid: string;
    name: string;
    type: string;
    layerMask: number;
    batchEntryCount: number;
  };
  lowQualityBatchRaycastsSuppressedAfterSampling: number;
  testPanelScale: number | null;
  anchors: PreG7EvidenceAnchor[];
  lights: Array<{ name: string; found: boolean; color?: string; intensity?: number; position?: number[] }>;
  interactionNeutralMeshes: { total: number; raycastsSuppressedAfterSampling: number };
};

type PreG7EvidenceWindow = Window & {
  __PRE_G7_13_ACTIVE_CAMERA__?: PreG7EvidenceSnapshot["camera"]["activeRuntime"];
  __PRE_G7_13_RENDERER_CAMERA__?: () => PreG7RendererCameraProbe | null;
  __PRE_G7_13_RENDER_SCENE__?: () => unknown;
  __PRE_G7_13_REFERENCE_DIAGNOSTICS__?: {
    latest: PreG7EvidenceSnapshot;
    refresh: () => PreG7EvidenceSnapshot;
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

  const testPanelScale = Number(query.get("pre-g7-test-panel-scale"));
  if (Number.isFinite(testPanelScale) && testPanelScale > 0) {
    for (let index = 1; index <= 7; index += 1) {
      scene.getObjectByName(`hex_panel_${index}`)?.scale.setScalar(testPanelScale);
    }
    scene.updateMatrixWorld(true);
  }

  const evidenceWindow = window as PreG7EvidenceWindow;
  const anchorNames = [
    ...Array.from({ length: 7 }, (_, index) => `hex_panel_${index + 1}`),
    "lightbar_emissive",
    "ai-real-camera",
    "plants",
    "ivy_mound",
    "ivy_vine_1",
    "ivy_vine_2",
    "ivy_vine_3",
    "ivy_vine_4",
    "pot_ivy",
    "shelf_rear_lower",
    "shelf_rear_upper",
    "plant-succulent",
    "monitor",
    "speaker_left_cabinet",
    "speaker_right_cabinet",
    "talks-microphone",
    "console-code-native",
    "helios-pc",
    "pegboard_system",
    "peg_controller_body",
    "controller-code-native",
    "headset-stand-code-native",
    "headset-code-native",
    "desk",
    "chair-root",
    "chair-base",
    "resident",
  ];
  const occlusionTargets = new Set(anchorNames.filter((name) =>
    !["chair-root", "chair-base", "resident"].includes(name),
  ));
  const raycaster = new THREE.Raycaster();
  const isBelow = (object: THREE.Object3D, root: THREE.Object3D): boolean => {
    for (let current: THREE.Object3D | null = object; current; current = current.parent) {
      if (current === root) return true;
    }
    return false;
  };

  const refresh = (): PreG7EvidenceSnapshot => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const canvases = Array.from(document.querySelectorAll("canvas"));
    const evidenceCanvas = canvases.find((canvas) => canvas.width > 0 && canvas.height > 0) ?? null;
    const canvasRect = evidenceCanvas?.getBoundingClientRect() ?? null;
    const presetName = width < 640 ? "home-mobile" : "home-desktop";
    const preset = CAMERA_PRESETS[presetName];
    const activeRuntimeCamera = evidenceWindow.__PRE_G7_13_ACTIVE_CAMERA__ ?? null;
    const rendererCamera = evidenceWindow.__PRE_G7_13_RENDERER_CAMERA__?.() ?? null;
    const runtimeSceneProbe = evidenceWindow.__PRE_G7_13_RENDER_SCENE__?.() as PreG7RuntimeSceneProbe | null | undefined;
    const raycastScene = runtimeSceneProbe?.scene ?? scene;
    const lowQualityBatchEntries = runtimeSceneProbe?.batchEntries ?? [];
    const sourceObjectForRenderHit = (hit: THREE.Intersection): THREE.Object3D => {
      const batch = hit.object as THREE.BatchedMesh;
      if (!batch.isBatchedMesh) return hit.object;
      const batchId = (hit as THREE.Intersection & { batchId?: number }).batchId;
      if (typeof batchId !== "number") return hit.object;
      const entry = lowQualityBatchEntries.find((candidate) => candidate.batch === batch);
      return entry?.originals[batchId]?.mesh ?? hit.object;
    };
    const renderStateForHit = (hit: THREE.Intersection) => {
      const chain: Array<{ name: string; type: string; visible: boolean; interactionNeutral: boolean }> = [];
      for (let current: THREE.Object3D | null = hit.object; current; current = current.parent) {
        chain.push({
          name: current.name,
          type: current.type,
          visible: current.visible,
          interactionNeutral: current.userData["interactionNeutral"] === true,
        });
      }
      const mesh = hit.object as THREE.Mesh;
      const materialList = mesh.isMesh
        ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material])
        : [];
      const materials = materialList.map((material) => ({
        name: material.name,
        visible: material.visible,
        opacity: material.opacity,
        transparent: material.transparent,
        colorWrite: material.colorWrite,
        depthWrite: material.depthWrite,
      }));
      const ancestryVisible = chain.every((node) => node.visible);
      const hasRenderableMaterial = materials.length === 0 || materials.some((material) =>
        material.visible && material.colorWrite && !(material.transparent && material.opacity <= 0),
      );
      return {
        ancestryVisible,
        hasRenderableMaterial,
        rendered: ancestryVisible && hasRenderableMaterial,
        interactionNeutralInChain: chain.some((node) => node.interactionNeutral),
        chain,
        materials,
      };
    };
    const isRenderableHit = (hit: THREE.Intersection) => renderStateForHit(hit).rendered;
    const describeRenderHit = (hit: THREE.Intersection) => {
      const batch = hit.object as THREE.BatchedMesh;
      const batchId = (hit as THREE.Intersection & { batchId?: number }).batchId ?? null;
      const entry = batch.isBatchedMesh
        ? lowQualityBatchEntries.find((candidate) => candidate.batch === batch)
        : undefined;
      const mappedSource = sourceObjectForRenderHit(hit);
      return {
        renderedObjectName: hit.object.name,
        renderedObjectType: hit.object.type,
        renderedObjectId: hit.object.id,
        renderedObjectUuid: hit.object.uuid,
        batchId,
        batchObjectId: batch.isBatchedMesh ? batch.id : null,
        batchVisible: batch.isBatchedMesh ? batch.visible : null,
        batchLayerMask: batch.isBatchedMesh ? batch.layers.mask : null,
        batchInstanceIndex: batchId,
        mappedSourceName: mappedSource.name,
        mappedSourceUuid: mappedSource.uuid,
        mappedSourceLayerMask: mappedSource.layers.mask,
        batchEntryContainsSource: entry
          ? entry.originals[batchId ?? -1]?.mesh === mappedSource
          : null,
        renderState: renderStateForHit(hit),
      };
    };
    const camera = new THREE.PerspectiveCamera(activeRuntimeCamera?.fov ?? preset.fov, activeRuntimeCamera?.aspect ?? width / height, 0.05, 30);
    if (activeRuntimeCamera) {
      camera.position.fromArray(activeRuntimeCamera.position);
      camera.quaternion.fromArray(activeRuntimeCamera.quaternion);
      camera.layers.mask = activeRuntimeCamera.layerMask;
      camera.projectionMatrix.fromArray(activeRuntimeCamera.projectionMatrix);
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
      camera.matrixWorld.fromArray(activeRuntimeCamera.worldMatrix);
      camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
      camera.matrixAutoUpdate = false;
    } else {
      camera.position.set(...preset.position);
      camera.lookAt(new THREE.Vector3(...preset.target));
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
    }
    raycaster.layers.mask = activeRuntimeCamera?.layerMask ?? camera.layers.mask;
    scene.updateMatrixWorld(true);
    raycastScene.updateMatrixWorld(true);

    const namedPlantMeshes = (names: readonly string[]) => names
      .map((name) => scene.getObjectByName(name))
      .filter((object): object is THREE.Object3D => Boolean(object));
    const plantMeshes = namedPlantMeshes(["ivy_mound", "ivy_vine_1", "ivy_vine_2", "ivy_vine_3", "ivy_vine_4", "pot_ivy"]);
    const succulentMeshes = namedPlantMeshes([
      "pot_succulent", "succulent_leaf_1", "succulent_leaf_2", "succulent_leaf_3", "succulent_leaf_4",
      "succulent_leaf_5", "succulent_leaf_6", "succulent_leaf_center",
    ]);
    const boundsFor = (objects: readonly THREE.Object3D[]) => {
      const bounds = new THREE.Box3();
      for (const object of objects) {
        object.updateWorldMatrix(true, true);
        bounds.expandByObject(object);
      }
      return bounds;
    };
    const plantTargets = new Map<string, THREE.Object3D[]>([
      ["plants", plantMeshes],
      ["plant-succulent", succulentMeshes],
    ]);
    const tabletop = scene.getObjectByName("desk_top");
    if (tabletop) plantTargets.set("desk", [tabletop]);
    const residentMeshes: THREE.Object3D[] = [];
    scene.traverse((object) => {
      if ((object as THREE.SkinnedMesh).isSkinnedMesh) residentMeshes.push(object);
    });
    plantTargets.set("resident", residentMeshes);
    const anchorObjects = anchorNames.map((name) => ({
      name,
      object: scene.getObjectByName(name),
      targetObjects: plantTargets.get(name),
    }));
    const anchors: PreG7EvidenceAnchor[] = withDiagnosticRaycasts(raycastScene, () => anchorObjects.map(({ name, object, targetObjects }) => {
      if (!object) return { name, found: false };

      // `plants` and `desk` are broad GLB containers whose aggregate AABBs
      // include unrelated room geometry. Measure the named opening-view ivy
      // set and actual tabletop surface, while reporting the desk succulent
      // and skinned resident separately. The runtime roots remain unchanged.
      const bounds = targetObjects ? boundsFor(targetObjects) : new THREE.Box3().setFromObject(object);
      const worldPosition = targetObjects ? bounds.getCenter(new THREE.Vector3()) : object.getWorldPosition(new THREE.Vector3());
      const worldScale = object.getWorldScale(new THREE.Vector3());
      const projected = bounds.isEmpty() ? [] : Array.from({ length: 8 }, (_, mask) => new THREE.Vector3(
        mask & 1 ? bounds.max.x : bounds.min.x,
        mask & 2 ? bounds.max.y : bounds.min.y,
        mask & 4 ? bounds.max.z : bounds.min.z,
      ).project(camera)).filter((point) => point.z >= -1 && point.z <= 1);
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
      for (const materialRoot of targetObjects ?? [object]) materialRoot.traverse((child) => {
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

      const mesh = object as THREE.Mesh;
      const hexGeometry = mesh.isMesh && mesh.geometry.userData["referenceHexPanel"]
        ? {
            meshName: mesh.name,
            parentName: mesh.parent?.name ?? null,
            runtimeGeometryUuid: mesh.geometry.uuid,
            sourceGeometryUuid: mesh.userData["referenceHexSourceGeometryUuid"] ?? null,
            vertices: mesh.geometry.getAttribute("position")?.count ?? 0,
            indices: mesh.geometry.index?.count ?? 0,
            groups: mesh.geometry.groups.length,
            materialSlotCount: Array.isArray(mesh.material) ? mesh.material.length : 1,
            ...mesh.geometry.userData["referenceHexPanel"],
          }
        : undefined;

      const sampledRegionHits = occlusionTargets.has(name) && pixelBounds ? (() => {
        const chair = scene.getObjectByName("chair-root");
        const resident = scene.getObjectByName("resident");
        const counts = {
          samples: 0,
          target: 0,
          targetSurface: 0,
          chair: 0,
          resident: 0,
          other: 0,
          noRenderableHit: 0,
        };
        const gridSize = 9;
        const centerPixel: [number, number] = [
          pixelBounds.left + pixelBounds.width / 2,
          pixelBounds.top + pixelBounds.height / 2,
        ];
        const centerNdc = new THREE.Vector2(centerPixel[0] / width * 2 - 1, 1 - centerPixel[1] / height * 2);
        raycaster.setFromCamera(centerNdc, camera);
        const centerTargetHits = targetObjects
          ? targetObjects.flatMap((target) => raycaster.intersectObject(target, true))
          : raycaster.intersectObject(object, true);
        const centerRenderHits = raycaster.intersectObject(raycastScene, true);
        const centerFirstRenderHit = centerRenderHits[0] ?? null;
        const centerFirstSceneHit = centerFirstRenderHit ? sourceObjectForRenderHit(centerFirstRenderHit) : null;
        const centerFirstRenderableHit = centerRenderHits.find(isRenderableHit) ?? null;
        const centerFirstRenderableSource = centerFirstRenderableHit
          ? sourceObjectForRenderHit(centerFirstRenderableHit)
          : null;
        let firstTargetMesh: THREE.Mesh | null = null;
        object.traverse((candidate) => {
          if (!firstTargetMesh && (candidate as THREE.Mesh).isMesh) firstTargetMesh = candidate as THREE.Mesh;
        });
        const meshCenterRay = (() => {
          if (!firstTargetMesh) return null;
          const mesh = firstTargetMesh as THREE.Mesh;
          if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
          const localCenter = mesh.geometry.boundingBox?.getCenter(new THREE.Vector3());
          if (!localCenter) return null;
          const worldCenter = localCenter.applyMatrix4(mesh.matrixWorld);
          const centerNdc = worldCenter.clone().project(camera);
          raycaster.setFromCamera(new THREE.Vector2(centerNdc.x, centerNdc.y), camera);
          const directHits: THREE.Intersection[] = [];
          THREE.Mesh.prototype.raycast.call(mesh, raycaster, directHits);
          const sceneHits = raycaster.intersectObject(raycastScene, true);
          const firstSceneMeshCenterHit = sceneHits[0] ? sourceObjectForRenderHit(sceneHits[0]) : null;
          const ancestorQueries: Array<Record<string, unknown>> = [];
          for (let current: THREE.Object3D | null = mesh; current; current = current.parent) {
            const ancestorHits = raycaster.intersectObject(current, true);
            ancestorQueries.push({
              name: current.name,
              type: current.type,
              id: current.id,
              isSceneRoot: current === raycastScene,
              sceneLookupIdentityMatches: raycastScene.getObjectById(current.id) === current,
              containsTargetMesh: isBelow(mesh, current),
              intersectionCount: ancestorHits.length,
              hitNames: ancestorHits.slice(0, 4).map((hit) => hit.object.name),
            });
          }
          return {
            meshName: mesh.name,
            worldCenter: worldCenter.toArray(),
            pixel: [(centerNdc.x + 1) * width / 2, (1 - centerNdc.y) * height / 2],
            ndc: centerNdc.toArray(),
            directRaycastHitCount: directHits.length,
            directRaycastHitNames: directHits.slice(0, 4).map((hit) => hit.object.name),
            firstSceneHitName: firstSceneMeshCenterHit?.name ?? null,
            firstRenderableSceneHitName: centerFirstRenderableSource?.name ?? null,
            rendererSceneHits: sceneHits.slice(0, 8).map(describeRenderHit),
            sceneIdentity: {
              sceneIsTargetMesh: raycastScene === mesh,
              sceneLookupFindsTargetById: raycastScene.getObjectById(mesh.id) === mesh,
              targetAncestorChainContainsScene: isBelow(mesh, raycastScene),
              sceneIntersectionCount: sceneHits.length,
              sceneIntersectionNames: sceneHits.slice(0, 6).map((hit) => sourceObjectForRenderHit(hit).name),
              raycasterLayerMask: raycaster.layers.mask,
              cameraLayerMask: camera.layers.mask,
              targetMeshLayerMask: mesh.layers.mask,
              sceneLayerMask: scene.layers.mask,
            },
            ancestorQueries,
          };
        })();
        const centerRay = {
          pixel: centerPixel,
          targetDirectHitCount: centerTargetHits.length,
          targetDirectHitNames: centerTargetHits.slice(0, 4).map((hit) => hit.object.name),
          firstSceneHitName: centerFirstSceneHit?.name ?? null,
          firstRawSceneHitRenderable: centerFirstRenderHit ? isRenderableHit(centerFirstRenderHit) : null,
          firstRenderableSceneHitName: centerFirstRenderableSource?.name ?? null,
          firstRenderableSceneHitBelongsToTarget: centerFirstRenderableSource
            ? (targetObjects ? targetObjects.some((target) => isBelow(centerFirstRenderableSource, target)) : isBelow(centerFirstRenderableSource, object))
            : false,
          firstSceneHitBelongsToTarget: centerFirstSceneHit
            ? (targetObjects ? targetObjects.some((target) => isBelow(centerFirstSceneHit, target)) : isBelow(centerFirstSceneHit, object))
            : false,
          renderedFirstHit: centerFirstRenderHit ? describeRenderHit(centerFirstRenderHit) : null,
          ndc: centerNdc.toArray(),
          rayOrigin: raycaster.ray.origin.toArray(),
          rayDirection: raycaster.ray.direction.toArray(),
          cameraSource: activeRuntimeCamera ? "active-runtime-camera" : "preset-reconstruction",
          meshCenterRay,
        };
        for (let y = 0; y < gridSize; y += 1) {
          for (let x = 0; x < gridSize; x += 1) {
            const pixelX = pixelBounds.left + (x + 0.5) / gridSize * pixelBounds.width;
            const pixelY = pixelBounds.top + (y + 0.5) / gridSize * pixelBounds.height;
            if (pixelX < 0 || pixelX >= width || pixelY < 0 || pixelY >= height) continue;
            raycaster.setFromCamera(new THREE.Vector2(pixelX / width * 2 - 1, 1 - pixelY / height * 2), camera);
            const targetHits = targetObjects
              ? targetObjects.flatMap((target) => raycaster.intersectObject(target, true))
              : raycaster.intersectObject(object, true);
            const sceneHits = raycaster.intersectObject(raycastScene, true);
            const renderHit = sceneHits.find(isRenderableHit) ?? null;
            const firstHit = renderHit ? sourceObjectForRenderHit(renderHit) : null;
            counts.samples += 1;
            if (targetHits.length) counts.targetSurface += 1;
            if (!firstHit) {
              counts.noRenderableHit += 1;
              continue;
            }
            if (targetObjects ? targetObjects.some((target) => isBelow(firstHit, target)) : isBelow(firstHit, object)) counts.target += 1;
            else if (chair && isBelow(firstHit, chair)) counts.chair += 1;
            else if (resident && isBelow(firstHit, resident)) counts.resident += 1;
            else counts.other += 1;
          }
        }
        const knownHits = counts.target + counts.chair + counts.resident;
        return { ...counts, occluderRatio: knownHits ? (counts.chair + counts.resident) / knownHits : null, centerRay };
      })() : null;

      return {
        name,
        found: true,
        worldPosition: worldPosition.toArray(),
        worldScale: worldScale.toArray(),
        worldBounds: bounds.isEmpty() ? null : { min: bounds.min.toArray(), max: bounds.max.toArray() },
        pixelBounds,
        materials: [...materials.values()],
        ...(hexGeometry ? { geometry: hexGeometry } : {}),
        sampledRegionHits,
      };
    }));

    const lightNames = ["Light_CeilingAmbient", "Light_CyanFill", "Light_HexWall", "Light_TaskDownlight"];
    const lights = lightNames.map((name) => {
      const light = scene.getObjectByName(name) as THREE.Light | undefined;
      if (!light) return { name, found: false };
      return {
        name,
        found: true,
        color: (light as THREE.Light & { color?: THREE.Color }).color?.getHexString(),
        intensity: light.intensity,
        position: light.getWorldPosition(new THREE.Vector3()).toArray(),
      };
    });

    const snapshot: PreG7EvidenceSnapshot = {
      url: window.location.href,
      viewport: { width, height },
      canvas: {
        count: canvases.length,
        cssRect: canvasRect ? { x: canvasRect.x, y: canvasRect.y, width: canvasRect.width, height: canvasRect.height } : null,
        drawingBuffer: evidenceCanvas ? { width: evidenceCanvas.width, height: evidenceCanvas.height } : null,
        devicePixelRatio: window.devicePixelRatio,
      },
      camera: {
        source: activeRuntimeCamera ? "active-runtime-camera" : "preset-reconstruction",
        activeRuntime: activeRuntimeCamera,
        activeWorldMatrixMatches: activeRuntimeCamera
          ? activeRuntimeCamera.worldMatrix.length === camera.matrixWorld.elements.length &&
            camera.matrixWorld.elements.every((value, index) => Math.abs(value - (activeRuntimeCamera.worldMatrix[index] ?? Number.POSITIVE_INFINITY)) < 1e-7)
          : null,
        activeProjectionMatrixMatches: activeRuntimeCamera
          ? activeRuntimeCamera.projectionMatrix.length === camera.projectionMatrix.elements.length &&
            camera.projectionMatrix.elements.every((value, index) => Math.abs(value - (activeRuntimeCamera.projectionMatrix[index] ?? Number.POSITIVE_INFINITY)) < 1e-7)
          : null,
        preset: presetName,
        position: activeRuntimeCamera?.position ?? preset.position,
        target: activeRuntimeCamera?.target ?? preset.target,
        fov: activeRuntimeCamera?.fov ?? preset.fov,
        aspect: camera.aspect,
        projectionMatrix: camera.projectionMatrix.toArray(),
        worldMatrix: camera.matrixWorld.toArray(),
      },
      rendererCamera,
      raycastScene: {
        source: runtimeSceneProbe ? "live-renderer-scene" : "composition-root",
        id: raycastScene.id,
        uuid: raycastScene.uuid,
        name: raycastScene.name,
        type: raycastScene.type,
        layerMask: raycastScene.layers.mask,
        batchEntryCount: lowQualityBatchEntries.length,
      },
      lowQualityBatchRaycastsSuppressedAfterSampling: lowQualityBatchEntries.filter(
        ({ batch }) => batch.raycast !== THREE.BatchedMesh.prototype.raycast,
      ).length,
      testPanelScale: Number.isFinite(testPanelScale) && testPanelScale > 0 ? testPanelScale : null,
      anchors,
      lights,
      interactionNeutralMeshes: countInteractionNeutralRaycasts(scene),
    };
    if (evidenceWindow.__PRE_G7_13_REFERENCE_DIAGNOSTICS__) {
      evidenceWindow.__PRE_G7_13_REFERENCE_DIAGNOSTICS__.latest = snapshot;
    }
    return snapshot;
  };

  evidenceWindow.__PRE_G7_13_REFERENCE_DIAGNOSTICS__ = { latest: null as unknown as PreG7EvidenceSnapshot, refresh };
  evidenceWindow.__PRE_G7_13_REFERENCE_DIAGNOSTICS__.latest = refresh();
}

/** Temporarily expose neutral meshes to the evidence raycaster, then restore
 * their no-op handlers synchronously before browser interaction can run. */
function withDiagnosticRaycasts<T>(scene: THREE.Object3D, collect: () => T): T {
  const originals: Array<{ mesh: THREE.Mesh; raycast: THREE.Mesh["raycast"] }> = [];
  const batchOriginals: Array<{ batch: THREE.BatchedMesh; raycast: THREE.BatchedMesh["raycast"] }> = [];
  scene.traverse((node) => {
    const batch = node as THREE.BatchedMesh;
    if (batch.isBatchedMesh) {
      batchOriginals.push({ batch, raycast: batch.raycast });
      batch.raycast = THREE.BatchedMesh.prototype.raycast;
    }
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || mesh.userData["interactionNeutral"] !== true) return;
    originals.push({ mesh, raycast: mesh.raycast });
    mesh.raycast = THREE.Mesh.prototype.raycast;
  });

  try {
    return collect();
  } finally {
    for (const { mesh, raycast } of originals) mesh.raycast = raycast;
    for (const { batch, raycast } of batchOriginals) batch.raycast = raycast;
  }
}

function countInteractionNeutralRaycasts(scene: THREE.Object3D): { total: number; raycastsSuppressedAfterSampling: number } {
  let total = 0;
  let raycastsSuppressedAfterSampling = 0;
  scene.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || mesh.userData["interactionNeutral"] !== true) return;
    total += 1;
    if (mesh.raycast !== THREE.Mesh.prototype.raycast) raycastsSuppressedAfterSampling += 1;
  });
  return { total, raycastsSuppressedAfterSampling };
}
