import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  configureProductionLighting,
  configureReferenceMaterials,
  PRODUCTION_LIGHT_INTENSITIES,
  REFERENCE_MATERIAL_CALIBRATIONS,
} from "../../src/features/world/ProductionLighting";

function mesh(name: string, material: THREE.Material): THREE.Mesh {
  const result = new THREE.Mesh(new THREE.BoxGeometry(), material);
  result.name = name;
  return result;
}

describe("named reference lighting and material calibration", () => {
  it("calibrates only the named anchor materials and isolates unrelated shared users", () => {
    const scene = new THREE.Group();
    const lilac = new THREE.MeshStandardMaterial({ name: "Hex_LilacEmissive", color: "white", emissive: "white", emissiveIntensity: 5.7 });
    const violet = new THREE.MeshStandardMaterial({ name: "Hex_VioletEmissive", color: "white", emissive: "white", emissiveIntensity: 5.28 });
    const warm = new THREE.MeshStandardMaterial({ name: "Lightbar_WarmTask", color: "white", emissive: "white", emissiveIntensity: 5 });
    const unrelatedOriginalColor = lilac.color.clone();

    const firstHex = mesh("hex_panel_1", lilac);
    const secondHex = mesh("hex_panel_3", lilac);
    const unrelated = mesh("decorative-trim", lilac);
    const violetHex = mesh("hex_panel_2", violet);
    const lightbar = mesh("lightbar_emissive", warm);
    scene.add(firstHex, secondHex, unrelated, violetHex, lightbar);

    const first = configureReferenceMaterials(scene);
    const firstHexMaterial = firstHex.material as THREE.MeshStandardMaterial;
    const secondHexMaterial = secondHex.material as THREE.MeshStandardMaterial;
    const violetMaterial = violetHex.material as THREE.MeshStandardMaterial;
    const lightbarMaterial = lightbar.material as THREE.MeshStandardMaterial;

    expect(first.calibratedMaterials).toEqual(["Hex_LilacEmissive", "Hex_VioletEmissive", "Lightbar_WarmTask"]);
    expect(first.isolatedMaterialClones).toBe(2);
    expect(firstHexMaterial).not.toBe(lilac);
    expect(secondHexMaterial).not.toBe(lilac);
    expect(unrelated.material).toBe(lilac);
    expect((unrelated.material as THREE.MeshStandardMaterial).color).toEqual(unrelatedOriginalColor);
    expect(firstHexMaterial.color.getHexString()).toBe(REFERENCE_MATERIAL_CALIBRATIONS.Hex_LilacEmissive.color.slice(1));
    expect(firstHexMaterial.emissiveIntensity).toBe(1.15);
    expect(violetMaterial.color.getHexString()).toBe(REFERENCE_MATERIAL_CALIBRATIONS.Hex_VioletEmissive.color.slice(1));
    expect(violetMaterial.emissiveIntensity).toBe(1.05);
    expect(lightbarMaterial.color.getHexString()).toBe(REFERENCE_MATERIAL_CALIBRATIONS.Lightbar_WarmTask.color.slice(1));
    expect(lightbarMaterial.emissiveIntensity).toBe(1.6);

    const second = configureReferenceMaterials(scene);
    expect(second.isolatedMaterialClones).toBe(0);
    expect(firstHex.material).toBe(firstHexMaterial);
    expect(firstHexMaterial.emissiveIntensity).toBe(1.15);
  });

  it("sets only the named room lights and retains the animated downlight baseline", () => {
    const scene = new THREE.Group();
    const ambient = new THREE.PointLight();
    ambient.name = "Light_CeilingAmbient";
    const cyan = new THREE.PointLight();
    cyan.name = "Light_CyanFill";
    const hex = new THREE.PointLight();
    hex.name = "Light_HexWall";
    const downlight = new THREE.SpotLight();
    downlight.name = "Light_TaskDownlight";
    scene.add(ambient, cyan, hex, downlight);

    configureProductionLighting(scene);

    expect(ambient.intensity).toBe(PRODUCTION_LIGHT_INTENSITIES.Light_CeilingAmbient);
    expect(cyan.intensity).toBe(PRODUCTION_LIGHT_INTENSITIES.Light_CyanFill);
    expect(hex.intensity).toBe(PRODUCTION_LIGHT_INTENSITIES.Light_HexWall);
    expect(downlight.intensity).toBe(2.5);
  });
});
