import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { applyReferenceComposition, measureProjectedBounds } from "../../src/features/world/ReferenceComposition";

describe("reference room composition", () => {
  it("keeps named anchors and materials while isolating six-sided runtime panel geometry", () => {
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
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.05, 0.8), new THREE.MeshBasicMaterial());
    deskTop.name = "desk_top";
    desk.add(deskTop);
    scene.add(desk);

    const microphone = new THREE.Group();
    microphone.name = "talks-microphone";
    const microphoneBody = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.08), new THREE.MeshBasicMaterial());
    microphoneBody.position.set(-0.42, 0.975, -0.95);
    microphone.add(microphoneBody);
    scene.add(microphone);

    const plants = new THREE.Group();
    plants.name = "plants";
    const ivy = new THREE.Group();
    ivy.name = "ivy_mound";
    ivy.position.set(-1.7, 2.29, -1.68);
    plants.add(ivy);
    scene.add(plants);

    const lowerShelf = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.03, 0.22), new THREE.MeshBasicMaterial());
    lowerShelf.name = "shelf_rear_lower";
    lowerShelf.position.set(-1.45, 1.65, -1.68);
    scene.add(lowerShelf);

    const shelfCamera = new THREE.Group();
    shelfCamera.name = "ai-real-camera";
    const cameraMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.1), new THREE.MeshBasicMaterial());
    cameraMesh.name = "ai_cam_chassis";
    shelfCamera.add(cameraMesh);
    scene.add(shelfCamera);

    const chairRoot = new THREE.Group();
    chairRoot.name = "chair-root";
    chairRoot.position.set(0.3, 0, -0.36);
    chairRoot.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.25), new THREE.MeshBasicMaterial()));
    scene.add(chairRoot);
    const chairBase = new THREE.Group();
    chairBase.name = "chair-base";
    scene.add(chairBase);
    const avatarScene = new THREE.Group();
    avatarScene.name = "avatar-scene";
    const resident = new THREE.Group();
    resident.name = "resident";
    avatarScene.add(resident);
    scene.add(avatarScene);

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

    const originalPanelGeometries = new Map(
      Array.from({ length: 7 }, (_, index) => {
        const name = `hex_panel_${index + 1}`;
        return [name, (scene.getObjectByName(name) as THREE.Mesh).geometry] as const;
      }),
    );
    const originalPanelMaterials = new Map(
      Array.from({ length: 7 }, (_, index) => {
        const name = `hex_panel_${index + 1}`;
        return [name, (scene.getObjectByName(name) as THREE.Mesh).material] as const;
      }),
    );
    const first = applyReferenceComposition(scene);
    const firstPanel = scene.getObjectByName("hex_panel_1") as THREE.Mesh;
    const panelPosition = firstPanel.position.clone();
    const panelScale = firstPanel.scale.clone();
    const lightbarPosition = lightbar.position.clone();
    const second = applyReferenceComposition(scene);
    const finalPanelGeometryIds = new Map(
      Array.from({ length: 7 }, (_, index) => {
        const name = `hex_panel_${index + 1}`;
        return [name, (scene.getObjectByName(name) as THREE.Mesh).geometry.uuid] as const;
      }),
    );

    expect(first).toEqual({ movedNode: "pegboard_system", headsetStandCreated: true, missingHexPanels: [] });
    expect(second.headsetStandCreated).toBe(false);
    expect(pegboard.position.x).toBeCloseTo(3.0);
    expect(plants.position.x).toBeCloseTo(0.3);
    expect(shelfCamera.scale.toArray()).toEqual([2.4, 2.2, 2.2]);
    expect(shelfCamera.position.x).toBeCloseTo(-0.87);
    expect(shelfCamera.position.y).toBeCloseTo(1.797);
    expect(shelfCamera.position.z).toBeCloseTo(-1.68);
    expect(shelfCamera.rotation.y).toBeCloseTo(-Math.PI / 3);
    expect(shelfCamera.userData["referenceCompositionYawRadians"]).toBeCloseTo(-Math.PI / 3);
    const lowerShelfBounds = new THREE.Box3().setFromObject(lowerShelf);
    const cameraBounds = new THREE.Box3().setFromObject(shelfCamera);
    expect(cameraBounds.min.y).toBeCloseTo(lowerShelfBounds.max.y);
    expect(lowerShelf.position.x).toBeCloseTo(-0.75);
    expect(scene.getObjectByName("ai-real-camera")).toBe(shelfCamera);
    expect(scene.getObjectByName("ai_cam_chassis")).toBe(cameraMesh);
    expect(chairRoot.position.x).toBeCloseTo(0.5);
    expect(chairRoot.position.z).toBeCloseTo(-1.75);
    expect(chairRoot.scale.toArray()).toEqual([0.75, 1.35, 0.9]);
    expect(new THREE.Box3().setFromObject(chairRoot).min.y).toBeCloseTo(-0.25);
    expect(chairRoot.userData["referenceChairBottomAnchored"]).toBe(true);
    expect(chairBase.position.x).toBeCloseTo(0.35);
    expect(chairBase.position.z).toBeCloseTo(-1.39);
    expect(avatarScene.position.x).toBeCloseTo(0.4);
    expect(avatarScene.position.z).toBeCloseTo(-1.15);
    expect(avatarScene.scale.toArray()).toEqual([0.82, 0.82, 0.82]);
    expect(ivy.position.x).toBeCloseTo(-0.9);
    expect(ivy.position.y).toBeCloseTo(2.29);
    expect(ivy.position.z).toBeCloseTo(-1.62);
    expect(desk.position.x).toBeCloseTo(0.03);
    expect(scene.getObjectByName("peg_controller_body")).toBe(controller);
    const controllerDetails = scene.getObjectByName("controller-code-native")!;
    expect(controllerDetails.parent).toBe(controller);
    expect(controller.scale.toArray()).toEqual([2.7, 3.2, 2.7]);
    expect(controllerDetails.userData["dimensions"]["width"]).toBeCloseTo(0.216750, 5);
    expect(controllerDetails.userData["dimensions"]["height"]).toBeCloseTo(0.114563, 5);
    expect(controllerDetails.userData["dimensions"]["depth"]).toBeCloseTo(0.02, 5);
    expect(controllerDetails.children.map((child) => child.name)).toEqual([
      "controller-body-shell-code-native",
      "controller-dpad-horizontal-code-native",
      "controller-dpad-vertical-code-native",
      "controller-stick-left-code-native",
      "controller-stick-right-code-native",
      "controller-action-button-1-code-native",
      "controller-action-button-2-code-native",
      "controller-action-button-3-code-native",
      "controller-action-button-4-code-native",
    ]);
    const controllerDetailsBounds = new THREE.Box3().setFromObject(controllerDetails);
    expect(controllerDetailsBounds.getSize(new THREE.Vector3()).x).toBeCloseTo(0.585228, 5);
    expect(controllerDetailsBounds.getSize(new THREE.Vector3()).y).toBeCloseTo(0.3666, 5);
    expect(controllerDetailsBounds.getSize(new THREE.Vector3()).z).toBeCloseTo(0.054, 3);
    const controllerShell = scene.getObjectByName("controller-body-shell-code-native") as THREE.Mesh;
    controllerShell.geometry.computeBoundingBox();
    const controllerShellSize = controllerShell.geometry.boundingBox?.getSize(new THREE.Vector3());
    expect(controllerShellSize?.x).toBeCloseTo(0.166731, 5);
    expect(controllerShellSize?.y).toBeCloseTo(0.088125, 5);
    expect(controllerShellSize?.z).toBeCloseTo(0.018, 5);
    for (const child of controllerDetails.children as THREE.Mesh[]) {
      expect(child.userData["interactionNeutral"]).toBe(true);
      expect(child.raycast).not.toBe(THREE.Mesh.prototype.raycast);
    }
    expect(lightbar.position.toArray()).toEqual(lightbarPosition.toArray());
    expect(lightbar.position.y).toBeCloseTo(1.263);
    expect(lightbar.position.z).toBeCloseTo(-1.275);
    expect(firstPanel.position.toArray()).toEqual(panelPosition.toArray());
    expect(firstPanel.scale.toArray()).toEqual(panelScale.toArray());
    expect(firstPanel.scale.x).toBeCloseTo(1.1);
    expect(firstPanel.position.y).toBeCloseTo(1.736);
    expect(firstPanel.position.z).toBeCloseTo(-1.61);
    const leftPanel = scene.getObjectByName("hex_panel_2")!;
    expect(leftPanel.position.x).toBeCloseTo(-0.252);
    expect(leftPanel.position.y).toBeCloseTo(1.824);

    const geometryIds = new Set<string>();
    for (let index = 1; index <= 7; index += 1) {
      const panel = scene.getObjectByName(`hex_panel_${index}`) as THREE.Mesh;
      expect(panel.name).toBe(`hex_panel_${index}`);
      expect(panel.geometry).not.toBe(originalPanelGeometries.get(panel.name));
      expect(panel.material).toBe(originalPanelMaterials.get(panel.name));
      expect(panel.geometry.uuid).toBe(finalPanelGeometryIds.get(panel.name));
      expect(geometryIds.has(panel.geometry.uuid)).toBe(false);
      geometryIds.add(panel.geometry.uuid);
      const referenceHexPanel = panel.geometry.userData["referenceHexPanel"] as {
        sides: number;
        width: number;
        depth: number;
        vertexCount: number;
        indexCount: number;
      };
      expect(referenceHexPanel.sides).toBe(6);
      expect(referenceHexPanel.width).toBeCloseTo(0.22, 5);
      expect(referenceHexPanel.depth).toBeCloseTo(0.015, 5);
      expect(referenceHexPanel.vertexCount).toBe(36);
      expect(referenceHexPanel.indexCount).toBe(60);
      expect(panel.geometry.getAttribute("position").count).toBe(36);
      expect(panel.geometry.index?.count).toBe(60);
    }

    const stand = scene.getObjectByName("headset-stand-code-native")!;
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
    expect(stand.userData["dimensions"]).toEqual({ width: 0.19, height: 0.237, depth: 0.156 });
    expect(scene.getObjectByName("headset-code-native")).toBeDefined();
    const headset = scene.getObjectByName("headset-code-native")!;
    expect(headset.userData["dimensions"]).toEqual({ width: 0.25, height: 0.199, depth: 0.034 });
    expect(scene.getObjectByName("headset-band-code-native")).toBeDefined();
    expect(scene.getObjectByName("headset-earcup-left-code-native")).toBeDefined();
    expect(scene.getObjectByName("headset-earcup-right-code-native")).toBeDefined();
    expect(scene.getObjectByName("headset-yoke-left-code-native")).toBeDefined();
    expect(scene.getObjectByName("headset-yoke-right-code-native")).toBeDefined();
    const headsetBounds = new THREE.Box3().setFromObject(headset);
    expect(headsetBounds.getSize(new THREE.Vector3()).x).toBeCloseTo(0.25, 3);
    expect(headsetBounds.getSize(new THREE.Vector3()).y).toBeCloseTo(0.199, 3);
    expect(headsetBounds.getSize(new THREE.Vector3()).z).toBeCloseTo(0.034, 3);
    const cradleBounds = new THREE.Box3().setFromObject(scene.getObjectByName("headset-stand-cradle")!);
    expect(Math.abs(headsetBounds.min.y - cradleBounds.max.y)).toBeLessThan(0.002);
    for (const name of [
      "headset-band-code-native",
      "headset-yoke-left-code-native",
      "headset-yoke-right-code-native",
      "headset-earcup-left-code-native",
      "headset-earcup-right-code-native",
      "headset-earcup-badge-left-code-native",
      "headset-earcup-badge-right-code-native",
    ]) {
      const mesh = scene.getObjectByName(name) as THREE.Mesh;
      expect(mesh.userData["interactionNeutral"]).toBe(true);
      expect(mesh.raycast).not.toBe(THREE.Mesh.prototype.raycast);
    }

    const console = scene.getObjectByName("console-code-native")!;
    const consoleBounds = new THREE.Box3().setFromObject(console);
    const deskBounds = new THREE.Box3().setFromObject(deskTop);
    expect(console.userData["source"]).toContain("PRE-G7-13");
    expect(console.userData["dimensions"]).toEqual({ width: 0.3, height: 0.076, depth: 0.19, chassisHeight: 0.055 });
    expect(consoleBounds.min.y).toBeCloseTo(deskBounds.max.y);
    expect(consoleBounds.min.x).toBeGreaterThanOrEqual(deskBounds.min.x);
    expect(consoleBounds.max.x).toBeLessThanOrEqual(deskBounds.max.x);
    expect(consoleBounds.min.z).toBeGreaterThanOrEqual(deskBounds.min.z);
    expect(consoleBounds.max.z).toBeLessThanOrEqual(deskBounds.max.z);
    expect(console.getObjectByName("console-display-code-native")).toBeDefined();
    expect(console.getObjectByName("console-fader-1-code-native")).toBeDefined();
    expect(console.getObjectByName("console-knob-1-code-native")).toBeDefined();
    console.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      expect(mesh.userData["interactionNeutral"]).toBe(true);
      expect(mesh.raycast).not.toBe(THREE.Mesh.prototype.raycast);
    });
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
