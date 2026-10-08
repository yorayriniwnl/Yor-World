import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { animatedNodes, attributeLayout, eligible, LOW_BATCH_ORIGINAL_LAYER } from "./LowQualityBatch";

interface Original {
  mesh: THREE.Mesh;
  layerMask: number;
  geometry: THREE.BufferGeometry;
  layout: string;
  instance: number;
  batched: boolean;
  versions: string;
  attributes: Array<THREE.BufferAttribute | THREE.InterleavedBufferAttribute | null>;
  parent: THREE.Object3D | null;
}
interface Entry { batch: THREE.BatchedMesh; originals: Original[] }
interface MergedOriginal extends Original {
  working: THREE.BufferGeometry;
  matrix: THREE.Matrix4;
  vertexStart: number;
  indexStart: number;
  indexCount: number;
  sphere: THREE.Sphere;
}
interface MergedEntry { batch: THREE.Mesh; originals: MergedOriginal[]; indices: number[]; visibleKey: string }

function attributeReferences(geometry: THREE.BufferGeometry): Original["attributes"] {
  return [geometry.index, ...Object.keys(geometry.attributes).sort().map((name) => geometry.getAttribute(name))];
}
function sameAttributes(entry: Original): boolean {
  const current = attributeReferences(entry.mesh.geometry);
  return current.length === entry.attributes.length && current.every((attribute, index) => attribute === entry.attributes[index]);
}

function bufferVersions(geometry: THREE.BufferGeometry): string {
  return JSON.stringify([geometry.index?.version, ...Object.values(geometry.attributes).map((attribute) =>
    (attribute as THREE.InterleavedBufferAttribute).isInterleavedBufferAttribute
      ? (attribute as THREE.InterleavedBufferAttribute).data.version : (attribute as THREE.BufferAttribute).version)]);
}

/** Opaque rigid geometry only. Source meshes retain their hierarchy, material,
 * visibility and real raycasts. Updating before the render also updates shadows
 * and transmission. Unsupported live changes return to native rendering.
 */
export class RigidWorldBatch {
  private readonly entries: Entry[] = [];
  private readonly mergedEntries: MergedEntry[] = [];
  private readonly unsafeAnimationTargets: Set<THREE.Object3D>;
  private disposed = false;

  constructor(private readonly scene: THREE.Object3D, multiDrawSupported: boolean, private readonly camera?: THREE.Camera) {
    this.unsafeAnimationTargets = animatedNodes(scene, true);
    // Without multi-draw, use actual merged draw buffers rather than Three's
    // per-instance fallback. Camera culling keeps the same per-object visibility.
    if (!multiDrawSupported && !camera) return;
    scene.updateWorldMatrix(true, true);
    const groups = new Map<THREE.Material, Map<string, THREE.Mesh[]>>();
    scene.traverse((object) => {
      if (!(object as THREE.Mesh).isMesh) return;
      const mesh = object as THREE.Mesh;
      if (!eligible(mesh, this.unsafeAnimationTargets, true) || Array.isArray(mesh.material)) return;
      const layout = attributeLayout(mesh.geometry);
      if (!layout) return;
      const key = JSON.stringify([layout, mesh.castShadow, mesh.receiveShadow, mesh.frustumCulled, mesh.layers.mask]);
      let materialGroups = groups.get(mesh.material);
      if (!materialGroups) groups.set(mesh.material, materialGroups = new Map());
      let group = materialGroups.get(key);
      if (!group) materialGroups.set(key, group = []);
      group.push(mesh);
    });
    for (const [material, materialGroups] of groups) for (const meshes of materialGroups.values()) {
      if (meshes.length < 2) continue;
      if (!multiDrawSupported) {
        this.createMerged(material, meshes);
        continue;
      }
      const geometries = [...new Set(meshes.map((mesh) => mesh.geometry))];
      const batch = new THREE.BatchedMesh(meshes.length,
        geometries.reduce((sum, geometry) => sum + geometry.getAttribute("position").count, 0),
        geometries.reduce((sum, geometry) => sum + (geometry.index?.count ?? 0), 0), material);
      batch.name = "rigid-world-opaque-batch";
      batch.castShadow = meshes[0]!.castShadow;
      batch.receiveShadow = meshes[0]!.receiveShadow;
      // Whole-batch bounds must not become stale after a rigid target moves.
      // Each live instance is still independently frustum culled by Three.
      batch.frustumCulled = false;
      batch.perObjectFrustumCulled = meshes[0]!.frustumCulled;
      batch.layers.mask = meshes[0]!.layers.mask & ~(1 << LOW_BATCH_ORIGINAL_LAYER);
      batch.raycast = () => {};
      const ids = new Map(geometries.map((geometry) => [geometry, batch.addGeometry(geometry)]));
      const originals = meshes.map((mesh) => ({ mesh, layerMask: mesh.layers.mask, geometry: mesh.geometry,
        layout: attributeLayout(mesh.geometry)!, instance: batch.addInstance(ids.get(mesh.geometry)!),
        batched: false, versions: bufferVersions(mesh.geometry), attributes: attributeReferences(mesh.geometry), parent: mesh.parent }));
      scene.add(batch);
      this.entries.push({ batch, originals });
    }
    this.update();
  }

  private createMerged(material: THREE.Material, meshes: THREE.Mesh[]): void {
    const inverse = this.scene.matrixWorld.clone().invert();
    let vertexStart = 0;
    let indexStart = 0;
    const originals: MergedOriginal[] = meshes.map((mesh) => {
      const working = mesh.geometry.clone();
      // Merge utilities do not support interleaved attributes. Leave that
      // optional layout on its native path; the frozen GLBs use ordinary ones.
      const matrix = new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld);
      if (!working.boundingSphere) working.computeBoundingSphere();
      const sphere = working.boundingSphere!.clone();
      working.applyMatrix4(matrix);
      const result: MergedOriginal = { mesh, layerMask: mesh.layers.mask, geometry: mesh.geometry,
        layout: attributeLayout(mesh.geometry)!, instance: 0, batched: false,
        versions: bufferVersions(mesh.geometry), attributes: attributeReferences(mesh.geometry), parent: mesh.parent,
        working, matrix, vertexStart, indexStart,
        indexCount: mesh.geometry.index?.count ?? mesh.geometry.getAttribute("position").count, sphere };
      vertexStart += mesh.geometry.getAttribute("position").count;
      indexStart += result.indexCount;
      return result;
    });
    if (originals.some(({ working }) => Object.values(working.attributes).some((attribute) => (attribute as THREE.InterleavedBufferAttribute).isInterleavedBufferAttribute))) {
      originals.forEach(({ working }) => working.dispose());
      return;
    }
    const geometry = mergeGeometries(originals.map(({ working }) => working), false);
    if (!geometry) { originals.forEach(({ working }) => working.dispose()); return; }
    // Keep one index buffer and move only the selected original ranges into its
    // active prefix. This is one real WebGL draw, including without multi-draw.
    if (!geometry.index) geometry.setIndex(Array.from({ length: vertexStart }, (_, index) => index));
    const batch = new THREE.Mesh(geometry, material);
    batch.name = "rigid-world-merged-batch";
    batch.castShadow = meshes[0]!.castShadow;
    batch.receiveShadow = meshes[0]!.receiveShadow;
    batch.frustumCulled = false;
    batch.layers.mask = meshes[0]!.layers.mask & ~(1 << LOW_BATCH_ORIGINAL_LAYER);
    batch.raycast = () => {};
    this.scene.add(batch);
    this.mergedEntries.push({ batch, originals, indices: Array.from(geometry.index!.array), visibleKey: "" });
  }

  private compatible(entry: Original, material: THREE.Material | THREE.Material[], castShadow: boolean, receiveShadow: boolean): boolean {
    const { mesh } = entry;
    const expectedMask = entry.batched ? 1 << LOW_BATCH_ORIGINAL_LAYER : entry.layerMask;
    if (mesh.layers.mask !== expectedMask) entry.layerMask = mesh.layers.mask;
    mesh.layers.mask = entry.layerMask;
    let ancestor: THREE.Object3D | null = mesh;
    while (ancestor && ancestor !== this.scene) ancestor = ancestor.parent;
    return mesh.geometry === entry.geometry && mesh.material === material
      && ancestor === this.scene && mesh.parent === entry.parent
      && mesh.castShadow === castShadow && mesh.receiveShadow === receiveShadow
      && sameAttributes(entry) && bufferVersions(mesh.geometry) === entry.versions
      && attributeLayout(mesh.geometry) === entry.layout
      && eligible(mesh, this.unsafeAnimationTargets, true);
  }

  public update(): void {
    if (this.disposed) return;
    this.scene.updateWorldMatrix(true, true);
    const inverse = this.scene.matrixWorld.clone().invert();
    for (const { batch, originals } of this.entries) for (const entry of originals) {
      const { mesh, instance } = entry;
      const compatible = this.compatible(entry, batch.material, batch.castShadow, batch.receiveShadow)
        && (entry.layerMask & ~(1 << LOW_BATCH_ORIGINAL_LAYER)) === batch.layers.mask
        && mesh.frustumCulled === batch.perObjectFrustumCulled
        ;
      batch.setVisibleAt(instance, compatible);
      entry.batched = compatible;
      if (compatible) {
        batch.setMatrixAt(instance, new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld));
        mesh.layers.mask = 1 << LOW_BATCH_ORIGINAL_LAYER;
      }
    }
    if (!this.camera) return;
    this.camera.updateWorldMatrix(true, false);
    const frustum = new THREE.Frustum().setFromProjectionMatrix(
      new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse));
    for (const entry of this.mergedEntries) {
      const { batch, originals } = entry;
      const selected: MergedOriginal[] = [];
      for (const original of originals) {
        const { mesh } = original;
        const compatible = this.compatible(original, batch.material, batch.castShadow, batch.receiveShadow)
          && (original.layerMask & ~(1 << LOW_BATCH_ORIGINAL_LAYER)) === batch.layers.mask;
        original.batched = compatible;
        if (!compatible) continue;
        mesh.layers.mask = 1 << LOW_BATCH_ORIGINAL_LAYER;
        const matrix = new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld);
        if (!matrix.equals(original.matrix)) {
          original.working.copy(original.geometry).applyMatrix4(matrix);
          for (const name of Object.keys(batch.geometry.attributes)) {
            const target = batch.geometry.getAttribute(name) as THREE.BufferAttribute;
            target.array.set(original.working.getAttribute(name).array, original.vertexStart * target.itemSize);
            target.needsUpdate = true;
          }
          original.matrix.copy(matrix);
        }
        // Off-camera casters must remain present for every shadow viewpoint.
        if (batch.castShadow || !mesh.frustumCulled || frustum.intersectsSphere(original.sphere.clone().applyMatrix4(mesh.matrixWorld))) selected.push(original);
      }
      const visibleKey = selected.map((original) => original.indexStart).join(",");
      batch.visible = selected.length > 0;
      if (visibleKey === entry.visibleKey) continue;
      entry.visibleKey = visibleKey;
      const index = batch.geometry.index!;
      let count = 0;
      for (const original of selected) {
        index.array.set(entry.indices.slice(original.indexStart, original.indexStart + original.indexCount), count);
        count += original.indexCount;
      }
      index.needsUpdate = true;
      batch.geometry.setDrawRange(0, count);
    }
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const { batch, originals } of this.entries) {
      for (const entry of originals) {
        if (entry.mesh.layers.mask === (entry.batched ? 1 << LOW_BATCH_ORIGINAL_LAYER : entry.layerMask)) entry.mesh.layers.mask = entry.layerMask;
      }
      batch.removeFromParent();
      batch.dispose();
    }
    this.entries.length = 0;
    for (const { batch, originals } of this.mergedEntries) {
      for (const entry of originals) {
        if (entry.mesh.layers.mask === (entry.batched ? 1 << LOW_BATCH_ORIGINAL_LAYER : entry.layerMask)) entry.mesh.layers.mask = entry.layerMask;
        entry.working.dispose();
      }
      batch.removeFromParent();
      batch.geometry.dispose();
    }
    this.mergedEntries.length = 0;
  }
}
