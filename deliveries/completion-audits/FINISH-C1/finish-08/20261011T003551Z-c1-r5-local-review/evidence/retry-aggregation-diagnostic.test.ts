import { afterEach, expect, it, vi } from "vitest";
import * as THREE from "three";
import { AssetLoader } from "../../src/features/world/AssetLoader";

const harness = vi.hoisted(() => ({ parsed: 0 }));
vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({
  GLTFLoader: class {
    async parseAsync() {
      harness.parsed += 1;
      if (harness.parsed === 1) throw new Error("synthetic failure after compressed EOF");
      return { scene: new THREE.Group(), animations: [] };
    }
  },
}));
vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();
  return { ...actual, TextureLoader: class { async loadAsync() { return new actual.Texture(); } } };
});
afterEach(() => {
  vi.unstubAllGlobals();
  harness.parsed = 0;
});
it("audit probe: previous compressed bytes must not poison a valid retry aggregate", async () => {
  vi.stubGlobal("window", {});
  let fetchCalls = 0;
  const encodings: string[] = [];
  const fetchMock = vi.fn(async () => {
    fetchCalls += 1;
    const headers = fetchCalls === 1
      ? { "content-length": "4", "content-encoding": "gzip" }
      : { "content-length": "4", "content-encoding": "identity" };
    encodings.push(headers["content-encoding"]);
    return new Response(new Uint8Array([1, 2, 3, 4]), { headers });
  });
  vi.stubGlobal("fetch", fetchMock);
  const optional = new AbortController();
  optional.abort();
  const captures: Array<{ stage: string; bytes: unknown; activity: unknown; requiredLoaded: number; retryCount: number; attempt: number }> = [];
  const loader = new AssetLoader("retry-aggregation-audit");
  const result = await loader.loadSession({
    sessionToken: 987,
    signal: new AbortController().signal,
    optionalSignal: optional.signal,
    onProgress: (p) => captures.push({
      stage: p.stage,
      bytes: p.bytes,
      activity: p.activity,
      requiredLoaded: p.requiredLoaded,
      retryCount: p.retryCount,
      attempt: p.attempt,
    }),
  });
  const final = captures.filter((p) => p.stage === "All required assets decoded").at(-1);
  console.log("AUDIT_RETRY_RESULT=" + JSON.stringify({
    fetchCalls,
    encodings,
    parseCalls: harness.parsed,
    byteAndRetryEvents: captures.filter((p) =>
      p.stage.startsWith("Downloading") ||
      p.stage.includes("Retrying production-room-full.glb") ||
      p.stage === "All required assets decoded"
    ),
    finalBytes: final?.bytes,
    resultHasAllRequired: Boolean(result.w1Gltf && result.avatarGltf && result.fixtureGltf),
  }));
  expect(fetchCalls).toBe(4);
  expect(encodings).toEqual(["gzip", "identity", "identity", "identity"]);
  expect(harness.parsed).toBe(4);
  expect(result.w1Gltf && result.avatarGltf && result.fixtureGltf).toBeTruthy();
  expect(final?.bytes).toEqual({ kind: "indeterminate", reason: "untrusted-required-representation" });
});
