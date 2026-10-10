import { readFileSync } from "node:fs";
import path from "node:path";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { describe, expect, it, vi } from "vitest";
import { integrateScene } from "@/features/world/SceneIntegrator";
import { WorldInteractionBinding } from "@/features/world/WorldInteractionBinding";
import { ExperienceController } from "@/features/experience/controller";
import { RuntimeMaterialQuality } from "@/features/world/RuntimeMaterialQuality";
import { LowQualityBatch } from "@/features/world/LowQualityBatch";

/** Parse the shipped GLB's actual mesh/skin/animation/node data. Omit bitmap decoding
 * only in this Node test; no production asset is changed or written by the test.
 */
async function parseFrozenModel(name: string) {
  const file = readFileSync(path.join(process.cwd(), "public/models", name));
  const jsonLength = file.readUInt32LE(12);
  const json = JSON.parse(file.subarray(20, 20 + jsonLength).toString("utf8"));
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
  const binaryChunks = file.subarray(20 + jsonLength);
  const glb = Buffer.alloc(20 + jsonChunk.length + binaryChunks.length);
  glb.writeUInt32LE(0x46546c67, 0); glb.writeUInt32LE(2, 4); glb.writeUInt32LE(glb.length, 8);
  glb.writeUInt32LE(jsonChunk.length, 12); glb.writeUInt32LE(0x4e4f534a, 16);
  jsonChunk.copy(glb, 20); binaryChunks.copy(glb, 20 + jsonChunk.length);
  const buffer = glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength) as ArrayBuffer;
  return new GLTFLoader().parseAsync(buffer, "");
}

function fakeCanvas() {
  return Object.assign(new EventTarget(), {
    style: { cursor: "" },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 1000 }),
    setPointerCapture: vi.fn(), releasePointerCapture: vi.fn(),
  }) as unknown as HTMLCanvasElement;
}

function pointer(canvas: HTMLCanvasElement, type: string, x = 500, y = 500) {
  const event = Object.assign(new Event(type), { pointerId: 1, clientX: x, clientY: y, button: 0 });
  canvas.dispatchEvent(event);
}

describe("Actual frozen production assets and C1 pointer binding", () => {
  it("parses real production rigs, prunes duplicate chair/proof furniture, and keeps F1 anchors", async () => {
    const [room, resident, fixture] = await Promise.all([
      parseFrozenModel("production-room-full.glb"), parseFrozenModel("resident-production.glb"), parseFrozenModel("fixture-production.glb"),
    ]);
    const result = integrateScene(room, resident, fixture);
    expect(result.nodeCounts).toEqual({ residentCount: 1, chairRootCount: 1, chairBaseCount: 1, deskCount: 1, fixtureStaticCount: 0 });
    expect(result.removedW1Nodes).toContain("chair-root");
    expect(result.discardedW2Nodes).toContain("fixture-static");
    result.scene.updateMatrixWorld(true);
    expect(result.resident.getWorldPosition(new THREE.Vector3()).x).toBeCloseTo(0.3);
    expect(result.chairRoot.getWorldPosition(new THREE.Vector3()).z).toBeCloseTo(-0.36);
    expect(result.scene.rotation.toArray().slice(0, 3)).toEqual([0, 0, 0]);
    expect(resident.animations.map((clip) => clip.name)).toContain("attention_glance");
  });

  it.each(["high", "low"] as const)("%s real production phone raycast dispatches contact; disposal detaches events", async (tier) => {
    const [room, interactions] = await Promise.all([parseFrozenModel("production-room-full.glb"), parseFrozenModel("interaction-assets.glb")]);
    const phone = room.scene.getObjectByName("contact_phone_body")!;
    const center = new THREE.Box3().setFromObject(phone).getCenter(new THREE.Vector3());
    const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 30);
    camera.position.copy(center).add(new THREE.Vector3(0, 0.6, 0.9));
    camera.lookAt(center); camera.updateMatrixWorld(true);
    const openRoute = vi.fn();
    const controller = new ExperienceController({ navigation: { openProject: vi.fn(), openRoute }, reducedMotion: true });
    const canvas = fakeCanvas();
    const painting = room.scene.getObjectByName("painting-pivot")!;
    const originalPainting = painting.position.toArray();
    const binding = new WorldInteractionBinding({ canvas, camera, scene: room.scene, interactionScene: interactions.scene,
      controller, enabled: () => true, reducedMotion: () => true });
    expect(binding.getDiagnostics().frozenHitProxyCount).toBe(25);
    expect(binding.getDiagnostics().boundProductionTargets).toBeGreaterThanOrEqual(25);
    const materials = new RuntimeMaterialQuality(room.scene);
    materials.apply(tier);
    const batches = tier === "low" ? new LowQualityBatch(room.scene) : null;
    batches?.apply(tier);
    if (batches) {
      const renderedBatches: THREE.BatchedMesh[] = [];
      room.scene.traverse((node) => { if (node instanceof THREE.BatchedMesh) renderedBatches.push(node); });
      expect(renderedBatches.length, "production geometry must actually batch").toBeGreaterThan(0);
      expect(room.scene.getObjectByName("contact_phone_body")).toBe(phone);
    }
    pointer(canvas, "pointerdown"); pointer(canvas, "pointerup");
    await Promise.resolve();
    expect(openRoute).toHaveBeenCalledExactlyOnceWith("/contact");
    expect(binding.getDiagnostics().lastActivatedId).toBe("contact-phone");
    expect(painting.position.toArray()).toEqual(originalPainting);
    binding.dispose();
    openRoute.mockClear();
    pointer(canvas, "pointerdown"); pointer(canvas, "pointerup");
    expect(openRoute).not.toHaveBeenCalled();
    batches?.dispose();
    materials.dispose();
  });

  it("mismatched frozen IA proxy coordinates never create a ghost production phone hit", async () => {
    const interactions = await parseFrozenModel("interaction-assets.glb");
    const phoneProxy = interactions.scene.getObjectByName("hit_contact_phone")!;
    interactions.scene.updateMatrixWorld(true);
    const center = phoneProxy.getWorldPosition(new THREE.Vector3());
    const scene = new THREE.Group();
    const phone = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.01, 0.18), new THREE.MeshBasicMaterial());
    phone.name = "contact_phone_body"; phone.position.set(2, 1, -1); scene.add(phone);
    const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 30);
    camera.position.copy(center).add(new THREE.Vector3(0, 0.4, 0.6)); camera.lookAt(center);
    const openRoute = vi.fn();
    const controller = new ExperienceController({ navigation: { openProject: vi.fn(), openRoute } });
    const canvas = fakeCanvas();
    const binding = new WorldInteractionBinding({ canvas, camera, scene, interactionScene: interactions.scene,
      controller, enabled: () => true, reducedMotion: () => true });
    pointer(canvas, "pointerdown"); pointer(canvas, "pointerup");
    expect(openRoute).not.toHaveBeenCalled();
    binding.dispose();
  });
});
