import { afterEach, describe, it, expect, vi } from "vitest";
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AssetLoader, AssetLoadingError } from "../../src/features/world/AssetLoader";
import type { LoadingProgress } from "../../src/features/world/types";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("AssetLoader - Single Session Owner and Asset Hierarchy", () => {
  it("exposes unique single owner ID", () => {
    const loader = new AssetLoader("primary-asset-loader");
    expect(loader.getOwnerId()).toBe("primary-asset-loader");
  });

  it("handles cancelled load session via AbortSignal", async () => {
    const loader = new AssetLoader();
    const abortController = new AbortController();
    abortController.abort(); // Abort before load

    await expect(
      loader.loadSession({
        sessionToken: 1,
        signal: abortController.signal,
      })
    ).rejects.toThrow();
  });

  it("distinguishes required vs optional assets on simulated failure", async () => {
    const loader = new AssetLoader();
    const progressReports: LoadingProgress[] = [];

    await expect(
      loader.loadSession({
        sessionToken: 1,
        simulateAssetError: true,
        onProgress: (p) => progressReports.push(p),
      })
    ).rejects.toThrowError(AssetLoadingError);

    expect(progressReports.length).toBeGreaterThan(0);
    const lastReport = progressReports[progressReports.length - 1];
    expect(lastReport?.requiredTotal).toBe(3);
    expect(lastReport?.optionalTotal).toBe(1);
    expect(lastReport?.failedAsset).toBe("production-room-full.glb");
  });

  it("resolves the required session without requesting unused textures or optional interaction proxies", async () => {
    const gltf = { scene: new THREE.Group(), animations: [] } as unknown as GLTF;
    const requiredLoad = vi.spyOn(GLTFLoader.prototype, "loadAsync").mockResolvedValue(gltf);
    const fetchOptional = vi.fn();
    vi.stubGlobal("fetch", fetchOptional);

    const assets = await new AssetLoader().loadSession({ sessionToken: 4 });

    expect(requiredLoad).toHaveBeenCalledTimes(3);
    expect(requiredLoad.mock.calls.map(([url]) => url)).toEqual([
      "/models/production-room-full.glb",
      "/models/resident-production.glb",
      "/models/fixture-production.glb",
    ]);
    expect(fetchOptional).not.toHaveBeenCalled();
    expect(assets.deskmatTexture).toBeNull();
    expect(assets.wallpaperTexture).toBeNull();
    expect(assets.interactionGltf).toBeNull();
  });

  it("loads optional interaction proxies separately and reports their fallback on failure", async () => {
    const fetchOptional = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchOptional);
    const progressReports: LoadingProgress[] = [];

    const assets = await new AssetLoader().loadOptionalInteractionAssets({
      mobile: true,
      onProgress: (progress) => progressReports.push(progress),
    });

    expect(assets).toBeNull();
    expect(fetchOptional).toHaveBeenCalledWith("/models/interaction-assets-mobile.glb", {});
    expect(progressReports).toMatchObject([{
      stage: "Optional interaction targets unavailable; production mesh fallback active.",
      optionalLoaded: 1,
      optionalTotal: 1,
    }]);
  });

  it("aborts optional work and disposes a late GLTF if the runtime was cancelled during parsing", async () => {
    const abortController = new AbortController();
    const gltfScene = new THREE.Group();
    const geometry = new THREE.BoxGeometry();
    const texture = new THREE.Texture();
    const material = new THREE.MeshBasicMaterial({ map: texture });
    gltfScene.add(new THREE.Mesh(geometry, material));
    const gltf = { scene: gltfScene, animations: [] } as unknown as GLTF;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }));
    vi.spyOn(GLTFLoader.prototype, "parseAsync").mockImplementation(async () => {
      abortController.abort();
      return gltf;
    });
    const geometryDispose = vi.spyOn(geometry, "dispose");
    const textureDispose = vi.spyOn(texture, "dispose");
    const materialDispose = vi.spyOn(material, "dispose");

    const result = await new AssetLoader().loadOptionalInteractionAssets({ signal: abortController.signal });

    expect(result).toBeNull();
    expect(geometryDispose).toHaveBeenCalledTimes(1);
    expect(textureDispose).toHaveBeenCalledTimes(1);
    expect(materialDispose).toHaveBeenCalledTimes(1);
  });
});
