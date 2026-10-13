import * as THREE from "three";

// Bounded browser values from the historical production parity viewer. This is
// a runtime integration calibration, not a claimed conversion of glTF units.
export const PRODUCTION_LIGHT_INTENSITIES: Readonly<Record<string, number>> = {
  Light_CeilingAmbient: 0.45,
  Light_CyanFill: 1.8,
  Light_HexWall: 2.7,
  Light_TaskDownlight: 1.65,
};

/** Run once before interaction controllers capture their lighting baseline. */
export function configureProductionLighting(scene: THREE.Object3D): void {
  for (const [name, intensity] of Object.entries(PRODUCTION_LIGHT_INTENSITIES)) {
    scene.getObjectByName(name)?.traverse((node) => {
      if (node instanceof THREE.PointLight || node instanceof THREE.SpotLight) node.intensity = intensity;
    });
  }
  // Calibrate the two emissive wall surfaces for ACES browser rendering. Their
  // imported near-white emission lost the pink/violet separation under fill.
  const calibrated = new Set<THREE.Material>();
  scene.traverse((node) => {
    if (!(node as THREE.Mesh).isMesh) return;
    const material = (node as THREE.Mesh).material;
    for (const candidate of Array.isArray(material) ? material : [material]) {
      if (calibrated.has(candidate) || !(candidate as THREE.MeshStandardMaterial).isMeshStandardMaterial) continue;
      calibrated.add(candidate);
      const standard = candidate as THREE.MeshStandardMaterial;
      if (standard.name === "Hex_LilacEmissive") { standard.emissive.set("#e982f8"); standard.emissiveIntensity = 0.55; }
      if (standard.name === "Hex_VioletEmissive") { standard.emissive.set("#a34ded"); standard.emissiveIntensity = 0.68; }
    }
  });
}
