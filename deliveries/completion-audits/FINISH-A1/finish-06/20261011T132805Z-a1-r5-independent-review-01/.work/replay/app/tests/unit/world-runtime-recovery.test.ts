import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AssetLoader, type LoadedAssets } from "../../src/features/world/AssetLoader";
import { CLIP_DURATIONS } from "../../src/features/world/SceneIntegrator";
import { WorldRuntime } from "../../src/features/world/WorldRuntime";

const { render } = vi.hoisted(() => ({ render: vi.fn() }));

// Keep the scene integration, directors and lifecycle real. Only the GPU and
// network timing are adapters; these tests do not establish browser GPU behavior.
vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();
  return {
    ...actual,
    WebGLRenderer: class {
      shadowMap = {};
      info = { render: { calls: 1, triangles: 1 } };
      render = render;
      getContext() { return { getExtension: () => null, getParameter: () => "test-renderer" }; }
      setPixelRatio() {}
      getPixelRatio() { return 1; }
      setSize() {}
      dispose() {}
      forceContextLoss() {}
    },
  };
});

function canvas() {
  return Object.assign(new EventTarget(), { isConnected: true, dataset: {}, style: {} }) as unknown as HTMLCanvasElement;
}

const runtimes: WorldRuntime[] = [];

afterEach(() => {
  for (const runtime of runtimes.splice(0)) runtime.dispose();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  render.mockClear();
});

function loadedAssets(): LoadedAssets {
  const node = (name: string) => Object.assign(new THREE.Group(), { name });
  const room = new THREE.Group();
  room.add(node("desk"));
  const avatar = new THREE.Group();
  const resident = node("resident");
  resident.add(node("body-turn"), node("head"), new THREE.SkinnedMesh());
  avatar.add(resident);
  const fixture = new THREE.Group();
  fixture.add(node("chair-root"), node("chair-base"));
  const gltf = (scene: THREE.Group): GLTF => ({
    scene, scenes: [scene], cameras: [], userData: {}, asset: { version: "2.0" },
    animations: Object.entries(CLIP_DURATIONS).map(([name, duration]) => new THREE.AnimationClip(name, duration, [])),
    parser: {} as GLTF["parser"],
  });
  return {
    w1Gltf: gltf(room), avatarGltf: gltf(avatar), fixtureGltf: gltf(fixture),
    interactionGltf: null, deskmatTexture: null, wallpaperTexture: null,
  };
}

function delayedLoad() {
  let resolve!: (assets: LoadedAssets) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<LoadedAssets>((resolveAssets, rejectAssets) => {
    resolve = resolveAssets;
    reject = rejectAssets;
  });
  vi.spyOn(AssetLoader.prototype, "loadSession").mockReturnValueOnce(promise);
  return {
    reject,
    async complete() {
      resolve(loadedAssets());
      await promise;
      await Promise.resolve();
    },
  };
}

function frameHarness(initialVisibility: DocumentVisibilityState = "visible") {
  const queued = new Map<number, FrameRequestCallback>();
  let nextFrame = 0;
  let timestamp = performance.now();
  const documentAdapter = Object.assign(new EventTarget(), {
    visibilityState: initialVisibility, querySelectorAll: () => [],
  });
  vi.stubGlobal("document", documentAdapter);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    const id = ++nextFrame;
    queued.set(id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => queued.delete(id));
  return {
    queued,
    visibility(state: DocumentVisibilityState) {
      documentAdapter.visibilityState = state;
      documentAdapter.dispatchEvent(new Event("visibilitychange"));
    },
    tick() {
      const callbacks = [...queued.values()];
      queued.clear();
      timestamp += 16;
      for (const callback of callbacks) callback(timestamp);
    },
    retainedCallback() {
      const callback = [...queued.values()][0];
      expect(callback).toBeDefined();
      return () => callback!(timestamp + 16);
    },
  };
}

function startRuntime(options: Partial<ConstructorParameters<typeof WorldRuntime>[0]> = {}) {
  const runtime = new WorldRuntime({ canvas: canvas(), reducedMotion: true, initialTier: "low", ...options });
  runtimes.push(runtime);
  return runtime;
}

describe("Production runtime failure retirement", () => {
  it("a failed runtime cannot schedule rendering when visibility resumes", async () => {
    const requestFrame = vi.fn();
    vi.stubGlobal("requestAnimationFrame", requestFrame);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const runtime = new WorldRuntime({ canvas: canvas(), simulateRendererError: true });
    await Promise.resolve();
    expect(runtime.lifecycleManager.getState()).toBe("FAILURE");
    runtime.pause();
    runtime.resume();
    expect(requestFrame).not.toHaveBeenCalled();
    runtime.dispose();
  });

  it("retired initialization cannot report an obsolete error and repeated disposal does no extra work", async () => {
    const onError = vi.fn();
    const onSamplingPause = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const runtime = new WorldRuntime({ canvas: canvas(), simulateRendererError: true, onError, onSamplingPause });
    runtime.dispose();
    runtime.dispose();
    await Promise.resolve();
    expect(onError).not.toHaveBeenCalled();
    expect(onSamplingPause).toHaveBeenCalledTimes(1);
    expect(runtime.lifecycleManager.getState()).toBe("STATIC");
  });
});

describe("Single render loop with delayed assets", () => {
  it("initialization starts one chain and each browser tick renders once", async () => {
    const frames = frameHarness();
    const load = delayedLoad();
    const runtime = startRuntime();
    expect(runtime.lifecycleManager.getState()).toBe("LOADING");
    expect(frames.queued.size).toBe(0);
    await load.complete();
    expect(runtime.lifecycleManager.getState()).toBe("HOME");
    expect(frames.queued.size).toBe(1);
    for (let tick = 1; tick <= 3; tick++) {
      frames.tick();
      expect(render).toHaveBeenCalledTimes(tick);
      expect(frames.queued.size).toBe(1);
    }
    const retained = frames.retainedCallback();
    runtime.dispose();
    expect(frames.queued.size).toBe(0);
    retained();
    expect(render).toHaveBeenCalledTimes(3);
    expect(frames.queued.size).toBe(0);
  });

  it("hide/show during loading and repeated resume cannot create a second chain", async () => {
    const frames = frameHarness();
    const load = delayedLoad();
    const runtime = startRuntime();
    for (let cycle = 0; cycle < 3; cycle++) {
      frames.visibility("hidden");
      frames.visibility("visible");
      runtime.resume();
      expect(frames.queued.size).toBe(0);
    }
    await load.complete();
    expect(frames.queued.size).toBe(1);
    frames.tick();
    expect(render).toHaveBeenCalledTimes(1);
    expect(frames.queued.size).toBe(1);
    const canceled = frames.retainedCallback();
    frames.visibility("hidden");
    expect(frames.queued.size).toBe(0);
    frames.visibility("visible");
    frames.visibility("visible");
    runtime.resume();
    expect(frames.queued.size).toBe(1);
    canceled();
    expect(render).toHaveBeenCalledTimes(1);
    expect(frames.queued.size).toBe(1);
    frames.tick();
    expect(render).toHaveBeenCalledTimes(2);
    expect(frames.queued.size).toBe(1);
  });

  it.each(["initially hidden", "hidden during loading"])("completion stays paused when %s", async (scenario) => {
    const frames = frameHarness(scenario === "initially hidden" ? "hidden" : "visible");
    const load = delayedLoad();
    const runtime = startRuntime();
    if (scenario === "hidden during loading") frames.visibility("hidden");
    await load.complete();
    expect(runtime.lifecycleManager.getState()).toBe("HOME");
    expect(frames.queued.size).toBe(0);
    expect(render).not.toHaveBeenCalled();
    frames.visibility("visible");
    expect(frames.queued.size).toBe(1);
    frames.tick();
    expect(render).toHaveBeenCalledTimes(1);
  });

  it.each(["dispose", "portfolio"])("%s during loading retires the pending initialization", async (retirement) => {
    const frames = frameHarness();
    const load = delayedLoad();
    const onReady = vi.fn();
    const runtime = startRuntime({ onReady });
    frames.visibility("hidden");
    frames.visibility("visible");
    if (retirement === "dispose") runtime.dispose();
    else runtime.lifecycleManager.continueWithPortfolio();
    await load.complete();
    frames.visibility("hidden");
    frames.visibility("visible");
    expect(runtime.lifecycleManager.getState()).toBe("STATIC");
    expect(onReady).not.toHaveBeenCalled();
    expect(frames.queued.size).toBe(0);
    expect(render).not.toHaveBeenCalled();
  });

  it("a failed asset load remains retired while a replacement retry owns one chain", async () => {
    const frames = frameHarness();
    const failedLoad = delayedLoad();
    const onError = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const failed = startRuntime({ onError });
    frames.visibility("hidden");
    frames.visibility("visible");
    failedLoad.reject(new Error("required asset unavailable"));
    await Promise.resolve();
    await Promise.resolve();
    expect(failed.lifecycleManager.getState()).toBe("FAILURE");
    expect(onError).toHaveBeenCalledTimes(1);
    frames.visibility("hidden");
    frames.visibility("visible");
    expect(frames.queued.size).toBe(0);
    failed.dispose();

    const retryLoad = delayedLoad();
    const retry = startRuntime();
    frames.visibility("hidden");
    frames.visibility("visible");
    await retryLoad.complete();
    expect(retry.lifecycleManager.getState()).toBe("HOME");
    expect(frames.queued.size).toBe(1);
    frames.tick();
    expect(render).toHaveBeenCalledTimes(1);
    expect(frames.queued.size).toBe(1);
  });
});
