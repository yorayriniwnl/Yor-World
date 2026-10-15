import * as THREE from "three";

const HEX_PANEL_POSITIONS: Readonly<Record<string, { x: number; y: number }>> = {
  hex_panel_1: { x: -0.2235, y: 1.87 },
  hex_panel_2: { x: 0, y: 1.87 },
  hex_panel_3: { x: 0.2235, y: 1.87 },
  hex_panel_4: { x: -0.33525, y: 1.6675 },
  hex_panel_5: { x: -0.11175, y: 1.6675 },
  hex_panel_6: { x: 0.11175, y: 1.6675 },
  hex_panel_7: { x: 0.33525, y: 1.6675 },
};

const FLOOR_PLANT_NODE_NAMES = [
  "monstera_leaf_1",
  "monstera_leaf_2",
  "monstera_leaf_3",
  "monstera_leaf_4",
  "monstera_stand_leg_1",
  "monstera_stand_leg_2",
  "monstera_stand_leg_3",
  "pot_monstera",
] as const;

const RIGHT_SPEAKER_NODE_NAMES = [
  "speaker_right_cabinet",
  "speaker_right_tweeter",
  "speaker_right_woofer",
] as const;
const HEX_PANEL_NAMES = [
  "hex_panel_1",
  "hex_panel_2",
  "hex_panel_3",
  "hex_panel_4",
  "hex_panel_5",
  "hex_panel_6",
  "hex_panel_7",
] as const;

export interface ReferenceCompositionResult {
  movedNode: string;
  headsetStandCreated: boolean;
  missingHexPanels: string[];
}

export interface PixelBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  visibleAreaRatio: number;
}

/**
 * Apply the reference-specific arrangement to the frozen production scene.
 * Existing named target nodes are moved in place, preserving name based
 * interaction lookup and every descendant mesh/animation binding.
 */
export function applyReferenceComposition(scene: THREE.Object3D): ReferenceCompositionResult {
  const pegboard = scene.getObjectByName("pegboard_system");
  const hasAnyHexPanel = HEX_PANEL_NAMES.some((name) => Boolean(scene.getObjectByName(name)));
  // Small unit fixtures intentionally do not include the production GLB.
  if (!pegboard && !hasAnyHexPanel) {
    return { movedNode: "none (non-production fixture)", headsetStandCreated: false, missingHexPanels: [] };
  }
  if (!pegboard) throw new Error("Reference composition requires the named pegboard_system group");
  if (pegboard.userData["referenceCompositionApplied"] !== true) {
    pegboard.position.x = 3.0;
    pegboard.userData["referenceCompositionApplied"] = true;
  }

  const plants = scene.getObjectByName("plants");
  if (plants && plants.userData["referenceCompositionApplied"] !== true) {
    // The accepted plant leaves extend beyond the left side of the opening
    // frusta. Move the existing group toward the shelf center without adding
    // or removing any GLB geometry.
    plants.position.x = 0.72;
    plants.userData["referenceCompositionApplied"] = true;
  }

  for (const name of FLOOR_PLANT_NODE_NAMES) {
    const plantPart = scene.getObjectByName(name);
    if (!plantPart || plantPart.userData["referenceCompositionApplied"] === true) continue;
    plantPart.position.z -= 0.85;
    plantPart.userData["referenceCompositionApplied"] = true;
  }

  for (const name of RIGHT_SPEAKER_NODE_NAMES) {
    const speakerPart = scene.getObjectByName(name);
    if (!speakerPart || speakerPart.userData["referenceCompositionApplied"] === true) continue;
    // Move only the existing right speaker above and beside the monitor so the
    // seated resident cannot completely hide the matched pair in either home view.
    speakerPart.position.x -= 0.2;
    speakerPart.position.y += 0.5;
    speakerPart.userData["referenceCompositionApplied"] = true;
  }


  const shelfCamera = scene.getObjectByName("ai-real-camera");
  if (shelfCamera && shelfCamera.userData["referenceCompositionApplied"] !== true) {
    // The camera meshes are authored around (-1.45, 1.7, -1.48), while the
    // adjacent shelf is centered at (-1.45, 1.65, -1.68). Scale about the
    // camera's authored center, then settle its feet on the shelf lip. The
    // root name stays intact for the accepted interaction binding.
    const cameraCenter = new THREE.Vector3(-1.45, 1.7, -1.48);
    const cameraScale = 1.8;
    const cameraTarget = new THREE.Vector3(-1.45, 1.78, -1.32);
    shelfCamera.scale.setScalar(cameraScale);
    shelfCamera.position.copy(cameraTarget).sub(cameraCenter.multiplyScalar(cameraScale));
    shelfCamera.userData["referenceCompositionApplied"] = true;
  }

  const missingHexPanels: string[] = [];
  for (const name of HEX_PANEL_NAMES) {
    const panel = scene.getObjectByName(name);
    if (!panel) {
      missingHexPanels.push(name);
      continue;
    }
    if (panel.userData["referenceCompositionApplied"] === true) continue;

    // The named box faces are arranged as two close, offset rows so the
    // existing six-sided material treatment reads as one honeycomb cluster.

    const panelPosition = HEX_PANEL_POSITIONS[name];
    if (!panelPosition) throw new Error(`Reference composition has no layout for ${name}`);
    panel.position.set(panelPosition.x, panelPosition.y, -1.61);

    panel.scale.set(1.35, 1.35, 1);
    panel.userData["referenceCompositionApplied"] = true;
  }

  if (missingHexPanels.length) {
    throw new Error(`Reference composition is missing hex panels: ${missingHexPanels.join(", ")}`);
  }

  const headsetStandCreated = addHeadsetStand(scene);
  scene.updateMatrixWorld(true);
  return { movedNode: pegboard.name, headsetStandCreated, missingHexPanels };
}

function addHeadsetStand(scene: THREE.Object3D): boolean {
  if (scene.getObjectByName("headset-stand-code-native")) return false;

  const stand = new THREE.Group();
  stand.name = "headset-stand-code-native";
  stand.position.set(1.12, 0, -0.68);
  stand.userData["source"] = "PRE-G7-12 code-native secondary headset stand; GLB inventory confirmed no headset stand node";

  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#c6c7d5"),
    metalness: 0.18,
    roughness: 0.46,
  });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.078, 0.018, 20), material);
  base.name = "headset-stand-base";
  base.position.y = 0.765;

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.019, 0.19, 12), material);
  stem.name = "headset-stand-stem";
  stem.position.y = 0.868;

  const cradle = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.035, 0.055), material);
  cradle.name = "headset-stand-cradle";
  cradle.position.y = 0.976;

  for (const mesh of [base, stem, cradle]) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    stand.add(mesh);
  }
  scene.add(stand);
  return true;
}

/** Project a world-space object box into CSS-pixel coordinates and report the
 * fraction of its projected rectangle inside the viewport. */
export function measureProjectedBounds(
  object: THREE.Object3D,
  camera: THREE.PerspectiveCamera,
  viewport: { width: number; height: number },
): PixelBounds | null {
  if (viewport.width <= 0 || viewport.height <= 0) return null;
  object.updateWorldMatrix(true, true);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();

  const bounds = new THREE.Box3().setFromObject(object);
  if (bounds.isEmpty()) return null;
  const points: THREE.Vector3[] = [];
  for (let mask = 0; mask < 8; mask += 1) {
    points.push(new THREE.Vector3(
      mask & 1 ? bounds.max.x : bounds.min.x,
      mask & 2 ? bounds.max.y : bounds.min.y,
      mask & 4 ? bounds.max.z : bounds.min.z,
    ));
  }

  const projected = points
    .map((point) => point.project(camera))
    .filter((point) => point.z >= -1 && point.z <= 1);
  if (!projected.length) return null;

  const left = (Math.min(...projected.map((point) => point.x)) + 1) * viewport.width / 2;
  const right = (Math.max(...projected.map((point) => point.x)) + 1) * viewport.width / 2;
  const top = (1 - Math.max(...projected.map((point) => point.y))) * viewport.height / 2;
  const bottom = (1 - Math.min(...projected.map((point) => point.y))) * viewport.height / 2;
  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);
  const fullArea = width * height;
  const visibleWidth = Math.max(0, Math.min(viewport.width, right) - Math.max(0, left));
  const visibleHeight = Math.max(0, Math.min(viewport.height, bottom) - Math.max(0, top));

  return {
    left,
    top,
    right,
    bottom,
    width,
    height,
    visibleAreaRatio: fullArea > 0 ? (visibleWidth * visibleHeight) / fullArea : 0,
  };
}
