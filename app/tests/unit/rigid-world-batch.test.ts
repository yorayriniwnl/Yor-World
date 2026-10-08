import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { RigidWorldBatch } from "../../src/features/world/RigidWorldBatch";
import { LOW_BATCH_ORIGINAL_LAYER } from "../../src/features/world/LowQualityBatch";

function fixture() {
  const scene = new THREE.Group();
  const parent = new THREE.Group();
  parent.name = "chair-root";
  const material = new THREE.MeshStandardMaterial({ roughness: 0.42, metalness: 0.2 });
  const geometry = new THREE.BoxGeometry();
  geometry.clearGroups();
  const meshes = [new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, material)];
  meshes[1]!.position.x = 2;
  parent.add(...meshes);
  scene.add(parent);
  const quality = new RigidWorldBatch(scene, true);
  const batch = scene.children.find((node) => (node as THREE.BatchedMesh).isBatchedMesh) as THREE.BatchedMesh;
  return { scene, parent, material, geometry, meshes, quality, batch };
}

describe("live rigid PBR batching", () => {
  it("updates rigid animation before all render passes without changing original transforms or raycast identity", () => {
    const { scene, parent, meshes, quality, batch, material } = fixture();
    expect(batch.material).toBe(material);
    parent.rotation.y = 0.8;
    meshes[0]!.scale.set(0.7, 1.2, 1);
    quality.update();
    for (const [index, mesh] of meshes.entries()) {
      const matrix = new THREE.Matrix4().multiplyMatrices(batch.matrixWorld, batch.getMatrixAt(index, new THREE.Matrix4()));
      matrix.elements.forEach((element, i) => expect(element).toBeCloseTo(mesh.matrixWorld.elements[i]!, 5));
      expect(mesh.parent).toBe(parent);
      expect(mesh.layers.mask).toBe(1 << LOW_BATCH_ORIGINAL_LAYER);
      expect(mesh.raycast).toBe(THREE.Mesh.prototype.raycast);
    }
    const center = meshes[0]!.getWorldPosition(new THREE.Vector3());
    const ray = new THREE.Raycaster(center.clone().add(new THREE.Vector3(0, 0, 5)), new THREE.Vector3(0, 0, -1));
    ray.layers.enable(LOW_BATCH_ORIGINAL_LAYER);
    expect(ray.intersectObject(scene, true)[0]!.object).toBe(meshes[0]);
    quality.dispose();
  });

  it.each(["hidden", "ancestor-hidden", "material", "shear", "order", "buffer", "shadow", "layers", "added-layer", "attribute-replacement", "detached", "frustum"])("falls back for live %s changes and resumes when safe", (change) => {
    const { parent, meshes, quality, batch } = fixture();
    const mesh = meshes[0]!;
    const material = mesh.material;
    if (change === "hidden") mesh.visible = false;
    if (change === "ancestor-hidden") parent.visible = false;
    if (change === "material") mesh.material = new THREE.MeshStandardMaterial();
    if (change === "shear") { mesh.matrixAutoUpdate = false; mesh.matrix.makeShear(0.2, 0, 0, 0, 0, 0); }
    if (change === "order") parent.renderOrder = 1;
    if (change === "buffer") (mesh.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    if (change === "shadow") mesh.castShadow = true;
    if (change === "layers") mesh.layers.set(5);
    if (change === "added-layer") mesh.layers.mask = 33;
    if (change === "attribute-replacement") mesh.geometry.setAttribute("position", mesh.geometry.getAttribute("position").clone());
    if (change === "detached") mesh.removeFromParent();
    if (change === "frustum") mesh.frustumCulled = false;
    quality.update();
    expect(batch.getVisibleAt(0)).toBe(false);
    expect(mesh.layers.mask).toBe(change === "layers" ? 32 : change === "added-layer" ? 33 : 1);
    parent.visible = mesh.visible = true;
    parent.renderOrder = 0;
    mesh.material = material;
    mesh.matrixAutoUpdate = true;
    mesh.castShadow = false;
    mesh.frustumCulled = true;
    mesh.layers.set(0);
    if (change === "detached") parent.add(mesh);
    quality.update();
    expect(batch.getVisibleAt(0)).toBe(change !== "buffer" && change !== "attribute-replacement");
    quality.dispose();
  });

  it("merges copied portable geometry while retaining live normals, visibility and source raycasts", () => {
    const { scene, parent, meshes, quality, geometry, material } = fixture();
    quality.dispose();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.z = 10;
    const portable = new RigidWorldBatch(scene, false, camera);
    const batch = scene.children.find((node) => node.name === "rigid-world-merged-batch") as THREE.Mesh;
    expect(batch.material).toBe(material);
    expect(batch.geometry).not.toBe(geometry);
    parent.rotation.y = 0.3;
    meshes[0]!.scale.set(0.8, 1.3, 0.9);
    portable.update();
    const expected = geometry.clone().applyMatrix4(meshes[0]!.matrixWorld);
    for (const name of ["position", "normal"]) {
      const copied = batch.geometry.getAttribute(name).array;
      Array.from(expected.getAttribute(name).array).forEach((value, index) => expect(copied[index]).toBeCloseTo(value, 5));
    }
    expect(meshes.map((mesh) => mesh.raycast)).toEqual([THREE.Mesh.prototype.raycast, THREE.Mesh.prototype.raycast]);
    const fullCount = batch.geometry.drawRange.count;
    meshes[1]!.visible = false;
    portable.update();
    expect(batch.geometry.drawRange.count).toBe(fullCount / 2);
    expect(meshes[1]!.layers.mask).toBe(1);
    const sourceDispose = vi.spyOn(geometry, "dispose");
    const materialDispose = vi.spyOn(material, "dispose");
    const mergedDispose = vi.spyOn(batch.geometry, "dispose");
    portable.dispose();
    portable.dispose();
    expect(mergedDispose).toHaveBeenCalledOnce();
    expect(sourceDispose).not.toHaveBeenCalled();
    expect(materialDispose).not.toHaveBeenCalled();
    expect(meshes.map((mesh) => mesh.layers.mask)).toEqual([1, 1]);
  });

  it.each(["added-layer", "attribute-replacement", "detached"])("portable batching safely falls back for %s", (change) => {
    const { scene, meshes, quality } = fixture();
    quality.dispose();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.z = 10;
    const portable = new RigidWorldBatch(scene, false, camera);
    const batch = scene.children.find((node) => node.name === "rigid-world-merged-batch") as THREE.Mesh;
    const fullCount = batch.geometry.drawRange.count;
    if (change === "added-layer") meshes[0]!.layers.mask = 33;
    if (change === "attribute-replacement") meshes[0]!.geometry.setAttribute("position", meshes[0]!.geometry.getAttribute("position").clone());
    if (change === "detached") meshes[0]!.removeFromParent();
    portable.update();
    expect(meshes[0]!.layers.mask).toBe(change === "added-layer" ? 33 : 1);
    expect(batch.geometry.drawRange.count).toBeLessThanOrEqual(fullCount / 2);
    portable.dispose();
  });

  it("keeps separate PBR materials distinct and leaves unsupported renderers on native meshes", () => {
    const { scene, meshes, quality } = fixture();
    quality.dispose();
    meshes[1]!.material = (meshes[0]!.material as THREE.MeshStandardMaterial).clone();
    const separate = new RigidWorldBatch(scene, true);
    expect(scene.children.some((node) => (node as THREE.BatchedMesh).isBatchedMesh)).toBe(false);
    separate.dispose();
    meshes[1]!.material = meshes[0]!.material;
    const fallback = new RigidWorldBatch(scene, false);
    expect(meshes.map((mesh) => mesh.layers.mask)).toEqual([1, 1]);
    expect(scene.children.some((node) => (node as THREE.BatchedMesh).isBatchedMesh)).toBe(false);
    fallback.dispose();
  });

  it("restores source layers and disposes only owned resources once", () => {
    const { meshes, quality, batch, material, geometry } = fixture();
    const disposeBatch = vi.spyOn(batch, "dispose");
    const disposeGeometry = vi.spyOn(geometry, "dispose");
    const disposeMaterial = vi.spyOn(material, "dispose");
    quality.dispose();
    quality.dispose();
    expect(disposeBatch).toHaveBeenCalledOnce();
    expect(disposeGeometry).not.toHaveBeenCalled();
    expect(disposeMaterial).not.toHaveBeenCalled();
    expect(meshes.map((mesh) => mesh.layers.mask)).toEqual([1, 1]);
    expect(batch.parent).toBeNull();
  });
});
