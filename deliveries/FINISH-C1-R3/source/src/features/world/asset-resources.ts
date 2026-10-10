import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

export type AssetSessionId = Readonly<{ generation: number; token: number }>;

export type OptionalAssetResult =
  | { session: AssetSessionId; id: "deskmat" | "wallpaper"; kind: "texture"; resource: THREE.Texture }
  | { session: AssetSessionId; id: "prop-details" | "project-effects"; kind: "gltf"; resource: GLTF };

export type Adoption = "adopted" | "rejected";
export type OptionalConsumer = (result: OptionalAssetResult) => Adoption;

const MATERIAL_TEXTURE_KEYS = [
  "map", "alphaMap", "aoMap", "bumpMap", "displacementMap", "emissiveMap", "envMap", "lightMap",
  "metalnessMap", "normalMap", "roughnessMap", "clearcoatMap", "clearcoatRoughnessMap",
  "clearcoatNormalMap", "iridescenceMap", "iridescenceThicknessMap", "sheenColorMap", "sheenRoughnessMap",
  "specularMap", "specularColorMap", "specularIntensityMap", "transmissionMap", "thicknessMap",
  "anisotropyMap", "gradientMap", "matcap",
] as const;

function collectTextures(value: unknown, output: Set<THREE.Texture>, visited = new Set<object>()): void {
  if (!value || typeof value !== "object") return;
  if (value instanceof THREE.Texture) {
    output.add(value);
    return;
  }
  if (visited.has(value)) return;
  visited.add(value);
  if (Array.isArray(value)) {
    for (const item of value) collectTextures(item, output, visited);
    return;
  }
  const record = value as Record<string, unknown>;
  if ("value" in record && Object.keys(record).length <= 4) {
    collectTextures(record.value, output, visited);
  }
}

function collectUniformTextures(value: unknown, output: Set<THREE.Texture>): void {
  if (!value || typeof value !== "object") return;
  for (const uniform of Object.values(value as Record<string, unknown>)) {
    if (uniform && typeof uniform === "object" && "value" in uniform) {
      collectTextures((uniform as { value?: unknown }).value, output);
    }
  }
}

function collectImageBitmaps(value: unknown, output: Set<ImageBitmap>, visited = new Set<object>()): void {
  if (!value || typeof value !== "object") return;
  if (typeof ImageBitmap !== "undefined" && value instanceof ImageBitmap) {
    output.add(value);
    return;
  }
  if (visited.has(value)) return;
  visited.add(value);
  if (Array.isArray(value)) {
    for (const item of value) collectImageBitmaps(item, output, visited);
    return;
  }
  const maybeTexture = value as THREE.Texture;
  if (maybeTexture.isTexture) {
    collectImageBitmaps(maybeTexture.source?.data ?? maybeTexture.image, output, visited);
    return;
  }
  const record = value as Record<string, unknown>;
  if ("value" in record && Object.keys(record).length <= 4) {
    collectImageBitmaps(record.value, output, visited);
  }
}

/** Single session owner for source resources, including assets detached during scene integration. */
export class SessionResourceLedger {
  private readonly textures = new Set<THREE.Texture>();
  private readonly geometries = new Set<THREE.BufferGeometry>();
  private readonly materials = new Set<THREE.Material>();
  private readonly imageBitmaps = new Set<ImageBitmap>();
  private readonly objectUrls = new Set<string>();
  private readonly disposedTextures = new Set<THREE.Texture>();
  private readonly disposedGeometries = new Set<THREE.BufferGeometry>();
  private readonly disposedMaterials = new Set<THREE.Material>();
  private readonly closedBitmaps = new Set<ImageBitmap>();
  private isDisposed = false;
  private disposalScheduled = false;

  constructor(private readonly session: AssetSessionId) {}

  public getSession(): AssetSessionId {
    return this.session;
  }

  public isDisposedSession(): boolean {
    return this.isDisposed;
  }

  public registerTexture(texture: THREE.Texture): void {
    if (this.isDisposed) {
      this.disposeTexture(texture);
      return;
    }
    if (!this.disposedTextures.has(texture)) this.textures.add(texture);
    const images = new Set<ImageBitmap>();
    collectImageBitmaps(texture, images);
    for (const image of images) this.imageBitmaps.add(image);
  }

  public registerObjectUrl(url: string): void {
    if (this.isDisposed) {
      this.revokeUrl(url);
      return;
    }
    this.objectUrls.add(url);
  }

  public revokeObjectUrl(url: string): void {
    this.objectUrls.delete(url);
    this.revokeUrl(url);
  }

  private revokeUrl(url: string): void {
    try {
      if (typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(url);
    } catch {}
  }

  public registerGltf(gltf: GLTF): void {
    const roots = new Set<THREE.Object3D>([...(gltf.scenes ?? []), ...(gltf.scene ? [gltf.scene] : [])]);
    for (const root of roots) {
      root.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh) return;
        if (mesh.geometry) this.registerGeometry(mesh.geometry);
        if (!mesh.material) return;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const material of materials) this.registerMaterial(material);
      });
    }
  }

  public registerGeometry(geometry: THREE.BufferGeometry): void {
    if (!this.isDisposed && !this.disposedGeometries.has(geometry)) this.geometries.add(geometry);
    else if (this.isDisposed) this.disposeGeometry(geometry);
  }

  public registerMaterial(material: THREE.Material): void {
    const record = material as unknown as Record<string, unknown>;
    const textures = new Set<THREE.Texture>();
    for (const key of MATERIAL_TEXTURE_KEYS) collectTextures(record[key], textures);
    collectUniformTextures(record.uniforms, textures);
    for (const texture of textures) this.registerTexture(texture);
    if (this.isDisposed) {
      this.disposeMaterial(material);
      return;
    }
    if (!this.disposedMaterials.has(material)) this.materials.add(material);
  }

  public unregisterTexture(texture: THREE.Texture): void {
    this.textures.delete(texture);
  }

  public unregisterGltf(_gltf: GLTF): void {
    // GLTF resources remain in the shared session ledger until the session owner disposes it.
    void _gltf;
  }

  public disposeTexture(texture: THREE.Texture): void {
    this.textures.delete(texture);
    if (this.disposedTextures.has(texture)) return;
    this.disposedTextures.add(texture);
    try { texture.dispose(); } catch {}
    const images = new Set<ImageBitmap>();
    collectImageBitmaps(texture, images);
    for (const image of images) this.closeBitmap(image);
  }

  public disposeGltf(gltf: GLTF): void {
    this.registerGltf(gltf);
    const textures = new Set<THREE.Texture>();
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const roots = new Set<THREE.Object3D>([...(gltf.scenes ?? []), ...(gltf.scene ? [gltf.scene] : [])]);
    for (const root of roots) {
      root.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh) return;
        if (mesh.geometry) geometries.add(mesh.geometry);
        if (mesh.material) {
          const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const material of list) {
            materials.add(material);
            const record = material as unknown as Record<string, unknown>;
            for (const key of MATERIAL_TEXTURE_KEYS) collectTextures(record[key], textures);
            collectUniformTextures(record.uniforms, textures);
          }
        }
      });
    }
    for (const texture of textures) this.disposeTexture(texture);
    for (const material of materials) this.disposeMaterial(material);
    for (const geometry of geometries) this.disposeGeometry(geometry);
  }

  private disposeGeometry(geometry: THREE.BufferGeometry): void {
    this.geometries.delete(geometry);
    if (this.disposedGeometries.has(geometry)) return;
    this.disposedGeometries.add(geometry);
    try { geometry.dispose(); } catch {}
  }

  private disposeMaterial(material: THREE.Material): void {
    this.materials.delete(material);
    if (this.disposedMaterials.has(material)) return;
    this.disposedMaterials.add(material);
    try { material.dispose(); } catch {}
  }

  private closeBitmap(bitmap: ImageBitmap): void {
    this.imageBitmaps.delete(bitmap);
    if (this.closedBitmaps.has(bitmap)) return;
    this.closedBitmaps.add(bitmap);
    try { bitmap.close(); } catch {}
  }

  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;
    this.disposalScheduled = false;
    for (const url of this.objectUrls) this.revokeUrl(url);
    this.objectUrls.clear();
    for (const texture of [...this.textures]) this.disposeTexture(texture);
    for (const material of [...this.materials]) this.disposeMaterial(material);
    for (const geometry of [...this.geometries]) this.disposeGeometry(geometry);
    for (const bitmap of [...this.imageBitmaps]) this.closeBitmap(bitmap);
    this.textures.clear();
    this.materials.clear();
    this.geometries.clear();
    this.imageBitmaps.clear();
  }

  /** Defers bulk GPU/bitmap release so user cancellation can update the page immediately. */
  public disposeSoon(): void {
    if (this.isDisposed || this.disposalScheduled) return;
    this.disposalScheduled = true;
    setTimeout(() => this.dispose(), 0);
  }
}
