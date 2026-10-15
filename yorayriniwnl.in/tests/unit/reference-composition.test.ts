import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { vi } from "vitest";
import { applyReferenceComposition, measureProjectedBounds } from "../../src/features/world/ReferenceComposition";
import { configureProductionLighting, PRODUCTION_LIGHT_INTENSITIES, PRODUCTION_LIGHT_POSITIONS } from "../../src/features/world/ProductionLighting";

describe("reference room composition", () => {
  it("moves named anchors, preserves all seven panel geometries, and adds the console and headset details once", () => {
    const scene = new THREE.Group();
    const pegboard = new THREE.Group();
    pegboard.name = "pegboard_system";
    const controller = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    controller.name = "peg_controller_body";
    pegboard.add(controller);
    scene.add(pegboard);

    const desk = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 1), new THREE.MeshBasicMaterial());
    desk.name = "desk";
    desk.position.set(0, 0.75, -1);
    scene.add(desk);
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.05, 0.8), new THREE.MeshBasicMaterial());
    deskTop.name = "desk_top";
    deskTop.position.set(0, 0.725, -1.15);
    scene.add(deskTop);

    const microphone = new THREE.Group();
    microphone.name = "talks-microphone";
    const microphoneBody = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.08), new THREE.MeshBasicMaterial());
    microphoneBody.position.set(-0.42, 0.975, -0.95);
    microphone.add(microphoneBody);
    scene.add(microphone);

    const plants = new THREE.Group();
    plants.name = "plants";
    const originalPlants = ["monstera_leaf_1", "monstera_leaf_2", "monstera_leaf_3", "monstera_leaf_4", "monstera_stand_leg_1", "monstera_stand_leg_2", "monstera_stand_leg_3", "pot_monstera", "ivy_mound"].map((name) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.015, 0.15), new THREE.MeshStandardMaterial());
      mesh.name = name;
      plants.add(mesh);
      return { mesh, geometry: mesh.geometry, material: mesh.material, position: mesh.position.clone() };
    });
    scene.add(plants);

    const pc = new THREE.Group();
    pc.name = "helios-pc";
    pc.position.set(0.4, 0.8, -0.9);
    const pcMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.3), new THREE.MeshBasicMaterial());
    pc.add(pcMesh);
    scene.add(pc);

    const rightSpeaker = new THREE.Group();
    rightSpeaker.name = "speaker_right_cabinet";
    rightSpeaker.position.set(0.72, 0.88, -1.25);
    const rightSpeakerMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.24, 0.16), new THREE.MeshStandardMaterial());
    rightSpeakerMesh.name = "speaker_right_driver";
    rightSpeaker.add(rightSpeakerMesh);
    scene.add(rightSpeaker);
    const originalSpeakerGeometry = rightSpeakerMesh.geometry;
    const originalSpeakerMaterial = rightSpeakerMesh.material;
    const speakerDrivers = ["speaker_right_woofer", "speaker_right_tweeter"].map((name, index) => {
      const driver = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.01, 16), new THREE.MeshStandardMaterial());
      driver.name = name;
      driver.position.set(0.72, index === 0 ? 0.84 : 0.94, -1.168);
      scene.add(driver);
      return driver;
    });
    const leftSpeaker = new THREE.Group();
    leftSpeaker.name = "speaker_left_cabinet";
    leftSpeaker.position.set(-0.72, 0.88, -1.25);
    const leftDrivers = ["speaker_left_woofer", "speaker_left_tweeter"].map((name, index) => {
      const driver = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.01, 16), new THREE.MeshStandardMaterial());
      driver.name = name;
      driver.position.set(-0.72, index === 0 ? 0.84 : 0.94, -1.168);
      scene.add(driver);
      return driver;
    });
    scene.add(leftSpeaker);

    const chairRoot = new THREE.Group();
    chairRoot.name = "chair-root";
    chairRoot.position.set(0.3, 0, -0.36);
    scene.add(chairRoot);
    const chairBase = new THREE.Group();
    chairBase.name = "chair-base";
    chairBase.position.set(0.3, 0, -0.36);
    scene.add(chairBase);
    const resident = new THREE.Group();
    resident.name = "resident";
    resident.position.set(0.3, 0, -0.36);
    scene.add(resident);

    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.03, 0.22), new THREE.MeshBasicMaterial());
    shelf.name = "shelf_rear_upper";
    shelf.position.set(0, 2.15, -1.68);
    scene.add(shelf);

    const shelfCamera = new THREE.Group();
    shelfCamera.name = "ai-real-camera";
    const cameraMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.07), new THREE.MeshBasicMaterial());
    cameraMesh.name = "ai_cam_chassis";
    cameraMesh.position.set(-1.45, 1.77, -1.68);
    shelfCamera.add(cameraMesh);
    for (const [name, position] of [
      ["ai_cam_leg_1", [-1.42, 1.7, -1.68]],
      ["ai_cam_leg_2", [-1.465, 1.7, -1.654]],
      ["ai_cam_leg_3", [-1.465, 1.7, -1.706]],
    ] as const) {
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.04, 0.012), new THREE.MeshBasicMaterial());
      foot.name = name;
      foot.position.set(position[0], position[1], position[2]);
      shelfCamera.add(foot);
    }
    scene.add(shelfCamera);

    const monitor = new THREE.Group();
    monitor.name = "monitor";
    const lightbar = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.008, 0.015), new THREE.MeshStandardMaterial());
    lightbar.name = "lightbar_emissive";
    lightbar.position.set(0, 1.275, -1.305);
    monitor.add(lightbar);
    scene.add(monitor);

    const lights = new THREE.Group();
    lights.name = "essential_lights";
    for (let index = 1; index <= 7; index += 1) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.015), new THREE.MeshStandardMaterial());
      panel.name = `hex_panel_${index}`;
      panel.position.set(index % 2 ? 0 : -0.21, 1.82 + (index - 4) * 0.08, -1.77);
      lights.add(panel);
    }
    scene.add(lights);

    const originalPanelStates = new Map(Array.from({ length: 7 }, (_, index) => {
      const name = `hex_panel_${index + 1}`;
      const panel = scene.getObjectByName(name) as THREE.Mesh;
      return [name, {
        panel,
        parent: panel.parent,
        geometry: panel.geometry,
        material: panel.material,
      }] as const;
    }));
    const first = applyReferenceComposition(scene);
    const firstPanel = scene.getObjectByName("hex_panel_1") as THREE.Mesh;
    const generatedPanelGeometry = firstPanel.geometry;
    const panelPosition = firstPanel.position.clone();
    const panelScale = firstPanel.scale.clone();
    const lightbarPosition = lightbar.position.clone();
    const second = applyReferenceComposition(scene);

    expect(first).toEqual({ movedNode: "pegboard_system", headsetStandCreated: true, missingHexPanels: [] });
    expect(second.headsetStandCreated).toBe(false);
    expect(pegboard.position.x).toBeCloseTo(2.45);
    expect(plants.position.toArray()).toEqual([0.68, 0, -1.6]);
    expect(plants.scale.toArray()).toEqual([0.7, 1, 0.4]);
    expect(pc.position.toArray()).toEqual([0.26, 0.8, -0.9]);
    expect(pc.getObjectByName("helios-pc")).toBe(pc);
    expect(pc.getObjectByName(pcMesh.name)).toBe(pcMesh);
    expect(rightSpeaker.position.toArray()).toEqual([0.93, 0.88, -1.25]);
    expect(rightSpeaker.userData["referenceCompositionApplied"]).toBe(true);
    expect(scene.getObjectByName("speaker_right_cabinet")).toBe(rightSpeaker);
    expect(scene.getObjectByName("speaker_right_driver")).toBe(rightSpeakerMesh);
    expect(leftSpeaker.position.toArray()).toEqual([-0.93, 0.88, -1.25]);
    expect(leftDrivers.map((driver) => driver.parent)).toEqual([leftSpeaker, leftSpeaker]);
    expect(speakerDrivers.map((driver) => driver.parent)).toEqual([rightSpeaker, rightSpeaker]);
    expect(rightSpeakerMesh.geometry).toBe(originalSpeakerGeometry);
    expect(rightSpeakerMesh.material).toBe(originalSpeakerMaterial);
    expect(chairRoot.position.toArray()).toEqual([1.5, 0, -0.91]);
    expect(chairBase.position.toArray()).toEqual([1.5, 0, -0.91]);
    expect(resident.position.toArray()).toEqual([1.5, 0, -0.91]);
    expect(chairRoot.scale.toArray()).toEqual([0.82, 0.82, 0.82]);
    expect(chairBase.scale.toArray()).toEqual([0.82, 0.82, 0.82]);
    expect(resident.scale.toArray()).toEqual([0.82, 0.82, 0.82]);
    expect(monitor.scale.toArray()).toEqual([1.68, 1, 1]);
    const cameraSurface = new THREE.Box3().setFromObject(shelf);
    for (const name of ["ai_cam_leg_1", "ai_cam_leg_2", "ai_cam_leg_3"]) {
      const foot = scene.getObjectByName(name)!;
      const footBounds = new THREE.Box3().setFromObject(foot);
      expect(footBounds.min.y).toBeCloseTo(cameraSurface.max.y, 3);
      expect(footBounds.min.x).toBeGreaterThanOrEqual(cameraSurface.min.x + 0.005);
      expect(footBounds.max.x).toBeLessThanOrEqual(cameraSurface.max.x - 0.005);
      expect(footBounds.min.z).toBeGreaterThanOrEqual(cameraSurface.min.z + 0.005);
      expect(footBounds.max.z).toBeLessThanOrEqual(cameraSurface.max.z - 0.005);
    }
    expect(shelfCamera.userData["referenceSupport"].surfaceNode).toBe("shelf_rear_upper");
    for (const { mesh, geometry, material, position } of originalPlants) {
      expect(mesh.geometry).toBe(geometry);
      expect(mesh.material).toBe(material);
      expect(scene.getObjectByName(mesh.name)).toBe(mesh);
      if (mesh.name.startsWith("monstera_leaf_")) {
        expect(mesh.position.x).toBeCloseTo(position.x - 0.65 / 0.7);
        expect(mesh.position.y).toBeCloseTo(position.y - 0.12);
        expect(mesh.position.z).toBeCloseTo(position.z + 0.62 / 0.4);
        expect(mesh.rotation.x).toBeCloseTo(Math.PI / 2);
        expect(mesh.userData["referenceUprightApplied"]).toBe(true);
        expect(Math.abs(mesh.rotation.y)).toBeGreaterThan(0.1);
        expect(Math.abs(mesh.rotation.z)).toBeGreaterThan(0.1);
      } else if (mesh.name.startsWith("monstera_stand_leg_") || mesh.name === "pot_monstera") {
        expect(mesh.position.x).toBeCloseTo(position.x - 0.65 / 0.7);
        expect(mesh.position.y).toBeCloseTo(position.y);
        expect(mesh.position.z).toBeCloseTo(position.z + 0.62 / 0.4);
      } else {
        expect(mesh.position.toArray()).toEqual(position.toArray());
        expect(mesh.rotation.toArray()).toEqual([0, 0, 0, "XYZ"]);
      }
    }
    expect(shelfCamera.position.x).toBeCloseTo(1.7875);
    expect(shelfCamera.position.y).toBeCloseTo(-0.775);
    expect(shelfCamera.position.z).toBeCloseTo(1.26);
    expect(shelfCamera.scale.toArray()).toEqual([1.75, 1.75, 1.75]);
    expect(scene.getObjectByName("ai-real-camera")).toBe(shelfCamera);
    expect(scene.getObjectByName("ai_cam_chassis")).toBe(cameraMesh);
    expect(scene.getObjectByName("peg_controller_body")).toBe(controller);
    expect(controller.scale.toArray()).toEqual([1.25, 1.25, 1.25]);
    expect(controller.getObjectByName("controller-details-code-native")).toBeDefined();
    expect(controller.getObjectByName("controller-shell-code-native")).toBeDefined();
    expect(controller.getObjectByName("controller-dpad-horizontal-code-native")).toBeDefined();
    expect(controller.getObjectByName("controller-face-button-1-code-native")).toBeDefined();
    expect(controller.getObjectByName("controller-stick-1-code-native")).toBeDefined();
    const controllerShell = controller.getObjectByName("controller-shell-code-native") as THREE.Mesh;
    const controllerShellSize = new THREE.Box3().setFromObject(controllerShell).getSize(new THREE.Vector3());
    expect(controllerShellSize.x).toBeGreaterThan(0.2);
    expect(controllerShellSize.y).toBeGreaterThan(0.1);
    expect(lightbar.position.toArray()).toEqual(lightbarPosition.toArray());
    expect(lightbar.position.y).toBeCloseTo(1.263);
    expect(lightbar.position.z).toBeCloseTo(-1.275);
    expect(firstPanel.position.toArray()).toEqual(panelPosition.toArray());
    expect(firstPanel.scale.toArray()).toEqual(panelScale.toArray());
    expect(firstPanel.geometry).toBe(generatedPanelGeometry);
    expect(pc.position.toArray()).toEqual([0.26, 0.8, -0.9]);
    expect(firstPanel.scale.x).toBeCloseTo(1.1);
    expect(firstPanel.position.toArray()).toEqual([-0.57, 1.82, -1.61]);
    expect(firstPanel.position.z).toBeCloseTo(-1.61);
    const leftPanel = scene.getObjectByName("hex_panel_2")!;
    expect(leftPanel.position.x).toBeCloseTo(-0.38);
    expect(leftPanel.position.y).toBeCloseTo(1.54);

    for (let index = 1; index <= 7; index += 1) {
      const panel = scene.getObjectByName(`hex_panel_${index}`) as THREE.Mesh;
      const original = originalPanelStates.get(panel.name)!;
      expect(panel.name).toBe(`hex_panel_${index}`);
      expect(panel).toBe(original.panel);
      expect(panel.parent).toBe(original.parent);
      expect(panel.geometry).not.toBe(original.geometry);
      expect(panel.material).toBe(original.material);
      expect(panel.userData["preG7HexGeometryApplied"]).toBe(true);
      const panelBounds = new THREE.Box3().setFromObject(panel);
      const panelSize = panelBounds.getSize(new THREE.Vector3());
      expect(panelSize.x).toBeCloseTo(0.22 * panel.scale.x, 5);
      expect(panelSize.y).toBeCloseTo(Math.sqrt(3) * 0.11 * panel.scale.y, 5);
      expect(panelSize.z).toBeCloseTo(0.015 * panel.scale.z, 5);
      const positions = panel.geometry.getAttribute("position");
      const outlinePoints = new Set<string>();
      for (let vertex = 0; vertex < positions.count; vertex += 1) {
        outlinePoints.add(`${positions.getX(vertex).toFixed(5)},${positions.getY(vertex).toFixed(5)}`);
      }
      expect(outlinePoints.size).toBe(6);
      expect(panel.geometry.userData["preG7ReferenceHex"]).toEqual({
        sides: 6,
        width: 0.22,
        height: Math.sqrt(3) * 0.11,
        depth: 0.015,
      });
    }

    const stand = scene.getObjectByName("headset-stand-code-native")!;
    const desktopPcBounds = new THREE.Box3().setFromObject(pc);
    const desktopStandBaseBounds = new THREE.Box3().setFromObject(stand.getObjectByName("headset-stand-base")!);
    expect(stand.position.x).toBeCloseTo(desktopPcBounds.getCenter(new THREE.Vector3()).x);
    expect(stand.position.z).toBeCloseTo(desktopPcBounds.getCenter(new THREE.Vector3()).z);
    expect(desktopStandBaseBounds.min.y).toBeCloseTo(desktopPcBounds.max.y);
    expect(stand.userData["placement"]).toContain("PRE-G7-22");
    expect(stand.scale.toArray()).toEqual([1, 1, 1]);
    const standBounds = new THREE.Box3().setFromObject(stand);
    expect(stand.children.map((child) => child.name)).toEqual([
      "headset-stand-base",
      "headset-stand-stem",
      "headset-stand-cradle",
      "headset-code-native",
    ]);
    expect(standBounds.getSize(new THREE.Vector3()).x).toBeCloseTo(0.25);
    expect(standBounds.getSize(new THREE.Vector3()).y).toBeCloseTo(0.436);
    expect(standBounds.getSize(new THREE.Vector3()).z).toBeCloseTo(0.156);
    expect(scene.getObjectByName("headset-code-native")).toBeDefined();
    expect(scene.getObjectByName("headset-band-code-native")).toBeDefined();
    expect(scene.getObjectByName("headset-earcup-left-code-native")).toBeDefined();
    expect(scene.getObjectByName("headset-earcup-right-code-native")).toBeDefined();

    const console = scene.getObjectByName("console-code-native")!;
    const consoleBase = console.getObjectByName("console-chassis-code-native")!;
    const consoleBaseBounds = new THREE.Box3().setFromObject(consoleBase);
    const deskTopBounds = new THREE.Box3().setFromObject(deskTop);
    const microphoneBounds = new THREE.Box3().setFromObject(microphone);
    expect(console.userData["source"]).toContain("PRE-G7-13");
    expect(consoleBaseBounds.min.y).toBeCloseTo(deskTopBounds.max.y, 5);
    expect(consoleBaseBounds.min.x).toBeGreaterThanOrEqual(deskTopBounds.min.x);
    expect(consoleBaseBounds.max.x).toBeLessThanOrEqual(deskTopBounds.max.x);
    expect(consoleBaseBounds.min.z).toBeGreaterThanOrEqual(deskTopBounds.min.z);
    expect(consoleBaseBounds.max.z).toBeLessThanOrEqual(deskTopBounds.max.z);
    const gapX = Math.max(0, consoleBaseBounds.min.x - microphoneBounds.max.x, microphoneBounds.min.x - consoleBaseBounds.max.x);
    const gapZ = Math.max(0, consoleBaseBounds.min.z - microphoneBounds.max.z, microphoneBounds.min.z - consoleBaseBounds.max.z);
    expect(Math.hypot(gapX, gapZ), "console remains adjacent to talks-microphone").toBeLessThan(0.5);
    expect(console.userData["supportMetrics"].baseFootprintWithinSurface).toBe(true);
    expect(console.userData["supportMetrics"].contactDeltaY).toBeCloseTo(0, 5);
    expect(console.getObjectByName("console-display-code-native")).toBeDefined();
    expect(console.getObjectByName("console-fader-1-code-native")).toBeDefined();
    expect(console.getObjectByName("console-knob-1-code-native")).toBeDefined();
  });

  it("rests the phone headset stand on top of the existing PC while retaining the named stand assembly", () => {
    const scene = new THREE.Group();
    const pegboard = new THREE.Group();
    pegboard.name = "pegboard_system";
    const controller = new THREE.Group();
    controller.name = "peg_controller_body";
    pegboard.add(controller);
    scene.add(pegboard);
    const plants = new THREE.Group();
    plants.name = "plants";
    const mobilePlantParts = ["monstera_leaf_1", "monstera_leaf_2", "monstera_leaf_3", "monstera_leaf_4", "monstera_stand_leg_1", "monstera_stand_leg_2", "monstera_stand_leg_3", "pot_monstera", "ivy_mound"].map((name) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.015, 0.15), new THREE.MeshStandardMaterial());
      mesh.name = name;
      plants.add(mesh);
      return mesh;
    });
    scene.add(plants);
    for (let index = 1; index <= 7; index += 1) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.015), new THREE.MeshStandardMaterial());
      panel.name = `hex_panel_${index}`;
      scene.add(panel);
    }
    const pc = new THREE.Group();
    pc.name = "helios-pc";
    const pcBody = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.48, 0.48), new THREE.MeshBasicMaterial());
    pcBody.position.set(0.9, 1, -1.15);
    pc.add(pcBody);
    scene.add(pc);
    const shelfCamera = new THREE.Group();
    shelfCamera.name = "ai-real-camera";
    const cameraBody = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.07), new THREE.MeshBasicMaterial());
    cameraBody.name = "ai_cam_chassis";
    cameraBody.position.set(-1.45, 1.77, -1.67);
    shelfCamera.add(cameraBody);
    for (const [name, position] of [
      ["ai_cam_leg_1", [-1.42, 1.7, -1.68]],
      ["ai_cam_leg_2", [-1.465, 1.7, -1.654]],
      ["ai_cam_leg_3", [-1.465, 1.7, -1.706]],
    ] as const) {
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.04, 0.012), new THREE.MeshBasicMaterial());
      foot.name = name;
      foot.position.set(position[0], position[1], position[2]);
      shelfCamera.add(foot);
    }
    scene.add(shelfCamera);
    const chairRoot = new THREE.Group();
    chairRoot.name = "chair-root";
    chairRoot.position.set(0.3, 0, -0.36);
    scene.add(chairRoot);
    const chairBase = new THREE.Group();
    chairBase.name = "chair-base";
    chairBase.position.set(0.3, 0, -0.36);
    scene.add(chairBase);
    const resident = new THREE.Group();
    resident.name = "resident";
    resident.position.set(0.3, 0, -0.36);
    scene.add(resident);
    const upperShelf = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.03, 0.22), new THREE.MeshBasicMaterial());
    upperShelf.name = "shelf_rear_upper";
    upperShelf.position.set(0, 2.15, -1.68);
    scene.add(upperShelf);

    vi.stubGlobal("window", { innerWidth: 390 });
    try {
      applyReferenceComposition(scene);
      expect(controller.scale.toArray()).toEqual([1.9, 1.9, 1.9]);
      expect(shelfCamera.scale.toArray()).toEqual([3, 3, 3]);
      expect(chairRoot.position.toArray()).toEqual([0.75, 0, -0.36]);
      expect(chairBase.position.toArray()).toEqual([0.75, 0, -0.36]);
      expect(resident.position.toArray()).toEqual([0.75, 0, -0.36]);
      expect(chairRoot.scale.toArray()).toEqual([0.85, 0.85, 0.85]);
      expect(chairBase.scale.toArray()).toEqual([0.85, 0.85, 0.85]);
      expect(resident.scale.toArray()).toEqual([0.85, 0.85, 0.85]);
      const cameraBounds = new THREE.Box3().setFromObject(shelfCamera);
      expect(cameraBounds.min.y).toBeCloseTo(new THREE.Box3().setFromObject(upperShelf).max.y, 3);
      expect(cameraBounds.getCenter(new THREE.Vector3()).x).toBeCloseTo(0.7);
      const cameraShelf = new THREE.Box3().setFromObject(upperShelf);
      for (const name of ["ai_cam_leg_1", "ai_cam_leg_2", "ai_cam_leg_3"]) {
        const footBounds = new THREE.Box3().setFromObject(scene.getObjectByName(name)!);
        expect(footBounds.min.y).toBeCloseTo(cameraShelf.max.y, 3);
        expect(footBounds.min.x).toBeGreaterThanOrEqual(cameraShelf.min.x + 0.005);
        expect(footBounds.max.x).toBeLessThanOrEqual(cameraShelf.max.x - 0.005);
        expect(footBounds.min.z).toBeGreaterThanOrEqual(cameraShelf.min.z + 0.005);
        expect(footBounds.max.z).toBeLessThanOrEqual(cameraShelf.max.z - 0.005);
      }
      expect(shelfCamera.userData["referenceSupport"].surfaceNode).toBe("shelf_rear_upper");
      expect(scene.getObjectByName("ai-real-camera")).toBe(shelfCamera);
      expect(scene.getObjectByName("ai_cam_chassis")).toBe(cameraBody);
      expect(plants.position.toArray()).toEqual([0.68, 0, -1.6]);
      expect(plants.scale.toArray()).toEqual([0.7, 1, 0.4]);
      for (const part of mobilePlantParts) {
        expect(scene.getObjectByName(part.name)).toBe(part);
        expect(part.geometry).toBeDefined();
        expect(part.material).toBeDefined();
        if (part.name.startsWith("monstera_") || part.name === "pot_monstera") {
          expect(part.position.x).toBeCloseTo(-0.15 / 0.7);
          expect(part.position.z).toBeCloseTo(0.62 / 0.4);
          if (part.name.startsWith("monstera_leaf_")) {
            expect(part.position.y).toBeCloseTo(-0.12);
          } else {
            expect(part.position.y).toBeCloseTo(0);
          }
        } else {
          expect(part.position.toArray()).toEqual([0, 0, 0]);
        }
      }
      const stand = scene.getObjectByName("headset-stand-code-native")!;
      const pcBounds = new THREE.Box3().setFromObject(pc);
      const standBase = stand.getObjectByName("headset-stand-base")!;
      const standBaseBounds = new THREE.Box3().setFromObject(standBase);
      expect(stand.userData["placement"]).toBe("PRE-G7-22 headset stand resting on the existing helios-pc top in both home presets");
      expect(stand.scale.toArray()).toEqual([1, 1, 1]);
      expect(standBaseBounds.min.y).toBeCloseTo(pcBounds.max.y);
      expect(scene.getObjectByName("headset-stand-code-native")).toBe(stand);
      expect(scene.getObjectByName("headset-code-native")).toBeDefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("projects a rotated and translated group and reports partial viewport clipping", () => {
    const group = new THREE.Group();
    group.position.set(2.7, 0, 0);
    group.rotation.y = Math.PI / 4;
    group.add(new THREE.Mesh(new THREE.BoxGeometry(2, 0.6, 0.2), new THREE.MeshBasicMaterial()));

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);
    const bounds = measureProjectedBounds(group, camera, { width: 1000, height: 1000 });

    expect(bounds).not.toBeNull();
    expect(bounds!.left).toBeGreaterThan(0);
    expect(bounds!.right).toBeGreaterThan(1000);
    expect(bounds!.width).toBeGreaterThan(0);
    expect(bounds!.visibleAreaRatio).toBeGreaterThan(0);
    expect(bounds!.visibleAreaRatio).toBeLessThan(1);
  });
});

describe("named production lighting", () => {
  it("keeps the bounded cyan fill on the existing floor-facing point light only", () => {
    const scene = new THREE.Group();
    const cyanFill = new THREE.PointLight(0x00f3ff, 1);
    cyanFill.name = "Light_CyanFill";
    cyanFill.position.set(0, 0.4, -1.15);
    scene.add(cyanFill);
    const taskLight = new THREE.PointLight(0xffaa55, 1);
    taskLight.name = "Light_TaskDownlight";
    taskLight.position.set(1, 2, -1);
    scene.add(taskLight);

    configureProductionLighting(scene);

    expect(cyanFill.intensity).toBe(PRODUCTION_LIGHT_INTENSITIES.Light_CyanFill);
    expect(cyanFill.position.toArray()).toEqual(PRODUCTION_LIGHT_POSITIONS.Light_CyanFill);
    expect(cyanFill.color.getHexString()).toBe("00f3ff");
    expect(taskLight.intensity).toBe(PRODUCTION_LIGHT_INTENSITIES.Light_TaskDownlight);
    expect(taskLight.position.toArray()).toEqual([1, 2, -1]);
  });
});
