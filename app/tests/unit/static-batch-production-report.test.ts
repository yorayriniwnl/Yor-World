import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { describe, expect, it } from "vitest";
import { integrateScene } from "../../src/features/world/SceneIntegrator";
import { LowQualityBatch } from "../../src/features/world/LowQualityBatch";

async function parseFrozenModel(name: string) {
  const source = readFileSync(path.join(process.cwd(), "public/models", name));
  const buffer = source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength) as ArrayBuffer;
  return {
    gltf: await new GLTFLoader().parseAsync(buffer, ""),
    sha256: createHash("sha256").update(source).digest("hex"),
  };
}

async function withPlaceholderImageBitmaps<T>(work: () => Promise<T>): Promise<T> {
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "createImageBitmap");
  const originalSelfDescriptor = Object.getOwnPropertyDescriptor(globalThis, "self");
  Object.defineProperty(globalThis, "self", { configurable: true, writable: true, value: globalThis });
  Object.defineProperty(globalThis, "createImageBitmap", {
    configurable: true,
    writable: true,
    // This Node-only structural report does not render pixels. Keep GLTFLoader's
    // original material, texture, sampler, and image-index relationships while
    // avoiding a browser image decoder for the embedded image payloads.
    value: async () => ({ width: 1, height: 1, close() {} }) as unknown as ImageBitmap,
  });
  try {
    return await work();
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(globalThis, "createImageBitmap", originalDescriptor);
    } else {
      delete (globalThis as unknown as Record<string, unknown>).createImageBitmap;
    }
    if (originalSelfDescriptor) {
      Object.defineProperty(globalThis, "self", originalSelfDescriptor);
    } else {
      delete (globalThis as unknown as Record<string, unknown>).self;
    }
  }
}

function objectPath(object: THREE.Object3D): string {
  const names: string[] = [];
  for (let node: THREE.Object3D | null = object; node; node = node.parent) names.push(node.name || node.type);
  return names.reverse().join("/");
}

function attributeSignature(geometry: THREE.BufferGeometry): string[] {
  return Object.keys(geometry.attributes).sort().map((name) => {
    const attribute = geometry.getAttribute(name);
    return `${name}:${attribute.itemSize}:${attribute.normalized ? 1 : 0}:${attribute.array.constructor.name}`;
  });
}

function materialFingerprint(material: THREE.Material): string {
  const serialized = material.toJSON() as unknown as Record<string, unknown>;
  delete serialized.uuid;
  delete serialized.name;
  delete serialized.metadata;
  return createHash("sha256").update(JSON.stringify(serialized)).digest("hex");
}

function materialTextureSlots(material: THREE.Material): Record<string, unknown> {
  const slots: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(material)) {
    const texture = value;
    if (!(texture instanceof THREE.Texture)) continue;
    slots[name] = {
      uuid: texture.uuid,
      sourceUuid: texture.source.uuid,
      mapping: texture.mapping,
      channel: texture.channel,
      colorSpace: texture.colorSpace,
      flipY: texture.flipY,
      wrapS: texture.wrapS,
      wrapT: texture.wrapT,
      magFilter: texture.magFilter,
      minFilter: texture.minFilter,
      anisotropy: texture.anisotropy,
      offset: texture.offset.toArray(),
      repeat: texture.repeat.toArray(),
      center: texture.center.toArray(),
      rotation: texture.rotation,
      matrixAutoUpdate: texture.matrixAutoUpdate,
      matrix: texture.matrix.toArray(),
    };
  }
  return slots;
}

function effectivelyVisible(object: THREE.Object3D): boolean {
  for (let node: THREE.Object3D | null = object; node; node = node.parent) if (!node.visible) return false;
  return true;
}

describe("production static-batch eligibility report", () => {
  it("accounts for every desktop and mobile runtime mesh and archives exact rejection reasons", async () => {
    const [room, resident, fixture, desktopInteractions, mobileInteractions] = await withPlaceholderImageBitmaps(() => Promise.all([
      parseFrozenModel("production-room-full.glb"),
      parseFrozenModel("resident-production.glb"),
      parseFrozenModel("fixture-production.glb"),
      parseFrozenModel("interaction-assets.glb"),
      parseFrozenModel("interaction-assets-mobile.glb"),
    ]));
    for (const asset of [room.gltf, resident.gltf, fixture.gltf]) asset.scene.animations = asset.animations;
    const integrated = integrateScene(room.gltf, resident.gltf, fixture.gltf);
    const profiles = [
      { name: "desktop", interactionAsset: "interaction-assets.glb", interactions: desktopInteractions },
      { name: "mobile", interactionAsset: "interaction-assets-mobile.glb", interactions: mobileInteractions },
    ] as const;
    const outputDirectory = process.env.PRE_G7_25_DIAGNOSTICS_OUTPUT;
    if (outputDirectory) mkdirSync(outputDirectory, { recursive: true });

    for (const profile of profiles) {
      const interactions = profile.interactions;
      interactions.gltf.scene.animations = interactions.gltf.animations;
      // WorldInteractionBinding hides the semantic hit-proxy asset before the
      // runtime adds it to the rendered scene and constructs static batches.
      interactions.gltf.scene.traverse((node) => { node.visible = false; });
      const runtimeScene = new THREE.Scene();
      runtimeScene.add(integrated.scene, interactions.gltf.scene);
      const sceneMeshes: Array<Record<string, unknown>> = [];
      runtimeScene.traverse((node) => {
        if (!(node as THREE.Mesh).isMesh) return;
        const mesh = node as THREE.Mesh;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        sceneMeshes.push({
          path: objectPath(mesh),
          name: mesh.name,
          visible: effectivelyVisible(mesh),
          castShadow: mesh.castShadow,
          receiveShadow: mesh.receiveShadow,
          layerMask: mesh.layers.mask,
          frustumCulled: mesh.frustumCulled,
          material: materials.map((material) => ({
            name: material.name || material.type,
            uuid: material.uuid,
            fingerprint: materialFingerprint(material),
            type: material.type,
            side: material.side,
            shadowSide: material.shadowSide,
            transparent: material.transparent,
            opacity: material.opacity,
            alphaTest: material.alphaTest,
            transmission: (material as THREE.MeshPhysicalMaterial).transmission ?? 0,
            textureSlots: materialTextureSlots(material),
          })),
        });
      });
      const batch = new LowQualityBatch(runtimeScene);
      const batchEntries = (batch as unknown as {
        entries: Array<{
          batch: THREE.BatchedMesh;
          parameterized: boolean;
          originals: Array<{ mesh: THREE.Mesh; layerMask: number; surfaceValues: unknown; dynamic: boolean }>;
        }>;
      }).entries;
      const report = {
        profile: profile.name,
        interactionAsset: profile.interactionAsset,
        sourceCommit: process.env.PRE_G7_25_SOURCE_COMMIT ?? null,
        appTree: process.env.PRE_G7_25_APP_TREE ?? null,
        textureDecodeMode: "Node-only 1x1 ImageBitmap placeholders; original GLB bytes, materials, texture indices, sampler definitions, and texture-slot assignments are preserved",
        instrumentedWorkingFileSha256: createHash("sha256")
          .update(readFileSync(path.join(process.cwd(), "src/features/world/LowQualityBatch.ts")))
          .digest("hex"),
        assets: {
          "production-room-full.glb": room.sha256,
          "resident-production.glb": resident.sha256,
          "fixture-production.glb": fixture.sha256,
          [profile.interactionAsset]: interactions.sha256,
        },
        diagnostics: batch.getDiagnostics(),
        sceneMeshes,
        batchGroups: batchEntries.map(({ batch: target, parameterized, originals }) => {
          const sourceMaterial = originals[0]!.mesh.material as THREE.Material;
          return {
          material: sourceMaterial.name || sourceMaterial.type,
          materialType: sourceMaterial.type,
          materialUuid: sourceMaterial.uuid,
          materialFingerprint: materialFingerprint(sourceMaterial),
          textureSlots: materialTextureSlots(sourceMaterial),
          castShadow: target.castShadow,
          receiveShadow: target.receiveShadow,
          frustumCulled: target.perObjectFrustumCulled,
          parameterized,
          dynamicSources: originals.filter(({ dynamic }) => dynamic).length,
          sourceCount: originals.length,
          attributeSignatures: [...new Set(originals.map(({ mesh }) => JSON.stringify(attributeSignature(mesh.geometry))))]
            .map((signature) => JSON.parse(signature) as string[]),
          sources: originals.map(({ mesh }) => objectPath(mesh)),
          };
        }),
      };
      const diagnostics = report.diagnostics;
      expect(diagnostics.totalMeshes).toBeGreaterThan(0);
      expect(diagnostics.totalMeshes).toBe(diagnostics.batchedMeshes + diagnostics.excludedMeshes.length);
      expect(diagnostics.excludedMeshes.every(({ index, path: objectPath, material, reason }) =>
        index >= 0 && objectPath.length > 0 && material.length > 0 && reason.length > 0)).toBe(true);

      const output = outputDirectory ? path.join(outputDirectory, `${profile.name}-static-batch-exclusion-report.json`) : null;
      if (output) writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
      console.info(JSON.stringify({
        profile: profile.name,
        totalMeshes: diagnostics.totalMeshes,
        batchedMeshes: diagnostics.batchedMeshes,
        batchCount: diagnostics.batchCount,
        batchMaterials: [...new Set(report.batchGroups.map(({ material }) => material))].length,
        batchGroups: report.batchGroups.map(({ material, materialFingerprint, sourceCount, dynamicSources, attributeSignatures }) => ({
          material, materialFingerprint, sourceCount, dynamicSources, attributeSignatures,
        })),
        rejectedByReason: diagnostics.rejectedByReason,
        excludedCount: diagnostics.excludedMeshes.length,
        visibleMeshes: sceneMeshes.filter((mesh) => mesh.visible).length,
        visibleShadowCasters: sceneMeshes.filter((mesh) => mesh.visible && mesh.castShadow).length,
        output,
      }));
      batch.dispose();
    }
  });
});
