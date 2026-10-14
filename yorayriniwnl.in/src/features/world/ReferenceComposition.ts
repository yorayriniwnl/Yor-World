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
  const desk = scene.getObjectByName("desk");
  if (desk && desk.userData["referenceDeskFramingApplied"] !== true) {
    // Attempt-14's tabletop missed the mobile left edge by 3.66 CSS px.
    desk.position.x += 0.03;
    desk.userData["referenceDeskFramingApplied"] = true;
  }
  // PRE-G7-13 measured plant placement moves only the visible ivy specimen.
  for (const name of ["ivy_mound", "ivy_vine_1", "ivy_vine_2", "ivy_vine_3", "ivy_vine_4", "pot_ivy"]) {
    const ivyPart = scene.getObjectByName(name);
    if (ivyPart && ivyPart.userData["referenceIvyPlacementApplied"] !== true) {
      ivyPart.position.x += 0.8;
      ivyPart.position.z += 0.06;
      // Attempt-14 clipped the mound at the desktop top; keep the pot and
      // vines fixed while returning the mound to its authored vertical anchor.
      if (name === "ivy_mound") ivyPart.position.y += 0;
      ivyPart.userData["referenceIvyPlacementApplied"] = true;
    }
  }

  const shelfCamera = scene.getObjectByName("ai-real-camera");
  if (shelfCamera && shelfCamera.userData["referenceCompositionApplied"] !== true) {
    // The attempt-08 camera was tiny and attempt-09's enlarged view clipped
    // above the desktop frame. Use its authored lower shelf, sizing from that
    // shelf's measured top plane while preserving the named interaction root.
    scene.updateMatrixWorld(true);
    const shelf = scene.getObjectByName("shelf_rear_lower");
    if (shelf && shelf.userData["referenceCompositionApplied"] !== true) {
      translateObjectWorld(shelf, new THREE.Vector3(0.7, 0, 0));
      shelf.userData["referenceCompositionApplied"] = true;
      scene.updateMatrixWorld(true);
    }
    const shelfBounds = shelf ? new THREE.Box3().setFromObject(shelf) : new THREE.Box3();
    const sourceCenter = new THREE.Box3().setFromObject(shelfCamera).getCenter(new THREE.Vector3());
    const shelfCenter = shelfBounds.isEmpty() ? new THREE.Vector3(-0.75, 1.65, -1.68) : shelfBounds.getCenter(new THREE.Vector3());
    const shelfTop = shelfBounds.isEmpty() ? 1.665 : shelfBounds.max.y;
    shelfCamera.scale.set(2.4, 2.2, 2.2);
    // A three-quarter yaw exposes the chassis and support legs while keeping
    // the lens visible from the opening camera.
    shelfCamera.rotation.y = -Math.PI / 3;
    scene.updateMatrixWorld(true);
    const cameraBounds = new THREE.Box3().setFromObject(shelfCamera);
    const targetCenter = new THREE.Vector3(
      // Keep the camera on the lower shelf but separate its chassis from the
      // ivy stems that cross the authored camera face in the opening views.
      shelfCenter.x - 0.12,
      shelfTop + cameraBounds.getSize(new THREE.Vector3()).y / 2,
      shelfCenter.z,
    );
    moveObjectWorldCenter(shelfCamera, targetCenter);
    shelfCamera.userData["referenceCompositionApplied"] = true;
    shelfCamera.userData["referenceCompositionScale"] = [2.4, 2.2, 2.2];
    shelfCamera.userData["referenceCompositionYawRadians"] = shelfCamera.rotation.y;
    shelfCamera.userData["referenceCompositionSourceCenter"] = sourceCenter.toArray();
    scene.updateMatrixWorld(true);
  }

  // Keep the resident at the workstation, with the chair back behind the body
  // and the pair to image-right of the monitor. The chair back previously
  // crossed the right speaker and covered the resident's torso.
  // Move the resident slightly forward while keeping the monitor/worktop clear.
  const actorShift = new THREE.Vector3(0.4, 0, -1.15);
  // Place the existing chair groups at the measured workstation position and
  // preserve the 0.15-unit X offset between the root and base.
  const chairRootShift = new THREE.Vector3(0.05, 0, -0.735);
  const chairBaseShift = new THREE.Vector3(0.2, 0, -0.735);
  const chairYawAdjustment = THREE.MathUtils.degToRad(18);
  for (const name of ["chair-root", "chair-base"]) {
    const chairPart = scene.getObjectByName(name);
    if (chairPart && chairPart.userData["referenceActorCompositionApplied"] !== true) {
      translateObjectWorld(chairPart, name === "chair-root" ? chairRootShift : chairBaseShift);
      // Keep the existing chair angled toward the camera and narrow its
      // horizontal profile without changing the source geometry.
      chairPart.rotation.y += chairYawAdjustment;
      chairPart.userData[name === "chair-root" ? "referenceChairYawAdjustmentRadians" : "referenceChairBaseYawAdjustmentRadians"] = chairYawAdjustment;
      if (name === "chair-root") {
        // Scale the existing named chair group while keeping its bottom
        // attached to the translated chair base; do not add chair geometry.
        scene.updateMatrixWorld(true);
        const boundsBeforeScale = new THREE.Box3().setFromObject(chairPart);
        const bottomBeforeScale = boundsBeforeScale.isEmpty() ? undefined : boundsBeforeScale.min.y;
        chairPart.scale.set(0.55, 0.8, 0.55);
        scene.updateMatrixWorld(true);
        if (bottomBeforeScale !== undefined) {
          const boundsAfterScale = new THREE.Box3().setFromObject(chairPart);
          if (!boundsAfterScale.isEmpty()) {
            translateObjectWorld(chairPart, new THREE.Vector3(0, bottomBeforeScale - boundsAfterScale.min.y, 0));
          }
        }
        chairPart.userData["referenceChairScale"] = [0.55, 0.8, 0.55];
        chairPart.userData["referenceChairBottomAnchored"] = bottomBeforeScale !== undefined;
      }
      if (name === "chair-base") {
        scene.updateMatrixWorld(true);
        const boundsBeforeScale = new THREE.Box3().setFromObject(chairPart);
        const bottomBeforeScale = boundsBeforeScale.isEmpty() ? undefined : boundsBeforeScale.min.y;
        chairPart.scale.set(0.75, 1, 0.75);
        scene.updateMatrixWorld(true);
        if (bottomBeforeScale !== undefined) {
          const boundsAfterScale = new THREE.Box3().setFromObject(chairPart);
          if (!boundsAfterScale.isEmpty()) {
            translateObjectWorld(chairPart, new THREE.Vector3(0, bottomBeforeScale - boundsAfterScale.min.y, 0));
          }
        }
        chairPart.userData["referenceChairBaseScale"] = [0.75, 1, 0.75];
        chairPart.userData["referenceChairBaseBottomAnchored"] = bottomBeforeScale !== undefined;
      }
      chairPart.userData["referenceActorCompositionApplied"] = true;
    }
  }
  const resident = scene.getObjectByName("resident");
  if (resident) {
    let residentScene = resident;
    while (residentScene.parent && residentScene.parent !== scene) residentScene = residentScene.parent;
    if (residentScene.userData["referenceActorCompositionApplied"] !== true) {
      scene.updateMatrixWorld(true);
      translateObjectWorld(residentScene, actorShift);
      scene.updateMatrixWorld(true);
      const residentBounds = new THREE.Box3().setFromObject(residentScene);
      residentScene.scale.multiplyScalar(0.82);
      if (!residentBounds.isEmpty()) {
        scene.updateMatrixWorld(true);
        moveObjectWorldCenter(residentScene, residentBounds.getCenter(new THREE.Vector3()));
      }
      residentScene.userData["referenceResidentScale"] = [0.82, 0.82, 0.82];
      residentScene.userData["referenceActorCompositionApplied"] = true;
    }
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
    if (panel.userData["referenceCompositionApplied"] !== true) {
      // Lower the measured attempt-08 cluster slightly to clear the desktop top.
      panel.position.x *= 1.2;
      panel.position.y = 2.0 + (panel.position.y - 1.82) * 1.1;
      panel.position.z += 0.16;
      panel.scale.set(1.1, 1.1, 1);
      panel.userData["referenceCompositionApplied"] = true;
    }
    replaceWithIsolatedHexPanelGeometry(panel);
  }

  if (missingHexPanels.length) {
    throw new Error(`Reference composition is missing hex panels: ${missingHexPanels.join(", ")}`);
  }

  const headsetStandCreated = addHeadsetStand(scene);
  addHeadsetToStand(scene);
  addControllerDetails(scene);
  addCompactAudioConsole(scene);
  scene.updateMatrixWorld(true);
  return { movedNode: pegboard.name, headsetStandCreated, missingHexPanels };
}

function addHeadsetStand(scene: THREE.Object3D): boolean {
  if (scene.getObjectByName("headset-stand-code-native")) return false;

  const stand = new THREE.Group();
  stand.name = "headset-stand-code-native";
  stand.userData["dimensions"] = { width: 0.19, height: 0.237, depth: 0.156 };
  stand.position.set(1.15, 0, -0.83);
  stand.userData["source"] = "PRE-G7-12-authorized code-native secondary headset stand; frozen GLB inventory contains no headset stand node";

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
    stand.add(makeInteractionNeutral(mesh));
  }
  scene.add(stand);
  return true;
}

function addHeadsetToStand(scene: THREE.Object3D): boolean {
  if (scene.getObjectByName("headset-code-native")) return false;
  const stand = scene.getObjectByName("headset-stand-code-native");
  if (!stand) return false;

  const headset = new THREE.Group();
  headset.name = "headset-code-native";
  headset.userData["dimensions"] = { width: 0.25, height: 0.199, depth: 0.034 };
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
  headset.add(makeInteractionNeutral(band));

  for (const side of [-1, 1]) {
    const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.072, 0.012), accentMaterial);
    yoke.name = side < 0 ? "headset-yoke-left-code-native" : "headset-yoke-right-code-native";
    yoke.position.set(side * 0.093, 0.075, 0);
    yoke.castShadow = true;
    yoke.receiveShadow = true;
    yoke.userData["dimensions"] = { width: 0.014, height: 0.072, depth: 0.012 };
    headset.add(makeInteractionNeutral(yoke));

    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.03, 12), cupMaterial);
    cup.name = side < 0 ? "headset-earcup-left-code-native" : "headset-earcup-right-code-native";
    cup.rotation.x = Math.PI / 2;
    cup.position.set(side * 0.093, 0.045, 0);
    cup.castShadow = true;
    cup.receiveShadow = true;
    headset.add(makeInteractionNeutral(cup));

    const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.004, 12), accentMaterial);
    badge.name = side < 0 ? "headset-earcup-badge-left-code-native" : "headset-earcup-badge-right-code-native";
    badge.rotation.x = Math.PI / 2;
    badge.position.set(side * 0.093, 0.045, 0.017);
    headset.add(makeInteractionNeutral(badge));
  }

  stand.add(headset);
  return true;
}

function addControllerDetails(scene: THREE.Object3D): boolean {
  if (scene.getObjectByName("controller-code-native")) return false;
  const body = scene.getObjectByName("peg_controller_body");
  if (!body) return false;
  if (body.userData["referenceControllerScaleApplied"] !== true) {
    // The frozen controller body and its authorized native controls were only
    // a tiny mark in the mobile opening view. Scale this named prop in place.
    body.scale.set(2.7, 3.2, 2.7);
    body.userData["referenceControllerScaleApplied"] = true;
  }

  const controller = new THREE.Group();
  controller.name = "controller-code-native";
  controller.userData["source"] = "PRE-G7-13 code-native controller controls layered onto frozen GLB body/accent/mount nodes; the GLB contains no stick or button nodes";

  const shellMaterial = new THREE.MeshStandardMaterial({ color: "#303849", metalness: 0.18, roughness: 0.52 });
  const dpadMaterial = new THREE.MeshStandardMaterial({ color: "#343b4a", metalness: 0.12, roughness: 0.5 });
  const stickMaterial = new THREE.MeshStandardMaterial({ color: "#252c3b", metalness: 0.08, roughness: 0.62 });
  const buttonMaterials = ["#ea68cf", "#63d6cd", "#edb45d", "#8bd98c"].map((color) => new THREE.MeshStandardMaterial({
    color,
    metalness: 0.12,
    roughness: 0.4,
  }));

  const shellShape = new THREE.Shape();
  shellShape.moveTo(-0.045, 0.04);
  shellShape.lineTo(0.045, 0.04);
  shellShape.bezierCurveTo(0.06, 0.04, 0.065, 0.03, 0.069, 0.018);
  shellShape.lineTo(0.082, -0.025);
  shellShape.bezierCurveTo(0.088, -0.043, 0.073, -0.053, 0.062, -0.046);
  shellShape.bezierCurveTo(0.052, -0.04, 0.048, -0.028, 0.04, -0.02);
  shellShape.lineTo(-0.04, -0.02);
  shellShape.bezierCurveTo(-0.048, -0.028, -0.052, -0.04, -0.062, -0.046);
  shellShape.bezierCurveTo(-0.073, -0.053, -0.088, -0.043, -0.082, -0.025);
  shellShape.lineTo(-0.069, 0.018);
  shellShape.bezierCurveTo(-0.065, 0.03, -0.06, 0.04, -0.045, 0.04);
  shellShape.closePath();

  const shell = new THREE.Mesh(new THREE.ExtrudeGeometry(shellShape, {
    depth: 0.018,
    bevelEnabled: false,
    curveSegments: 6,
  }), shellMaterial);
  shell.name = "controller-body-shell-code-native";
  shell.position.z = 0.006;
  shell.castShadow = true;
  shell.receiveShadow = true;
  shell.geometry.computeBoundingBox();
  const shellSize = shell.geometry.boundingBox?.getSize(new THREE.Vector3());
  shell.userData["dimensions"] = {
    width: shellSize?.x ?? 0,
    height: shellSize?.y ?? 0,
    depth: shellSize?.z ?? 0,
  };
  controller.add(makeInteractionNeutral(shell));

  const dpadHorizontal = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.008, 0.006), dpadMaterial);
  dpadHorizontal.name = "controller-dpad-horizontal-code-native";
  dpadHorizontal.position.set(-0.04, 0.004, 0.023);
  controller.add(makeInteractionNeutral(dpadHorizontal));

  const dpadVertical = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.024, 0.006), dpadMaterial);
  dpadVertical.name = "controller-dpad-vertical-code-native";
  dpadVertical.position.set(-0.04, 0.004, 0.023);
  controller.add(makeInteractionNeutral(dpadVertical));

  for (const [index, x] of [-0.012, 0.012].entries()) {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0085, 0.006, 10), stickMaterial);
    stick.name = index === 0 ? "controller-stick-left-code-native" : "controller-stick-right-code-native";
    stick.rotation.x = Math.PI / 2;
    stick.position.set(x, -0.02, 0.023);
    controller.add(makeInteractionNeutral(stick));
  }

  const buttonPositions: Array<[number, number]> = [
    [0.038, 0.012],
    [0.047, 0],
    [0.038, -0.012],
    [0.029, 0],
  ];
  buttonPositions.forEach(([x, y], index) => {
    const button = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.006, 10), buttonMaterials[index]);
    button.name = `controller-action-button-${index + 1}-code-native`;
    button.rotation.x = Math.PI / 2;
    button.position.set(x, y, 0.023);
    controller.add(makeInteractionNeutral(button));
  });

  // Make the authorized buttons, sticks, and shell face legible at phone scale.
  controller.scale.set(1.3, 1.3, 1);
  controller.updateMatrixWorld(true);
  const controllerBounds = new THREE.Box3().setFromObject(controller);
  const controllerSize = controllerBounds.getSize(new THREE.Vector3());
  controller.userData["dimensions"] = {
    width: controllerSize.x,
    height: controllerSize.y,
    depth: controllerSize.z,
  };
  body.add(controller);
  return true;
}

function addCompactAudioConsole(scene: THREE.Object3D): boolean {
  if (scene.getObjectByName("console-code-native")) return false;
  const microphone = scene.getObjectByName("talks-microphone");
  const tabletop = scene.getObjectByName("desk_top");
  if (!microphone || !tabletop) return false;

  scene.updateMatrixWorld(true);
  const microphoneBounds = new THREE.Box3().setFromObject(microphone);
  const tabletopBounds = new THREE.Box3().setFromObject(tabletop);
  if (microphoneBounds.isEmpty() || tabletopBounds.isEmpty()) return false;

  const width = 0.30;
  const depth = 0.19;
  const height = 0.055;
  const centerZ = THREE.MathUtils.clamp(
    microphoneBounds.getCenter(new THREE.Vector3()).z,
    tabletopBounds.min.z + depth / 2 + 0.035,
    tabletopBounds.max.z - depth / 2 - 0.035,
  );
  const centerX = THREE.MathUtils.clamp(
    microphoneBounds.max.x + width / 2 + 0.04,
    tabletopBounds.min.x + width / 2 + 0.035,
    tabletopBounds.max.x - width / 2 - 0.035,
  );

  const console = new THREE.Group();
  console.name = "console-code-native";
  console.position.copy(scene.worldToLocal(new THREE.Vector3(centerX, tabletopBounds.max.y, centerZ)));
  console.userData["source"] = "PRE-G7-13 code-native compact audio console; frozen GLB inventory has microphone nodes but no audio-console node";
  console.userData["dimensions"] = { width, height: 0.076, depth, chassisHeight: height };

  const chassis = new THREE.MeshStandardMaterial({ color: "#262d3c", metalness: 0.22, roughness: 0.48 });
  const surface = new THREE.MeshStandardMaterial({ color: "#141a27", metalness: 0.12, roughness: 0.56 });
  const controls = new THREE.MeshStandardMaterial({ color: "#e2a45d", metalness: 0.24, roughness: 0.42 });
  const display = new THREE.MeshStandardMaterial({ color: "#26d6c3", emissive: "#0b544d", emissiveIntensity: 0.8, metalness: 0, roughness: 0.34 });

  const base = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), chassis);
  base.name = "console-chassis-code-native";
  base.position.y = height / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  console.add(makeInteractionNeutral(base));

  const top = new THREE.Mesh(new THREE.BoxGeometry(width - 0.012, 0.008, depth - 0.012), surface);
  top.name = "console-control-surface-code-native";
  top.position.y = height + 0.004;
  console.add(makeInteractionNeutral(top));

  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.004, 0.034), display);
  screen.name = "console-display-code-native";
  screen.position.set(0.082, height + 0.01, -0.048);
  console.add(makeInteractionNeutral(screen));

  for (let index = 0; index < 3; index += 1) {
    const x = -0.075 + index * 0.075;
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.003, 0.047), chassis);
    rail.name = `console-fader-rail-${index + 1}-code-native`;
    rail.position.set(x, height + 0.01, 0.044);
    console.add(makeInteractionNeutral(rail));

    const fader = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.008, 0.012), controls);
    fader.name = `console-fader-${index + 1}-code-native`;
    fader.position.set(x, height + 0.015, 0.035 + index * 0.008);
    fader.castShadow = true;
    console.add(makeInteractionNeutral(fader));

    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.014, 10), controls);
    knob.name = `console-knob-${index + 1}-code-native`;
    knob.position.set(-0.078 + index * 0.032, height + 0.014, -0.048);
    console.add(makeInteractionNeutral(knob));
  }

  scene.add(console);
  scene.updateMatrixWorld(true);
  return true;
}

function makeInteractionNeutral(mesh: THREE.Mesh): THREE.Mesh {
  mesh.userData["interactionNeutral"] = true;
  mesh.raycast = () => {};
  return mesh;
}

function moveObjectWorldCenter(object: THREE.Object3D, targetWorldCenter: THREE.Vector3): void {
  object.updateWorldMatrix(true, true);
  const currentWorldCenter = new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3());
  if (object.parent) {
    const targetParent = object.parent.worldToLocal(targetWorldCenter.clone());
    const centerParent = object.parent.worldToLocal(currentWorldCenter.clone());
    object.position.add(targetParent.sub(centerParent));
  } else {
    object.position.add(targetWorldCenter.sub(currentWorldCenter));
  }
}

function translateObjectWorld(object: THREE.Object3D, worldDelta: THREE.Vector3): void {
  object.updateWorldMatrix(true, false);
  if (object.parent) {
    const origin = object.parent.worldToLocal(new THREE.Vector3());
    const destination = object.parent.worldToLocal(worldDelta.clone());
    object.position.add(destination.sub(origin));
  } else {
    object.position.add(worldDelta);
  }
}

function replaceWithIsolatedHexPanelGeometry(panel: THREE.Object3D): void {
  const mesh = panel as THREE.Mesh;
  if (!mesh.isMesh) throw new Error("Named hex panel " + panel.name + " is not a mesh");
  if (mesh.userData["referenceHexGeometryApplied"] === true) return;

  const sourceGeometry = mesh.geometry;
  if (!sourceGeometry.boundingBox) sourceGeometry.computeBoundingBox();
  const sourceBounds = sourceGeometry.boundingBox;
  if (!sourceBounds) throw new Error("Named hex panel " + panel.name + " has no local bounds");
  const sourceSize = sourceBounds.getSize(new THREE.Vector3());
  const sourceCenter = sourceBounds.getCenter(new THREE.Vector3());
  const radius = Math.min(sourceSize.x / 2, sourceSize.y / Math.sqrt(3));
  const hexWidth = radius * 2;
  const hexHeight = radius * Math.sqrt(3);
  const depth = sourceSize.z;
  const frontZ = sourceCenter.z + depth / 2;
  const backZ = sourceCenter.z - depth / 2;
  const positions: number[] = [];
  const indices: number[] = [];
  const front: Array<[number, number, number]> = [];
  const back: Array<[number, number, number]> = [];

  for (let side = 0; side < 6; side += 1) {
    const angle = side * Math.PI / 3;
    const x = sourceCenter.x + radius * Math.cos(angle);
    const y = sourceCenter.y + radius * Math.sin(angle);
    front.push([x, y, frontZ]);
    back.push([x, y, backZ]);
  }
  positions.push(...front.flat(), ...back.flat());
  for (let side = 1; side < 5; side += 1) {
    indices.push(0, side, side + 1);
    indices.push(6, 6 + side + 1, 6 + side);
  }
  for (let side = 0; side < 6; side += 1) {
    const next = (side + 1) % 6;
    const start = positions.length / 3;
    positions.push(...front[side]!, ...back[side]!, ...back[next]!, ...front[next]!);
    indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.userData["referenceHexPanel"] = {
    sides: 6,
    width: hexWidth,
    height: hexHeight,
    depth,
    sourceWidth: sourceSize.x,
    sourceHeight: sourceSize.y,
    sourceDepth: sourceSize.z,
    vertexCount: positions.length / 3,
    indexCount: indices.length,
    sourceGeometryUuid: sourceGeometry.uuid,
  };

  // Keep the original geometry undisposed because glTF data may be shared.
  // Each named panel receives independent geometry while retaining its mesh,
  // hierarchy, transforms, material slots and interaction binding.
  mesh.geometry = geometry;
  mesh.userData["referenceHexGeometryApplied"] = true;
  mesh.userData["referenceHexSourceGeometryUuid"] = sourceGeometry.uuid;
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
