import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { LOW_BATCH_ORIGINAL_LAYER, LowQualityBatch } from "../../src/features/world/LowQualityBatch";
import { RuntimeMaterialQuality } from "../../src/features/world/RuntimeMaterialQuality";

function geometry(size = 1): THREE.BufferGeometry {
  const result = new THREE.BoxGeometry(size, size, size);
  result.clearGroups();
  return result;
}

function pair(material: THREE.Material = new THREE.MeshLambertMaterial()): [THREE.Mesh, THREE.Mesh] {
  const first = new THREE.Mesh(geometry(), material);
  const second = new THREE.Mesh(geometry(2), material);
  first.name = "accepted-static-a";
  second.name = "accepted-static-b";
  second.position.x = 3;
  return [first, second];
}

function batches(scene: THREE.Object3D): THREE.BatchedMesh[] {
  const result: THREE.BatchedMesh[] = [];
  scene.traverse((object) => {
    if ((object as THREE.BatchedMesh).isBatchedMesh) result.push(object as THREE.BatchedMesh);
  });
  return result;
}

function expectMatrix(actual: THREE.Matrix4, expected: THREE.Matrix4): void {
  actual.elements.forEach((value, index) => expect(value).toBeCloseTo(expected.elements[index]!, 5));
}

describe("reversible LOW batching of original frozen meshes", () => {
  it("copies buffers and uses relative instance matrices without changing original identity or transforms", () => {
    const scene = new THREE.Group();
    scene.position.set(1.2, -0.5, 2.5);
    scene.rotation.y = 0.4;
    scene.scale.setScalar(1.2);
    const meshes = pair();
    meshes[0].position.set(0.2, 0.3, -0.4);
    meshes[0].rotation.set(0.1, 0.2, 0.3);
    meshes[0].scale.set(0.8, 1.1, 1.3);
    scene.add(...meshes);
    scene.updateMatrixWorld(true);
    const before = meshes.map((mesh) => ({
      name: mesh.name, geometry: mesh.geometry, material: mesh.material, parent: mesh.parent,
      position: mesh.position.toArray(), rotation: mesh.quaternion.toArray(), scale: mesh.scale.toArray(),
      matrix: mesh.matrix.toArray(), world: mesh.matrixWorld.clone(),
      attributes: Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([key, attribute]) => [key, Array.from(attribute.array)])),
      index: Array.from(mesh.geometry.index!.array), box: mesh.geometry.boundingBox, sphere: mesh.geometry.boundingSphere,
    }));

    const quality = new LowQualityBatch(scene);
    const batch = batches(scene)[0]!;
    expect(batch).toBeInstanceOf(THREE.BatchedMesh);
    expect(batch.visible).toBe(false);
    expect(batch.material).toBe(meshes[0].material);
    expect(batch.instanceCount).toBe(2);
    expect(batch.geometry.getAttribute("position").array).not.toBe(meshes[0].geometry.getAttribute("position").array);
    expect(batch.boundingBox).not.toBeNull();
    expect(batch.boundingSphere).not.toBeNull();
    expect(batch.boundingSphere!.radius).toBeGreaterThan(2);
    quality.apply("low");
    expect(batch.visible).toBe(true);

    meshes.forEach((mesh, index) => {
      const saved = before[index]!;
      expect(mesh.name).toBe(saved.name);
      expect(mesh.geometry).toBe(saved.geometry);
      expect(mesh.material).toBe(saved.material);
      expect(mesh.parent).toBe(saved.parent);
      expect(mesh.visible).toBe(true);
      expect(mesh.position.toArray()).toEqual(saved.position);
      expect(mesh.quaternion.toArray()).toEqual(saved.rotation);
      expect(mesh.scale.toArray()).toEqual(saved.scale);
      expect(mesh.matrix.toArray()).toEqual(saved.matrix);
      expect(mesh.matrixWorld.equals(saved.world)).toBe(true);
      expect(mesh.geometry.boundingBox).toBe(saved.box);
      expect(mesh.geometry.boundingSphere).toBe(saved.sphere);
      expect(Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([key, attribute]) => [key, Array.from(attribute.array)]))).toEqual(saved.attributes);
      expect(Array.from(mesh.geometry.index!.array)).toEqual(saved.index);
      const instance = batch.getMatrixAt(index, new THREE.Matrix4());
      expectMatrix(new THREE.Matrix4().multiplyMatrices(batch.matrixWorld, instance), saved.world);
      const range = batch.getGeometryRangeAt(batch.getGeometryIdAt(index))!;
      expect(Array.from(batch.geometry.getAttribute("position").array).slice(range.vertexStart * 3, (range.vertexStart + range.vertexCount) * 3)).toEqual(saved.attributes.position);
    });
    quality.dispose();
  });

  it("deduplicates shared source geometry within a batch without owning that geometry", () => {
    const scene = new THREE.Group();
    const material = new THREE.MeshLambertMaterial();
    const shared = geometry();
    scene.add(new THREE.Mesh(shared, material), new THREE.Mesh(shared, material));
    const quality = new LowQualityBatch(scene);
    const batch = batches(scene)[0]!;
    expect(batch.getGeometryIdAt(0)).toBe(batch.getGeometryIdAt(1));
    expect(batch.geometry.getAttribute("position").count).toBe(shared.getAttribute("position").count);
    expect(batch.geometry.index!.count).toBe(shared.index!.count);
    quality.dispose();
  });

  it.each(["high", "medium"] as const)("keeps static batches active at %s while preserving original raycast layers", (tier) => {
    const scene = new THREE.Group();
    const meshes = pair();
    for (const mesh of meshes) mesh.layers.enable(4);
    const masks = meshes.map((mesh) => mesh.layers.mask);
    scene.add(...meshes);
    const quality = new LowQualityBatch(scene);
    const batch = batches(scene)[0]!;
    for (let index = 0; index < 3; index++) {
      quality.apply("low");
      expect(meshes.map((mesh) => mesh.layers.mask)).toEqual(masks.map((mask) => (mask & ~1) | (1 << LOW_BATCH_ORIGINAL_LAYER)));
      expect(batch.visible).toBe(true);
      quality.apply(tier);
      expect(meshes.map((mesh) => mesh.layers.mask)).toEqual(masks.map((mask) => (mask & ~1) | (1 << LOW_BATCH_ORIGINAL_LAYER)));
      expect(batch.visible).toBe(true);
    }
    quality.apply("static");
    expect(meshes.map((mesh) => mesh.layers.mask)).toEqual(masks);
    expect(batch.visible).toBe(false);
    quality.dispose();
  });

  it("keeps original meshes as exact raycast targets and makes batch raycasts empty", () => {
    const scene = new THREE.Group();
    const meshes = pair();
    scene.add(...meshes);
    scene.updateMatrixWorld(true);
    const raycaster = new THREE.Raycaster(new THREE.Vector3(0, 0, 5), new THREE.Vector3(0, 0, -1));
    const before = raycaster.intersectObject(scene, true);
    expect(before[0]!.object).toBe(meshes[0]);
    const quality = new LowQualityBatch(scene);
    quality.apply("low");
    expect(raycaster.intersectObject(scene, true)).toHaveLength(0);
    raycaster.layers.enable(LOW_BATCH_ORIGINAL_LAYER);
    const low = raycaster.intersectObject(scene, true);
    expect(low).toHaveLength(before.length);
    expect(low[0]!.object).toBe(meshes[0]);
    expect(low[0]!.point.equals(before[0]!.point)).toBe(true);
    expect(low[0]!.distance).toBe(before[0]!.distance);
    expect(raycaster.intersectObject(batches(scene)[0]!, false)).toHaveLength(0);
    quality.dispose();
  });

  it("uses the existing shared LOW material while its owner restores HIGH and MEDIUM materials", () => {
    const scene = new THREE.Group();
    const original = new THREE.MeshStandardMaterial();
    const meshes = pair(original);
    scene.add(...meshes);
    const materials = new RuntimeMaterialQuality(scene);
    const quality = new LowQualityBatch(scene);
    const batch = batches(scene)[0]!;
    materials.apply("low");
    quality.apply("low");
    const lowMaterial = meshes[0].material;
    expect(lowMaterial).toBeInstanceOf(THREE.MeshLambertMaterial);
    expect(batch.material).toBe(lowMaterial);
    for (const tier of ["low", "medium", "low", "high"] as const) {
      materials.apply(tier);
      quality.apply(tier);
      expect(meshes[0].material).toBe(tier === "low" ? lowMaterial : original);
      expect(batch.material).toBe(meshes[0].material);
      expect(batch.visible).toBe(true);
    }
    quality.dispose();
    materials.dispose();
  });

  it("parameterizes compatible standard materials while preserving their surface values at every tier", () => {
    const scene = new THREE.Group();
    const firstMaterial = new THREE.MeshStandardMaterial({
      name: "warm-surface",
      color: 0xc08040,
      emissive: 0x301008,
      emissiveIntensity: 0.35,
      roughness: 0.28,
      metalness: 0.12,
    });
    const secondMaterial = new THREE.MeshStandardMaterial({
      name: "cool-surface",
      color: 0x5070c0,
      emissive: 0x081020,
      emissiveIntensity: 0.8,
      roughness: 0.76,
      metalness: 0.62,
    });
    const first = new THREE.Mesh(geometry(), firstMaterial);
    const second = new THREE.Mesh(geometry(2), secondMaterial);
    first.castShadow = second.castShadow = true;
    first.receiveShadow = second.receiveShadow = true;
    second.position.x = 3;
    scene.add(first, second);
    const materials = new RuntimeMaterialQuality(scene);
    const quality = new LowQualityBatch(scene);
    const batch = batches(scene)[0]!;

    expect(quality.getDiagnostics().batchedMeshes).toBe(2);
    expect(quality.getDiagnostics().batchCount).toBe(1);
    expect(batch.castShadow).toBe(true);
    expect(batch.receiveShadow).toBe(true);
    expect(batch.instanceCount).toBe(2);

    const expected = [firstMaterial, secondMaterial];
    for (let index = 0; index < expected.length; index += 1) {
      const source = expected[index]!;
      const geometryId = batch.getGeometryIdAt(index);
      const range = batch.getGeometryRangeAt(geometryId)!;
      const vertex = range.vertexStart;
      expect(batch.geometry.getAttribute("yorSurfaceColor").getX(vertex)).toBeCloseTo(source.color.r, 6);
      expect(batch.geometry.getAttribute("yorSurfaceColor").getY(vertex)).toBeCloseTo(source.color.g, 6);
      expect(batch.geometry.getAttribute("yorSurfaceColor").getZ(vertex)).toBeCloseTo(source.color.b, 6);
      expect(batch.geometry.getAttribute("yorSurfaceEmissive").getX(vertex)).toBeCloseTo(source.emissive.r, 6);
      expect(batch.geometry.getAttribute("yorSurfaceEmissive").getY(vertex)).toBeCloseTo(source.emissive.g, 6);
      expect(batch.geometry.getAttribute("yorSurfaceEmissive").getZ(vertex)).toBeCloseTo(source.emissive.b, 6);
      expect(batch.geometry.getAttribute("yorSurfaceFactors").getX(vertex)).toBeCloseTo(source.roughness, 6);
      expect(batch.geometry.getAttribute("yorSurfaceFactors").getY(vertex)).toBeCloseTo(source.metalness, 6);
      expect(batch.geometry.getAttribute("yorSurfaceFactors").getZ(vertex)).toBeCloseTo(source.emissiveIntensity, 6);
    }

    for (const tier of ["high", "medium", "low", "high"] as const) {
      materials.apply(tier);
      quality.apply(tier);
      expect(batch.visible).toBe(true);
      expect(batch.material).not.toBe(expected[0]);
      expect(batch.material.onBeforeCompile).not.toBe(THREE.Material.prototype.onBeforeCompile);
      if (tier === "low") {
        expect(batch.material).toBeInstanceOf(THREE.MeshLambertMaterial);
        expect((batch.material as THREE.MeshLambertMaterial).color.getHex()).toBe(0xffffff);
      } else {
        expect(batch.material).toBeInstanceOf(THREE.MeshStandardMaterial);
        const standard = batch.material as THREE.MeshStandardMaterial;
        expect(standard.color.getHex()).toBe(0xffffff);
        expect(standard.emissive.getHex()).toBe(0xffffff);
        expect(standard.emissiveIntensity).toBe(1);
        expect(standard.roughness).toBe(1);
        expect(standard.metalness).toBe(1);
      }
      if (tier === "low") {
        expect(first.material).toBeInstanceOf(THREE.MeshLambertMaterial);
        expect(second.material).toBeInstanceOf(THREE.MeshLambertMaterial);
      } else {
        expect(first.material).toBe(firstMaterial);
        expect(second.material).toBe(secondMaterial);
      }
    }
    quality.dispose();
    materials.dispose();
    expect(first.material).toBe(firstMaterial);
    expect(second.material).toBe(secondMaterial);
  });

  it("requires identical material identity, attribute layout, indexedness and render state", () => {
    const scene = new THREE.Group();
    const material = new THREE.MeshLambertMaterial();
    const accepted = pair(material);
    const otherMaterial = new THREE.Mesh(geometry(), material.clone());
    const differentAttribute = new THREE.Mesh(geometry(), material);
    differentAttribute.geometry.deleteAttribute("uv");
    const differentNormalization = new THREE.Mesh(geometry(), material);
    differentNormalization.geometry.getAttribute("normal").normalized = true;
    const nonIndexed = new THREE.Mesh(geometry().toNonIndexed(), material);
    const differentShadow = new THREE.Mesh(geometry(), material);
    differentShadow.receiveShadow = true;
    const differentCull = new THREE.Mesh(geometry(), material);
    differentCull.frustumCulled = false;
    const differentLayer = new THREE.Mesh(geometry(), material);
    differentLayer.layers.enable(3);
    const excluded = [otherMaterial, differentAttribute, differentNormalization, nonIndexed, differentShadow, differentCull, differentLayer];
    scene.add(...accepted, ...excluded);
    const quality = new LowQualityBatch(scene);
    quality.apply("low");
    expect(batches(scene)).toHaveLength(1);
    expect(batches(scene)[0]!.instanceCount).toBe(2);
    for (const mesh of excluded) expect(mesh.layers.mask & 1).toBe(1);
    quality.dispose();
  });

  it("supports non-indexed geometry when both original layouts match", () => {
    const scene = new THREE.Group();
    const meshes = pair();
    for (const mesh of meshes) mesh.geometry = mesh.geometry.toNonIndexed();
    scene.add(...meshes);
    const quality = new LowQualityBatch(scene);
    expect(batches(scene)).toHaveLength(1);
    expect(batches(scene)[0]!.geometry.index).toBeNull();
    quality.dispose();
  });

  it.each(["resident", "chair-root", "chair-base", "body-turn", "door-hinge", "painting-pivot", "blind_slat_1", "blind_slat_12", "hidden-yor-mark"])("tracks every descendant transform beneath dynamic %s", (name) => {
    const scene = new THREE.Group();
    const dynamic = new THREE.Group();
    dynamic.name = name;
    const meshes = pair();
    dynamic.add(...meshes);
    scene.add(dynamic);
    const quality = new LowQualityBatch(scene);
    quality.apply("low");
    const batch = batches(scene)[0]!;
    expect(batches(scene)).toHaveLength(1);
    expect(batch.instanceCount).toBe(2);
    expect(batch.frustumCulled).toBe(false);
    expect(batch.perObjectFrustumCulled).toBe(true);
    expect(quality.getDiagnostics().dynamicMeshes).toBe(2);
    expect(quality.getDiagnostics().dynamicBatchedMeshes).toBe(2);
    expect(meshes.map((mesh) => mesh.layers.mask)).toEqual([2, 2]);

    dynamic.position.set(1.2, 0.5, -0.7);
    dynamic.rotation.y = 0.4;
    dynamic.updateWorldMatrix(true, true);
    quality.syncDynamicInstances();
    for (let index = 0; index < meshes.length; index += 1) {
      const instance = batch.getMatrixAt(index, new THREE.Matrix4());
      expectMatrix(new THREE.Matrix4().multiplyMatrices(batch.matrixWorld, instance), meshes[index]!.matrixWorld);
    }
    expect([batch.getVisibleAt(0), batch.getVisibleAt(1)]).toEqual([true, true]);

    dynamic.visible = false;
    quality.syncDynamicInstances();
    expect([batch.getVisibleAt(0), batch.getVisibleAt(1)]).toEqual([false, false]);
    dynamic.visible = true;
    dynamic.scale.x = -1;
    quality.syncDynamicInstances();
    expect([batch.getVisibleAt(0), batch.getVisibleAt(1)]).toEqual([false, false]);
    expect(meshes.map((mesh) => mesh.layers.mask)).toEqual([3, 3]);

    dynamic.scale.x = 1;
    quality.syncDynamicInstances();
    expect([batch.getVisibleAt(0), batch.getVisibleAt(1)]).toEqual([true, true]);
    expect(meshes.map((mesh) => mesh.layers.mask)).toEqual([2, 2]);
    quality.dispose();
    expect(meshes.map((mesh) => mesh.layers.mask)).toEqual([1, 1]);
  });

  it("batches actual named and UUID animation targets and tracks their state", () => {
    const scene = new THREE.Group();
    const animatedParent = new THREE.Group();
    animatedParent.name = "animated-custom-root";
    const animatedChildren = pair();
    animatedParent.add(...animatedChildren);
    const uuidMeshes = pair(animatedChildren[0].material as THREE.Material);
    const accepted = pair(animatedChildren[0].material as THREE.Material);
    scene.add(animatedParent, ...uuidMeshes, ...accepted);
    scene.animations = [new THREE.AnimationClip("frozen-clip", 1, [
      new THREE.VectorKeyframeTrack("animated-custom-root.position", [0, 1], [0, 0, 0, 1, 0, 0]),
      new THREE.VectorKeyframeTrack(`${uuidMeshes[0].uuid}.scale`, [0, 1], [1, 1, 1, 2, 2, 2]),
      new THREE.BooleanKeyframeTrack(`${uuidMeshes[1].uuid}.visible`, [0, 1], [true, false]),
    ])];
    const quality = new LowQualityBatch(scene);
    quality.apply("low");
    const batch = batches(scene)[0]!;
    expect(batches(scene)).toHaveLength(1);
    expect(batch.instanceCount).toBe(6);
    expect(quality.getDiagnostics().dynamicMeshes).toBe(4);
    expect(quality.getDiagnostics().dynamicBatchedMeshes).toBe(4);
    for (const mesh of [...animatedChildren, ...uuidMeshes]) expect(mesh.layers.mask).toBe(2);
    expect(accepted.map((mesh) => mesh.layers.mask)).toEqual([2, 2]);

    const mixer = new THREE.AnimationMixer(scene);
    const action = mixer.clipAction(scene.animations[0]!);
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    mixer.setTime(0.5);
    quality.syncDynamicInstances();
    const allMeshes = [...animatedChildren, ...uuidMeshes, ...accepted];
    for (let index = 0; index < batch.instanceCount; index += 1) {
      const instance = batch.getMatrixAt(index, new THREE.Matrix4());
      expectMatrix(new THREE.Matrix4().multiplyMatrices(batch.matrixWorld, instance), allMeshes[index]!.matrixWorld);
    }
    expect(animatedParent.position.x).toBeCloseTo(0.5);
    mixer.setTime(1);
    quality.syncDynamicInstances();
    expect(uuidMeshes[1]!.visible).toBe(false);
    expect(batch.getVisibleAt(2)).toBe(true);
    expect(batch.getVisibleAt(3)).toBe(false);
    quality.dispose();
    mixer.stopAllAction();
  });

  it("conservatively tracks a nested animation subtree when a track cannot be resolved", () => {
    const scene = new THREE.Group();
    const animated = new THREE.Group();
    animated.add(...pair());
    animated.animations = [new THREE.AnimationClip("unresolved", 1, [
      new THREE.NumberKeyframeTrack("missing-node.position[x]", [0, 1], [0, 1]),
    ])];
    scene.add(animated);
    const quality = new LowQualityBatch(scene);
    expect(batches(scene)).toHaveLength(1);
    expect(batches(scene)[0]!.instanceCount).toBe(2);
    expect(quality.getDiagnostics().dynamicBatchedMeshes).toBe(2);
    quality.dispose();
  });

  it.each(["transparent", "cutout", "wireframe", "stencil", "partial", "groups", "array", "morph", "instanced", "instanced-attribute", "skinned", "callback", "shader-callback", "material-callback", "custom-raycast", "order", "parent-order", "hidden", "negative", "parent-negative", "singular", "shear", "dynamic-buffer", "half-float"])("leaves %s meshes untouched", (condition) => {
    const scene = new THREE.Group();
    const meshes = pair();
    if (condition === "transparent") (meshes[0].material as THREE.Material).transparent = true;
    if (condition === "cutout") (meshes[0].material as THREE.Material).alphaTest = 0.1;
    if (condition === "wireframe") (meshes[0].material as THREE.MeshLambertMaterial).wireframe = true;
    if (condition === "stencil") (meshes[0].material as THREE.Material).stencilWrite = true;
    if (condition === "shader-callback") (meshes[0].material as THREE.Material).onBeforeCompile = () => {};
    if (condition === "material-callback") (meshes[0].material as THREE.Material).onBeforeRender = () => {};
    for (const mesh of meshes) {
      if (condition === "partial") mesh.geometry.setDrawRange(3, 3);
      if (condition === "groups") mesh.geometry.addGroup(0, 3, 0);
      if (condition === "array") mesh.material = [mesh.material as THREE.Material];
      if (condition === "morph") mesh.geometry.morphAttributes.position = [mesh.geometry.getAttribute("position").clone()];
      if (condition === "callback") mesh.onBeforeRender = () => {};
      if (condition === "custom-raycast") mesh.raycast = () => {};
      if (condition === "order") mesh.renderOrder = 1;
      if (condition === "hidden") mesh.visible = false;
      if (condition === "negative") mesh.scale.x = -1;
      if (condition === "singular") mesh.scale.y = 0;
      if (condition === "shear") {
        mesh.matrixAutoUpdate = false;
        mesh.matrix.makeShear(0.5, 0, 0, 0, 0, 0);
      }
      if (condition === "dynamic-buffer") (mesh.geometry.getAttribute("position") as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
      if (condition === "half-float") mesh.geometry.setAttribute("position", new THREE.Float16BufferAttribute(new Uint16Array(72), 3));
      if (condition === "instanced-attribute") mesh.geometry.setAttribute("instanceValue", new THREE.InstancedBufferAttribute(new Float32Array(24), 1));
    }
    if (condition === "instanced" || condition === "skinned") {
      const material = meshes[0].material as THREE.Material;
      scene.add(condition === "instanced" ? new THREE.InstancedMesh(geometry(), material, 2) : new THREE.SkinnedMesh(geometry(), material));
    } else scene.add(...meshes);
    if (condition === "parent-order") scene.renderOrder = 1;
    if (condition === "parent-negative") scene.scale.set(-1, -1, 1);
    const quality = new LowQualityBatch(scene);
    quality.apply("low");
    expect(batches(scene)).toHaveLength(0);
    for (const mesh of meshes) expect(mesh.layers.mask).toBe(1);
    quality.dispose();
  });

  it("disposes owned batch geometry and internal textures once, without disposing originals or shared material", () => {
    const texture = new THREE.Texture();
    const material = new THREE.MeshLambertMaterial({ map: texture });
    const scene = new THREE.Group();
    const meshes = pair(material);
    meshes.forEach((mesh) => mesh.layers.enable(5));
    scene.add(...meshes);
    const quality = new LowQualityBatch(scene);
    const batch = batches(scene)[0]!;
    const internal = batch as unknown as { _matricesTexture: THREE.DataTexture; _indirectTexture: THREE.DataTexture };
    const batchGeometryDispose = vi.spyOn(batch.geometry, "dispose");
    const matricesDispose = vi.spyOn(internal._matricesTexture, "dispose");
    const indirectDispose = vi.spyOn(internal._indirectTexture, "dispose");
    const originalsDispose = meshes.map((mesh) => vi.spyOn(mesh.geometry, "dispose"));
    const materialDispose = vi.spyOn(material, "dispose");
    const textureDispose = vi.spyOn(texture, "dispose");
    quality.apply("low");
    quality.dispose();
    quality.dispose();
    quality.apply("low");
    expect(batchGeometryDispose).toHaveBeenCalledOnce();
    expect(matricesDispose).toHaveBeenCalledOnce();
    expect(indirectDispose).toHaveBeenCalledOnce();
    for (const dispose of originalsDispose) expect(dispose).not.toHaveBeenCalled();
    expect(materialDispose).not.toHaveBeenCalled();
    expect(textureDispose).not.toHaveBeenCalled();
    expect(meshes.map((mesh) => mesh.layers.mask)).toEqual([33, 33]);
    expect(batches(scene)).toHaveLength(0);
    expect(batch.parent).toBeNull();
    vi.restoreAllMocks();
  });
});
