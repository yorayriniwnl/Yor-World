import * as THREE from "three";
import type { QualityTier } from "../../contracts/experience";

/** LOW uses vertex-lit surfaces and alpha glass without extra transmission passes.
 * Frozen geometry, transforms, textures and the original materials stay intact.
 */
export class RuntimeMaterialQuality {
  private readonly originals = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  private readonly simplified = new Map<THREE.Material, THREE.MeshLambertMaterial>();
  private readonly ambientPoints = new Map<THREE.PointLight, number>();

  constructor(private readonly scene: THREE.Object3D) {
    scene.traverse((object) => {
      // Hemisphere/directional fill and the interactive task spotlight remain.
      // Optional ambient points add five per-vertex light loops in software LOW.
      if (object instanceof THREE.PointLight) this.ambientPoints.set(object, object.layers.mask);
      if (!(object as THREE.Mesh).isMesh) return;
      const mesh = object as THREE.Mesh;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      if (materials.some((material) => (material as THREE.MeshStandardMaterial).isMeshStandardMaterial)) {
        this.originals.set(mesh, mesh.material);
        for (const material of materials) {
          const standard = material as THREE.MeshPhysicalMaterial;
          if (!standard.isMeshStandardMaterial || this.simplified.has(material)) continue;
          const transmission = standard.transmission ?? 0;
          const surface = new THREE.MeshLambertMaterial({
            name: standard.name,
            color: standard.color, map: standard.map,
            emissive: standard.emissive, emissiveMap: standard.emissiveMap,
            emissiveIntensity: standard.emissiveIntensity,
            aoMap: standard.aoMap, aoMapIntensity: standard.aoMapIntensity,
            lightMap: standard.lightMap, lightMapIntensity: standard.lightMapIntensity,
            alphaMap: standard.alphaMap, alphaTest: standard.alphaTest,
            opacity: standard.opacity * (1 - transmission),
            transparent: transmission > 0 || standard.transparent,
            depthWrite: transmission > 0 ? false : standard.depthWrite,
            depthTest: standard.depthTest, side: standard.side,
            flatShading: standard.flatShading, vertexColors: standard.vertexColors,
            wireframe: standard.wireframe,
          });
          this.simplified.set(material, surface);
        }
      }
    });
  }

  public apply(tier: QualityTier): void {
    for (const [light, mask] of this.ambientPoints) light.layers.mask = tier === "low" ? 0 : mask;
    for (const [mesh, original] of this.originals) {
      mesh.material = tier === "low"
        ? Array.isArray(original) ? original.map((material) => this.simplified.get(material) ?? material) : this.simplified.get(original) ?? original
        : original;
    }
  }

  public dispose(): void {
    this.apply("high");
    for (const material of this.simplified.values()) material.dispose();
    this.simplified.clear();
    this.originals.clear();
    this.ambientPoints.clear();
  }
}
