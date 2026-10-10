import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

export type AssetSessionId = Readonly<{ generation: number; token: number }>;

export type OptionalAssetResult =
  | {
      session: AssetSessionId;
      id: "deskmat" | "wallpaper";
      kind: "texture";
      resource: THREE.Texture;
    }
  | {
      session: AssetSessionId;
      id: "prop-details" | "project-effects";
      kind: "gltf";
      resource: GLTF;
    };

export type Adoption = "adopted" | "rejected";

/**
 * Called synchronously only after complete decode and current-session fencing.
 */
export type OptionalConsumer = (result: OptionalAssetResult) => Adoption;

/**
 * Session resource ledger tracking geometries, materials, textures,
 * scenes and transient object URLs by object identity.
 */
export class SessionResourceLedger {
  private session: AssetSessionId;
  private textures = new Set<THREE.Texture>();
  private geometries = new Set<THREE.BufferGeometry>();
  private materials = new Set<THREE.Material>();
  private objectUrls = new Set<string>();
  private gltfs = new Set<GLTF>();
  private isDisposed = false;

  constructor(session: AssetSessionId) {
    this.session = session;
  }

  public getSession(): AssetSessionId {
    return this.session;
  }

  public registerTexture(texture: THREE.Texture): void {
    if (this.isDisposed) {
      try {
        texture.dispose();
      } catch {}
      return;
    }
    this.textures.add(texture);
  }

  public registerObjectUrl(url: string): void {
    if (this.isDisposed) {
      if (typeof URL !== "undefined" && URL.revokeObjectURL) {
        URL.revokeObjectURL(url);
      }
      return;
    }
    this.objectUrls.add(url);
  }

  public revokeObjectUrl(url: string): void {
    this.objectUrls.delete(url);
    if (typeof URL !== "undefined" && URL.revokeObjectURL) {
      URL.revokeObjectURL(url);
    }
  }

  public registerGltf(gltf: GLTF): void {
    if (this.isDisposed) {
      this.disposeGltf(gltf);
      return;
    }
    this.gltfs.add(gltf);
  }

  public unregisterTexture(texture: THREE.Texture): void {
    this.textures.delete(texture);
  }

  public unregisterGltf(gltf: GLTF): void {
    this.gltfs.delete(gltf);
  }

  public disposeTexture(texture: THREE.Texture): void {
    this.textures.delete(texture);
    try {
      texture.dispose();
    } catch {}
  }

  public disposeGltf(gltf: GLTF): void {
    this.gltfs.delete(gltf);
    if (!gltf.scene) return;
    gltf.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) {
        try {
          mesh.geometry.dispose();
        } catch {}
      }
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => {
            try {
              m.dispose();
            } catch {}
          });
        } else {
          try {
            mesh.material.dispose();
          } catch {}
        }
      }
    });
  }

  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;

    for (const url of this.objectUrls) {
      try {
        if (typeof URL !== "undefined" && URL.revokeObjectURL) {
          URL.revokeObjectURL(url);
        }
      } catch {}
    }
    this.objectUrls.clear();

    for (const texture of this.textures) {
      try {
        texture.dispose();
      } catch {}
    }
    this.textures.clear();

    for (const gltf of this.gltfs) {
      this.disposeGltf(gltf);
    }
    this.gltfs.clear();

    for (const geo of this.geometries) {
      try {
        geo.dispose();
      } catch {}
    }
    this.geometries.clear();

    for (const mat of this.materials) {
      try {
        mat.dispose();
      } catch {}
    }
    this.materials.clear();
  }
}
