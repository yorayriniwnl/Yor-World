import * as THREE from "three";

// Bounded browser values from the historical production parity viewer. This is
// a runtime integration calibration, not a claimed conversion of glTF units.
export const PRODUCTION_LIGHT_INTENSITIES: Readonly<Record<string, number>> = {
  Light_CeilingAmbient: 0.25,
  Light_CyanFill: 2.0,
  Light_HexWall: 0.5,
  Light_TaskDownlight: 2.5,
};

/** Run once before interaction controllers capture their lighting baseline. */
export function configureProductionLighting(scene: THREE.Object3D): void {
  for (const [name, intensity] of Object.entries(PRODUCTION_LIGHT_INTENSITIES)) {
    scene.getObjectByName(name)?.traverse((node) => {
      if (node instanceof THREE.PointLight || node instanceof THREE.SpotLight) node.intensity = intensity;
    });
  }
}
