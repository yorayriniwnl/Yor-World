import * as THREE from "three";
import type { QualityTier } from "../../contracts/experience";

/** Reserved for source meshes, which remain the interaction and diagnostics geometry. */
export const STATIC_BATCH_ORIGINAL_LAYER = 1;
/** @deprecated Use STATIC_BATCH_ORIGINAL_LAYER. */
export const LOW_BATCH_ORIGINAL_LAYER = STATIC_BATCH_ORIGINAL_LAYER;

const dynamicNames = /^(resident|chair-root|chair-base|body-turn|door-hinge|painting-pivot|blind_slat_\d+|hidden-yor-mark)$/;
const epsilon = 1e-6;

interface BatchEntry {
  batch: THREE.BatchedMesh;
  sourceMaterial: THREE.Material;
  parameterized: boolean;
  tierMaterials: Map<QualityTier, THREE.Material>;
  originals: Array<{
    mesh: THREE.Mesh;
    layerMask: number;
    instanceId: number;
    dynamic: boolean;
    inBatch: boolean;
  }>;
}

export interface StaticSceneBatchDiagnostics {
  totalMeshes: number;
  eligibleMeshes: number;
  layoutRejectedMeshes: number;
  batchedMeshes: number;
  dynamicMeshes: number;
  dynamicBatchedMeshes: number;
  batchCount: number;
  singletonGroups: number;
  singletonMeshes: number;
  rejectedByReason: Record<string, number>;
  excludedMeshes: Array<{
    index: number;
    path: string;
    material: string;
    reason: string;
  }>;
}

function positiveOrthogonalTransform(matrix: THREE.Matrix4): boolean {
  const elements = matrix.elements;
  if (!elements.every(Number.isFinite) || matrix.determinant() <= 0) return false;
  if (Math.abs(elements[3]!) > epsilon || Math.abs(elements[7]!) > epsilon
    || Math.abs(elements[11]!) > epsilon || Math.abs(elements[15]! - 1) > epsilon) return false;
  const axes = [0, 1, 2].map((index) => new THREE.Vector3().setFromMatrixColumn(matrix, index));
  if (axes.some((axis) => axis.lengthSq() <= epsilon * epsilon)) return false;
  axes.forEach((axis) => axis.normalize());
  return Math.abs(axes[0]!.dot(axes[1]!)) <= epsilon
    && Math.abs(axes[0]!.dot(axes[2]!)) <= epsilon
    && Math.abs(axes[1]!.dot(axes[2]!)) <= epsilon;
}

function animatedNodes(scene: THREE.Object3D): Set<THREE.Object3D> {
  const targets = new Set<THREE.Object3D>();
  scene.traverse((root) => {
    for (const clip of root.animations) {
      for (const track of clip.tracks) {
        try {
          const parsed = THREE.PropertyBinding.parseTrackName(track.name);
          const target = THREE.PropertyBinding.findNode(root, parsed.nodeName);
          if (target instanceof THREE.Object3D) targets.add(target);
          // An unresolved/malformed animation can still affect this subtree.
          else targets.add(root);
        } catch {
          targets.add(root);
        }
      }
    }
  });
  return targets;
}

function attributeLayout(geometry: THREE.BufferGeometry): string | null {
  const position = geometry.getAttribute("position");
  if (!position || position.itemSize !== 3 || position.count === 0
    || (geometry as THREE.InstancedBufferGeometry).isInstancedBufferGeometry) return null;
  const layout: unknown[] = [];
  for (const name of Object.keys(geometry.attributes).sort()) {
    const attribute = geometry.getAttribute(name);
    // BatchedMesh copies CPU buffers, and cannot preserve GPU-only or half-float attributes.
    if (!attribute.array || attribute.count !== position.count
      || attribute instanceof THREE.Float16BufferAttribute
      || (attribute as THREE.InstancedBufferAttribute).isInstancedBufferAttribute) return null;
    const interleaved = attribute as THREE.InterleavedBufferAttribute;
    const ordinary = attribute as THREE.BufferAttribute;
    if (interleaved.isInterleavedBufferAttribute) {
      if (interleaved.data.usage !== THREE.StaticDrawUsage) return null;
      layout.push([name, attribute.itemSize, attribute.normalized, attribute.array.constructor.name,
        interleaved.data.stride, interleaved.offset]);
    } else {
      if (ordinary.usage !== THREE.StaticDrawUsage || ordinary.gpuType !== THREE.FloatType) return null;
      layout.push([name, attribute.itemSize, attribute.normalized, attribute.array.constructor.name, ordinary.gpuType]);
    }
  }
  const index = geometry.getIndex();
  if (index && (index.count === 0 || index.itemSize !== 1 || index.normalized || index.usage !== THREE.StaticDrawUsage)) return null;
  layout.push(index ? ["index", index.array.constructor.name] : ["non-indexed"]);
  return JSON.stringify(layout);
}

function dynamicReason(mesh: THREE.Mesh, animationTargets: Set<THREE.Object3D>): string | null {
  for (let node: THREE.Object3D | null = mesh; node; node = node.parent) {
    if (dynamicNames.test(node.name)) return `named:${node.name}`;
    if (animationTargets.has(node)) return `animated:${node.name || node.type}`;
  }
  return null;
}

function exclusionReason(mesh: THREE.Mesh): string | null {
  if (mesh.constructor !== THREE.Mesh) return "mesh-subclass";
  for (let node: THREE.Object3D | null = mesh; node; node = node.parent) {
    if (!node.visible) return "hidden-ancestor";
  }
  if (Array.isArray(mesh.material)) return "material-array";
  if (Object.keys(mesh.geometry.morphAttributes).length > 0 || mesh.morphTargetInfluences) return "morph-targets";
  if (mesh.customDepthMaterial || mesh.customDistanceMaterial) return "custom-shadow-material";
  if (mesh.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender
    || mesh.onAfterRender !== THREE.Object3D.prototype.onAfterRender
    || mesh.onBeforeShadow !== THREE.Object3D.prototype.onBeforeShadow
    || mesh.onAfterShadow !== THREE.Object3D.prototype.onAfterShadow) return "mesh-render-hook";
  if (!(mesh.layers.mask & 1)) return "not-on-camera-layer";
  const material = mesh.material;
  const transmitting = material as THREE.MeshPhysicalMaterial;
  if (!material.visible) return "material-invisible";
  if (material.transparent || material.opacity !== 1 || material.blending !== THREE.NormalBlending) return "material-transparent-or-blended";
  if (material.alphaTest !== 0 || material.alphaHash || material.alphaToCoverage) return "material-alpha-coverage";
  if (material.stencilWrite) return "material-stencil";
  if (transmitting.transmission > 0) return "material-transmission";
  if ((material as THREE.MeshLambertMaterial).wireframe) return "material-wireframe";
  if (material.onBeforeRender !== THREE.Material.prototype.onBeforeRender) return "material-render-hook";
  if (material.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile
    || material.customProgramCacheKey !== THREE.Material.prototype.customProgramCacheKey) return "material-custom-shader-hook";
  if ((material as THREE.ShaderMaterial).isShaderMaterial) return "shader-material";
  const count = mesh.geometry.index?.count ?? mesh.geometry.getAttribute("position")?.count;
  if (!count || mesh.geometry.drawRange.start !== 0
    || (mesh.geometry.drawRange.count !== Infinity && mesh.geometry.drawRange.count !== count)) return "partial-geometry-range";
  for (let node: THREE.Object3D | null = mesh; node; node = node.parent) {
    if (node.renderOrder !== 0) return "nondefault-render-order";
    if (node.scale.x <= 0 || node.scale.y <= 0 || node.scale.z <= 0) return "nonpositive-scale";
    if (!positiveOrthogonalTransform(node.matrixWorld)) return "unsupported-world-transform";
  }
  return null;
}

function objectPath(object: THREE.Object3D): string {
  const names: string[] = [];
  for (let node: THREE.Object3D | null = object; node; node = node.parent) {
    names.push(node.name || node.type);
  }
  return names.reverse().join("/");
}

function materialName(mesh: THREE.Mesh): string {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  return materials.map((material) => material.name || material.type).join(",");
}

function effectivelyVisible(object: THREE.Object3D, root: THREE.Object3D): boolean {
  for (let node: THREE.Object3D | null = object; node; node = node.parent) {
    if (!node.visible) return false;
    if (node === root) return true;
  }
  return false;
}

const SURFACE_COLOR_ATTRIBUTE = "yorSurfaceColor";
const SURFACE_EMISSIVE_ATTRIBUTE = "yorSurfaceEmissive";
const SURFACE_FACTORS_ATTRIBUTE = "yorSurfaceFactors";

interface SurfaceValues {
  color: [number, number, number];
  emissive: [number, number, number];
  factors: [number, number, number];
}

function surfaceValues(material: THREE.Material): SurfaceValues | null {
  const standard = material as THREE.MeshStandardMaterial;
  if (!standard.isMeshStandardMaterial) return null;
  return {
    color: [standard.color.r, standard.color.g, standard.color.b],
    emissive: [standard.emissive.r, standard.emissive.g, standard.emissive.b],
    factors: [standard.roughness, standard.metalness, standard.emissiveIntensity],
  };
}

function compatibleMaterialKey(material: THREE.Material, identity: number): string {
  const values = surfaceValues(material);
  if (!values) return `identity:${identity}`;

  const serialized = material.toJSON() as unknown as Record<string, unknown>;
  for (const key of ["metadata", "uuid", "id", "name", "color", "emissive", "emissiveIntensity", "roughness", "metalness"]) {
    delete serialized[key];
  }
  return `surface:${JSON.stringify(serialized)}`;
}

function repeatedSurfaceAttribute(count: number, values: readonly number[]): THREE.Float32BufferAttribute {
  const itemSize = values.length;
  const buffer = new Float32Array(count * itemSize);
  for (let vertex = 0; vertex < count; vertex += 1) {
    buffer.set(values, vertex * itemSize);
  }
  return new THREE.Float32BufferAttribute(buffer, itemSize);
}

function geometryWithSurfaceValues(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.BufferGeometry {
  const values = surfaceValues(material);
  if (!values) return geometry;
  const result = geometry.clone();
  const count = geometry.getAttribute("position").count;
  result.setAttribute(SURFACE_COLOR_ATTRIBUTE, repeatedSurfaceAttribute(count, values.color));
  result.setAttribute(SURFACE_EMISSIVE_ATTRIBUTE, repeatedSurfaceAttribute(count, values.emissive));
  result.setAttribute(SURFACE_FACTORS_ATTRIBUTE, repeatedSurfaceAttribute(count, values.factors));
  return result;
}

function requiredShaderReplacement(source: string, include: string, replacement: string): string {
  if (!source.includes(include)) throw new Error(`Surface batch shader is missing ${include}`);
  return source.replace(include, replacement);
}

function materialWithSurfaceAttributes(source: THREE.Material): THREE.Material {
  const material = source.clone();
  const lambert = material as THREE.MeshLambertMaterial;
  lambert.color?.set(0xffffff);
  lambert.emissive?.set(0xffffff);
  if ("emissiveIntensity" in lambert) lambert.emissiveIntensity = 1;

  const standard = material as THREE.MeshStandardMaterial;
  const hasPbrFactors = standard.isMeshStandardMaterial;
  if (hasPbrFactors) {
    standard.roughness = 1;
    standard.metalness = 1;
  }

  const originalCompile = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    originalCompile.call(material, shader, renderer);
    shader.vertexShader = requiredShaderReplacement(
      shader.vertexShader,
      "#include <common>",
      `#include <common>\nattribute vec3 ${SURFACE_COLOR_ATTRIBUTE};\nattribute vec3 ${SURFACE_EMISSIVE_ATTRIBUTE};\nattribute vec3 ${SURFACE_FACTORS_ATTRIBUTE};\nvarying vec3 vYorSurfaceColor;\nvarying vec3 vYorSurfaceEmissive;\nvarying vec3 vYorSurfaceFactors;`,
    );
    shader.vertexShader = requiredShaderReplacement(
      shader.vertexShader,
      "#include <begin_vertex>",
      `#include <begin_vertex>\nvYorSurfaceColor = ${SURFACE_COLOR_ATTRIBUTE};\nvYorSurfaceEmissive = ${SURFACE_EMISSIVE_ATTRIBUTE};\nvYorSurfaceFactors = ${SURFACE_FACTORS_ATTRIBUTE};`,
    );
    shader.fragmentShader = requiredShaderReplacement(
      shader.fragmentShader,
      "#include <common>",
      "#include <common>\nvarying vec3 vYorSurfaceColor;\nvarying vec3 vYorSurfaceEmissive;\nvarying vec3 vYorSurfaceFactors;",
    );
    shader.fragmentShader = requiredShaderReplacement(
      shader.fragmentShader,
      "#include <color_fragment>",
      "#include <color_fragment>\ndiffuseColor.rgb *= vYorSurfaceColor;",
    );
    shader.fragmentShader = requiredShaderReplacement(
      shader.fragmentShader,
      "#include <emissivemap_fragment>",
      "#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vYorSurfaceEmissive * vYorSurfaceFactors.z;",
    );
    if (hasPbrFactors) {
      shader.fragmentShader = requiredShaderReplacement(
        shader.fragmentShader,
        "#include <roughnessmap_fragment>",
        "#include <roughnessmap_fragment>\nroughnessFactor *= vYorSurfaceFactors.x;",
      );
      shader.fragmentShader = requiredShaderReplacement(
        shader.fragmentShader,
        "#include <metalnessmap_fragment>",
        "#include <metalnessmap_fragment>\nmetalnessFactor *= vYorSurfaceFactors.y;",
      );
    }
  };
  material.needsUpdate = true;
  return material;
}

/** Reversible static and transform-synchronized draw batching. Construct before
 * quality materials are applied and only when the renderer reports
 * WEBGL_multi_draw. Source meshes keep identity, buffers, hierarchy, transforms,
 * and raycast behavior; dynamic transforms are copied into per-object instances.
 */
export class StaticSceneBatch {
  private readonly entries: BatchEntry[] = [];
  private disposed = false;
  private totalMeshes = 0;
  private eligibleMeshes = 0;
  private layoutRejectedMeshes = 0;
  private batchedMeshes = 0;
  private dynamicMeshes = 0;
  private dynamicBatchedMeshes = 0;
  private singletonGroups = 0;
  private singletonMeshes = 0;
  private rendering = false;
  private readonly localMatrix = new THREE.Matrix4();
  private readonly existingMatrix = new THREE.Matrix4();
  private readonly excludedMeshes: StaticSceneBatchDiagnostics["excludedMeshes"] = [];

  constructor(
    private readonly scene: THREE.Object3D,
    private readonly materialForTier: (material: THREE.Material, tier: QualityTier) => THREE.Material = (material) => material,
  ) {
    scene.updateWorldMatrix(true, true);
    const animationTargets = animatedNodes(scene);
    const batchGroups = new Map<string, {
      sourceMaterial: THREE.Material;
      materials: Set<THREE.Material>;
      meshes: THREE.Mesh[];
    }>();
    const materialIdentities = new WeakMap<THREE.Material, number>();
    let nextMaterialIdentity = 0;
    const meshIndices = new Map<THREE.Mesh, number>();
    const dynamicByMesh = new Map<THREE.Mesh, boolean>();
    const recordExclusion = (mesh: THREE.Mesh, reason: string) => {
      this.excludedMeshes.push({
        index: meshIndices.get(mesh) ?? -1,
        path: objectPath(mesh),
        material: materialName(mesh),
        reason,
      });
    };
    scene.traverse((object) => {
      if (!(object as THREE.Mesh).isMesh) return;
      const mesh = object as THREE.Mesh;
      meshIndices.set(mesh, this.totalMeshes);
      this.totalMeshes += 1;
      const material = mesh.material;
      if (Array.isArray(material)) {
        recordExclusion(mesh, "material-array");
        return;
      }
      const reason = exclusionReason(mesh);
      if (reason) {
        recordExclusion(mesh, reason);
        return;
      }
      this.eligibleMeshes += 1;
      const dynamic = dynamicReason(mesh, animationTargets) !== null;
      dynamicByMesh.set(mesh, dynamic);
      if (dynamic) this.dynamicMeshes += 1;
      const layout = attributeLayout(mesh.geometry);
      if (!layout) {
        this.layoutRejectedMeshes += 1;
        recordExclusion(mesh, "unsupported-attribute-layout");
        return;
      }
      let identity = materialIdentities.get(material);
      if (identity === undefined) {
        identity = nextMaterialIdentity++;
        materialIdentities.set(material, identity);
      }
      const materialKey = compatibleMaterialKey(material, identity);
      const key = JSON.stringify([materialKey, layout, mesh.castShadow, mesh.receiveShadow, mesh.frustumCulled, mesh.layers.mask]);
      let group = batchGroups.get(key);
      if (!group) {
        group = { sourceMaterial: material, materials: new Set(), meshes: [] };
        batchGroups.set(key, group);
      }
      group.materials.add(material);
      group.meshes.push(mesh);
    });

    const inverseWorld = scene.matrixWorld.clone().invert();
    for (const { sourceMaterial, materials, meshes } of batchGroups.values()) {
      if (meshes.length < 2) {
        this.singletonGroups += 1;
        this.singletonMeshes += meshes.length;
        for (const mesh of meshes) recordExclusion(mesh, "singleton-compatible-group");
        continue;
      }

      this.batchedMeshes += meshes.length;
      const dynamicCount = meshes.filter((mesh) => dynamicByMesh.get(mesh)).length;
      this.dynamicBatchedMeshes += dynamicCount;
      const parameterized = materials.size > 1;
      const geometryForMesh = new Map<THREE.Mesh, THREE.BufferGeometry>();
      const ownedGeometries = new Set<THREE.BufferGeometry>();
      const geometryCache = new Map<string, THREE.BufferGeometry>();
      for (const mesh of meshes) {
        if (!parameterized) {
          geometryForMesh.set(mesh, mesh.geometry);
          continue;
        }
        const materialValues = surfaceValues(mesh.material as THREE.Material)!;
        const geometryKey = JSON.stringify([mesh.geometry.uuid, materialValues]);
        let geometry = geometryCache.get(geometryKey);
        if (!geometry) {
          geometry = geometryWithSurfaceValues(mesh.geometry, mesh.material as THREE.Material);
          geometryCache.set(geometryKey, geometry);
          ownedGeometries.add(geometry);
        }
        geometryForMesh.set(mesh, geometry);
      }
      const geometries = [...new Set(geometryForMesh.values())];
      const vertices = geometries.reduce((total, geometry) => total + geometry.getAttribute("position").count, 0);
      const indices = geometries.reduce((total, geometry) => total + (geometry.index?.count ?? 0), 0);
      const batch = new THREE.BatchedMesh(meshes.length, vertices, indices, sourceMaterial);
      batch.name = "world-static-geometry-batch";
      batch.castShadow = meshes[0]!.castShadow;
      batch.receiveShadow = meshes[0]!.receiveShadow;
      batch.frustumCulled = meshes[0]!.frustumCulled && dynamicCount === 0;
      batch.perObjectFrustumCulled = meshes[0]!.frustumCulled;
      batch.layers.mask = meshes[0]!.layers.mask & ~(1 << STATIC_BATCH_ORIGINAL_LAYER);
      batch.visible = false;
      batch.raycast = () => {};
      const geometryIds = new Map<THREE.BufferGeometry, number>();
      for (const geometry of geometries) geometryIds.set(geometry, batch.addGeometry(geometry));
      for (const geometry of ownedGeometries) geometry.dispose();
      const originals: BatchEntry["originals"] = [];
      for (const mesh of meshes) {
        const instance = batch.addInstance(geometryIds.get(geometryForMesh.get(mesh)!)!);
        batch.setMatrixAt(instance, new THREE.Matrix4().multiplyMatrices(inverseWorld, mesh.matrixWorld));
        originals.push({
          mesh,
          layerMask: mesh.layers.mask,
          instanceId: instance,
          dynamic: dynamicByMesh.get(mesh) ?? false,
          inBatch: true,
        });
      }
      batch.computeBoundingBox();
      batch.computeBoundingSphere();
      scene.add(batch);
      batch.updateWorldMatrix(true, false);
      this.entries.push({
        batch,
        sourceMaterial,
        parameterized,
        tierMaterials: new Map(),
        originals,
      });
    }
  }

  public apply(tier: QualityTier): void {
    if (this.disposed) return;
    const renderBatches = tier !== "static";
    this.rendering = renderBatches;
    for (const { batch, sourceMaterial, parameterized, tierMaterials, originals } of this.entries) {
      batch.visible = renderBatches;
      if (parameterized) {
        let material = tierMaterials.get(tier);
        if (!material) {
          material = materialWithSurfaceAttributes(this.materialForTier(sourceMaterial, tier));
          tierMaterials.set(tier, material);
        }
        batch.material = material;
      } else {
        batch.material = this.materialForTier(sourceMaterial, tier);
      }
      for (const { mesh, layerMask, inBatch } of originals) {
        mesh.layers.mask = renderBatches
          ? inBatch ? (layerMask & ~(1 << 0)) | (1 << STATIC_BATCH_ORIGINAL_LAYER) : layerMask | (1 << STATIC_BATCH_ORIGINAL_LAYER)
          : layerMask;
      }
    }
    if (renderBatches) this.syncDynamicInstances();
  }

  /** Synchronize transform-animated source meshes before each renderer pass. */
  public syncDynamicInstances(): void {
    if (this.disposed || !this.rendering) return;
    this.scene.updateWorldMatrix(true, true);
    const inverseWorld = this.scene.matrixWorld.clone().invert();
    for (const { batch, originals } of this.entries) {
      for (const source of originals) {
        if (!source.dynamic) continue;
        const { mesh, instanceId, layerMask } = source;
        if (!positiveOrthogonalTransform(mesh.matrixWorld)) {
          if (source.inBatch) {
            batch.setVisibleAt(instanceId, false);
            mesh.layers.mask = layerMask | (1 << STATIC_BATCH_ORIGINAL_LAYER);
            source.inBatch = false;
          }
          continue;
        }
        if (!source.inBatch) {
          mesh.layers.mask = (layerMask & ~(1 << 0)) | (1 << STATIC_BATCH_ORIGINAL_LAYER);
          source.inBatch = true;
        }
        this.localMatrix.multiplyMatrices(inverseWorld, mesh.matrixWorld);
        batch.getMatrixAt(instanceId, this.existingMatrix);
        if (!this.localMatrix.equals(this.existingMatrix)) batch.setMatrixAt(instanceId, this.localMatrix);
        const visible = effectivelyVisible(mesh, this.scene);
        if (batch.getVisibleAt(instanceId) !== visible) batch.setVisibleAt(instanceId, visible);
      }
    }
  }

  public getDiagnostics(): StaticSceneBatchDiagnostics {
    const rejectedByReason = new Map<string, number>();
    for (const mesh of this.excludedMeshes) {
      rejectedByReason.set(mesh.reason, (rejectedByReason.get(mesh.reason) ?? 0) + 1);
    }
    return {
      totalMeshes: this.totalMeshes,
      eligibleMeshes: this.eligibleMeshes,
      layoutRejectedMeshes: this.layoutRejectedMeshes,
      batchedMeshes: this.batchedMeshes,
      dynamicMeshes: this.dynamicMeshes,
      dynamicBatchedMeshes: this.dynamicBatchedMeshes,
      batchCount: this.entries.length,
      singletonGroups: this.singletonGroups,
      singletonMeshes: this.singletonMeshes,
      rejectedByReason: Object.fromEntries([...rejectedByReason.entries()].sort(([a], [b]) => a.localeCompare(b))),
      excludedMeshes: [...this.excludedMeshes].sort((a, b) => a.index - b.index),
    };
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const { batch, originals, tierMaterials } of this.entries) {
      batch.visible = false;
      for (const { mesh, layerMask } of originals) mesh.layers.mask = layerMask;
      batch.removeFromParent();
      batch.dispose();
      for (const material of tierMaterials.values()) material.dispose();
      tierMaterials.clear();
    }
    this.entries.length = 0;
  }
}

/** Backward-compatible name for callers that used the LOW-only implementation. */
export { StaticSceneBatch as LowQualityBatch };
