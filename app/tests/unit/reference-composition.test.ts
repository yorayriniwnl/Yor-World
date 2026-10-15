import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { applyReferenceComposition, measureProjectedBounds } from "../../src/features/world/ReferenceComposition";
import {
  configureProductionLighting,
  PRODUCTION_HEX_EMISSIVE_COLORS,
  PRODUCTION_HEX_EMISSIVE_INTENSITY,
  PRODUCTION_LIGHT_INTENSITIES,
} from "../../src/features/world/ProductionLighting";

const AUTHORED_HEX_POSITIONS = [
  [-0.2235, 1.87], [0, 1.87], [0.2235, 1.87], [-0.33525, 1.6675], [-0.11175, 1.6675], [0.11175, 1.6675], [0.33525, 1.6675],
] as const;

function addHexPanels(scene: THREE.Object3D, standardMaterials = false): THREE.Group {
  const panelGroup = new THREE.Group();
  panelGroup.name = "essential_lights";
  AUTHORED_HEX_POSITIONS.forEach(([x, y], index) => {
    const material = standardMaterials
      ? new THREE.MeshStandardMaterial({ name: index % 2 ? "Hex_LilacEmissive" : "Hex_VioletEmissive" })
      : new THREE.MeshBasicMaterial();
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.015), material);
    panel.name = `hex_panel_${index + 1}`;
    panel.position.set(x, y, -1.77);
    panelGroup.add(panel);
  });
  scene.add(panelGroup);
  return panelGroup;
}

describe("reference room composition", () => {
  it("keeps named interaction roots intact while making the full seven-panel cluster fit the wall", () => {
    const scene = new THREE.Group();
    const pegboard = new THREE.Group();
    pegboard.name = "pegboard_system";
    const controller = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    controller.name = "peg_controller_body";
    controller.position.set(-1.55, 1.3, -1.71);
    pegboard.add(controller);
    scene.add(pegboard);

    const plants = new THREE.Group();
    plants.name = "plants";
    const monsteraLeaf = new THREE.Group();
    monsteraLeaf.name = "monstera_leaf_1";
    monsteraLeaf.position.z = 0.9;
    plants.add(monsteraLeaf);
    scene.add(plants);

    const shelfCamera = new THREE.Group();
    shelfCamera.name = "ai-real-camera";
    const cameraMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.07), new THREE.MeshBasicMaterial());
    cameraMesh.name = "ai_cam_chassis";
    cameraMesh.position.set(-1.45, 1.7, -1.48);
    shelfCamera.add(cameraMesh);
    scene.add(shelfCamera);

    const rightSpeaker = new THREE.Group();
    rightSpeaker.name = "speaker_right_cabinet";
    rightSpeaker.position.set(0.72, 0.88, -1.25);
    scene.add(rightSpeaker);
    const rightTweeter = new THREE.Group();
    rightTweeter.name = "speaker_right_tweeter";
    rightTweeter.position.set(0.72, 0.94, -1.168);
    scene.add(rightTweeter);
    const rightWoofer = new THREE.Group();
    rightWoofer.name = "speaker_right_woofer";
    rightWoofer.position.set(0.72, 0.84, -1.168);
    scene.add(rightWoofer);
    const panelGroup = addHexPanels(scene, true);
    const first = applyReferenceComposition(scene);
    const controllerWorld = controller.getWorldPosition(new THREE.Vector3());
    const cameraWorld = cameraMesh.getWorldPosition(new THREE.Vector3());
    const panelBounds = new THREE.Box3();
    panelGroup.children.forEach((panel) => panelBounds.union(new THREE.Box3().setFromObject(panel)));
    const firstPanelPosition = panelGroup.getObjectByName("hex_panel_1")!.position.clone();
    const second = applyReferenceComposition(scene);

    expect(first).toEqual({ movedNode: "pegboard_system", headsetStandCreated: true, missingHexPanels: [] });
    expect(second.headsetStandCreated).toBe(false);
    expect(scene.getObjectByName("pegboard_system")).toBe(pegboard);
    expect(scene.getObjectByName("peg_controller_body")).toBe(controller);
    expect(controllerWorld.x).toBeCloseTo(1.45);
    expect(plants.position.x).toBeCloseTo(0.72);
    expect(monsteraLeaf.position.z).toBeCloseTo(0.05);
    expect(scene.getObjectByName("ai-real-camera")).toBe(shelfCamera);
    expect(cameraWorld.x).toBeCloseTo(-1.45);
    expect(cameraWorld.y).toBeCloseTo(1.78);
    expect(cameraWorld.z).toBeCloseTo(-1.32);
    expect(scene.getObjectByName("speaker_right_cabinet")).toBe(rightSpeaker);
    expect(rightSpeaker.position.x).toBeCloseTo(0.52);
    expect(rightSpeaker.position.y).toBeCloseTo(1.38);
    expect(rightSpeaker.position.z).toBeCloseTo(-1.25);
    expect(rightTweeter.position.x).toBeCloseTo(0.52);
    expect(rightWoofer.position.y).toBeCloseTo(1.34);
    expect(panelBounds.min.y).toBeGreaterThan(1.35);
    expect(panelBounds.max.y).toBeLessThan(2.6);
    expect(panelBounds.getSize(new THREE.Vector3()).x).toBeGreaterThan(0.9);
    expect(panelBounds.getSize(new THREE.Vector3()).x).toBeLessThan(1.1);
    expect(panelBounds.getSize(new THREE.Vector3()).y).toBeLessThan(0.6);
    expect(panelGroup.getObjectByName("hex_panel_1")!.position.toArray()).toEqual(firstPanelPosition.toArray());

    const stand = scene.getObjectByName("headset-stand-code-native")!;
    const standBounds = new THREE.Box3().setFromObject(stand);
    expect(stand.userData["source"]).toContain("GLB inventory confirmed no headset stand node");
    expect(stand.position.x).toBeGreaterThan(1);
    expect(stand.children.map((child) => child.name)).toEqual([
      "headset-stand-base",
      "headset-stand-stem",
      "headset-stand-cradle",
    ]);
    const standSize = standBounds.getSize(new THREE.Vector3());
    expect(standSize.x).toBeCloseTo(0.19);
    expect(standSize.y).toBeCloseTo(0.237);
    expect(standSize.z).toBeCloseTo(0.156);
  });

  it("projects the changed wall group fully into the frozen desktop home frustum", () => {
    const scene = new THREE.Group();
    const pegboard = new THREE.Group();
    pegboard.name = "pegboard_system";
    scene.add(pegboard);
    const panelGroup = addHexPanels(scene);
    applyReferenceComposition(scene);

    const camera = new THREE.PerspectiveCamera(48, 1440 / 900, 0.05, 30);
    camera.position.set(-0.45, 1.85, 1.3);
    camera.lookAt(0, 1.27, -1.22);
    const bounds = measureProjectedBounds(panelGroup, camera, { width: 1440, height: 900 });

    expect(bounds).not.toBeNull();
    expect(bounds!.width).toBeGreaterThan(100);
    expect(bounds!.height).toBeGreaterThan(100);
    expect(bounds!.left).toBeGreaterThanOrEqual(0);
    expect(bounds!.right).toBeLessThanOrEqual(1440);
    expect(bounds!.visibleAreaRatio).toBeGreaterThan(0.99);
  });

  it("reports partial viewport clipping for a rotated, translated scene group", () => {
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

  it("calibrates only the named production lights and seven hex emissive materials", () => {
    const scene = new THREE.Group();
    const lights = new Map<string, THREE.Light>();
    for (const name of Object.keys(PRODUCTION_LIGHT_INTENSITIES)) {
      const light = name === "Light_TaskDownlight"
        ? new THREE.SpotLight(0xffffff, 20)
        : new THREE.PointLight(0xffffff, 20);
      light.name = name;
      lights.set(name, light);
      scene.add(light);
    }

    const panel = new THREE.Group();
    panel.name = "hex_panel_1";
    const emissive = new THREE.MeshStandardMaterial({ name: "Hex_LilacEmissive", emissiveIntensity: 5.7 });
    const violet = new THREE.MeshStandardMaterial({ name: "Hex_VioletEmissive", emissiveIntensity: 5.28 });
    panel.add(new THREE.Mesh(new THREE.BoxGeometry(), violet));
    const unrelated = new THREE.MeshStandardMaterial({ name: "Desk_White", emissiveIntensity: 0.4 });
    panel.add(new THREE.Mesh(new THREE.BoxGeometry(), emissive));
    panel.add(new THREE.Mesh(new THREE.BoxGeometry(), unrelated));
    scene.add(panel);

    configureProductionLighting(scene);

    for (const [name, intensity] of Object.entries(PRODUCTION_LIGHT_INTENSITIES)) {
      expect(lights.get(name)!.intensity).toBe(intensity);
    }
    expect(emissive.emissiveIntensity).toBe(PRODUCTION_HEX_EMISSIVE_INTENSITY);
    expect(emissive.emissive.getHex()).toBe(PRODUCTION_HEX_EMISSIVE_COLORS.Hex_LilacEmissive);
    expect(violet.emissiveIntensity).toBe(PRODUCTION_HEX_EMISSIVE_INTENSITY);
    expect(violet.emissive.getHex()).toBe(PRODUCTION_HEX_EMISSIVE_COLORS.Hex_VioletEmissive);
    expect(unrelated.emissiveIntensity).toBe(0.4);
    const shader = {
      vertexShader: "#include <common>\nvoid main() {\n#include <begin_vertex>\n}",
      fragmentShader: "#include <common>\nvoid main() {\n#include <clipping_planes_fragment>\n}",
    };
    const compile = emissive.onBeforeCompile as unknown as (program: typeof shader, renderer: THREE.WebGLRenderer) => void;
    compile(shader, {} as THREE.WebGLRenderer);
    expect(shader.vertexShader).toContain("vReferenceHexPosition = vec2(position.x / 0.11, position.y / 0.10);");
    expect(shader.fragmentShader).toContain("referenceHexX > 0.5");
    expect(shader.fragmentShader).toContain("discard;");
  });

  it("requires all named panels when a production pegboard is present", () => {
    const scene = new THREE.Group();
    const pegboard = new THREE.Group();
    pegboard.name = "pegboard_system";
    scene.add(pegboard);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    panel.name = "hex_panel_1";
    scene.add(panel);

    expect(() => applyReferenceComposition(scene)).toThrow(/missing hex panels/i);
    expect(scene.getObjectByName("headset-stand-code-native")).toBeUndefined();
  });
});
