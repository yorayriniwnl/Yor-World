import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { SessionResourceLedger } from "../../../src/features/world/asset-resources";
import { LifecycleManager } from "../../../src/features/world/LifecycleManager";
import { RuntimeMaterialQuality, installOptionalTextureOnScene } from "../../../src/features/world/RuntimeMaterialQuality";
import { WorldRuntime } from "../../../src/features/world/WorldRuntime";

describe("Completion: optional texture adoption and runtime quality lifecycle", () => {
  it("buffers typed texture IDs until integration and replays each only to its own targets", () => {
    const lifecycle = new LifecycleManager();
    const token = lifecycle.requestEntry();
    lifecycle.startLoading(token);
    const session = lifecycle.getSessionId();
    const ledger = new SessionResourceLedger(session);
    const deskmat = new THREE.Texture();
    const wallpaper = new THREE.Texture();
    ledger.registerTexture(deskmat);
    ledger.registerTexture(wallpaper);

    const runtime = Object.create(WorldRuntime.prototype) as WorldRuntime;
    Object.assign(runtime, {
      isDisposed: false,
      lifecycleManager: lifecycle,
      integratedResult: null,
      materialQuality: null,
      pendingOptionalTextures: new Map(),
      resourceLedger: ledger,
      optionalTextureTargets: {},
    });
    const consume = (runtime as unknown as {
      consumeOptionalAsset: (result: unknown, expected: typeof session) => "adopted" | "rejected";
    }).consumeOptionalAsset.bind(runtime);
    expect(consume({ session, id: "deskmat", kind: "texture", resource: deskmat }, session)).toBe("adopted");
    expect(consume({ session, id: "wallpaper", kind: "texture", resource: wallpaper }, session)).toBe("adopted");

    const baseMap = new THREE.Texture();
    const shared = new THREE.MeshStandardMaterial({ map: baseMap });
    const desk = new THREE.Mesh(new THREE.BoxGeometry(), shared);
    const monitor = new THREE.Mesh(new THREE.BoxGeometry(), shared);
    desk.name = "desk_mat";
    monitor.name = "monitor_screen_center";
    const scene = new THREE.Group();
    scene.add(desk, monitor);
    const quality = new RuntimeMaterialQuality(scene);
    quality.apply("low");
    Object.assign(runtime, { integratedResult: { scene }, materialQuality: quality });
    (runtime as unknown as { installBufferedOptionalTextures: () => void }).installBufferedOptionalTextures();

    expect((runtime as unknown as { optionalTextureTargets: Record<string, readonly string[]> }).optionalTextureTargets).toEqual({
      deskmat: ["desk_mat"],
      wallpaper: ["monitor_screen_center"],
    });
    expect((desk.material as unknown as THREE.MeshLambertMaterial).map).toBe(deskmat);
    expect((monitor.material as unknown as THREE.MeshLambertMaterial).map).toBe(wallpaper);

    quality.dispose();
    ledger.dispose();
    lifecycle.dispose();
  });

  it("keeps deskmat and wallpaper scoped to their own meshes across LOW/HIGH", () => {
    const session = { generation: 3, token: 14 } as const;
    const ledger = new SessionResourceLedger(session);
    const baseMap = new THREE.Texture();
    const deskmat = new THREE.Texture();
    const wallpaper = new THREE.Texture();
    const sharedBase = new THREE.MeshStandardMaterial({ map: baseMap });
    const desk = new THREE.Mesh(new THREE.BoxGeometry(), sharedBase);
    const secondDeskTarget = new THREE.Mesh(new THREE.BoxGeometry(), sharedBase);
    const monitor = new THREE.Mesh(new THREE.BoxGeometry(), sharedBase);
    const unrelated = new THREE.Mesh(new THREE.BoxGeometry(), sharedBase);
    desk.name = "desk_mat_overlay";
    secondDeskTarget.name = "production_topography_surface";
    monitor.name = "monitor_screen_center_display";
    unrelated.name = "unrelated_static_surface";
    const scene = new THREE.Group();
    scene.add(desk, secondDeskTarget, monitor, unrelated);

    const quality = new RuntimeMaterialQuality(scene);
    quality.apply("low");
    ledger.registerTexture(deskmat);
    ledger.registerTexture(wallpaper);
    const disposeBaseMap = vi.spyOn(baseMap, "dispose");
    const disposeDeskmat = vi.spyOn(deskmat, "dispose");
    const disposeWallpaper = vi.spyOn(wallpaper, "dispose");

    expect(installOptionalTextureOnScene("deskmat", scene, deskmat, quality)).toEqual([
      "desk_mat_overlay",
      "production_topography_surface",
    ]);
    expect((desk.material as unknown as THREE.MeshLambertMaterial).map).toBe(deskmat);
    expect((secondDeskTarget.material as unknown as THREE.MeshLambertMaterial).map).toBe(deskmat);
    expect((monitor.material as unknown as THREE.MeshLambertMaterial).map).toBe(baseMap);
    expect(unrelated.material).toBe(monitor.material);

    quality.apply("high");
    expect((desk.material as THREE.MeshStandardMaterial).map).toBe(deskmat);
    expect((monitor.material as THREE.MeshStandardMaterial).map).toBe(baseMap);
    expect(installOptionalTextureOnScene("wallpaper", scene, wallpaper, quality)).toEqual([
      "monitor_screen_center_display",
    ]);
    expect((monitor.material as THREE.MeshStandardMaterial).map).toBe(wallpaper);
    expect((desk.material as THREE.MeshStandardMaterial).map).toBe(deskmat);

    quality.apply("low");
    expect((monitor.material as unknown as THREE.MeshLambertMaterial).map).toBe(wallpaper);
    expect((desk.material as unknown as THREE.MeshLambertMaterial).map).toBe(deskmat);

    quality.dispose();
    ledger.dispose();
    ledger.dispose();
    expect(disposeDeskmat).toHaveBeenCalledOnce();
    expect(disposeWallpaper).toHaveBeenCalledOnce();
    expect(disposeBaseMap).not.toHaveBeenCalled();
  });

  it("rolls back every prior material installation when a later target rejects the map", () => {
    const baseMap = new THREE.Texture();
    const lateMap = new THREE.Texture();
    const original = new THREE.MeshStandardMaterial({ map: baseMap });
    const valid = new THREE.Mesh(new THREE.BoxGeometry(), original);
    const invalid = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.ShaderMaterial());
    valid.name = "deskmat_topography_valid";
    invalid.name = "deskmat_topography_invalid";
    const scene = new THREE.Group();
    scene.add(valid, invalid);
    const quality = new RuntimeMaterialQuality(scene);
    quality.apply("low");
    const previousVisible = valid.material;

    expect(() => installOptionalTextureOnScene("deskmat", scene, lateMap, quality)).toThrow(/color-map slot/i);
    expect(valid.material).toBe(previousVisible);
    expect((valid.material as unknown as THREE.MeshLambertMaterial).map).toBe(baseMap);
    quality.apply("high");
    expect(valid.material).toBe(original);
    quality.dispose();
  });

  it("rejects an optional ID when its scene target is missing", () => {
    const scene = new THREE.Group();
    const quality = new RuntimeMaterialQuality(scene);
    const texture = new THREE.Texture();
    expect(installOptionalTextureOnScene("wallpaper", scene, texture, quality)).toBeNull();
    quality.dispose();
  });
});
