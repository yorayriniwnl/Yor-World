import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { AssetLoader } from "../../../src/features/world/AssetLoader";
import { SessionResourceLedger } from "../../../src/features/world/asset-resources";

const harness = vi.hoisted(() => ({
  parsed: 0,
  releaseTexture: null as null | ((tex: THREE.Texture) => void),
}));

vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({
  GLTFLoader: class {
    async parseAsync() {
      harness.parsed++;
      return { scene: new THREE.Group(), animations: [] };
    }
  },
}));

vi.mock("three", async (original) => {
  const real = await original<typeof import("three")>();
  return {
    ...real,
    TextureLoader: class {
      loadAsync() {
        return new Promise((resolve) => {
          harness.releaseTexture = resolve;
        });
      }
    },
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
  harness.parsed = 0;
  harness.releaseTexture = null;
});

describe("Completion: Essential Loader Held Decode, Abort, and Disposal Lifecycle", () => {
  it("resolves required readiness while optional decode is held, and cleans up on abort without late delivery", async () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array([1, 2, 3, 4]), {
      headers: { "content-length": "4" },
    })));

    const abort = new AbortController();
    const adoptedList: string[] = [];

    const loader = new AssetLoader("test-loader");
    const loadPromise = loader.loadSession({
      sessionToken: 1,
      signal: abort.signal,
      onOptionalConsumer: (consumer) => {
        adoptedList.push(consumer.id);
        return "adopted";
      },
    });

    const result = await loadPromise;
    expect(harness.parsed).toBe(3);
    expect(result.w1Gltf).toBeDefined();
    expect(result.avatarGltf).toBeDefined();
    expect(result.fixtureGltf).toBeDefined();

    // Optional decode is held pending releaseTexture
    await vi.waitFor(() => expect(harness.releaseTexture).not.toBeNull());

    // Now abort before texture is released
    abort.abort();

    const lateTexture = new THREE.Texture();
    let textureDisposed = false;
    lateTexture.addEventListener("dispose", () => {
      textureDisposed = true;
    });

    // Release the texture into the aborted session
    harness.releaseTexture!(lateTexture);

    // Yield macro-task
    await new Promise((r) => setTimeout(r, 20));

    // Must NOT have adopted late texture
    expect(adoptedList).not.toContain("deskmat");
    // The texture must have been disposed by the ledger
    expect(textureDisposed).toBe(true);
  });

  it("SessionResourceLedger disposes unadopted textures when consumer rejects", () => {
    const ledger = new SessionResourceLedger({ generation: 1, token: 100 });
    const texture = new THREE.Texture();
    let disposed = false;
    texture.addEventListener("dispose", () => {
      disposed = true;
    });

    ledger.registerTexture(texture);
    // Simulating consumer rejection
    ledger.disposeTexture(texture);

    expect(disposed).toBe(true);
  });

  it("does not report one completed file as the required-session byte aggregate", async () => {
    vi.stubGlobal("window", {});
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([1, 2, 3, 4]), {
      headers: { "content-length": "4" },
    }));
    vi.stubGlobal("fetch", fetchMock);
    const abort = new AbortController();
    const progress = [] as Array<{ requiredLoaded: number; bytes: { kind: string; loaded?: number; total?: number } }>;
    const result = await new AssetLoader("aggregate-test").loadSession({
      sessionToken: 7,
      sessionGeneration: 71,
      signal: abort.signal,
      onProgress: (entry) => progress.push(entry),
      onOptionalConsumer: () => "rejected",
    });

    const firstDeterminate = progress.find((entry) => entry.bytes.kind === "determinate");
    expect(firstDeterminate).toMatchObject({
      requiredLoaded: 2,
      bytes: { kind: "determinate", loaded: 8, total: 12 },
    });
    abort.abort();
    result.resourceLedger?.dispose();
  });

  it("uses the actual ArrayBuffer byte length instead of a contradictory header", async () => {
    vi.stubGlobal("window", {});
    let request = 0;
    const fetchMock = vi.fn(async () => {
      request += 1;
      if (request === 1) {
        return {
          ok: true,
          headers: new Headers({ "content-length": "99" }),
          body: null,
          arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer,
        } as Response;
      }
      return new Response(new Uint8Array([1, 2, 3, 4]), { headers: { "content-length": "4" } });
    });
    vi.stubGlobal("fetch", fetchMock);
    const abort = new AbortController();
    const progress: Array<{ activity?: { kind: string; loaded?: number } | undefined; bytes: { kind: string; total?: number } }> = [];
    const result = await new AssetLoader("arraybuffer-fallback-test").loadSession({
      sessionToken: 10,
      signal: abort.signal,
      onProgress: (entry) => progress.push(entry),
      onOptionalConsumer: () => "rejected",
    });
    expect(progress.some((entry) => entry.activity?.kind === "required-bytes" && entry.activity.loaded === 4)).toBe(true);
    expect(progress.some((entry) => entry.bytes.kind === "determinate" && entry.bytes.total === 99)).toBe(false);
    abort.abort();
    result.resourceLedger?.dispose();
  });

  it.each([
    ["unknown content length", { headers: {} }],
    ["compressed representation", { headers: { "content-length": "4", "content-encoding": "gzip" } }],
    ["short body at EOF", { headers: { "content-length": "5" } }],
    ["long body at EOF", { headers: { "content-length": "3" } }],
  ])("keeps %s indeterminate", async (_label, init) => {
    vi.stubGlobal("window", {});
    let request = 0;
    const fetchMock = vi.fn(async () => {
      request += 1;
      const headers = request === 1 ? init.headers : { "content-length": "4" };
      return new Response(new Uint8Array([1, 2, 3, 4]), { headers });
    });
    vi.stubGlobal("fetch", fetchMock);
    const abort = new AbortController();
    const progress: Array<{ bytes: { kind: string } }> = [];
    const result = await new AssetLoader("untrusted-length-test").loadSession({
      sessionToken: 8,
      signal: abort.signal,
      onProgress: (entry) => progress.push(entry),
      onOptionalConsumer: () => "rejected",
    });
    expect(progress.some((entry) => entry.bytes.kind === "determinate")).toBe(false);
    abort.abort();
    result.resourceLedger?.dispose();
  });

  it("disposes a decoded texture exactly once when a synchronous consumer throws", async () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array([1, 2, 3, 4]), {
      headers: { "content-length": "4" },
    })));
    const abort = new AbortController();
    const result = await new AssetLoader("throwing-consumer-test").loadSession({
      sessionToken: 9,
      signal: abort.signal,
      onOptionalConsumer: () => { throw new Error("synthetic consumer failure"); },
    });
    await vi.waitFor(() => expect(harness.releaseTexture).not.toBeNull());
    const texture = new THREE.Texture();
    const dispose = vi.spyOn(texture, "dispose");
    harness.releaseTexture!(texture);
    await vi.waitFor(() => expect(dispose).toHaveBeenCalledOnce());
    abort.abort();
    result.resourceLedger?.dispose();
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("cancels optional decoding without disposing the required session owner", async () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array([1, 2, 3, 4]), {
      headers: { "content-length": "4" },
    })));
    const requiredAbort = new AbortController();
    const optionalAbort = new AbortController();
    const result = await new AssetLoader("optional-signal-test").loadSession({
      sessionToken: 13,
      signal: requiredAbort.signal,
      optionalSignal: optionalAbort.signal,
      onOptionalConsumer: () => "adopted",
    });
    await vi.waitFor(() => expect(harness.releaseTexture).not.toBeNull());
    optionalAbort.abort();
    const texture = new THREE.Texture();
    const dispose = vi.spyOn(texture, "dispose");
    harness.releaseTexture!(texture);
    await vi.waitFor(() => expect(dispose).toHaveBeenCalledOnce());
    expect(result.resourceLedger?.isDisposedSession()).toBe(false);
    result.resourceLedger?.dispose();
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("captures shared and pruned GLTF resources and closes their ImageBitmap once", () => {
    class TestBitmap {
      public readonly close = vi.fn();
      public readonly width = 2;
      public readonly height = 2;
    }
    vi.stubGlobal("ImageBitmap", TestBitmap);
    const ledger = new SessionResourceLedger({ generation: 2, token: 5 });
    const texture = new THREE.Texture();
    texture.image = new TestBitmap() as unknown as ImageBitmap;
    const material = new THREE.MeshStandardMaterial({ map: texture });
    const geometry = new THREE.BoxGeometry();
    const kept = new THREE.Mesh(geometry, material);
    const pruned = new THREE.Mesh(geometry, material);
    const root = new THREE.Group();
    root.add(kept, pruned);
    const gltf = { scene: root, scenes: [root], animations: [] } as unknown as import("three/examples/jsm/loaders/GLTFLoader.js").GLTF;
    const geometryDispose = vi.spyOn(geometry, "dispose");
    const materialDispose = vi.spyOn(material, "dispose");
    const textureDispose = vi.spyOn(texture, "dispose");
    const bitmap = texture.image as unknown as TestBitmap;

    ledger.registerGltf(gltf);
    root.remove(pruned);
    ledger.dispose();
    ledger.dispose();

    expect(geometryDispose).toHaveBeenCalledOnce();
    expect(materialDispose).toHaveBeenCalledOnce();
    expect(textureDispose).toHaveBeenCalledOnce();
    expect(bitmap.close).toHaveBeenCalledOnce();
  });

  it("cleans resources registered after cancellation has already disposed the session", () => {
    class TestBitmap {
      public readonly close = vi.fn();
      public readonly width = 1;
      public readonly height = 1;
    }
    vi.stubGlobal("ImageBitmap", TestBitmap);
    const ledger = new SessionResourceLedger({ generation: 4, token: 2 });
    ledger.dispose();
    const texture = new THREE.Texture();
    texture.image = new TestBitmap() as unknown as ImageBitmap;
    const material = new THREE.MeshStandardMaterial({ map: texture });
    const geometry = new THREE.BoxGeometry();
    const root = new THREE.Group();
    root.add(new THREE.Mesh(geometry, material));
    const textureDispose = vi.spyOn(texture, "dispose");
    const materialDispose = vi.spyOn(material, "dispose");
    const geometryDispose = vi.spyOn(geometry, "dispose");
    const bitmap = texture.image as unknown as TestBitmap;

    ledger.registerGltf({ scene: root, scenes: [root], animations: [] } as unknown as import("three/examples/jsm/loaders/GLTFLoader.js").GLTF);

    expect(textureDispose).toHaveBeenCalledOnce();
    expect(materialDispose).toHaveBeenCalledOnce();
    expect(geometryDispose).toHaveBeenCalledOnce();
    expect(bitmap.close).toHaveBeenCalledOnce();
  });
});
