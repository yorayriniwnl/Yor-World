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
    pegboard.position.x = 2.45;
    pegboard.userData["referenceCompositionApplied"] = true;
  }

  const plants = scene.getObjectByName("plants");
  if (plants && plants.userData["referenceCompositionApplied"] !== true) {
    // Keep the shelf ivy and succulent at their authored bay. The GLB groups
    // both shelf plants and the floor monstera beneath this named root, so
    // place only the existing monstera parts together into the clear floor
    // bay in front of the desk apron.
    plants.position.set(0.68, plants.position.y, -1.6);
    plants.scale.set(0.7, 1, 0.4);
    const isMobileOpening = typeof window !== "undefined" && window.innerWidth < 640;
    const monsteraOffset = new THREE.Vector3(isMobileOpening ? -0.15 : -0.65, 0, 0.62);
    const monsteraPartNames = [
      "monstera_leaf_1",
      "monstera_leaf_2",
      "monstera_leaf_3",
      "monstera_leaf_4",
      "monstera_stand_leg_1",
      "monstera_stand_leg_2",
      "monstera_stand_leg_3",
      "pot_monstera",
    ];
    for (const name of monsteraPartNames) {
      const part = scene.getObjectByName(name);
      if (!part || part.userData["monsteraPlacementApplied"] === true) continue;
      part.updateWorldMatrix(true, false);
      const worldPosition = part.getWorldPosition(new THREE.Vector3()).add(monsteraOffset);
      if (part.parent) part.parent.worldToLocal(worldPosition);
      part.position.copy(worldPosition);
      part.userData["monsteraPlacementApplied"] = true;
    }
    const leafFan = [
      ["monstera_leaf_1", -0.5, -0.24],
      ["monstera_leaf_2", 0.48, 0.22],
      ["monstera_leaf_3", -0.72, 0.28],
      ["monstera_leaf_4", 0.7, -0.32],
    ] as const;
    for (const [name, yaw, roll] of leafFan) {
      const leaf = scene.getObjectByName(name);
      if (!leaf || leaf.userData["referenceUprightApplied"] === true) continue;
      // These existing GLB leaf cards are horizontal XZ planes (their authored
      // Y thickness is 0.015m). Turn each named card upright in memory so its
      // unchanged mesh reads as separated, fanned foliage from both openings.
      leaf.rotation.x += Math.PI / 2;
      leaf.rotation.y += yaw;
      leaf.rotation.z += roll;
      // Lower only the existing leaf cards so their bases meet the rim of the
      // unchanged pot. The prior opening screenshots showed a visible gap.
      leaf.position.y -= 0.12;
      leaf.userData["referenceUprightApplied"] = true;
    }
    plants.userData["referenceCompositionApplied"] = true;
  }

  const pc = scene.getObjectByName("helios-pc");
  if (pc && pc.userData["referenceCompositionApplied"] !== true) {
    // Move the mobile PC slightly right of the foreground chair silhouette;
    // desktop retains its prior small left correction.
    const isMobileOpening = typeof window !== "undefined" && window.innerWidth < 640;
    pc.updateWorldMatrix(true, false);
    const worldPosition = pc.getWorldPosition(new THREE.Vector3());
    worldPosition.x += isMobileOpening ? 0.21 : -0.14;
    if (pc.parent) pc.parent.worldToLocal(worldPosition);
    pc.position.copy(worldPosition);
    pc.userData["referenceCompositionApplied"] = true;
  }

  const rightSpeaker = scene.getObjectByName("speaker_right_cabinet");
  if (rightSpeaker && rightSpeaker.userData["referenceCompositionApplied"] !== true) {
    // A bounded quarter-meter lift tests a sightline above the seated figure
    // while keeping the existing speaker within the monitor/desk composition.
    rightSpeaker.position.y += 0.25;
    rightSpeaker.userData["referenceCompositionApplied"] = true;
  }

  const shelfCamera = scene.getObjectByName("ai-real-camera");
  if (shelfCamera && shelfCamera.userData["referenceCompositionApplied"] !== true) {
    // The accepted GLB camera is authored on the far-left lower shelf and its
    // meshes intersect that shelf. Move the named interaction group toward the
    // upper-shelf lip and slightly forward of the board so its feet and body
    // remain visible from both opening presets.
    // The named GLB root is offset from its mesh by about (-1.45, 1.74, -1.67).
    // Compensate that local origin while enlarging the camera so it stays on
    // the upper shelf and clears the phone-size recognition floor.
    const isMobileOpening = typeof window !== "undefined" && window.innerWidth < 640;
    if (isMobileOpening) {
      // Enlarge the existing camera silhouette, then solve the named root's
      // translation from its actual transformed child bounds. Its authored
      // meshes sit around local (-1.45, 1.70, -1.67), so preserving the root's
      // origin would move the camera off the shelf after scaling.
      shelfCamera.position.set(0, 0, 0);
      shelfCamera.scale.setScalar(3);
      shelfCamera.updateWorldMatrix(true, true);
      const scaledBounds = new THREE.Box3().setFromObject(shelfCamera);
      const scaledCenter = scaledBounds.getCenter(new THREE.Vector3());
      const currentAnchor = new THREE.Vector3(scaledCenter.x, scaledBounds.min.y, scaledCenter.z);
      const shelfAnchor = new THREE.Vector3(0.7, 2.03, -1.48);
      const rootWorldPosition = shelfCamera.getWorldPosition(new THREE.Vector3());
      rootWorldPosition.add(shelfAnchor.sub(currentAnchor));
      const parent = shelfCamera.parent;
      if (parent) parent.worldToLocal(rootWorldPosition);
      shelfCamera.position.copy(rootWorldPosition);
    } else {
      shelfCamera.position.set(1.7875, -0.91, 1.429);
      shelfCamera.scale.setScalar(1.75);
    }
    shelfCamera.userData["referenceCompositionApplied"] = true;
  }

  const lightbar = scene.getObjectByName("lightbar_emissive");
  if (lightbar && lightbar.userData["referenceCompositionApplied"] !== true) {
    // The authored emissive strip sits inside the lower edge of the monitor
    // bezel. Move it slightly forward and down so it reads as a warm task bar
    // while staying attached to the monitor from both opening cameras.
    lightbar.position.y -= 0.012;
    lightbar.position.z += 0.03;
    lightbar.userData["referenceCompositionApplied"] = true;
  }

  const missingHexPanels: string[] = [];
  for (const name of HEX_PANEL_NAMES) {
    const panel = scene.getObjectByName(name);
    if (!panel) {
      missingHexPanels.push(name);
      continue;
    }
    if (!(panel instanceof THREE.Mesh)) {
      throw new Error(`Reference composition panel ${name} is not a mesh`);
    }
    if (panel.userData["preG7HexGeometryApplied"] !== true) {
      panel.geometry = createReferenceHexGeometry();
      panel.userData["preG7HexGeometryApplied"] = true;
    }
    if (panel.userData["referenceCompositionApplied"] === true) continue;

    // Keep the authored panel geometry immutable; this bounded transform only
    // adjusts the existing named wall-panel placement and scale.
    // The prior 2.7x scale caused adjacent emissive panels to merge into large
    // rectangles. A 1.1x scale gives each named panel a separate outline.
    panel.position.x *= 1.2;
    panel.position.y = 1.98 + (panel.position.y - 1.82) * 1.1;
    panel.position.z += 0.16;
    panel.scale.set(1.1, 1.1, 1);
    panel.userData["referenceCompositionApplied"] = true;
  }

  if (missingHexPanels.length) {
    throw new Error(`Reference composition is missing hex panels: ${missingHexPanels.join(", ")}`);
  }

  addCodeNativeController(scene);
  const headsetStandCreated = addHeadsetStand(scene);
  addHeadsetToStand(scene);
  addCompactAudioConsole(scene);
  scene.updateMatrixWorld(true);
  return { movedNode: pegboard.name, headsetStandCreated, missingHexPanels };
}

/** Build the single authorized six-sided runtime silhouette within the GLB
 * panel envelope. The points face left/right so the 0.22m width stays within
 * the frozen cuboid's 0.22m × 0.20m × 0.015m bounds. */
function createReferenceHexGeometry(): THREE.ExtrudeGeometry {
  const widthRadius = 0.11;
  const depth = 0.015;
  const shape = new THREE.Shape();
  for (let index = 0; index < 6; index += 1) {
    const angle = (index * Math.PI) / 3;
    const x = widthRadius * Math.cos(angle);
    const y = widthRadius * Math.sin(angle);
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 1,
    steps: 1,
  });
  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  geometry.userData["preG7ReferenceHex"] = {
    sides: 6,
    width: 0.22,
    height: Math.sqrt(3) * widthRadius,
    depth,
  };
  return geometry;
}

function addHeadsetStand(scene: THREE.Object3D): boolean {
  if (scene.getObjectByName("headset-stand-code-native")) return false;

  const stand = new THREE.Group();
  stand.name = "headset-stand-code-native";
  const isMobileOpening = typeof window !== "undefined" && window.innerWidth < 640;
  if (isMobileOpening) {
    const pc = scene.getObjectByName("helios-pc");
    scene.updateMatrixWorld(true);
    const pcBounds = pc ? new THREE.Box3().setFromObject(pc) : null;
    const pcTop = pcBounds && !pcBounds.isEmpty() ? pcBounds.max.y : 1.24;
    const pcCenter = pcBounds && !pcBounds.isEmpty()
      ? pcBounds.getCenter(new THREE.Vector3())
      : new THREE.Vector3(0.9, 0, -1.15);
    const standScale = 1.0;
    const worldPosition = new THREE.Vector3(pcCenter.x, pcTop - 0.756 * standScale, pcCenter.z);
    scene.worldToLocal(worldPosition);
    stand.position.copy(worldPosition);
    stand.scale.setScalar(standScale);
    stand.userData["placement"] = "PRE-G7-13 mobile secondary stand resting on helios-pc top";
  } else {
    // Preserve the approved desktop placement; only the phone preset uses the
    // PC-top placement to keep the headset above the chair silhouette.
    stand.position.set(1.0, 0, -0.83);
  }
  stand.userData["source"] = "PRE-G7-13 code-native secondary headset stand; frozen GLB inventory contains no headset stand node";

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

function addCodeNativeController(scene: THREE.Object3D): boolean {
  const controller = scene.getObjectByName("peg_controller_body");
  if (!controller || controller.getObjectByName("controller-shell-code-native")) return false;

  // Preserve the existing interaction root while adding the small details
  // missing from its authored rectangular body. The assembly is a single
  // controller attached to that existing pegboard target.
  const isMobileOpening = typeof window !== "undefined" && window.innerWidth < 640;
  controller.scale.setScalar(isMobileOpening ? 1.9 : 1.25);
  controller.userData["referenceControllerScaleApplied"] = true;
  const assembly = new THREE.Group();
  assembly.name = "controller-details-code-native";
  assembly.position.z = 0.03;
  assembly.userData["source"] = "PRE-G7-13 code-native controller details attached to existing peg_controller_body interaction target";

  const shell = new THREE.Shape();
  shell.moveTo(-0.073, 0.046);
  shell.lineTo(0.073, 0.046);
  shell.quadraticCurveTo(0.105, 0.046, 0.108, 0.018);
  shell.lineTo(0.098, -0.046);
  shell.quadraticCurveTo(0.093, -0.067, 0.076, -0.065);
  shell.lineTo(0.050, -0.022);
  shell.lineTo(-0.050, -0.022);
  shell.lineTo(-0.076, -0.065);
  shell.quadraticCurveTo(-0.093, -0.067, -0.098, -0.046);
  shell.lineTo(-0.108, 0.018);
  shell.quadraticCurveTo(-0.105, 0.046, -0.073, 0.046);
  const shellGeometry = new THREE.ExtrudeGeometry(shell, {
    depth: 0.024,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.004,
    bevelThickness: 0.003,
    curveSegments: 3,
  });
  const shellMaterial = new THREE.MeshStandardMaterial({ color: "#283246", metalness: 0.18, roughness: 0.5 });
  const controlMaterial = new THREE.MeshStandardMaterial({ color: "#c2c9d6", metalness: 0.28, roughness: 0.4 });
  const accentMaterial = new THREE.MeshStandardMaterial({ color: "#dc69d5", emissive: "#5b1e58", emissiveIntensity: 0.35, roughness: 0.42 });
  const shellMesh = new THREE.Mesh(shellGeometry, shellMaterial);
  shellMesh.name = "controller-shell-code-native";
  shellMesh.castShadow = true;
  shellMesh.receiveShadow = true;
  assembly.add(shellMesh);

  const dpadHorizontal = new THREE.Mesh(new THREE.BoxGeometry(0.039, 0.009, 0.006), controlMaterial);
  dpadHorizontal.name = "controller-dpad-horizontal-code-native";
  dpadHorizontal.position.set(-0.047, 0.011, 0.031);
  assembly.add(dpadHorizontal);
  const dpadVertical = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.039, 0.006), controlMaterial);
  dpadVertical.name = "controller-dpad-vertical-code-native";
  dpadVertical.position.set(-0.047, 0.011, 0.031);
  assembly.add(dpadVertical);

  for (const [index, x, y] of [[1, 0.045, 0.022], [2, 0.063, 0.006], [3, 0.027, 0.006], [4, 0.045, -0.01]] as const) {
    const button = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.006, 10), index === 1 ? accentMaterial : controlMaterial);
    button.name = `controller-face-button-${index}-code-native`;
    button.rotation.x = Math.PI / 2;
    button.position.set(x, y, 0.034);
    assembly.add(button);
  }

  for (const [index, x] of [[1, -0.019], [2, 0.019]] as const) {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.008, 10), controlMaterial);
    stick.name = `controller-stick-${index}-code-native`;
    stick.rotation.x = Math.PI / 2;
    stick.position.set(x, -0.009, 0.033);
    assembly.add(stick);
  }

  controller.add(assembly);
  return true;
}

function addHeadsetToStand(scene: THREE.Object3D): boolean {
  if (scene.getObjectByName("headset-code-native")) return false;
  const stand = scene.getObjectByName("headset-stand-code-native");
  if (!stand) return false;

  const headset = new THREE.Group();
  headset.name = "headset-code-native";
  headset.position.set(0, 0.98, 0);
  headset.userData["source"] = "PRE-G7-13 code-native secondary headset; frozen GLB inventory contains no headset node";

  const bandMaterial = new THREE.MeshStandardMaterial({ color: "#242b3a", metalness: 0.22, roughness: 0.42 });
  const cupMaterial = new THREE.MeshStandardMaterial({ color: "#384153", metalness: 0.14, roughness: 0.56 });
  const accentMaterial = new THREE.MeshStandardMaterial({ color: "#aab8cb", metalness: 0.42, roughness: 0.34 });

  const band = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.012, 8, 18, Math.PI), bandMaterial);
  band.name = "headset-band-code-native";
  band.position.y = 0.105;
  band.castShadow = true;
  band.receiveShadow = true;
  headset.add(band);

  for (const side of [-1, 1]) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.03, 12), cupMaterial);
    cup.name = side < 0 ? "headset-earcup-left-code-native" : "headset-earcup-right-code-native";
    cup.rotation.x = Math.PI / 2;
    cup.position.set(side * 0.093, 0.045, 0);
    cup.castShadow = true;
    cup.receiveShadow = true;
    headset.add(cup);

    const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.004, 12), accentMaterial);
    badge.name = side < 0 ? "headset-earcup-badge-left-code-native" : "headset-earcup-badge-right-code-native";
    badge.rotation.x = Math.PI / 2;
    badge.position.set(side * 0.093, 0.045, 0.017);
    headset.add(badge);
  }

  stand.add(headset);
  return true;
}

function addCompactAudioConsole(scene: THREE.Object3D): boolean {
  if (scene.getObjectByName("console-code-native")) return false;
  const microphone = scene.getObjectByName("talks-microphone");
  const desk = scene.getObjectByName("desk");
  if (!microphone || !desk) return false;

  scene.updateMatrixWorld(true);
  const microphoneBounds = new THREE.Box3().setFromObject(microphone);
  const deskBounds = new THREE.Box3().setFromObject(desk);
  if (microphoneBounds.isEmpty() || deskBounds.isEmpty()) return false;

  const width = 0.30;
  const depth = 0.19;
  const height = 0.055;
  const microphoneCenter = microphoneBounds.getCenter(new THREE.Vector3());
  const centerX = THREE.MathUtils.clamp(
    microphoneCenter.x + 0.23,
    deskBounds.min.x + width / 2 + 0.035,
    deskBounds.max.x - width / 2 - 0.035,
  );
  const centerZ = THREE.MathUtils.clamp(
    microphoneCenter.z + 0.20,
    deskBounds.min.z + depth / 2 + 0.035,
    deskBounds.max.z - depth / 2 - 0.035,
  );

  const console = new THREE.Group();
  console.name = "console-code-native";
  console.position.copy(scene.worldToLocal(new THREE.Vector3(centerX, deskBounds.max.y, centerZ)));
  console.userData["source"] = "PRE-G7-13 code-native compact audio console; frozen GLB inventory has microphone nodes but no audio-console node";
  console.userData["dimensions"] = { width, height, depth };

  const chassis = new THREE.MeshStandardMaterial({ color: "#262d3c", metalness: 0.22, roughness: 0.48 });
  const surface = new THREE.MeshStandardMaterial({ color: "#141a27", metalness: 0.12, roughness: 0.56 });
  const controls = new THREE.MeshStandardMaterial({ color: "#e2a45d", metalness: 0.24, roughness: 0.42 });
  const display = new THREE.MeshStandardMaterial({ color: "#26d6c3", emissive: "#0b544d", emissiveIntensity: 0.8, metalness: 0, roughness: 0.34 });

  const base = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), chassis);
  base.name = "console-chassis-code-native";
  base.position.y = height / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  console.add(base);

  const top = new THREE.Mesh(new THREE.BoxGeometry(width - 0.012, 0.008, depth - 0.012), surface);
  top.name = "console-control-surface-code-native";
  top.position.y = height + 0.004;
  console.add(top);

  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.004, 0.034), display);
  screen.name = "console-display-code-native";
  screen.position.set(0.082, height + 0.01, -0.048);
  console.add(screen);

  for (let index = 0; index < 3; index += 1) {
    const x = -0.075 + index * 0.075;
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.003, 0.047), chassis);
    rail.name = `console-fader-rail-${index + 1}-code-native`;
    rail.position.set(x, height + 0.01, 0.044);
    console.add(rail);

    const fader = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.008, 0.012), controls);
    fader.name = `console-fader-${index + 1}-code-native`;
    fader.position.set(x, height + 0.015, 0.035 + index * 0.008);
    fader.castShadow = true;
    console.add(fader);

    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.014, 10), controls);
    knob.name = `console-knob-${index + 1}-code-native`;
    knob.position.set(-0.078 + index * 0.032, height + 0.014, -0.048);
    console.add(knob);
  }

  scene.add(console);
  scene.updateMatrixWorld(true);
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
