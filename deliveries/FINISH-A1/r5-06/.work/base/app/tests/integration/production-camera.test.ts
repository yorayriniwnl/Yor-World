import { readFileSync } from "node:fs";
import path from "node:path";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { CameraDirector, CAMERA_PRESETS } from "@/features/world/CameraDirector";
import { CharacterDirector } from "@/features/world/CharacterDirector";
import { EntranceCoordinator, entrancePositionAt } from "@/features/world/EntranceCoordinator";

/** Decode the shipped mesh buffers and transforms. Bitmap decoding is unnecessary
 * for collision/raycast tests in Node; the file and its geometry stay untouched.
 */
async function loadProductionRoom() {
  const file = readFileSync(path.join(process.cwd(), "public/models/production-room-full.glb"));
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
  glb.writeUInt32LE(0x46546c67, 0);
  glb.writeUInt32LE(2, 4);
  glb.writeUInt32LE(glb.length, 8);
  glb.writeUInt32LE(jsonChunk.length, 12);
  glb.writeUInt32LE(0x4e4f534a, 16);
  jsonChunk.copy(glb, 20);
  binaryChunks.copy(glb, 20 + jsonChunk.length);
  const buffer = glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength) as ArrayBuffer;
  const room = (await new GLTFLoader().parseAsync(buffer, "")).scene;
  room.updateMatrixWorld(true);
  return room;
}

describe("Production room camera integration", () => {
  let room: THREE.Group;
  let shellBounds: { name: string; bounds: THREE.Box3 }[];

  beforeAll(async () => {
    room = await loadProductionRoom();
    shellBounds = [];
    room.traverse((node) => {
      // The door leaf is articulated. These are the frozen, immovable shell and jambs.
      if (node instanceof THREE.Mesh && /^(wall_|door_frame_|floor_|ceiling_)/.test(node.name)) {
        shellBounds.push({ name: node.name, bounds: new THREE.Box3().setFromObject(node) });
      }
    });
    expect(shellBounds.length).toBeGreaterThanOrEqual(16);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function boundsOf(name: string): THREE.Box3 {
    const found = shellBounds.find((node) => node.name === name);
    expect(found, `missing frozen shell node ${name}`).toBeDefined();
    return found!.bounds;
  }

  function expectClear(position: THREE.Vector3, near = 0.05) {
    for (const node of shellBounds) {
      expect(node.bounds.distanceToPoint(position), `${node.name} near-plane clearance at ${position.toArray()}`)
        .toBeGreaterThan(near);
    }
  }

  function expectClearSegment(start: THREE.Vector3, end: THREE.Vector3, near = 0.05) {
    const delta = end.clone().sub(start);
    const distance = delta.length();
    if (distance === 0) return;
    const ray = new THREE.Ray(start, delta.divideScalar(distance));
    for (const node of shellBounds) {
      // Expanding the actual shell bounds covers the camera's near-plane clearance
      // along the complete segment, including between the sampled animation frames.
      const hit = ray.intersectBox(node.bounds.clone().expandByScalar(near), new THREE.Vector3());
      if (hit) {
        expect(hit.distanceTo(start), `${node.name} intersects camera travel`).toBeGreaterThan(distance);
      }
    }
  }

  it.each([
    ["home-desktop", 16 / 9],
    ["home-mobile", 390 / 844],
  ] as const)("%s sees the real room beyond its near plane", (preset, aspect) => {
    const camera = new THREE.PerspectiveCamera(60, aspect, 0.05, 30);
    const director = new CameraDirector(camera, preset);
    camera.updateMatrixWorld(true);
    expectClear(camera.position, camera.near);

    // Demonstrate the original integration failure using the actual asset bounds.
    expect(boundsOf("wall_left").containsPoint(new THREE.Vector3(-2.15, 1.7, 1.55))).toBe(true);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const center = raycaster.intersectObject(room, true)[0];
    expect(center, "center ray must reach production room geometry").toBeDefined();
    expect(center!.distance).toBeGreaterThan(0.5);
    expect(center!.object.name).not.toMatch(/^wall_/);

    for (const [x, y] of [[-0.8, -0.8], [-0.8, 0.8], [0.8, -0.8], [0.8, 0.8]]) {
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      const first = raycaster.intersectObject(room, true)[0];
      if (first) expect(first.distance, `viewport ray ${x},${y}`).toBeGreaterThan(camera.near);
    }
    director.dispose();
  });

  it("hallway and entry start inside the actual hallway enclosure", () => {
    const left = boundsOf("wall_hallway_l");
    const right = boundsOf("wall_hallway_r");
    const back = boundsOf("wall_hallway_b");
    for (const preset of ["hallway", "entry"] as const) {
      const position = new THREE.Vector3(...CAMERA_PRESETS[preset].position);
      expectClear(position);
      expect(position.x).toBeGreaterThan(left.max.x + 0.05);
      expect(position.x).toBeLessThan(right.min.x - 0.05);
      expect(position.z).toBeLessThan(back.min.z - 0.05);
      expect(position.z).toBeGreaterThan(boundsOf("wall_front_header").max.z + 0.05);
    }
  });

  it.each([false, true])("the actual %s-mobile entrance clears every static wall and doorframe", async (isMobile) => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.stubGlobal("cancelAnimationFrame", () => undefined);
    vi.spyOn(performance, "now").mockReturnValue(0);
    const camera = new THREE.PerspectiveCamera(60, isMobile ? 390 / 844 : 16 / 9, 0.05, 30);
    const director = new CameraDirector(camera, isMobile ? "home-mobile" : "home-desktop");
    const body = new THREE.Object3D();
    const chair = new THREE.Object3D();
    const character = new CharacterDirector(new THREE.AnimationMixer(body), new THREE.AnimationMixer(chair), {}, {}, body, chair);
    const entrance = new EntranceCoordinator(director, character);
    const completed = entrance.playEntrance({ sessionToken: 1, isMobile, durationSec: 1 });
    const positions = [camera.position.clone()];

    for (let sample = 0; sample <= 200; sample++) {
      const frame = frames.shift();
      expect(frame, `missing real entrance frame ${sample}`).toBeDefined();
      frame!(sample * 5);
      positions.push(camera.position.clone());
      expectClear(camera.position, camera.near);
    }
    await completed;

    for (let sample = 1; sample < positions.length; sample++) {
      expectClearSegment(positions[sample - 1]!, positions[sample]!, camera.near);
    }
    // Require passage through the actual gap between the door jambs while the
    // trajectory crosses the complete thickness of the front wall.
    const front = boundsOf("wall_front_header");
    const doorwaySamples = positions.filter((position) => position.z >= front.min.z && position.z <= front.max.z);
    expect(doorwaySamples.length).toBeGreaterThan(0);
    for (const position of doorwaySamples) {
      expect(position.x).toBeGreaterThan(boundsOf("door_frame_left").max.x + camera.near);
      expect(position.x).toBeLessThan(boundsOf("door_frame_right").min.x - camera.near);
      expect(position.y).toBeLessThan(boundsOf("door_frame_top").min.y - camera.near);
    }
    expect(camera.position.toArray()).toEqual(CAMERA_PRESETS[isMobile ? "home-mobile" : "home-desktop"].position);
    expect(entrancePositionAt(0, isMobile).toArray()).toEqual(positions[0]!.toArray());
    expect(entrancePositionAt(1, isMobile).toArray()).toEqual(camera.position.toArray());
    expect(entrance.getDiagnostics().phase).toBe("settled");
    entrance.dispose();
    director.dispose();
    character.dispose();
  });
});
