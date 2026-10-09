import { afterEach, describe, it, expect, vi } from "vitest";
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AssetLoader, AssetLoadingError, AssetResourceOwner } from "../../src/features/world/AssetLoader";
import type { LoadingProgress } from "../../src/features/world/types";

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
    expect(lastReport?.optionalTotal).toBe(3);
    expect(lastReport?.failedAsset).toBe("production-room-full.glb");
  });
});

function gltf(scene = new THREE.Group()): GLTF {
  return { scene, scenes: [scene], cameras: [], animations: [], userData: {}, asset: { version: "2.0" }, parser: {} as GLTF["parser"] };
}

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("Bounded production loading and explicit resource transfer", () => {
  it("returns required readiness while optional network work is hanging, then bounds and aborts each enhancement", async () => {
    vi.useFakeTimers();
    const optionalSignals: AbortSignal[] = [];
    const request = vi.fn((url: string, init: RequestInit) => {
      if (url.includes("production")) return Promise.resolve(new Response(new ArrayBuffer(4)));
      optionalSignals.push(init.signal!);
      return new Promise<Response>(() => {});
    });
    vi.stubGlobal("fetch", request);
    vi.spyOn(GLTFLoader.prototype, "parseAsync").mockImplementation(async () => gltf());
    const assets = await new AssetLoader().loadSession({ sessionToken: 1, optionalTimeoutMs: 50 });
    expect(request).toHaveBeenCalledTimes(6);
    expect(optionalSignals).toHaveLength(3);
    expect(optionalSignals.every((signal) => !signal.aborted)).toBe(true);
    let optionalFinished = false;
    void assets.optionalEnhancements!.then(() => { optionalFinished = true; });
    await Promise.resolve();
    expect(optionalFinished).toBe(false);
    await vi.advanceTimersByTimeAsync(50);
    expect(await assets.optionalEnhancements).toEqual({ deskmatTexture: null, wallpaperTexture: null, interactionGltf: null });
    expect(optionalSignals.every((signal) => signal.aborted)).toBe(true);
    assets.resourceOwner!.dispose();
  });

  it("clamps automatic retries at two and cleans the earlier required asset after later required failure", async () => {
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshStandardMaterial();
    const disposedGeometry = vi.spyOn(geometry, "dispose");
    const disposedMaterial = vi.spyOn(material, "dispose");
    const scene = new THREE.Group();
    scene.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, material));
    const request = vi.fn((url: string) => Promise.resolve(new Response(new ArrayBuffer(4), { status: url.includes("room-full") ? 200 : 503 })));
    vi.stubGlobal("fetch", request);
    vi.spyOn(GLTFLoader.prototype, "parseAsync").mockResolvedValue(gltf(scene));
    await expect(new AssetLoader().loadSession({ sessionToken: 1, maxRetries: 100 })).rejects.toMatchObject({ name: "AssetLoadingError", retryCount: 2 });
    expect(request).toHaveBeenCalledTimes(4);
    expect(disposedGeometry).toHaveBeenCalledTimes(1);
    expect(disposedMaterial).toHaveBeenCalledTimes(1);
  });

  it("aborts the actual request and rejects promptly without waiting for a stalled network adapter", async () => {
    const abort = new AbortController();
    let networkSignal: AbortSignal | undefined;
    vi.stubGlobal("fetch", (_url: string, init: RequestInit) => { networkSignal = init.signal!; return new Promise(() => {}); });
    const pending = new AssetLoader().loadSession({ sessionToken: 1, signal: abort.signal });
    const rejection = expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(networkSignal?.aborted).toBe(false);
    abort.abort();
    await rejection;
    expect(networkSignal?.aborted).toBe(true);
  });

  it("disposes a decoded GLTF arriving after cancellation exactly once, including its shared bitmap", async () => {
    const abort = new AbortController();
    vi.stubGlobal("fetch", () => Promise.resolve(new Response(new ArrayBuffer(4))));
    let resolveParse!: (result: GLTF) => void;
    let announceParse!: () => void;
    const parsing = new Promise<void>((resolve) => { announceParse = resolve; });
    vi.spyOn(GLTFLoader.prototype, "parseAsync").mockImplementation(() => { announceParse(); return new Promise((resolve) => { resolveParse = resolve; }); });
    const pending = new AssetLoader().loadSession({ sessionToken: 1, signal: abort.signal });
    const rejection = expect(pending).rejects.toMatchObject({ name: "AbortError" });
    await parsing;
    abort.abort();
    await rejection;
    const bitmap = { close: vi.fn() };
    const map = new THREE.Texture(bitmap as unknown as TexImageSource);
    const material = new THREE.MeshStandardMaterial({ map });
    const geometry = new THREE.BoxGeometry();
    const disposeGeometry = vi.spyOn(geometry, "dispose");
    const disposeMaterial = vi.spyOn(material, "dispose");
    const disposeMap = vi.spyOn(map, "dispose");
    const scene = new THREE.Group();
    scene.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, material));
    resolveParse(gltf(scene));
    await Promise.resolve();
    await Promise.resolve();
    expect(disposeGeometry).toHaveBeenCalledTimes(1);
    expect(disposeMaterial).toHaveBeenCalledTimes(1);
    expect(disposeMap).toHaveBeenCalledTimes(1);
    expect(bitmap.close).toHaveBeenCalledTimes(1);
  });

  it("times out a stalled required request at a finite total deadline", async () => {
    vi.useFakeTimers();
    const signals: AbortSignal[] = [];
    vi.stubGlobal("fetch", (_url: string, init: RequestInit) => { signals.push(init.signal!); return new Promise(() => {}); });
    const pending = new AssetLoader().loadSession({ sessionToken: 1, attemptTimeoutMs: 50, requiredTimeoutMs: 80 });
    const rejection = expect(pending).rejects.toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(80);
    await rejection;
    expect(signals).toHaveLength(2);
    expect(signals.every((signal) => signal.aborted)).toBe(true);
  });

  it("releases pruned-only resources promptly but preserves geometry and bitmap shared with retained objects", () => {
    const owner = new AssetResourceOwner();
    const bitmap = { close: vi.fn() };
    const retainedMap = new THREE.Texture(bitmap as unknown as TexImageSource);
    const prunedMap = new THREE.Texture(bitmap as unknown as TexImageSource);
    const sharedGeometry = new THREE.BoxGeometry();
    const prunedGeometry = new THREE.BoxGeometry();
    const prunedMaterial = new THREE.MeshStandardMaterial({ map: prunedMap });
    const retainedMaterial = new THREE.MeshStandardMaterial({ map: retainedMap });
    const disposeShared = vi.spyOn(sharedGeometry, "dispose");
    const disposePruned = vi.spyOn(prunedGeometry, "dispose");
    const scene = new THREE.Group();
    const retained = new THREE.Mesh(sharedGeometry, retainedMaterial);
    const pruned = new THREE.Group();
    pruned.add(new THREE.Mesh(sharedGeometry, prunedMaterial), new THREE.Mesh(prunedGeometry, prunedMaterial));
    scene.add(retained, pruned);
    owner.adoptGltf(gltf(scene));
    scene.remove(pruned);
    owner.releaseUnused(scene);
    expect(disposePruned).toHaveBeenCalledTimes(1);
    expect(disposeShared).not.toHaveBeenCalled();
    expect(bitmap.close).not.toHaveBeenCalled();
    owner.dispose();
    owner.dispose();
    expect(disposeShared).toHaveBeenCalledTimes(1);
    expect(disposePruned).toHaveBeenCalledTimes(1);
    expect(bitmap.close).toHaveBeenCalledTimes(1);
  });
});
