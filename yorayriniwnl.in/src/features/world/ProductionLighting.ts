import * as THREE from "three";

// Bounded browser values from the historical production parity viewer. This is
// a runtime integration calibration, not a claimed conversion of glTF units.
export const PRODUCTION_LIGHT_INTENSITIES: Readonly<Record<string, number>> = {
  Light_CeilingAmbient: 0.12,
  Light_CyanFill: 1.65,
  Light_HexWall: 0.08,
  Light_TaskDownlight: 2.5,
};

export const REFERENCE_MATERIAL_CALIBRATIONS = {
  Hex_LilacEmissive: { color: "#ec24d0", emissive: "#ff35e6", emissiveIntensity: 1.65, users: ["hex_panel_1", "hex_panel_3", "hex_panel_5", "hex_panel_6"] },
  Hex_VioletEmissive: { color: "#8e52e0", emissive: "#9d64ff", emissiveIntensity: 1.55, users: ["hex_panel_2", "hex_panel_4", "hex_panel_7"] },
  Lightbar_WarmTask: { color: "#f08a18", emissive: "#ff4b00", emissiveIntensity: 0.9, users: ["lightbar_emissive"] },
} as const;

export interface ReferenceMaterialCalibrationResult {
  calibratedMaterials: string[];
  isolatedMaterialClones: number;
}

/** Run once before interaction controllers capture their lighting baseline. */
export function configureProductionLighting(scene: THREE.Object3D): void {
  for (const [name, intensity] of Object.entries(PRODUCTION_LIGHT_INTENSITIES)) {
    scene.getObjectByName(name)?.traverse((node) => {
      if (node instanceof THREE.PointLight || node instanceof THREE.SpotLight) node.intensity = intensity;
    });
  }
}

/**
 * Calibrate only the named reference anchors. Materials shared with any other
 * scene mesh are cloned for these users so the override cannot recolor an
 * unrelated prop. Reapplying the function is safe and produces the same values.
 */
export function configureReferenceMaterials(scene: THREE.Object3D): ReferenceMaterialCalibrationResult {
  const usersByMaterial = new Map<THREE.Material, Array<{ mesh: THREE.Mesh; index: number }>>();
  scene.traverse((node) => {
    if (!(node as THREE.Mesh).isMesh) return;
    const mesh = node as THREE.Mesh;
    const slots = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    slots.forEach((material, index) => {
      if (Object.prototype.hasOwnProperty.call(REFERENCE_MATERIAL_CALIBRATIONS, material.name)) {
        const users = usersByMaterial.get(material) ?? [];
        users.push({ mesh, index });
        usersByMaterial.set(material, users);
      }
    });
  });

  const calibratedMaterials: string[] = [];
  let isolatedMaterialClones = 0;
  for (const [sourceMaterial, users] of usersByMaterial) {
    const calibration = REFERENCE_MATERIAL_CALIBRATIONS[sourceMaterial.name as keyof typeof REFERENCE_MATERIAL_CALIBRATIONS];
    const allowedUsers = new Set<string>(calibration.users);
    const targetUses = users.filter(({ mesh }) => allowedUsers.has(mesh.name));
    if (!targetUses.length) continue;

    const unrelatedUsers = users.some(({ mesh }) => !allowedUsers.has(mesh.name));
    const materialsToCalibrate = new Set<THREE.Material>();
    for (const { mesh, index } of targetUses) {
      if (unrelatedUsers) {
        const clone = sourceMaterial.clone();
        if (Array.isArray(mesh.material)) mesh.material[index] = clone;
        else mesh.material = clone;
        materialsToCalibrate.add(clone);
        isolatedMaterialClones += 1;
      } else {
        materialsToCalibrate.add(sourceMaterial);
      }
    }

    for (const material of materialsToCalibrate) {
      const standard = material as THREE.MeshStandardMaterial;
      standard.color.set(calibration.color);
      standard.emissive.set(calibration.emissive);
      standard.emissiveIntensity = calibration.emissiveIntensity;
      calibratedMaterials.push(sourceMaterial.name);
    }
  }

  return { calibratedMaterials: [...new Set(calibratedMaterials)].sort(), isolatedMaterialClones };
}
