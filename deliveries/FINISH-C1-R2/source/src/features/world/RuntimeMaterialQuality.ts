import * as THREE from "three";
import type { QualityTier } from "../../contracts/experience";

/** LOW uses vertex-lit surfaces and alpha glass without extra transmission passes.
 * Frozen geometry, transforms, textures and the original materials stay intact.
 */
export class RuntimeMaterialQuality {
  private readonly originals = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  private readonly simplified = new Map<THREE.Material, THREE.MeshLambertMaterial>();
  private readonly ambientPoints = new Map<THREE.PointLight, number>();
  private currentTier: QualityTier = "high";

  constructor(private readonly scene: THREE.Object3D) {
    scene.traverse((object) => {
      // Hemisphere/directional fill and the interactive task spotlight remain.
      // Optional ambient points add five per-vertex light loops in software LOW.
      if (object instanceof THREE.PointLight) this.ambientPoints.set(object, object.layers.mask);
      if (!(object as THREE.Mesh).isMesh) return;
      const mesh = object as THREE.Mesh;
      this.registerMesh(mesh);
    });
  }

  private simplifyMaterial(material: THREE.Material): THREE.MeshLambertMaterial | null {
    const standard = material as THREE.MeshPhysicalMaterial;
    if (!standard.isMeshStandardMaterial) return null;
    const transmission = standard.transmission ?? 0;
    return new THREE.MeshLambertMaterial({
      name: standard.name,
      color: standard.color,
      map: standard.map,
      emissive: standard.emissive,
      emissiveMap: standard.emissiveMap,
      emissiveIntensity: standard.emissiveIntensity,
      aoMap: standard.aoMap,
      aoMapIntensity: standard.aoMapIntensity,
      lightMap: standard.lightMap,
      lightMapIntensity: standard.lightMapIntensity,
      alphaMap: standard.alphaMap,
      alphaTest: standard.alphaTest,
      opacity: standard.opacity * (1 - transmission),
      transparent: transmission > 0 || standard.transparent,
      depthWrite: transmission > 0 ? false : standard.depthWrite,
      depthTest: standard.depthTest,
      side: standard.side,
      flatShading: standard.flatShading,
      vertexColors: standard.vertexColors,
      wireframe: standard.wireframe,
    });
  }

  public registerMesh(mesh: THREE.Mesh): void {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    if (materials.some((material) => (material as THREE.MeshStandardMaterial).isMeshStandardMaterial)) {
      this.originals.set(mesh, mesh.material);
      for (const material of materials) {
        if (this.simplified.has(material)) continue;
        const simplified = this.simplifyMaterial(material);
        if (simplified) {
          this.simplified.set(material, simplified);
        }
      }
    }
  }

  public refreshMesh(mesh: THREE.Mesh): void {
    const original = this.originals.get(mesh) ?? mesh.material;
    const materials = Array.isArray(original) ? original : [original];
    for (const material of materials) {
      if ((material as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
        const standard = material as THREE.MeshPhysicalMaterial;
        const existingSimplified = this.simplified.get(material);
        if (existingSimplified) {
          existingSimplified.map = standard.map;
          existingSimplified.needsUpdate = true;
        } else {
          const simplified = this.simplifyMaterial(material);
          if (simplified) {
            this.simplified.set(material, simplified);
          }
        }
      }
    }
    if (!this.originals.has(mesh)) {
      this.originals.set(mesh, original);
    }
    if (this.currentTier === "low") {
      mesh.material = Array.isArray(original)
        ? original.map((mat) => this.simplified.get(mat) ?? mat)
        : this.simplified.get(original) ?? original;
    } else {
      mesh.material = original;
    }
  }

  public apply(tier: QualityTier): void {
    this.currentTier = tier;
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
