import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { LoadingProgress } from "./types";
import { ASSET_LOCATIONS } from "./asset-locations";

export interface OptionalAssets {
  deskmatTexture: THREE.Texture | null;
  wallpaperTexture: THREE.Texture | null;
  interactionGltf: GLTF | null;
}

export interface LoadedAssets extends OptionalAssets {
  w1Gltf: GLTF;
  avatarGltf: GLTF;
  fixtureGltf: GLTF;
  /** Loader transfers this owner with the required assets; it also owns late enhancements. */
  resourceOwner?: AssetResourceOwner;
  optionalEnhancements?: Promise<OptionalAssets>;
}

export interface AssetLoaderOptions {
  sessionToken: number;
  signal?: AbortSignal | undefined;
  simulateAssetError?: boolean | undefined;
  maxRetries?: number | undefined;
  mobile?: boolean | undefined;
  attemptTimeoutMs?: number;
  requiredTimeoutMs?: number;
  optionalTimeoutMs?: number;
  onProgress?: ((progress: LoadingProgress) => void) | undefined;
}

export class AssetLoadingError extends Error {
  constructor(message: string, public assetName: string, public retryCount: number) {
    super(message);
    this.name = "AssetLoadingError";
  }
}

type Resource = THREE.BufferGeometry | THREE.Material | THREE.Texture | THREE.Skeleton;

/** One owner per loading session, including pruned/shared resources and late decodes. */
export class AssetResourceOwner {
  private resources = new Set<Resource>();
  private released = new WeakSet<Resource>();
  private closedImages = new WeakSet<object>();
  private disposed = false;

  private collect(root: THREE.Object3D): Set<Resource> {
    const resources = new Set<Resource>();
    root.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (mesh.geometry) resources.add(mesh.geometry);
      if (mesh.material) {
        for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
          resources.add(material);
          for (const value of Object.values(material)) {
            if (value instanceof THREE.Texture) resources.add(value);
          }
        }
      }
      if ((node as THREE.SkinnedMesh).skeleton) resources.add((node as THREE.SkinnedMesh).skeleton);
    });
    return resources;
  }

  private release(resource: Resource): void {
    if (this.released.has(resource)) return;
    this.released.add(resource);
    resource.dispose();
    if (resource instanceof THREE.Texture) {
      const images: unknown[] = Array.isArray(resource.image) ? resource.image : [resource.image];
      for (const image of images) {
        const sharedWithLiveTexture = [...this.resources].some((other) => other instanceof THREE.Texture && !this.released.has(other)
          && (Array.isArray(other.image) ? other.image : [other.image]).includes(image));
        if (!sharedWithLiveTexture && image && typeof image === "object" && "close" in image && typeof image.close === "function" && !this.closedImages.has(image)) {
          this.closedImages.add(image);
          image.close();
        }
      }
    }
  }

  public adoptGltf(gltf: GLTF): void {
    for (const scene of new Set([gltf.scene, ...gltf.scenes])) this.adoptObject(scene);
  }

  public adoptObject(root: THREE.Object3D): void {
    for (const resource of this.collect(root)) this.adoptResource(resource);
  }

  public adoptResource(resource: Resource): void {
    if (this.disposed) this.release(resource);
    else this.resources.add(resource);
  }

  public discardGltf(gltf: GLTF): void {
    for (const scene of new Set([gltf.scene, ...gltf.scenes])) {
      for (const resource of this.collect(scene)) this.discardResource(resource);
    }
  }

  public discardResource(resource: Resource): void {
    this.resources.delete(resource);
    this.release(resource);
  }

  /** Release detached/pruned data only when no retained object shares it. */
  public releaseUnused(retainedRoot: THREE.Object3D): void {
    const retained = this.collect(retainedRoot);
    for (const resource of this.resources) {
      if (!retained.has(resource)) {
        this.release(resource);
        this.resources.delete(resource);
      }
    }
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const resource of this.resources) this.release(resource);
    this.resources.clear();
  }
}

function abortError(): DOMException { return new DOMException("Asset loading aborted", "AbortError"); }

/** Races uncancellable parsing/decoding too; late resources remain with the session owner. */
async function bounded<T>(operation: (signal: AbortSignal) => Promise<T>, signal: AbortSignal | undefined, timeoutMs: number): Promise<T> {
  if (signal?.aborted) throw abortError();
  const abort = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  const interruption = new Promise<never>((_, reject) => {
    onAbort = () => { abort.abort(); reject(abortError()); };
    signal?.addEventListener("abort", onAbort, { once: true });
    timer = setTimeout(() => {
      abort.abort();
      reject(new DOMException("Asset operation exceeded its time limit", "TimeoutError"));
    }, timeoutMs);
  });
  try { return await Promise.race([operation(abort.signal), interruption]); }
  finally {
    clearTimeout(timer);
    if (onAbort) signal?.removeEventListener("abort", onAbort);
  }
}

async function readAsset(url: string, signal: AbortSignal): Promise<ArrayBuffer> {
  const response = await fetch(url, { signal, credentials: "same-origin" });
  if (!response.ok) throw new Error(`Asset request failed (${response.status})`);
  return response.arrayBuffer();
}

export class AssetLoader {
  constructor(private readonly ownerId = "primary-asset-loader") {}
  public getOwnerId(): string { return this.ownerId; }

  public async loadSession(options: AssetLoaderOptions): Promise<LoadedAssets> {
    const { signal, simulateAssetError = false, onProgress } = options;
    // Initial request plus at most two automatic retries, each within a total session deadline.
    const maxRetries = Math.min(2, Math.max(0, Math.floor(options.maxRetries ?? 2)));
    const owner = new AssetResourceOwner();
    const requiredAbort = new AbortController();
    const externalAbort = () => requiredAbort.abort();
    signal?.addEventListener("abort", externalAbort, { once: true });
    if (signal?.aborted) requiredAbort.abort();
    const requiredTimer = setTimeout(() => requiredAbort.abort(), options.requiredTimeoutMs ?? 25000);
    let requiredLoaded = 0;
    let optionalLoaded = 0;
    const report = (stage: string, retryCount = 0, failedAsset?: string) => {
      if (signal?.aborted) return;
      onProgress?.({ stage, progress: requiredLoaded / 3, requiredLoaded, requiredTotal: 3,
        optionalLoaded, optionalTotal: 3, retryCount, maxRetries, failedAsset });
    };
    const loader = new GLTFLoader();
    const loadGltf = async (url: string, operationSignal: AbortSignal): Promise<GLTF> => {
      const bytes = await readAsset(url, operationSignal);
      if (operationSignal.aborted) throw abortError();
      // Production GLBs embed their buffers/textures. Parsing cannot be interrupted;
      // its result is adopted even after cancellation, ensuring late cleanup.
      const gltf = await loader.parseAsync(bytes, url.slice(0, url.lastIndexOf("/") + 1));
      if (operationSignal.aborted) { owner.discardGltf(gltf); throw abortError(); }
      owner.adoptGltf(gltf);
      return gltf;
    };
    const required = async (url: string): Promise<GLTF> => {
      const name = url.slice(url.lastIndexOf("/") + 1);
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          report(`Loading ${name}…`, attempt);
          const result = await bounded((s) => loadGltf(url, s), requiredAbort.signal, options.attemptTimeoutMs ?? 8000);
          requiredLoaded++;
          report(`${name} ready`);
          return result;
        } catch (error) {
          if (requiredAbort.signal.aborted || signal?.aborted) throw abortError();
          if (attempt === maxRetries) {
            report(`Failed to load ${name}`, attempt, name);
            throw new AssetLoadingError(`Required asset "${name}" failed after ${attempt + 1} attempts: ${(error as Error).message}`, name, attempt);
          }
        }
      }
      throw new Error("Unreachable retry state");
    };
    try {
      report("Loading required room assets…");
      if (requiredAbort.signal.aborted) throw abortError();
      if (simulateAssetError) {
        report("Failed to load required model asset", 0, "production-room-full.glb");
        throw new AssetLoadingError("Simulated required asset failure", "production-room-full.glb", 0);
      }
      const w1Gltf = await required(options.mobile ? ASSET_LOCATIONS.roomMobile : ASSET_LOCATIONS.roomFull);
      const avatarGltf = await required(ASSET_LOCATIONS.avatar);
      const fixtureGltf = await required(ASSET_LOCATIONS.fixture);
      if (signal?.aborted) throw abortError();
      report("Required assets ready; optional enhancements continue separately");
      const loadTexture = async (url: string, operationSignal: AbortSignal): Promise<THREE.Texture> => {
        const bytes = await readAsset(url, operationSignal);
        if (operationSignal.aborted) throw abortError();
        const bitmap = await createImageBitmap(new Blob([bytes]), { imageOrientation: "flipY" });
        const texture = new THREE.Texture(bitmap);
        texture.flipY = false;
        texture.needsUpdate = true;
        if (operationSignal.aborted) { owner.discardResource(texture); throw abortError(); }
        owner.adoptResource(texture);
        return texture;
      };
      const optional = async <T>(url: string, operation: (url: string, signal: AbortSignal) => Promise<T>): Promise<T | null> => {
        try { return await bounded((s) => operation(url, s), signal, options.optionalTimeoutMs ?? 5000); }
        catch { return null; }
        finally { optionalLoaded++; report("Optional enhancements processed"); }
      };
      const optionalEnhancements = Promise.all([
        optional(ASSET_LOCATIONS.deskmatTexture, loadTexture),
        optional(ASSET_LOCATIONS.wallpaperTexture, loadTexture),
        optional(options.mobile ? ASSET_LOCATIONS.interactionMobile : ASSET_LOCATIONS.interactionDesktop, loadGltf),
      ]).then(([deskmatTexture, wallpaperTexture, interactionGltf]) => ({ deskmatTexture, wallpaperTexture, interactionGltf }));

      return { w1Gltf, avatarGltf, fixtureGltf, deskmatTexture: null, wallpaperTexture: null, interactionGltf: null, resourceOwner: owner, optionalEnhancements };
    } catch (error) {
      owner.dispose();
      throw error;
    } finally {
      clearTimeout(requiredTimer);
      signal?.removeEventListener("abort", externalAbort);
    }
  }
}
