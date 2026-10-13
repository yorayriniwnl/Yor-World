import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AssetLoader, type LoadedAssets } from "../../src/features/world/AssetLoader";
import { CLIP_DURATIONS } from "../../src/features/world/SceneIntegrator";
import { WorldRuntime } from "../../src/features/world/WorldRuntime";
import { replayRuntimeAfterControllerEscape, requestRuntimeReplayEntrance } from "../../src/features/world/replay-entrance-actions";
import { PreferencesStore } from "../../src/features/experience/preferences-store";
import { defaultPreferences, defaultWorldSnapshot } from "../../src/contracts/experience";

const { render } = vi.hoisted(() => ({ render: vi.fn() }));

// Keep the scene integration, directors and lifecycle real. Only the GPU and
// network timing are adapters; these tests do not establish browser GPU behavior.
vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();
  return {
    ...actual,
    WebGLRenderer: class {
      shadowMap = {};
      info = { autoReset: true, render: { calls: 0, triangles: 0 }, reset: () => {
        this.info.render.calls = 0;
        this.info.render.triangles = 0;
      } };
      render() {
        render();
        // GPU adapter models shadow, transmission and main draws in order.
        this.info.render.calls += 3;
        if (this.info.autoReset) this.info.reset();
        this.info.render.calls += 5 + 7;
        this.info.render.triangles += 90;
      }
      getContext() { return { getExtension: () => null, getParameter: () => "test-renderer" }; }
      setPixelRatio() {}
      getPixelRatio() { return 1; }
      setSize() {}
      dispose() {}
      forceContextLoss() {}
    },
  };
});

function canvas(width = 0, height = 0) {
  const parentElement = width > 0 && height > 0 ? { clientWidth: width, clientHeight: height } : null;
  return Object.assign(new EventTarget(), { isConnected: true, dataset: {}, style: {}, parentElement }) as unknown as HTMLCanvasElement;
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
  let signal: AbortSignal | undefined;
  const promise = new Promise<LoadedAssets>((resolveAssets, rejectAssets) => {
    resolve = resolveAssets;
    reject = rejectAssets;
  });
  vi.spyOn(AssetLoader.prototype, "loadSession").mockImplementationOnce((options) => {
    signal = options.signal;
    return promise;
  });
  return {
    reject,
    get signal() { return signal; },
    async complete(assets = loadedAssets()) {
      resolve(assets);
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
  it("returns to portfolio by aborting pending required work and disposing a late parse", async () => {
    frameHarness();
    const load = delayedLoad();
    const runtime = startRuntime();
    const lateAssets = loadedAssets();
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshStandardMaterial();
    const disposeGeometry = vi.spyOn(geometry, "dispose");
    const disposeMaterial = vi.spyOn(material, "dispose");
    lateAssets.w1Gltf.scene.add(new THREE.Mesh(geometry, material));

    expect(load.signal?.aborted).toBe(false);
    expect(runtime.continueWithPortfolio()).toBe(true);
    expect(load.signal?.aborted).toBe(true);
    expect(runtime.lifecycleManager.getState()).toBe("STATIC");

    await load.complete(lateAssets);
    expect(runtime.getDiagnostics().residentCount).toBe(0);
    expect(disposeGeometry).toHaveBeenCalledTimes(1);
    expect(disposeMaterial).toHaveBeenCalledTimes(1);
  });

  it("keeps runtime camera snapshots aligned with measured mobile framing and Escape", async () => {
    frameHarness();
    const load = delayedLoad();
    const initialSnapshot = {
      returnToStudio: true as const,
      preferences: { ...defaultPreferences, introCompleted: true },
      world: { ...defaultWorldSnapshot },
      lastProjectId: "helios" as const,
      previousCamera: "home-desktop" as const,
      timestamp: Date.now(),
    };
    const runtime = startRuntime({ canvas: canvas(390, 844), skipInitialEntrance: true, initialSnapshot });
    await load.complete();

    expect(runtime.getDiagnostics().cameraPreset).toBe("home-mobile");
    expect(runtime.experienceController.getSnapshot().activeCamera).toBe("home-mobile");
    await runtime.setCamera("monitor");
    expect(runtime.experienceController.getSnapshot().activeCamera).toBe("monitor");
    await runtime.setCamera("reverse-doorway");
    expect(runtime.getDiagnostics().cameraPreset).toBe("reverse-doorway");
    expect(runtime.experienceController.getSnapshot().activeCamera).toBe("home-mobile");

    runtime.escape();
    expect(runtime.getDiagnostics().cameraPreset).toBe("home-mobile");
    expect(runtime.experienceController.getSnapshot().activeCamera).toBe("home-mobile");
  });

  it("reports a valid initial snapshot restored only after essential assets load", async () => {
    frameHarness();
    const load = delayedLoad();
    const onInitialSnapshotRestored = vi.fn();
    const initialSnapshot = {
      returnToStudio: true as const,
      preferences: { ...defaultPreferences, introCompleted: true, quality: "low" as const },
      world: { ...defaultWorldSnapshot, lampOn: false, blindsOpen: false },
      lastProjectId: "helios" as const,
      previousCamera: "monitor" as const,
      timestamp: Date.now(),
    };
    const runtime = startRuntime({ initialSnapshot, skipInitialEntrance: true, onInitialSnapshotRestored });

    expect(onInitialSnapshotRestored).not.toHaveBeenCalled();
    await load.complete();
    expect(onInitialSnapshotRestored).toHaveBeenCalledTimes(1);
    expect(onInitialSnapshotRestored).toHaveBeenCalledWith(true);
    expect(runtime.experienceController.getSnapshot()).toMatchObject({
      activeCamera: "monitor",
      world: { lampOn: false, blindsOpen: false },
      preferences: { quality: "low", introCompleted: true },
    });
  });

  it("freezes actual decorative clip time while camera/project navigation remains usable", async () => {
    const frames = frameHarness(); const load = delayedLoad(); const navigate = vi.fn();
    const runtime = startRuntime({ reducedMotion: false, skipInitialEntrance: true, onNavigatePublic: navigate });
    await load.complete(); frames.tick(); frames.tick();
    const moving = runtime.getDiagnostics().currentTime; expect(moving).toBeGreaterThan(0);
    runtime.setDecorativePaused(true); frames.tick(); frames.tick();
    expect(runtime.getDiagnostics().currentTime).toBe(moving);
    const pending = runtime.experienceController.send({ type: "OPEN_PROJECT", projectId: "helios", source: "room" });
    runtime.setReducedMotion(true); await pending;
    expect(navigate).toHaveBeenCalledWith("/projects/helios");
    runtime.setReducedMotion(false); runtime.setDecorativePaused(false); frames.tick();
    expect(runtime.getDiagnostics().currentTime).toBeGreaterThan(0);
    expect(frames.queued.size).toBe(1);
  });

  it("settles reduced motion during entrance and replay uses the same asset/session/render owner", async () => {
    const frames = frameHarness(); const load = delayedLoad(); const complete = vi.fn();
    const runtime = startRuntime({ reducedMotion: false, onIntroComplete: complete });
    await load.complete(); expect(runtime.lifecycleManager.getState()).toBe("ENTRANCE");
    const token = runtime.lifecycleManager.getSessionToken(); runtime.setReducedMotion(true);
    expect(runtime.lifecycleManager.getState()).toBe("HOME");
    await Promise.resolve(); expect(complete).toHaveBeenCalledTimes(1);
    expect(runtime.experienceController.preferencesStore.get().introCompleted).toBe(true);
    expect(frames.queued.size).toBe(1);
    runtime.setReducedMotion(false); const replay = runtime.replayEntrance();
    expect(runtime.lifecycleManager.getState()).toBe("ENTRANCE");
    expect(runtime.lifecycleManager.getSessionToken()).toBe(token);
    expect(AssetLoader.prototype.loadSession).toHaveBeenCalledTimes(1);
    runtime.skip(); await replay;
    expect(runtime.lifecycleManager.getState()).toBe("HOME"); expect(complete).toHaveBeenCalledTimes(1);
    expect(frames.queued.size).toBe(1);
  });

  it("settles an active greeting before replay without allocating a new runtime session", async () => {
    const frames = frameHarness(); const load = delayedLoad();
    const runtime = startRuntime({ reducedMotion: false, skipInitialEntrance: true });
    await load.complete();
    const sessionToken = runtime.lifecycleManager.getSessionToken();

    runtime.greet();
    expect(runtime.lifecycleManager.getState()).toBe("TRANSITION");
    const replay = runtime.replayEntrance();
    expect(runtime.lifecycleManager.getState()).toBe("ENTRANCE");
    expect(runtime.lifecycleManager.getSessionToken()).toBe(sessionToken);
    expect(runtime.getDiagnostics().activeClip).toBe("coding_idle");

    runtime.skip();
    await replay;
    expect(runtime.lifecycleManager.getState()).toBe("HOME");
    expect(AssetLoader.prototype.loadSession).toHaveBeenCalledTimes(1);
    expect(frames.queued.size).toBe(1);
  });

  it("HUD, room-control and replay-modal actions share one runtime lifecycle and loaded session", async () => {
    const frames = frameHarness();
    const load = delayedLoad();
    const runtime = startRuntime({ reducedMotion: false, skipInitialEntrance: true });
    await load.complete();
    expect(runtime.lifecycleManager.getState()).toBe("HOME");

    const sessionToken = runtime.lifecycleManager.getSessionToken();
    const rendererOwner = runtime.rendererOwnerId;
    const transitions: string[] = [];
    runtime.lifecycleManager.subscribe((state) => transitions.push(state));
    const whenEntranceStarts = () => new Promise<void>((resolve) => {
      let unsubscribe = () => {};
      unsubscribe = runtime.lifecycleManager.subscribe((state) => {
        if (state === "ENTRANCE") {
          unsubscribe();
          resolve();
        }
      });
    });

    const hudReplay = requestRuntimeReplayEntrance(runtime);
    expect(runtime.lifecycleManager.getState()).toBe("ENTRANCE");
    expect(runtime.lifecycleManager.getSessionToken()).toBe(sessionToken);
    runtime.skip();
    await hudReplay;
    expect(runtime.lifecycleManager.getState()).toBe("HOME");

    await runtime.experienceController.send({ type: "OPEN_PANEL", panel: "room-controls" });
    const roomReplayStarted = whenEntranceStarts();
    const roomControlsReplay = runtime.experienceController.send({ type: "ENTER", replay: true });
    await roomReplayStarted;
    expect(runtime.lifecycleManager.getState()).toBe("ENTRANCE");
    expect(runtime.lifecycleManager.getSessionToken()).toBe(sessionToken);
    expect(runtime.experienceController.getSnapshot().activePanel).toBeNull();
    runtime.skip();
    await roomControlsReplay;

    await runtime.experienceController.send({ type: "OPEN_PANEL", panel: "replay" });
    const modalReplayStarted = whenEntranceStarts();
    const replayModalAction = replayRuntimeAfterControllerEscape(runtime.experienceController, runtime);
    await modalReplayStarted;
    expect(runtime.lifecycleManager.getState()).toBe("ENTRANCE");
    expect(runtime.lifecycleManager.getSessionToken()).toBe(sessionToken);
    runtime.skip();
    await replayModalAction;

    expect(runtime.lifecycleManager.getState()).toBe("HOME");
    expect(runtime.lifecycleManager.getSessionToken()).toBe(sessionToken);
    expect(runtime.rendererOwnerId).toBe(rendererOwner);
    expect(AssetLoader.prototype.loadSession).toHaveBeenCalledTimes(1);
    expect(transitions).toEqual(["ENTRANCE", "HOME", "ENTRANCE", "HOME", "ENTRANCE", "HOME"]);
    expect(frames.queued.size).toBe(1);
  });

  it("keeps a saved sound preference while startup mute remains silent and non-persistent", async () => {
    const frames = frameHarness(); const load = delayedLoad();
    const preferencesStore = new PreferencesStore({ soundEnabled: true, quality: "low" });
    const runtime = startRuntime({ skipInitialEntrance: true, preferencesStore });
    expect(runtime.experienceController.preferencesStore).toBe(preferencesStore);

    runtime.setSound(false, false);
    expect(runtime.soundEnabled).toBe(false);
    expect(runtime.experienceController.getSnapshot().preferences.soundEnabled).toBe(true);

    await load.complete();
    expect(runtime.soundEnabled).toBe(false);
    expect(runtime.experienceController.getSnapshot().preferences.soundEnabled).toBe(true);
    runtime.setSound(true);
    await Promise.resolve();
    expect(runtime.experienceController.getSnapshot().preferences.soundEnabled).toBe(true);
    expect(frames.queued.size).toBe(1);
  });

  it("context loss during required loading cannot attach a late scene", async () => {
    const frames = frameHarness(); const load = delayedLoad(); const onReady = vi.fn(); const worldCanvas = canvas();
    const runtime = startRuntime({ canvas: worldCanvas, onReady });
    worldCanvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
    const assets = loadedAssets(); const material = assets.avatarGltf.scene.children[0]!.children[2] as THREE.Mesh;
    const disposed = vi.spyOn(material.geometry, "dispose");
    await load.complete(assets);
    expect(runtime.lifecycleManager.getState()).toBe("FAILURE"); expect(onReady).not.toHaveBeenCalled();
    expect(frames.queued.size).toBe(0); expect(disposed).toHaveBeenCalledTimes(1);
  });
  it("publishes inclusive shadow/transmission/main counts exactly once per consecutive frame", async () => {
    const frames = frameHarness();
    const load = delayedLoad();
    const worldCanvas = canvas();
    const samples: Array<{ renderCalls: number; renderedTriangles: number; renderCallsIncludeAllPasses: boolean }> = [];
    worldCanvas.addEventListener("yor-world-rendered-frame", (event) => samples.push((event as CustomEvent).detail));
    const runtime = startRuntime({ canvas: worldCanvas });
    await load.complete();
    frames.tick();
    frames.tick();
    expect(samples).toHaveLength(2);
    for (const sample of samples) {
      expect(sample.renderCalls).toBe(15);
      expect(sample.renderedTriangles).toBe(90);
      expect(sample.renderCallsIncludeAllPasses).toBe(true);
    }
    expect(runtime.getDiagnostics().renderCalls).toBe(15);
    expect(runtime.getDiagnostics().renderCallsIncludeAllPasses).toBe(true);
  });
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
