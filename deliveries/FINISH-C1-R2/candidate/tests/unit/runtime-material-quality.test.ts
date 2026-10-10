import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { RuntimeMaterialQuality } from "../../src/features/world/RuntimeMaterialQuality";

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

});
