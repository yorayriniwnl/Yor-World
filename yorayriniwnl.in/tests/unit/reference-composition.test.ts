import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { applyReferenceComposition, measureProjectedBounds } from "../../src/features/world/ReferenceComposition";

describe("reference room composition", () => {
  it("moves the named interaction roots, scales the seven light panels, and adds only the missing headset stand once", () => {
    const scene = new THREE.Group();
    const pegboard = new THREE.Group();
    pegboard.name = "pegboard_system";
    const controller = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    controller.name = "peg_controller_body";
    pegboard.add(controller);
    scene.add(pegboard);

    const plants = new THREE.Group();
    plants.name = "plants";
    scene.add(plants);

    const shelfCamera = new THREE.Group();
    shelfCamera.name = "ai-real-camera";
    const cameraMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.07), new THREE.MeshBasicMaterial());
    cameraMesh.name = "ai_cam_chassis";
    shelfCamera.add(cameraMesh);
    scene.add(shelfCamera);

    const lights = new THREE.Group();
    lights.name = "essential_lights";
    for (let index = 1; index <= 7; index += 1) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.015), new THREE.MeshStandardMaterial());
      panel.name = `hex_panel_${index}`;
      panel.position.set(index % 2 ? 0 : -0.21, 1.82 + (index - 4) * 0.08, -1.77);
      lights.add(panel);
    }
    scene.add(lights);

    const first = applyReferenceComposition(scene);
    const firstPanel = scene.getObjectByName("hex_panel_1")!;
    const panelPosition = firstPanel.position.clone();
    const panelScale = firstPanel.scale.clone();
    const second = applyReferenceComposition(scene);

    expect(first).toEqual({ movedNode: "pegboard_system", headsetStandCreated: true, missingHexPanels: [] });
    expect(second.headsetStandCreated).toBe(false);
    expect(pegboard.position.x).toBeCloseTo(3.0);
    expect(plants.position.x).toBeCloseTo(0.3);
    expect(shelfCamera.position.toArray()).toEqual([0.7, 0.35, 0.18]);
    expect(scene.getObjectByName("ai-real-camera")).toBe(shelfCamera);
    expect(scene.getObjectByName("ai_cam_chassis")).toBe(cameraMesh);
    expect(scene.getObjectByName("peg_controller_body")).toBe(controller);
    expect(firstPanel.position.toArray()).toEqual(panelPosition.toArray());
    expect(firstPanel.scale.toArray()).toEqual(panelScale.toArray());
    expect(firstPanel.scale.x).toBeCloseTo(2.7);
    expect(firstPanel.position.y).toBeCloseTo(1.836);
    expect(firstPanel.position.z).toBeCloseTo(-1.61);
    const leftPanel = scene.getObjectByName("hex_panel_2")!;
    expect(leftPanel.position.x).toBeCloseTo(-0.504);
    expect(leftPanel.position.y).toBeCloseTo(1.924);

    const stand = scene.getObjectByName("headset-stand-code-native")!;
    const standBounds = new THREE.Box3().setFromObject(stand);
    expect(stand.children.map((child) => child.name)).toEqual([
      "headset-stand-base",
      "headset-stand-stem",
      "headset-stand-cradle",
    ]);
    expect(standBounds.getSize(new THREE.Vector3()).x).toBeCloseTo(0.19);
    expect(standBounds.getSize(new THREE.Vector3()).y).toBeCloseTo(0.237);
    expect(standBounds.getSize(new THREE.Vector3()).z).toBeCloseTo(0.156);
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
