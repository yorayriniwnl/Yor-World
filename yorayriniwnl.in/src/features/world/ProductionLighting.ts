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

export const PRODUCTION_LIGHT_INTENSITIES: Readonly<Record<string, number>> = {
  Light_CeilingAmbient: 0.08,
  Light_CyanFill: 1.2,
  Light_HexWall: 0.5,
  Light_TaskDownlight: 1.25,
};

// Keep the existing panels saturated enough to read against the bright white wall.
export const PRODUCTION_HEX_EMISSIVE_INTENSITY = 2.4;
export const PRODUCTION_HEX_EMISSIVE_COLORS: Readonly<Record<string, number>> = {
  Hex_LilacEmissive: 0xff58e8,
  Hex_VioletEmissive: 0x995cff,
};

/** Run once before interaction controllers capture their lighting baseline. */
export function configureProductionLighting(scene: THREE.Object3D): void {
  for (const [name, intensity] of Object.entries(PRODUCTION_LIGHT_INTENSITIES)) {
    scene.getObjectByName(name)?.traverse((node) => {
      if (node instanceof THREE.PointLight || node instanceof THREE.SpotLight) node.intensity = intensity;
    });
  }

  const configuredMaterials = new Set<THREE.Material>();
  for (const name of HEX_PANEL_NAMES) {
    scene.getObjectByName(name)?.traverse((node) => {
      if (!(node as THREE.Mesh).isMesh) return;
      const mesh = node as THREE.Mesh;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        if (material.name !== "Hex_LilacEmissive" && material.name !== "Hex_VioletEmissive") continue;
        const standard = material as THREE.MeshStandardMaterial;
        standard.emissiveIntensity = PRODUCTION_HEX_EMISSIVE_INTENSITY;
        standard.emissive.setHex(PRODUCTION_HEX_EMISSIVE_COLORS[material.name]!);
        if (!configuredMaterials.has(standard)) {
          clipExistingBoxFaceToHexagon(standard);
          configuredMaterials.add(standard);
        }
      }
    });
  }
}

/** Clip the existing named box face in the shader; no mesh or geometry is added. */
function clipExistingBoxFaceToHexagon(material: THREE.MeshStandardMaterial): void {
  if (material.userData["referenceHexClipApplied"] === true) return;

  const previousCompile = material.onBeforeCompile.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    previousCompile(shader, renderer);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vReferenceHexPosition;")
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvReferenceHexPosition = vec2(position.x / 0.11, position.y / 0.10);",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vReferenceHexPosition;")
      .replace(
        "#include <clipping_planes_fragment>",
        "#include <clipping_planes_fragment>\n" +
          "float referenceHexX = abs(vReferenceHexPosition.x);\n" +
          "float referenceHexY = abs(vReferenceHexPosition.y);\n" +
          "if (referenceHexX > 0.5 && referenceHexY > 2.0 * (1.0 - referenceHexX)) discard;",
      );
  };
  const previousCacheKey = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => `${previousCacheKey()}|pre-g7-12-hex-face-v1`;
  material.userData["referenceHexClipApplied"] = true;
  material.needsUpdate = true;
}
