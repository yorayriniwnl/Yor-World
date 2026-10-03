import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { describe, expect, it } from "vitest";
import { ExperienceController } from "@/features/experience/controller";
import { configureProductionLighting, PRODUCTION_LIGHT_INTENSITIES } from "@/features/world/ProductionLighting";
import { RuntimeMaterialQuality } from "@/features/world/RuntimeMaterialQuality";
import { WorldInteractionBinding } from "@/features/world/WorldInteractionBinding";

const assetPath = path.join(process.cwd(), "public/models/production-room-full.glb");

/** Decode the actual shipped light/node/mesh data. Only bitmap decoding is omitted
 * in memory for Node. The original file retains its complete texture metadata.
 */
async function loadRoom() {
  const bytes = readFileSync(assetPath);
  const jsonLength = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString("utf8"));
  for (const material of json.materials ?? []) {
    for (const key of Object.keys(material)) if (key.endsWith("Texture")) delete material[key];
    if (material.pbrMetallicRoughness) {
      delete material.pbrMetallicRoughness.baseColorTexture;
      delete material.pbrMetallicRoughness.metallicRoughnessTexture;
    }
  }
  delete json.images;
  delete json.textures;
  const encoded = Buffer.from(JSON.stringify(json));
  const jsonChunk = Buffer.alloc(Math.ceil(encoded.length / 4) * 4, 32);
  encoded.copy(jsonChunk);
  const binaryChunks = bytes.subarray(20 + jsonLength);
  const glb = Buffer.alloc(20 + jsonChunk.length + binaryChunks.length);
  glb.writeUInt32LE(0x46546c67, 0);
  glb.writeUInt32LE(2, 4);
  glb.writeUInt32LE(glb.length, 8);
  glb.writeUInt32LE(jsonChunk.length, 12);
  glb.writeUInt32LE(0x4e4f534a, 16);
  jsonChunk.copy(glb, 20);
  binaryChunks.copy(glb, 20 + jsonChunk.length);
  const buffer = glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength) as ArrayBuffer;
  const scene = (await new GLTFLoader().parseAsync(buffer, "")).scene;
  scene.updateMatrixWorld(true);
  return { scene, bytes };
}

function productionLights(scene: THREE.Object3D) {
  const lights = new Map<string, THREE.PointLight | THREE.SpotLight>();
  for (const name of Object.keys(PRODUCTION_LIGHT_INTENSITIES)) {
    scene.getObjectByName(name)?.traverse((node) => {
      if (node instanceof THREE.PointLight || node instanceof THREE.SpotLight) lights.set(name, node);
    });
  }
  expect([...lights.keys()].sort()).toEqual(Object.keys(PRODUCTION_LIGHT_INTENSITIES).sort());
  return lights;
}

function lightState(light: THREE.PointLight | THREE.SpotLight, includeIntensity = false) {
  return {
    type: light.type, color: light.color.toArray(), position: light.position.toArray(),
    quaternion: light.quaternion.toArray(), scale: light.scale.toArray(), matrixWorld: light.matrixWorld.toArray(),
    decay: light.decay, distance: light.distance, visible: light.visible,
    layers: light.layers.mask, castShadow: light.castShadow,
    angle: light instanceof THREE.SpotLight ? light.angle : null,
    penumbra: light instanceof THREE.SpotLight ? light.penumbra : null,
    target: light instanceof THREE.SpotLight ? light.target.matrixWorld.toArray() : null,
    ...(includeIntensity ? { intensity: light.intensity } : {}),
  };
}

function meshState(scene: THREE.Object3D) {
  const meshes: unknown[] = [];
  scene.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    meshes.push({
      name: node.name, geometry: node.geometry, material: node.material,
      attributes: Object.fromEntries(Object.entries(node.geometry.attributes).map(([name, rawAttribute]) => {
        const attribute = rawAttribute as THREE.BufferAttribute | THREE.InterleavedBufferAttribute;
        const array = attribute instanceof THREE.InterleavedBufferAttribute ? attribute.data.array : attribute.array;
        return [name, { count: attribute.count, itemSize: attribute.itemSize, normalized: attribute.normalized,
          sha256: createHash("sha256").update(new Uint8Array(array.buffer, array.byteOffset, array.byteLength)).digest("hex") }];
      })),
      index: node.geometry.index ? Array.from(node.geometry.index.array) : null,
      position: node.position.toArray(), quaternion: node.quaternion.toArray(), scale: node.scale.toArray(),
      matrixWorld: node.matrixWorld.toArray(),
      materials: (Array.isArray(node.material) ? node.material : [node.material]).map((material) => material.toJSON()),
    });
  });
  return meshes;
}

function bindEnvironment(scene: THREE.Object3D, reducedMotion = false) {
  const controller = new ExperienceController();
  controller.setReducedMotion(reducedMotion);
  const canvas = Object.assign(new EventTarget(), { style: { cursor: "" } }) as unknown as HTMLCanvasElement;
  const binding = new WorldInteractionBinding({
    canvas, camera: new THREE.PerspectiveCamera(60, 1, 0.05, 30), scene, controller,
    enabled: () => true, reducedMotion: () => reducedMotion,
  });
  return { controller, binding };
}

describe("Frozen production lighting and runtime controls", () => {
  it("calibrates the four actual glTF lights while preserving their authored attributes, meshes and asset bytes", async () => {
    const { scene, bytes } = await loadRoom();
    const lights = productionLights(scene);
    const originalLightStates = new Map([...lights].map(([name, light]) => [name, lightState(light)]));
    const originalMeshes = meshState(scene);
    expect([...lights.values()].filter((light) => light instanceof THREE.PointLight)).toHaveLength(3);
    expect([...lights.values()].filter((light) => light instanceof THREE.SpotLight)).toHaveLength(1);
    for (const light of lights.values()) expect(light.intensity).toBeGreaterThan(1_000);

    configureProductionLighting(scene);

    for (const [name, light] of lights) {
      expect(light.intensity).toBe(PRODUCTION_LIGHT_INTENSITIES[name]);
      expect(lightState(light)).toEqual(originalLightStates.get(name));
    }
    expect(meshState(scene)).toEqual(originalMeshes);
    // This also binds the bitmap/emissive texture metadata that Node did not decode.
    expect(readFileSync(assetPath).equals(bytes)).toBe(true);
  });

  it("leaves unrelated scene lights untouched and is idempotent for the normalized production lights", async () => {
    const { scene } = await loadRoom();
    const fill = new THREE.PointLight(0x83adff, 8.4, 7.2, 1.3);
    fill.name = "runtime-fill";
    fill.position.set(1.3, 2.2, -0.8);
    fill.layers.enable(4);
    const spot = new THREE.SpotLight(0xffe2a0, 12.6, 4.3, 0.72, 0.31, 1.6);
    spot.name = "unrelated-task-light";
    spot.position.set(-0.4, 1.8, -1.2);
    scene.add(fill, spot);
    scene.updateMatrixWorld(true);
    const externalBefore = [lightState(fill, true), lightState(spot, true)];

    configureProductionLighting(scene);
    const afterFirst = [...productionLights(scene)].map(([name, light]) => [name, lightState(light, true)]);
    configureProductionLighting(scene);

    expect([...productionLights(scene)].map(([name, light]) => [name, lightState(light, true)])).toEqual(afterFirst);
    expect([lightState(fill, true), lightState(spot, true)]).toEqual(externalBefore);
  });

  it("the real environment binding eases the task lamp off and on using its calibrated 2.5 baseline", async () => {
    const { scene } = await loadRoom();
    configureProductionLighting(scene);
    const lights = productionLights(scene);
    const lamp = lights.get("Light_TaskDownlight")!;
    const otherIntensities = [...lights].filter(([name]) => name !== "Light_TaskDownlight")
      .map(([name, light]) => [name, light.intensity]);
    const { controller, binding } = bindEnvironment(scene);
    try {
      expect(lamp.intensity).toBe(2.5);
      await controller.send({ type: "SET_LAMP", enabled: false });
      controller.advance(0.125);
      expect(lamp.intensity).toBeCloseTo(1.25);
      controller.advance(0.125);
      expect(lamp.intensity).toBe(0);
      await controller.send({ type: "SET_LAMP", enabled: true });
      controller.advance(0.125);
      expect(lamp.intensity).toBeCloseTo(1.25);
      controller.advance(0.125);
      expect(lamp.intensity).toBe(2.5);
      expect([...lights].filter(([name]) => name !== "Light_TaskDownlight")
        .map(([name, light]) => [name, light.intensity])).toEqual(otherIntensities);
    } finally {
      binding.dispose();
      controller.stop();
    }
  });

  it("LOW and HIGH restore actual point layers without reviving uncalibrated intensities or a lamp switched off", async () => {
    const { scene, bytes } = await loadRoom();
    configureProductionLighting(scene);
    const lights = productionLights(scene);
    const points = [...lights.values()].filter((light): light is THREE.PointLight => light instanceof THREE.PointLight);
    points[0]!.layers.enable(4);
    const masks = points.map((light) => light.layers.mask);
    const lamp = lights.get("Light_TaskDownlight")!;
    const lampMask = lamp.layers.mask;
    const { controller, binding } = bindEnvironment(scene, true);
    const quality = new RuntimeMaterialQuality(scene);
    try {
      quality.apply("low");
      expect(points.map((light) => light.layers.mask)).toEqual([0, 0, 0]);
      expect(lamp.layers.mask).toBe(lampMask);
      expect(lamp.intensity).toBe(2.5);
      await controller.send({ type: "SET_LAMP", enabled: false });
      expect(lamp.intensity).toBe(0);
      quality.apply("high");
      expect(points.map((light) => light.layers.mask)).toEqual(masks);
      expect(lamp.intensity).toBe(0);
      quality.apply("medium");
      expect(lamp.intensity).toBe(0);
      quality.apply("low");
      await controller.send({ type: "SET_LAMP", enabled: true });
      expect(lamp.intensity).toBe(2.5);
      quality.dispose();
      expect(points.map((light) => light.layers.mask)).toEqual(masks);
      for (const [name, light] of lights) expect(light.intensity).toBe(PRODUCTION_LIGHT_INTENSITIES[name]);
      expect(readFileSync(assetPath).equals(bytes)).toBe(true);
    } finally {
      quality.dispose();
      binding.dispose();
      controller.stop();
    }
  });
});
