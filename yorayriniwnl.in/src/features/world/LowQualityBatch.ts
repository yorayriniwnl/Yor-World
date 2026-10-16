import * as THREE from "three";
import type { QualityTier } from "../../contracts/experience";

/** Reserved for the original meshes, which remain the interaction geometry. */
export const LOW_BATCH_ORIGINAL_LAYER = 1;

const dynamicNames = /^(resident|chair-root|chair-base|body-turn|door-hinge|painting-pivot|blind_slat_\d+|hidden-yor-mark)$/;
const epsilon = 1e-6;

interface BatchEntry {
  batch: THREE.BatchedMesh;
  originals: Array<{ mesh: THREE.Mesh; layerMask: number }>;
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

function eligible(mesh: THREE.Mesh, animationTargets: Set<THREE.Object3D>): boolean {
  if (mesh.constructor !== THREE.Mesh || Array.isArray(mesh.material)
    || Object.keys(mesh.geometry.morphAttributes).length > 0 || mesh.morphTargetInfluences
    || mesh.geometry.groups.length > 0 || mesh.customDepthMaterial || mesh.customDistanceMaterial
    || mesh.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender
    || mesh.onAfterRender !== THREE.Object3D.prototype.onAfterRender
    || mesh.onBeforeShadow !== THREE.Object3D.prototype.onBeforeShadow
    || mesh.onAfterShadow !== THREE.Object3D.prototype.onAfterShadow
    || mesh.raycast !== THREE.Mesh.prototype.raycast || !(mesh.layers.mask & 1)) return false;
  const material = mesh.material;
  const transmitting = material as THREE.MeshPhysicalMaterial;
  if (!material.visible || material.transparent || material.opacity !== 1 || material.alphaTest !== 0
    || material.alphaHash || material.alphaToCoverage || material.stencilWrite || transmitting.transmission > 0
    || (material as THREE.MeshLambertMaterial).wireframe
    || material.blending !== THREE.NormalBlending || material.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile
    || material.onBeforeRender !== THREE.Material.prototype.onBeforeRender
    || material.customProgramCacheKey !== THREE.Material.prototype.customProgramCacheKey
    || (material as THREE.ShaderMaterial).isShaderMaterial) return false;
  const count = mesh.geometry.index?.count ?? mesh.geometry.getAttribute("position")?.count;
  if (!count || mesh.geometry.drawRange.start !== 0
    || (mesh.geometry.drawRange.count !== Infinity && mesh.geometry.drawRange.count !== count)) return false;
  for (let node: THREE.Object3D | null = mesh; node; node = node.parent) {
    if (!node.visible || node.renderOrder !== 0 || dynamicNames.test(node.name) || animationTargets.has(node)
      || node.scale.x <= 0 || node.scale.y <= 0 || node.scale.z <= 0
      || !positiveOrthogonalTransform(node.matrixWorld)) return false;
  }
  return true;
}

/** LOW-only draw batching. Construct after LOW materials are installed, and only
 * when the renderer reports WEBGL_multi_draw. Original mesh identity, buffers,
 * materials, hierarchy and transforms remain owned by the original world.
 */
export class LowQualityBatch {
  private readonly entries: BatchEntry[] = [];
  private disposed = false;

  constructor(private readonly scene: THREE.Object3D) {
    scene.updateWorldMatrix(true, true);
    const animationTargets = animatedNodes(scene);
    const byMaterial = new Map<THREE.Material, Map<string, THREE.Mesh[]>>();
    scene.traverse((object) => {
      if (!(object as THREE.Mesh).isMesh) return;
      const mesh = object as THREE.Mesh;
      if (!eligible(mesh, animationTargets) || Array.isArray(mesh.material)) return;
      const layout = attributeLayout(mesh.geometry);
      if (!layout) return;
      const key = JSON.stringify([layout, mesh.castShadow, mesh.receiveShadow, mesh.frustumCulled, mesh.layers.mask]);
      let groups = byMaterial.get(mesh.material);
      if (!groups) byMaterial.set(mesh.material, groups = new Map());
      let group = groups.get(key);
      if (!group) groups.set(key, group = []);
      group.push(mesh);
    });

    const inverseWorld = scene.matrixWorld.clone().invert();
    for (const [material, groups] of byMaterial) {
      for (const meshes of groups.values()) {
        if (meshes.length < 2) continue;
        const geometries = [...new Set(meshes.map((mesh) => mesh.geometry))];
        const vertices = geometries.reduce((total, geometry) => total + geometry.getAttribute("position").count, 0);
        const indices = geometries.reduce((total, geometry) => total + (geometry.index?.count ?? 0), 0);
        const batch = new THREE.BatchedMesh(meshes.length, vertices, indices, material);
        batch.name = "low-quality-static-batch";
        batch.castShadow = meshes[0]!.castShadow;
        batch.receiveShadow = meshes[0]!.receiveShadow;
        batch.frustumCulled = meshes[0]!.frustumCulled;
        batch.perObjectFrustumCulled = batch.frustumCulled;
        batch.layers.mask = meshes[0]!.layers.mask & ~(1 << LOW_BATCH_ORIGINAL_LAYER);
        batch.visible = false;
        batch.raycast = () => {};
        const geometryIds = new Map<THREE.BufferGeometry, number>();
        for (const geometry of geometries) geometryIds.set(geometry, batch.addGeometry(geometry));
        for (const mesh of meshes) {
          const instance = batch.addInstance(geometryIds.get(mesh.geometry)!);
          batch.setMatrixAt(instance, new THREE.Matrix4().multiplyMatrices(inverseWorld, mesh.matrixWorld));
        }
        batch.computeBoundingBox();
        batch.computeBoundingSphere();
        scene.add(batch);
        batch.updateWorldMatrix(true, false);
        this.entries.push({ batch, originals: meshes.map((mesh) => ({ mesh, layerMask: mesh.layers.mask })) });
      }
    }
  }

  public apply(tier: QualityTier): void {
    if (this.disposed) return;
    const low = tier === "low";
    for (const { batch, originals } of this.entries) {
      batch.visible = low;
      for (const { mesh, layerMask } of originals) {
        mesh.layers.mask = low ? 1 << LOW_BATCH_ORIGINAL_LAYER : layerMask;
      }
    }
  }

  public dispose(): void {
    if (this.disposed) return;
    this.apply("high");
    this.disposed = true;
    for (const { batch } of this.entries) {
      batch.removeFromParent();
      batch.dispose();
    }
    this.entries.length = 0;
  }
}
