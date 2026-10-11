import * as THREE from "three";
import type { QualityTier } from "../../contracts/experience";
import { isLateMaterialTargetName } from "./LowQualityBatch";

/** LOW uses owned vertex-lit derivatives; source geometry/material ownership remains with the session ledger. */
export class RuntimeMaterialQuality {
  private readonly originals = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  private readonly simplified = new Map<THREE.Material, THREE.MeshLambertMaterial>();
  private readonly generatedSimplified = new Set<THREE.MeshLambertMaterial>();
  private readonly generatedClones = new Set<THREE.Material>();
  private readonly generatedTextures = new Set<THREE.Texture>();
  private readonly ambientPoints = new Map<THREE.PointLight, number>();
  private currentTier: QualityTier = "high";

  constructor(private readonly scene: THREE.Object3D) {
    scene.traverse((object) => {
      if (object instanceof THREE.PointLight) this.ambientPoints.set(object, object.layers.mask);
      if ((object as THREE.Mesh).isMesh) this.registerMesh(object as THREE.Mesh);
    });
  }

  private simplifyMaterial(material: THREE.Material): THREE.MeshLambertMaterial | null {
    const standard = material as THREE.MeshPhysicalMaterial;
    if (!standard.isMeshStandardMaterial) return null;
    const transmission = standard.transmission ?? 0;
    const simplified = new THREE.MeshLambertMaterial({
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
    this.generatedSimplified.add(simplified);
    return simplified;
  }

  public registerMesh(mesh: THREE.Mesh): void {
    const original = mesh.material;
    this.originals.set(mesh, original);
    const materials = Array.isArray(original) ? original : [original];
    for (const material of materials) {
      if (this.simplified.has(material)) continue;
      const simplified = this.simplifyMaterial(material);
      if (simplified) this.simplified.set(material, simplified);
    }
  }

  /**
   * Installs a late color map on a mesh-local material copy. The returned undo
   * function restores the prior visible material and quality registration.
   */
  public installColorMap(mesh: THREE.Mesh, texture: THREE.Texture): () => void {
    texture.colorSpace = THREE.SRGBColorSpace;
    const hadOriginalRegistration = this.originals.has(mesh);
    const previousOriginal = hadOriginalRegistration ? this.originals.get(mesh)! : mesh.material;
    const previousVisible = mesh.material;
    const previousList = Array.isArray(previousOriginal) ? previousOriginal : [previousOriginal];
    const clones: THREE.Material[] = [];
    const replacementMaps: THREE.Texture[] = [];
    const newSimplified: Array<[THREE.Material, THREE.MeshLambertMaterial]> = [];

    const releaseGenerated = (): void => {
      for (const [source, derivative] of newSimplified) {
        if (this.simplified.get(source) === derivative) this.simplified.delete(source);
        if (this.generatedSimplified.delete(derivative)) derivative.dispose();
      }
      for (const clone of clones) {
        this.generatedClones.delete(clone);
        clone.dispose();
      }
      for (const replacementMap of replacementMaps) {
        if (this.generatedTextures.delete(replacementMap)) replacementMap.dispose();
      }
    };

    const restoreOriginalRegistration = (): void => {
      if (hadOriginalRegistration) this.originals.set(mesh, previousOriginal);
      else this.originals.delete(mesh);
    };

    try {
      for (const material of previousList) {
        const clone = material.clone();
        clones.push(clone);
        if (!("map" in clone)) throw new Error("Target material has no color-map slot");
        const sourceMap = (clone as THREE.Material & { map: THREE.Texture | null }).map;
        const needsTargetTextureState = sourceMap !== null && (
          sourceMap.flipY !== texture.flipY
          || sourceMap.channel !== texture.channel
          || sourceMap.wrapS !== texture.wrapS
          || sourceMap.wrapT !== texture.wrapT
          || sourceMap.offset.equals(texture.offset) === false
          || sourceMap.repeat.equals(texture.repeat) === false
          || sourceMap.center.equals(texture.center) === false
          || sourceMap.rotation !== texture.rotation
          || sourceMap.matrixAutoUpdate !== texture.matrixAutoUpdate
          || sourceMap.matrix.equals(texture.matrix) === false
          || sourceMap.mapping !== texture.mapping
          || sourceMap.magFilter !== texture.magFilter
          || sourceMap.minFilter !== texture.minFilter
          || sourceMap.generateMipmaps !== texture.generateMipmaps
          || sourceMap.anisotropy !== texture.anisotropy
        );
        const replacementMap = needsTargetTextureState ? texture.clone() : texture;
        if (needsTargetTextureState) {
          replacementMaps.push(replacementMap);
          this.generatedTextures.add(replacementMap);
          const decodedSource = replacementMap.source;
          replacementMap.copy(sourceMap!);
          replacementMap.source = decodedSource;
        }
        replacementMap.colorSpace = THREE.SRGBColorSpace;
        (clone as THREE.Material & { map: THREE.Texture | null }).map = replacementMap;
        clone.needsUpdate = true;
        const simplified = this.simplifyMaterial(clone);
        if (simplified) newSimplified.push([clone, simplified]);
      }
      const nextOriginal: THREE.Material | THREE.Material[] = Array.isArray(previousOriginal) ? clones : clones[0]!;
      this.originals.set(mesh, nextOriginal);
      for (const clone of clones) this.generatedClones.add(clone);
      for (const [source, derivative] of newSimplified) this.simplified.set(source, derivative);
      mesh.material = this.materialFor(nextOriginal, this.currentTier);

      let undone = false;
      return () => {
        if (undone) return;
        undone = true;
        try {
          mesh.material = previousVisible;
        } finally {
          restoreOriginalRegistration();
          releaseGenerated();
        }
      };
    } catch (error) {
      try { mesh.material = previousVisible; } catch {}
      restoreOriginalRegistration();
      releaseGenerated();
      throw error;
    }
  }

  private materialFor(original: THREE.Material | THREE.Material[], tier: QualityTier): THREE.Material | THREE.Material[] {
    if (tier !== "low") return original;
    const list = Array.isArray(original) ? original : [original];
    const mapped = list.map((material) => this.simplified.get(material) ?? material);
    return Array.isArray(original) ? mapped : mapped[0]!;
  }

  public refreshMesh(mesh: THREE.Mesh): void {
    const original = this.originals.get(mesh) ?? mesh.material;
    const list = Array.isArray(original) ? original : [original];
    for (const material of list) {
      const derivative = this.simplified.get(material);
      const standard = material as THREE.MeshPhysicalMaterial;
      if (derivative && standard.isMeshStandardMaterial) {
        derivative.map = standard.map;
        derivative.needsUpdate = true;
      } else if (!derivative) {
        const created = this.simplifyMaterial(material);
        if (created) this.simplified.set(material, created);
      }
    }
    this.originals.set(mesh, original);
    mesh.material = this.materialFor(original, this.currentTier);
  }

  public apply(tier: QualityTier): void {
    this.currentTier = tier;
    for (const [light, originalMask] of this.ambientPoints) light.layers.mask = tier === "low" ? 0 : originalMask;
    for (const [mesh, original] of this.originals) mesh.material = this.materialFor(original, tier);
  }

  public dispose(): void {
    this.apply("high");
    for (const material of this.generatedSimplified) material.dispose();
    for (const material of this.generatedClones) material.dispose();
    for (const texture of this.generatedTextures) texture.dispose();
    this.generatedSimplified.clear();
    this.generatedClones.clear();
    this.generatedTextures.clear();
    this.simplified.clear();
    this.originals.clear();
    this.ambientPoints.clear();
  }
}

/** Installs one optional image only on its named scene targets, rolling back the whole operation on failure. */
export function installOptionalTextureOnScene(
  id: "deskmat" | "wallpaper",
  scene: THREE.Object3D,
  texture: THREE.Texture,
  quality: RuntimeMaterialQuality
): string[] | null {
  const targetPattern = id === "deskmat"
    ? /(desk[_\s-]?mat|topography)/i
    : /(monitor[_\s-]?screen[_\s-]?center|wallpaper)/i;
  const targets: THREE.Mesh[] = [];
  scene.traverse((node) => {
    if ((node as THREE.Mesh).isMesh && targetPattern.test(node.name)) targets.push(node as THREE.Mesh);
  });
  if (targets.length === 0) return null;

  const undo: Array<() => void> = [];
  try {
    texture.colorSpace = THREE.SRGBColorSpace;
    for (const target of targets) {
      if (!isLateMaterialTargetName(target.name)) throw new Error("Optional texture target is not excluded from static batching");
      undo.push(quality.installColorMap(target, texture));
    }
    return targets.map((target) => target.name);
  } catch (error) {
    for (const rollback of undo.reverse()) {
      try { rollback(); } catch {}
    }
    throw error;
  }
}
