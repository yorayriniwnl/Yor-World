import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { installOptionalTextureOnScene, RuntimeMaterialQuality } from "../../src/features/world/RuntimeMaterialQuality";

function glassMaterial() {
  return new THREE.MeshPhysicalMaterial({
    transmission: 0.75,
    opacity: 0.8,
    color: 0x8fcfff,
    roughness: 0.12,
    metalness: 0.05,
    ior: 1.5,
  });
}

describe("runtime material quality on frozen world meshes", () => {
  it("reduces optional ambient point lights without changing task lighting or authored light state", () => {
    const scene = new THREE.Group();
    const point = new THREE.PointLight(0x78e4ff, 1195, 8);
    point.position.set(2, 1.2, -1);
    point.layers.enable(4);
    const mask = point.layers.mask;
    const task = new THREE.SpotLight(0xffeed0, 1902);
    const hemisphere = new THREE.HemisphereLight();
    const directional = new THREE.DirectionalLight();
    scene.add(point, task, hemisphere, directional);
    const quality = new RuntimeMaterialQuality(scene);
    quality.apply("low");
    expect(point.layers.mask).toBe(0);
    expect(point.visible).toBe(true);
    expect(point.position.toArray()).toEqual([2, 1.2, -1]);
    expect(point.intensity).toBe(1195);
    expect([task, hemisphere, directional].map((light) => light.layers.mask)).toEqual([1, 1, 1]);
    // Live task-lamp changes remain authoritative across tier transitions.
    task.intensity = 0;
    quality.apply("medium");
    expect(point.layers.mask).toBe(mask);
    expect(task.intensity).toBe(0);
    quality.apply("low");
    quality.dispose();
    expect(point.layers.mask).toBe(mask);
    expect(point.intensity).toBe(1195);
  });
  it("approximates transmitting glass at LOW while preserving its original material and texture", () => {
    const texture = new THREE.Texture();
    const original = glassMaterial();
    original.map = texture;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), original);
    const quality = new RuntimeMaterialQuality(mesh);

    expect(mesh.material).toBe(original);
    quality.apply("low");

    const low = mesh.material;
    expect(low).not.toBe(original);
    expect(low).toBeInstanceOf(THREE.MeshLambertMaterial);
    expect(low).not.toHaveProperty("transmission");
    expect(low.opacity).toBeCloseTo(0.2);
    expect(low.transparent).toBe(true);
    expect(low.depthWrite).toBe(false);
    expect(low.map).toBe(texture);
    expect(low.color.equals(original.color)).toBe(true);
    expect(original.transmission).toBe(0.75);
    expect(original.opacity).toBe(0.8);
    expect(original.transparent).toBe(false);
    expect(original.depthWrite).toBe(true);
    quality.dispose();
  });

  it.each(["high", "medium"] as const)("restores the exact original material at %s", (tier) => {
    const original = glassMaterial();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), original);
    const quality = new RuntimeMaterialQuality(mesh);
    quality.apply("low");

    quality.apply(tier);

    expect(mesh.material).toBe(original);
    expect(mesh.material.transmission).toBe(0.75);
    expect(mesh.material.opacity).toBe(0.8);
    quality.dispose();
  });

  it("shares one glass clone across meshes and material arrays while retaining non-PBR materials", () => {
    const glass = glassMaterial();
    const opaque = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const originalArray = [opaque, glass, glass];
    const single = new THREE.Mesh(new THREE.BoxGeometry(), glass);
    const multiple = new THREE.Mesh(new THREE.BoxGeometry(), originalArray);
    const opaqueOnly = new THREE.Mesh(new THREE.BoxGeometry(), opaque);
    const scene = new THREE.Group();
    scene.add(single, multiple, opaqueOnly);
    const quality = new RuntimeMaterialQuality(scene);

    quality.apply("low");

    expect(single.material).not.toBe(glass);
    expect(multiple.material).not.toBe(originalArray);
    expect(multiple.material[0]).toBe(opaque);
    expect(multiple.material[1]).toBe(single.material);
    expect(multiple.material[2]).toBe(single.material);
    expect(opaqueOnly.material).toBe(opaque);
    expect(originalArray).toEqual([opaque, glass, glass]);

    quality.apply("medium");
    expect(single.material).toBe(glass);
    expect(multiple.material).toBe(originalArray);
    expect(opaqueOnly.material).toBe(opaque);
    quality.dispose();
  });

  it("keeps PBR surface color, texture, emissive lighting and alpha controls in its lit LOW material", () => {
    const map = new THREE.Texture();
    map.colorSpace = THREE.SRGBColorSpace;
    const emissiveMap = new THREE.Texture();
    const aoMap = new THREE.Texture();
    const lightMap = new THREE.Texture();
    const alphaMap = new THREE.Texture();
    const original = new THREE.MeshStandardMaterial({
      name: "accepted-pink-lit-surface",
      color: 0xb0ddff,
      map,
      emissive: 0xff0088,
      emissiveMap,
      emissiveIntensity: 2.4,
      aoMap,
      aoMapIntensity: 0.7,
      lightMap,
      lightMapIntensity: 0.6,
      alphaMap,
      alphaTest: 0.25,
      opacity: 0.65,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
      flatShading: true,
      vertexColors: true,
      wireframe: true,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), original);
    const quality = new RuntimeMaterialQuality(mesh);

    quality.apply("low");

    const low = mesh.material as unknown as THREE.MeshLambertMaterial;
    expect(low).toBeInstanceOf(THREE.MeshLambertMaterial);
    expect(low).not.toBe(original);
    expect(low.name).toBe(original.name);
    expect(low.color.equals(original.color)).toBe(true);
    expect(low.color).not.toBe(original.color);
    expect(low.emissive.equals(original.emissive)).toBe(true);
    expect(low.emissive).not.toBe(original.emissive);
    expect(low.emissiveIntensity).toBe(2.4);
    expect(low.map).toBe(map);
    expect(low.map!.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(low.emissiveMap).toBe(emissiveMap);
    expect(low.aoMap).toBe(aoMap);
    expect(low.aoMapIntensity).toBe(0.7);
    expect(low.lightMap).toBe(lightMap);
    expect(low.lightMapIntensity).toBe(0.6);
    expect(low.alphaMap).toBe(alphaMap);
    expect(low.alphaTest).toBe(0.25);
    expect(low.opacity).toBe(0.65);
    expect(low.transparent).toBe(true);
    expect(low.depthWrite).toBe(false);
    expect(low.depthTest).toBe(false);
    expect(low.side).toBe(THREE.DoubleSide);
    expect(low.flatShading).toBe(true);
    expect(low.vertexColors).toBe(true);
    expect(low.wireframe).toBe(true);

    quality.apply("high");
    expect(mesh.material).toBe(original);
    quality.dispose();
  });

  it("does not compound opacity or allocate another material when quality toggles repeatedly", () => {
    const original = glassMaterial();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), original);
    const quality = new RuntimeMaterialQuality(mesh);
    quality.apply("low");
    const low = mesh.material;

    for (let toggle = 0; toggle < 12; toggle++) {
      quality.apply(toggle % 2 === 0 ? "high" : "medium");
      expect(mesh.material).toBe(original);
      quality.apply("low");
      quality.apply("low");
      expect(mesh.material).toBe(low);
      expect(mesh.material.opacity).toBeCloseTo(0.2);
      expect(original.opacity).toBe(0.8);
    }
    quality.dispose();
  });

  it("keeps geometry, local transforms, world matrices, names and real mesh raycasts intact", () => {
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const original = glassMaterial();
    const mesh = new THREE.Mesh(geometry, original);
    mesh.name = "approved-monitor-glass";
    mesh.position.set(0.2, 0.4, -0.1);
    mesh.rotation.set(0.1, 0.2, 0.05);
    mesh.scale.set(0.8, 1.1, 0.9);
    const scene = new THREE.Group();
    scene.position.set(1, 2, 3);
    scene.rotation.set(0, 0.1, 0);
    scene.add(mesh);
    scene.updateMatrixWorld(true);
    const before = {
      position: mesh.position.toArray(),
      quaternion: mesh.quaternion.toArray(),
      scale: mesh.scale.toArray(),
      matrix: mesh.matrix.toArray(),
      world: mesh.matrixWorld.toArray(),
      vertices: Array.from(geometry.attributes.position!.array),
    };
    const center = mesh.getWorldPosition(new THREE.Vector3());
    const raycaster = new THREE.Raycaster(center.clone().add(new THREE.Vector3(0, 0, 10)), new THREE.Vector3(0, 0, -1));
    const beforeHits = raycaster.intersectObject(scene, true);
    expect(beforeHits.length).toBeGreaterThan(0);
    expect(beforeHits[0]!.object).toBe(mesh);
    const quality = new RuntimeMaterialQuality(scene);

    quality.apply("low");
    scene.updateMatrixWorld(true);

    expect(mesh.geometry).toBe(geometry);
    expect(mesh.name).toBe("approved-monitor-glass");
    expect(mesh.parent).toBe(scene);
    expect(mesh.position.toArray()).toEqual(before.position);
    expect(mesh.quaternion.toArray()).toEqual(before.quaternion);
    expect(mesh.scale.toArray()).toEqual(before.scale);
    expect(mesh.matrix.toArray()).toEqual(before.matrix);
    expect(mesh.matrixWorld.toArray()).toEqual(before.world);
    expect(Array.from(geometry.attributes.position!.array)).toEqual(before.vertices);
    const lowHits = raycaster.intersectObject(scene, true);
    expect(lowHits.length).toBe(beforeHits.length);
    expect(lowHits[0]!.object).toBe(mesh);
    expect(lowHits[0]!.distance).toBe(beforeHits[0]!.distance);
    expect(lowHits[0]!.point.equals(beforeHits[0]!.point)).toBe(true);
    quality.dispose();
  });

  it("restores originals and disposes each shared clone once without disposing shared assets", () => {
    const texture = new THREE.Texture();
    const geometry = new THREE.BoxGeometry();
    const glass = glassMaterial();
    glass.map = texture;
    const otherGlass = glassMaterial();
    otherGlass.map = texture;
    const opaque = new THREE.MeshStandardMaterial({ map: texture });
    const originalArray = [glass, otherGlass, opaque];
    const single = new THREE.Mesh(geometry, glass);
    const multiple = new THREE.Mesh(geometry, originalArray);
    const scene = new THREE.Group();
    scene.add(single, multiple);
    const quality = new RuntimeMaterialQuality(scene);
    quality.apply("low");
    const firstCloneDispose = vi.spyOn(single.material, "dispose");
    const secondCloneDispose = vi.spyOn(multiple.material[1]!, "dispose");
    const opaqueCloneDispose = vi.spyOn(multiple.material[2]!, "dispose");
    const originalDispose = vi.spyOn(glass, "dispose");
    const otherOriginalDispose = vi.spyOn(otherGlass, "dispose");
    const opaqueDispose = vi.spyOn(opaque, "dispose");
    const textureDispose = vi.spyOn(texture, "dispose");
    const geometryDispose = vi.spyOn(geometry, "dispose");

    quality.dispose();
    quality.dispose();

    expect(single.material).toBe(glass);
    expect(multiple.material).toBe(originalArray);
    expect(firstCloneDispose).toHaveBeenCalledOnce();
    expect(secondCloneDispose).toHaveBeenCalledOnce();
    expect(opaqueCloneDispose).toHaveBeenCalledOnce();
    expect(originalDispose).not.toHaveBeenCalled();
    expect(otherOriginalDispose).not.toHaveBeenCalled();
    expect(opaqueDispose).not.toHaveBeenCalled();
    expect(textureDispose).not.toHaveBeenCalled();
    expect(geometryDispose).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("refreshes late texture map onto simplified low quality material via refreshMesh", () => {
    const original = glassMaterial();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), original);
    const scene = new THREE.Group();
    scene.add(mesh);
    const quality = new RuntimeMaterialQuality(scene);

    quality.apply("low");
    expect(mesh.material).not.toBe(original);
    const lowMat = mesh.material as unknown as THREE.MeshLambertMaterial;
    expect(lowMat.map).toBeNull();

    // Late texture arrives
    const lateTexture = new THREE.Texture();
    original.map = lateTexture;
    quality.refreshMesh(mesh);

    expect(mesh.material).not.toBe(original);
    expect((mesh.material as unknown as THREE.MeshLambertMaterial).map).toBe(lateTexture);

    quality.apply("high");
    expect(mesh.material).toBe(original);
    expect(original.map).toBe(lateTexture);

    quality.dispose();
  });

  it("isolates a late map on shared materials and keeps LOW/HIGH map state consistent", () => {
    const baseTexture = new THREE.Texture();
    const lateTexture = new THREE.Texture();
    const shared = new THREE.MeshStandardMaterial({ map: baseTexture });
    const target = new THREE.Mesh(new THREE.BoxGeometry(), shared);
    target.name = "desk_mat_overlay";
    const unrelated = new THREE.Mesh(new THREE.BoxGeometry(), shared);
    unrelated.name = "unrelated-static-surface";
    const scene = new THREE.Group();
    scene.add(target, unrelated);
    const quality = new RuntimeMaterialQuality(scene);
    quality.apply("low");

    const rollback = quality.installColorMap(target, lateTexture);
    expect(target.material).not.toBe(unrelated.material);
    const adoptedLowMap = (target.material as unknown as THREE.MeshLambertMaterial).map!;
    expect(adoptedLowMap).toBe(lateTexture);
    expect(adoptedLowMap.source).toBe(lateTexture.source);
    expect((unrelated.material as unknown as THREE.MeshLambertMaterial).map).toBe(baseTexture);
    expect(lateTexture.colorSpace).toBe(THREE.SRGBColorSpace);

    quality.apply("high");
    const adoptedHighMap = (target.material as THREE.MeshStandardMaterial).map!;
    expect(adoptedHighMap).toBe(lateTexture);
    expect(adoptedHighMap.source).toBe(lateTexture.source);
    expect(unrelated.material).toBe(shared);
    quality.apply("low");
    expect((target.material as unknown as THREE.MeshLambertMaterial).map).toBe(adoptedLowMap);

    rollback();
    expect((target.material as unknown as THREE.MeshLambertMaterial).map).toBe(baseTexture);
    quality.apply("high");
    expect(target.material).toBe(shared);
    expect(unrelated.material).toBe(shared);
    quality.dispose();
  });

  it("preserves each GLB map's flip, UV channel, wrap modes, and transform on isolated late textures", () => {
    const firstBaseMap = new THREE.Texture();
    firstBaseMap.flipY = false;
    firstBaseMap.channel = 1;
    firstBaseMap.offset.set(0.2, 0.4);
    firstBaseMap.repeat.set(2, 3);
    firstBaseMap.center.set(0.25, 0.75);
    firstBaseMap.rotation = 0.5;
    firstBaseMap.wrapS = THREE.RepeatWrapping;
    firstBaseMap.wrapT = THREE.MirroredRepeatWrapping;

    const secondBaseMap = new THREE.Texture();
    secondBaseMap.flipY = false;
    secondBaseMap.channel = 2;
    secondBaseMap.offset.set(0.1, 0.3);
    secondBaseMap.repeat.set(4, 5);
    secondBaseMap.rotation = -0.25;
    secondBaseMap.wrapS = THREE.MirroredRepeatWrapping;

    const first = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ map: firstBaseMap }));
    const second = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ map: secondBaseMap }));
    const scene = new THREE.Group();
    scene.add(first, second);
    const quality = new RuntimeMaterialQuality(scene);
    const lateTexture = new THREE.Texture();
    const undoFirst = quality.installColorMap(first, lateTexture);
    const undoSecond = quality.installColorMap(second, lateTexture);
    const firstMap = (first.material as THREE.MeshStandardMaterial).map!;
    const secondMap = (second.material as THREE.MeshStandardMaterial).map!;

    expect(firstMap).not.toBe(lateTexture);
    expect(secondMap).not.toBe(lateTexture);
    expect(firstMap).not.toBe(secondMap);
    expect(firstMap.source).toBe(lateTexture.source);
    expect(secondMap.source).toBe(lateTexture.source);
    expect(firstMap.flipY).toBe(false);
    expect(firstMap.channel).toBe(1);
    expect(firstMap.offset.toArray()).toEqual([0.2, 0.4]);
    expect(firstMap.repeat.toArray()).toEqual([2, 3]);
    expect(firstMap.center.toArray()).toEqual([0.25, 0.75]);
    expect(firstMap.rotation).toBe(0.5);
    expect(firstMap.wrapS).toBe(THREE.RepeatWrapping);
    expect(firstMap.wrapT).toBe(THREE.MirroredRepeatWrapping);
    expect(secondMap.flipY).toBe(false);
    expect(secondMap.channel).toBe(2);
    expect(secondMap.offset.toArray()).toEqual([0.1, 0.3]);
    expect(secondMap.repeat.toArray()).toEqual([4, 5]);
    expect(secondMap.rotation).toBe(-0.25);
    expect(secondMap.wrapS).toBe(THREE.MirroredRepeatWrapping);
    expect(firstMap.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(secondMap.colorSpace).toBe(THREE.SRGBColorSpace);

    undoSecond();
    undoFirst();
    expect((first.material as THREE.MeshStandardMaterial).map).toBe(firstBaseMap);
    expect((second.material as THREE.MeshStandardMaterial).map).toBe(secondBaseMap);
    quality.dispose();
    expect(lateTexture.source).toBeDefined();
  });

  it("atomically rolls back an optional-map failure on a second shared-material target", () => {
    const baseMap = new THREE.Texture();
    baseMap.flipY = false;
    baseMap.channel = 1;
    baseMap.offset.set(0.2, 0.4);
    const lateTexture = new THREE.Texture();
    const baseMapDispose = vi.spyOn(baseMap, "dispose");
    const lateTextureDispose = vi.spyOn(lateTexture, "dispose");
    const generatedTextureDisposals: THREE.Texture[] = [];
    const originalTextureDispose = THREE.Texture.prototype.dispose;
    vi.spyOn(THREE.Texture.prototype, "dispose").mockImplementation(function (this: THREE.Texture) {
      if (this !== lateTexture && this.source === lateTexture.source) generatedTextureDisposals.push(this);
      return originalTextureDispose.call(this);
    });
    const shared = new THREE.MeshStandardMaterial({ map: baseMap });
    const originalClone = shared.clone.bind(shared);
    const temporaryClones: THREE.Material[] = [];
    vi.spyOn(shared, "clone").mockImplementation(() => {
      const clone = originalClone();
      vi.spyOn(clone, "dispose");
      temporaryClones.push(clone);
      return clone;
    });
    const first = new THREE.Mesh(new THREE.BoxGeometry(), shared);
    first.name = "desk_mat_overlay";
    const second = new THREE.Mesh(new THREE.BoxGeometry(), shared);
    second.name = "topography-panel";
    const unrelated = new THREE.Mesh(new THREE.BoxGeometry(), shared);
    unrelated.name = "unrelated-static-surface";
    const scene = new THREE.Group();
    scene.add(first, second, unrelated);
    const quality = new RuntimeMaterialQuality(scene);
    quality.apply("low");
    const baseLow = first.material;
    let secondVisible: THREE.Material | THREE.Material[] = second.material;
    let failedDerivative: THREE.Material | undefined;
    let rejectLateAssignment = true;
    Object.defineProperty(second, "material", {
      configurable: true,
      get: () => secondVisible,
      set: (next: THREE.Material | THREE.Material[]) => {
        const list = Array.isArray(next) ? next : [next];
        const replacement = list.find((material) => {
          const map = (material as THREE.MeshStandardMaterial | THREE.MeshLambertMaterial).map;
          return map?.source === lateTexture.source;
        });
        if (replacement && rejectLateAssignment) {
          rejectLateAssignment = false;
          failedDerivative = replacement;
          throw new Error("second target material connection failed");
        }
        secondVisible = next;
      },
    });
    const temporaryDerivativeDisposals: THREE.Material[] = [];
    const originalLambertDispose = THREE.MeshLambertMaterial.prototype.dispose;
    vi.spyOn(THREE.MeshLambertMaterial.prototype, "dispose").mockImplementation(function (this: THREE.MeshLambertMaterial) {
      if (this.map?.source === lateTexture.source) temporaryDerivativeDisposals.push(this);
      return originalLambertDispose.call(this);
    });

    expect(() => installOptionalTextureOnScene("deskmat", scene, lateTexture, quality))
      .toThrow("second target material connection failed");
    expect(first.material).toBe(baseLow);
    expect(second.material).toBe(baseLow);
    expect(unrelated.material).toBe(baseLow);

    quality.apply("high");
    expect(first.material).toBe(shared);
    expect(second.material).toBe(shared);
    expect(unrelated.material).toBe(shared);
    quality.apply("low");
    expect(first.material).toBe(baseLow);
    expect(second.material).toBe(baseLow);
    expect(unrelated.material).toBe(baseLow);

    quality.dispose();
    expect(temporaryClones).toHaveLength(2);
    for (const clone of temporaryClones) expect(clone.dispose).toHaveBeenCalledOnce();
    expect(failedDerivative).toBeDefined();
    expect(temporaryDerivativeDisposals.filter((material) => material === failedDerivative)).toHaveLength(1);
    expect(new Set(temporaryDerivativeDisposals).size).toBe(2);
    expect(temporaryDerivativeDisposals).toHaveLength(2);
    expect(new Set(generatedTextureDisposals).size).toBe(2);
    expect(generatedTextureDisposals).toHaveLength(2);
    expect(baseMapDispose).not.toHaveBeenCalled();
    expect(lateTextureDispose).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("rejects a target without a color-map slot without changing its live material", () => {
    const material = new THREE.ShaderMaterial();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material);
    const quality = new RuntimeMaterialQuality(mesh);
    expect(() => quality.installColorMap(mesh, new THREE.Texture())).toThrow(/color-map slot/i);
    expect(mesh.material).toBe(material);
    quality.dispose();
  });

});
