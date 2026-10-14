import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { vi } from "vitest";
import { applyReferenceComposition, measureProjectedBounds } from "../../src/features/world/ReferenceComposition";

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

    const shelfCamera = new THREE.Group();
    shelfCamera.name = "ai-real-camera";
    const cameraMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.07), new THREE.MeshBasicMaterial());
    cameraMesh.name = "ai_cam_chassis";
    shelfCamera.add(cameraMesh);
    scene.add(shelfCamera);

    const monitor = new THREE.Group();
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
    expect(rightSpeaker.position.toArray()).toEqual([0.72, 1.13, -1.25]);
    expect(rightSpeaker.userData["referenceCompositionApplied"]).toBe(true);
    expect(scene.getObjectByName("speaker_right_cabinet")).toBe(rightSpeaker);
    expect(scene.getObjectByName("speaker_right_driver")).toBe(rightSpeakerMesh);
    expect(rightSpeakerMesh.geometry).toBe(originalSpeakerGeometry);
    expect(rightSpeakerMesh.material).toBe(originalSpeakerMaterial);
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
    expect(shelfCamera.position.toArray()).toEqual([1.7875, -0.91, 1.429]);
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
    expect(firstPanel.position.y).toBeCloseTo(1.716);
    expect(firstPanel.position.z).toBeCloseTo(-1.61);
    const leftPanel = scene.getObjectByName("hex_panel_2")!;
    expect(leftPanel.position.x).toBeCloseTo(-0.252);
    expect(leftPanel.position.y).toBeCloseTo(1.804);

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
    expect(stand.position.x).toBeCloseTo(1.0);
    expect(stand.position.z).toBeCloseTo(-0.83);
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
    const consoleBounds = new THREE.Box3().setFromObject(console);
    const deskBounds = new THREE.Box3().setFromObject(desk);
    expect(console.userData["source"]).toContain("PRE-G7-13");
    expect(consoleBounds.min.y).toBeCloseTo(deskBounds.max.y);
    expect(consoleBounds.min.x).toBeGreaterThanOrEqual(deskBounds.min.x);
    expect(consoleBounds.max.x).toBeLessThanOrEqual(deskBounds.max.x);
    expect(consoleBounds.min.z).toBeGreaterThanOrEqual(deskBounds.min.z);
    expect(consoleBounds.max.z).toBeLessThanOrEqual(deskBounds.max.z);
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
    const cameraBody = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.24, 0.198), new THREE.MeshBasicMaterial());
    cameraBody.name = "ai_cam_chassis";
    cameraBody.position.set(-1.45, 1.77, -1.67);
    shelfCamera.add(cameraBody);
    scene.add(shelfCamera);

    vi.stubGlobal("window", { innerWidth: 390 });
    try {
      applyReferenceComposition(scene);
      expect(controller.scale.toArray()).toEqual([1.9, 1.9, 1.9]);
      expect(shelfCamera.scale.toArray()).toEqual([3, 3, 3]);
      const cameraBounds = new THREE.Box3().setFromObject(shelfCamera);
      expect(cameraBounds.min.y).toBeCloseTo(2.03);
      expect(cameraBounds.getCenter(new THREE.Vector3()).x).toBeCloseTo(0.7);
      expect(cameraBounds.getCenter(new THREE.Vector3()).z).toBeCloseTo(-1.48);
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
      expect(stand.userData["placement"]).toBe("PRE-G7-13 mobile secondary stand resting on helios-pc top");
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
