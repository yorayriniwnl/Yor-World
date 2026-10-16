import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { STATIC_BATCH_ORIGINAL_LAYER, StaticSceneBatch } from "../../src/features/world/LowQualityBatch";
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

describe("reversible static batching of original frozen meshes", () => {
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

    const quality = new StaticSceneBatch(scene);
    const batch = batches(scene)[0]!;
    expect(batch).toBeInstanceOf(THREE.BatchedMesh);
    expect(batch.visible).toBe(false);
    expect(batch.material).toBe(meshes[0].material);
    expect(batch.instanceCount).toBe(2);
    expect(quality.getDiagnostics()).toEqual({
      totalMeshes: 2,
      eligibleMeshes: 2,
      layoutRejectedMeshes: 0,
      batchedMeshes: 2,
      dynamicMeshes: 0,
      dynamicBatchedMeshes: 0,
      batchCount: 1,
      singletonGroups: 0,
      singletonMeshes: 0,
      rejectedByReason: {},
      excludedMeshes: [],
    });
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
    const quality = new StaticSceneBatch(scene);
    const batch = batches(scene)[0]!;
    expect(batch.getGeometryIdAt(0)).toBe(batch.getGeometryIdAt(1));
    expect(batch.geometry.getAttribute("position").count).toBe(shared.getAttribute("position").count);
    expect(batch.geometry.index!.count).toBe(shared.index!.count);
    quality.dispose();
  });

  it.each(["high", "medium"] as const)("keeps source meshes raycastable at %s while static batches render", (tier) => {
    const scene = new THREE.Group();
    const meshes = pair();
    for (const mesh of meshes) mesh.layers.enable(4);
    const masks = meshes.map((mesh) => mesh.layers.mask);
    scene.add(...meshes);
    const quality = new StaticSceneBatch(scene);
    const batch = batches(scene)[0]!;
    for (let index = 0; index < 3; index++) {
      quality.apply("low");
      expect(meshes.map((mesh) => mesh.layers.mask)).toEqual([18, 18]);
      expect(batch.visible).toBe(true);
      quality.apply(tier);
      expect(meshes.map((mesh) => mesh.layers.mask)).toEqual([18, 18]);
      expect(batch.visible).toBe(true);
      quality.apply("static");
      expect(meshes.map((mesh) => mesh.layers.mask)).toEqual(masks);
      expect(batch.visible).toBe(false);
    }
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
    const quality = new StaticSceneBatch(scene);
    quality.apply("medium");
    expect(raycaster.intersectObject(scene, true)).toHaveLength(0);
    raycaster.layers.enable(STATIC_BATCH_ORIGINAL_LAYER);
    const active = raycaster.intersectObject(scene, true);
    expect(active).toHaveLength(before.length);
    expect(active[0]!.object).toBe(meshes[0]);
    expect(active[0]!.point.equals(before[0]!.point)).toBe(true);
    expect(active[0]!.distance).toBe(before[0]!.distance);
    expect(raycaster.intersectObject(batches(scene)[0]!, false)).toHaveLength(0);
    quality.dispose();
  });

  it("uses the existing shared LOW material while its owner restores HIGH and MEDIUM materials", () => {
    const scene = new THREE.Group();
    const original = new THREE.MeshStandardMaterial();
    const meshes = pair(original);
    scene.add(...meshes);
    const materials = new RuntimeMaterialQuality(scene);
    const quality = new StaticSceneBatch(scene, (material, tier) => materials.materialForTier(material, tier));
    const batch = batches(scene)[0]!;
    const lowMaterial = materials.materialForTier(original, "low");
    expect(lowMaterial).toBeInstanceOf(THREE.MeshLambertMaterial);
    expect(batch.material).toBe(original);
    for (const tier of ["low", "medium", "low", "high", "static"] as const) {
      materials.apply(tier);
      quality.apply(tier);
      expect(meshes[0].material).toBe(tier === "low" ? lowMaterial : original);
      expect(batch.material).toBe(tier === "low" ? lowMaterial : original);
      expect(batch.visible).toBe(tier !== "static");
    }
    quality.dispose();
    materials.dispose();
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
    const quality = new StaticSceneBatch(scene);
    quality.apply("low");
    expect(batches(scene)).toHaveLength(1);
    expect(batches(scene)[0]!.instanceCount).toBe(2);
    for (const mesh of excluded) expect(mesh.layers.mask & 1).toBe(1);
    quality.dispose();
  });

  it("reports a path, material and precise reason for every mesh that stays on the source render path", () => {
    const scene = new THREE.Group();
    scene.name = "world";
    const accepted = pair();
    const transparentMaterial = new THREE.MeshBasicMaterial({ transparent: true });
    const transparent = new THREE.Mesh(geometry(), transparentMaterial);
    transparent.name = "transparent-panel";
    const grouped = new THREE.Mesh(geometry(), new THREE.MeshBasicMaterial());
    grouped.name = "grouped-trim";
    grouped.geometry.addGroup(0, 3, 0);
    const groupedSibling = new THREE.Mesh(geometry(), grouped.material as THREE.Material);
    groupedSibling.name = "grouped-trim-sibling";
    groupedSibling.geometry.addGroup(0, 3, 0);
    const hiddenParent = new THREE.Group();
    hiddenParent.name = "closed-drawer";
    hiddenParent.visible = false;
    const hidden = new THREE.Mesh(geometry(), new THREE.MeshBasicMaterial());
    hidden.name = "hidden-detail";
    hiddenParent.add(hidden);
    const singleton = new THREE.Mesh(geometry(), new THREE.MeshBasicMaterial());
    singleton.name = "unique-metal-part";
    scene.add(...accepted, transparent, grouped, groupedSibling, hiddenParent, singleton);

    const quality = new StaticSceneBatch(scene);
    const diagnostics = quality.getDiagnostics();
    expect(diagnostics.totalMeshes).toBe(7);
    expect(diagnostics.batchedMeshes).toBe(4);
    expect(diagnostics.excludedMeshes).toEqual([
      expect.objectContaining({ path: "world/transparent-panel", material: "MeshBasicMaterial", reason: "material-transparent-or-blended" }),
      expect.objectContaining({ path: "world/closed-drawer/hidden-detail", material: "MeshBasicMaterial", reason: "hidden-ancestor" }),
      expect.objectContaining({ path: "world/unique-metal-part", material: "MeshBasicMaterial", reason: "singleton-compatible-group" }),
    ]);
    expect(diagnostics.rejectedByReason).toEqual({
      "hidden-ancestor": 1,
      "material-transparent-or-blended": 1,
      "singleton-compatible-group": 1,
    });
    expect(diagnostics.totalMeshes).toBe(diagnostics.batchedMeshes + diagnostics.excludedMeshes.length);
    quality.dispose();
  });

  it("supports non-indexed geometry when both original layouts match", () => {
    const scene = new THREE.Group();
    const meshes = pair();
    for (const mesh of meshes) mesh.geometry = mesh.geometry.toNonIndexed();
    scene.add(...meshes);
    const quality = new StaticSceneBatch(scene);
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
    const quality = new StaticSceneBatch(scene);
    quality.apply("low");
    const batch = batches(scene)[0]!;
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
    expect(batch.getVisibleAt(0)).toBe(true);
    dynamic.visible = false;
    quality.syncDynamicInstances();
    expect(batch.getVisibleAt(0)).toBe(false);
    dynamic.visible = true;
    dynamic.scale.x = -1;
    quality.syncDynamicInstances();
    expect(batch.getVisibleAt(0)).toBe(false);
    expect(meshes.map((mesh) => mesh.layers.mask)).toEqual([3, 3]);
    dynamic.scale.x = 1;
    quality.syncDynamicInstances();
    expect(batch.getVisibleAt(0)).toBe(true);
    expect(meshes.map((mesh) => mesh.layers.mask)).toEqual([2, 2]);
    quality.dispose();
    expect(meshes.map((mesh) => mesh.layers.mask)).toEqual([1, 1]);
  });

  it("batches grouped geometry when a single material owns the whole mesh", () => {
    const scene = new THREE.Group();
    const meshes = pair();
    for (const mesh of meshes) {
      mesh.geometry.addGroup(0, 6, 0);
      mesh.geometry.addGroup(6, mesh.geometry.index!.count - 6, 0);
    }
    scene.add(...meshes);
    const quality = new StaticSceneBatch(scene);
    expect(batches(scene)).toHaveLength(1);
    expect(batches(scene)[0]!.instanceCount).toBe(2);
    expect(batches(scene)[0]!.geometry.getAttribute("position").count)
      .toBe(meshes[0]!.geometry.getAttribute("position").count + meshes[1]!.geometry.getAttribute("position").count);
    quality.dispose();
  });

  it("updates instances for actual named and UUID animation targets and their descendants", () => {
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
    const quality = new StaticSceneBatch(scene);
    quality.apply("low");
    expect(batches(scene)).toHaveLength(1);
    expect(batches(scene)[0]!.instanceCount).toBe(6);
    expect(quality.getDiagnostics().dynamicBatchedMeshes).toBe(4);
    for (const mesh of [...animatedChildren, ...uuidMeshes]) expect(mesh.layers.mask).toBe(2);
    quality.dispose();
  });

  it("synchronizes instances from a playing transform and visibility clip before render", () => {
    const scene = new THREE.Group();
    const resident = new THREE.Group();
    resident.name = "resident";
    const meshes = pair(new THREE.MeshStandardMaterial({ color: 0x3a8ed4 }));
    resident.add(...meshes);
    scene.add(resident);
    const clip = new THREE.AnimationClip("resident-turn", 1, [
      new THREE.VectorKeyframeTrack("resident.position", [0, 1], [0, 0, 0, 1.25, 0.4, -0.6]),
      new THREE.BooleanKeyframeTrack("resident.visible", [0, 1], [true, false]),
    ]);
    scene.animations = [clip];
    scene.updateWorldMatrix(true, true);
    const quality = new StaticSceneBatch(scene);
    quality.apply("high");
    const batch = batches(scene)[0]!;
    const mixer = new THREE.AnimationMixer(scene);
    const action = mixer.clipAction(clip);
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    mixer.setTime(0.5);
    quality.syncDynamicInstances();
    for (let index = 0; index < meshes.length; index += 1) {
      const instance = batch.getMatrixAt(index, new THREE.Matrix4());
      expectMatrix(new THREE.Matrix4().multiplyMatrices(batch.matrixWorld, instance), meshes[index]!.matrixWorld);
      expect(batch.getVisibleAt(index)).toBe(true);
    }
    expect(resident.position.x).toBeCloseTo(0.625);
    mixer.setTime(1);
    quality.syncDynamicInstances();
    expect(resident.visible).toBe(false);
    expect(meshes.map((mesh, index) => batch.getVisibleAt(index))).toEqual([false, false]);
    quality.dispose();
    mixer.stopAllAction();
    (batch.material as THREE.Material).dispose();
  });

  it("tracks a nested animation subtree conservatively when a track cannot be resolved", () => {
    const scene = new THREE.Group();
    const animated = new THREE.Group();
    animated.add(...pair());
    animated.animations = [new THREE.AnimationClip("unresolved", 1, [
      new THREE.NumberKeyframeTrack("missing-node.position[x]", [0, 1], [0, 1]),
    ])];
    scene.add(animated);
    const quality = new StaticSceneBatch(scene);
    expect(batches(scene)).toHaveLength(1);
    expect(quality.getDiagnostics().dynamicBatchedMeshes).toBe(2);
    quality.dispose();
  });

  it("reports hidden transparent semantic proxies as hidden while preserving their raycast source", () => {
    const scene = new THREE.Group();
    const parent = new THREE.Group();
    const proxy = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }));
    parent.visible = false;
    parent.add(proxy);
    scene.add(parent);
    const quality = new StaticSceneBatch(scene);
    const diagnostics = quality.getDiagnostics();
    expect(diagnostics.totalMeshes).toBe(1);
    expect(diagnostics.batchedMeshes).toBe(0);
    expect(diagnostics.rejectedByReason["hidden-ancestor"]).toBe(1);
    expect(proxy.geometry).toBeInstanceOf(THREE.BoxGeometry);
    quality.dispose();
  });

  it.each(["transparent", "cutout", "wireframe", "stencil", "partial", "array", "morph", "instanced", "instanced-attribute", "skinned", "callback", "material-callback", "order", "parent-order", "hidden", "negative", "parent-negative", "singular", "shear", "dynamic-buffer", "half-float"])("leaves %s meshes untouched", (condition) => {
    const scene = new THREE.Group();
    const meshes = pair();
    if (condition === "transparent") (meshes[0].material as THREE.Material).transparent = true;
    if (condition === "cutout") (meshes[0].material as THREE.Material).alphaTest = 0.1;
    if (condition === "wireframe") (meshes[0].material as THREE.MeshLambertMaterial).wireframe = true;
    if (condition === "stencil") (meshes[0].material as THREE.Material).stencilWrite = true;
    if (condition === "material-callback") (meshes[0].material as THREE.Material).onBeforeRender = () => {};
    for (const mesh of meshes) {
      if (condition === "partial") mesh.geometry.setDrawRange(3, 3);
      if (condition === "array") mesh.material = [mesh.material as THREE.Material];
      if (condition === "morph") mesh.geometry.morphAttributes.position = [mesh.geometry.getAttribute("position").clone()];
      if (condition === "callback") mesh.onBeforeRender = () => {};
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
    const quality = new StaticSceneBatch(scene);
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
    const quality = new StaticSceneBatch(scene);
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

  it("keeps custom shader hooks on the original source render path", () => {
    const scene = new THREE.Group();
    const material = new THREE.MeshStandardMaterial();
    material.onBeforeCompile = () => {};
    const meshes = pair(material);
    const originalRaycast = meshes[0].raycast.bind(meshes[0]);
    const raycast = vi.fn((raycaster: THREE.Raycaster, intersections: THREE.Intersection[]) => originalRaycast(raycaster, intersections));
    meshes[0].raycast = raycast;
    scene.add(...meshes);
    scene.updateMatrixWorld(true);
    const quality = new StaticSceneBatch(scene);
    quality.apply("medium");
    expect(batches(scene)).toHaveLength(0);
    expect(quality.getDiagnostics().rejectedByReason["material-custom-shader-hook"]).toBe(2);
    const raycaster = new THREE.Raycaster(new THREE.Vector3(0, 0, 5), new THREE.Vector3(0, 0, -1));
    raycaster.intersectObject(scene, true);
    expect(raycast).toHaveBeenCalled();
    quality.dispose();
  });

  it("batches standard material variants through copied per-surface attributes", () => {
    const scene = new THREE.Group();
    const firstMaterial = new THREE.MeshStandardMaterial({
      color: 0xd23b62,
      emissive: 0x331122,
      emissiveIntensity: 0.4,
      roughness: 0.3,
      metalness: 0.15,
    });
    const secondMaterial = firstMaterial.clone();
    secondMaterial.color.set(0x2d8fce);
    secondMaterial.emissive.set(0x112244);
    secondMaterial.emissiveIntensity = 1.25;
    secondMaterial.roughness = 0.82;
    secondMaterial.metalness = 0.65;
    const first = new THREE.Mesh(geometry(), firstMaterial);
    const second = new THREE.Mesh(geometry(2), secondMaterial);
    second.position.x = 3;
    scene.add(first, second);

    const materials = new RuntimeMaterialQuality(scene);
    const quality = new StaticSceneBatch(scene, (material, tier) => materials.materialForTier(material, tier));
    quality.apply("high");
    const batch = batches(scene)[0]!;
    expect(batches(scene)).toHaveLength(1);
    expect(batch.instanceCount).toBe(2);
    expect(batch.material).not.toBe(firstMaterial);
    const batchMaterial = batch.material as THREE.MeshStandardMaterial;
    expect(batchMaterial.color.getHex()).toBe(0xffffff);
    expect(batchMaterial.emissive.getHex()).toBe(0xffffff);
    expect(batchMaterial.emissiveIntensity).toBe(1);
    expect(batchMaterial.roughness).toBe(1);
    expect(batchMaterial.metalness).toBe(1);

    const firstRange = batch.getGeometryRangeAt(batch.getGeometryIdAt(0))!;
    const secondRange = batch.getGeometryRangeAt(batch.getGeometryIdAt(1))!;
    const colors = batch.geometry.getAttribute("yorSurfaceColor");
    const emissive = batch.geometry.getAttribute("yorSurfaceEmissive");
    const factors = batch.geometry.getAttribute("yorSurfaceFactors");
    expect(new THREE.Color().fromBufferAttribute(colors, firstRange.vertexStart).getHex()).toBe(firstMaterial.color.getHex());
    expect(new THREE.Color().fromBufferAttribute(colors, secondRange.vertexStart).getHex()).toBe(secondMaterial.color.getHex());
    expect(new THREE.Color().fromBufferAttribute(emissive, firstRange.vertexStart).getHex()).toBe(firstMaterial.emissive.getHex());
    expect(new THREE.Color().fromBufferAttribute(emissive, secondRange.vertexStart).getHex()).toBe(secondMaterial.emissive.getHex());
    expect(factors.getX(firstRange.vertexStart)).toBeCloseTo(firstMaterial.roughness);
    expect(factors.getY(firstRange.vertexStart)).toBeCloseTo(firstMaterial.metalness);
    expect(factors.getZ(firstRange.vertexStart)).toBeCloseTo(firstMaterial.emissiveIntensity);
    expect(factors.getX(secondRange.vertexStart)).toBeCloseTo(secondMaterial.roughness);
    expect(factors.getY(secondRange.vertexStart)).toBeCloseTo(secondMaterial.metalness);
    expect(factors.getZ(secondRange.vertexStart)).toBeCloseTo(secondMaterial.emissiveIntensity);

    const shader = {
      ...THREE.ShaderLib.standard,
      uniforms: { ...THREE.ShaderLib.standard.uniforms },
    } as Parameters<typeof batchMaterial.onBeforeCompile>[0];
    batchMaterial.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
    expect(shader.vertexShader).toContain("vYorSurfaceColor = yorSurfaceColor;");
    expect(shader.fragmentShader).toContain("diffuseColor.rgb *= vYorSurfaceColor;");
    expect(shader.fragmentShader).toContain("roughnessFactor *= vYorSurfaceFactors.x;");
    expect(shader.fragmentShader).toContain("metalnessFactor *= vYorSurfaceFactors.y;");
    expect(shader.fragmentShader).toContain("totalEmissiveRadiance *= vYorSurfaceEmissive * vYorSurfaceFactors.z;");

    materials.apply("low");
    quality.apply("low");
    const lowMaterial = batch.material as THREE.MeshLambertMaterial;
    expect(lowMaterial).toBeInstanceOf(THREE.MeshLambertMaterial);
    expect(lowMaterial.color.getHex()).toBe(0xffffff);
    expect(lowMaterial.emissive.getHex()).toBe(0xffffff);
    expect(lowMaterial.emissiveIntensity).toBe(1);
    const lowShader = {
      ...THREE.ShaderLib.lambert,
      uniforms: { ...THREE.ShaderLib.lambert.uniforms },
    } as Parameters<typeof lowMaterial.onBeforeCompile>[0];
    lowMaterial.onBeforeCompile(lowShader, {} as THREE.WebGLRenderer);
    expect(lowShader.fragmentShader).toContain("diffuseColor.rgb *= vYorSurfaceColor;");
    expect(lowShader.fragmentShader).toContain("totalEmissiveRadiance *= vYorSurfaceEmissive * vYorSurfaceFactors.z;");

    const sourceGeometry = first.geometry;
    const ownedMaterialDispose = vi.spyOn(lowMaterial, "dispose");
    quality.dispose();
    materials.dispose();
    expect(ownedMaterialDispose).toHaveBeenCalledOnce();
    expect(first.geometry).toBe(sourceGeometry);
    expect(sourceGeometry.hasAttribute("yorSurfaceColor")).toBe(false);
    expect(first.material).toBe(firstMaterial);
    expect(second.material).toBe(secondMaterial);
    firstMaterial.dispose();
    secondMaterial.dispose();
  });

  it("does not combine scalar variants when texture identity or material class differs", () => {
    const scene = new THREE.Group();
    const firstMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, map: new THREE.Texture() });
    const secondMaterial = firstMaterial.clone();
    secondMaterial.color.set(0x0000ff);
    secondMaterial.map = new THREE.Texture();
    const physicalMaterial = new THREE.MeshPhysicalMaterial({ color: 0x00ff00 });
    scene.add(
      new THREE.Mesh(geometry(), firstMaterial),
      new THREE.Mesh(geometry(), secondMaterial),
      new THREE.Mesh(geometry(), physicalMaterial),
    );

    const quality = new StaticSceneBatch(scene);
    expect(batches(scene)).toHaveLength(0);
    expect(quality.getDiagnostics().singletonMeshes).toBe(3);
    expect(quality.getDiagnostics().rejectedByReason["singleton-compatible-group"]).toBe(3);
    quality.dispose();
    firstMaterial.dispose();
    secondMaterial.dispose();
    physicalMaterial.dispose();
  });
});
