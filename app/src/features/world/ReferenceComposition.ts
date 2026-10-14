import * as THREE from "three";

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
    plants.position.x = 0.3;
    plants.userData["referenceCompositionApplied"] = true;
  }

  const missingHexPanels: string[] = [];
  for (const name of HEX_PANEL_NAMES) {
    const panel = scene.getObjectByName(name);
    if (!panel) {
      missingHexPanels.push(name);
      continue;
    }
    if (panel.userData["referenceCompositionApplied"] === true) continue;

    // Keep the authored seven-panel diamond silhouette while giving it the
    // wall scale shown in the supplied reference. Move the flat panels just
    // forward of the upper shelf so its board cannot occlude their glow.
    panel.position.x *= 2.4;
    panel.position.y = 2.10 + (panel.position.y - 1.82) * 1.1;
    panel.position.z += 0.16;
    panel.scale.set(2.7, 2.7, 1);
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
  stand.position.set(1.38, 0, -0.83);
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
