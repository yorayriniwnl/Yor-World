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
});
