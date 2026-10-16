import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { describe, expect, it } from "vitest";
import { integrateScene } from "../../src/features/world/SceneIntegrator";
import { StaticSceneBatch } from "../../src/features/world/LowQualityBatch";

async function parseFrozenModel(name: string) {
  const source = readFileSync(path.join(process.cwd(), "public/models", name));
  const jsonLength = source.readUInt32LE(12);
  const json = JSON.parse(source.subarray(20, 20 + jsonLength).toString("utf8"));
  for (const material of json.materials ?? []) {
    for (const key of Object.keys(material)) if (key.endsWith("Texture")) delete material[key];
    if (material.pbrMetallicRoughness) {
      delete material.pbrMetallicRoughness.baseColorTexture;
      delete material.pbrMetallicRoughness.metallicRoughnessTexture;
    }
  }
  delete json.images;
  delete json.textures;
  const encoded = Buffer.from(JSON.stringify(json));
  const paddedJson = Buffer.alloc(Math.ceil(encoded.length / 4) * 4, 32);
  encoded.copy(paddedJson);
  const binary = source.subarray(20 + jsonLength);
  const glb = Buffer.alloc(20 + paddedJson.length + binary.length);
  glb.writeUInt32LE(0x46546c67, 0);
  glb.writeUInt32LE(2, 4);
  glb.writeUInt32LE(glb.length, 8);
  glb.writeUInt32LE(paddedJson.length, 12);
  glb.writeUInt32LE(0x4e4f534a, 16);
  paddedJson.copy(glb, 20);
  binary.copy(glb, 20 + paddedJson.length);
  const buffer = glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength) as ArrayBuffer;
  return {
    gltf: await new GLTFLoader().parseAsync(buffer, ""),
    sha256: createHash("sha256").update(source).digest("hex"),
  };
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

function effectivelyVisible(object: THREE.Object3D): boolean {
  for (let node: THREE.Object3D | null = object; node; node = node.parent) if (!node.visible) return false;
  return true;
}

describe("production static-batch eligibility report", () => {
  it("accounts for every desktop and mobile runtime mesh and archives exact rejection reasons", async () => {
    const [room, resident, fixture] = await Promise.all([
      parseFrozenModel("production-room-full.glb"),
      parseFrozenModel("resident-production.glb"),
      parseFrozenModel("fixture-production.glb"),
    ]);
    for (const asset of [room.gltf, resident.gltf, fixture.gltf]) asset.scene.animations = asset.animations;
    const integrated = integrateScene(room.gltf, resident.gltf, fixture.gltf);
    const profiles = [
      { name: "desktop", interactionAsset: "interaction-assets.glb" },
      { name: "mobile", interactionAsset: "interaction-assets-mobile.glb" },
    ] as const;
    const outputDirectory = process.env.PRE_G7_23_DIAGNOSTICS_OUTPUT;
    if (outputDirectory) mkdirSync(outputDirectory, { recursive: true });

    for (const profile of profiles) {
      const interactions = await parseFrozenModel(profile.interactionAsset);
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
          })),
        });
      });
      const batch = new StaticSceneBatch(runtimeScene);
      const batchEntries = (batch as unknown as {
        entries: Array<{
          batch: THREE.BatchedMesh;
          sourceMaterial: THREE.Material;
          originals: Array<{ mesh: THREE.Mesh; dynamic: boolean }>;
        }>;
      }).entries;
      const report = {
        profile: profile.name,
        interactionAsset: profile.interactionAsset,
        sourceCommit: process.env.PRE_G7_23_SOURCE_COMMIT ?? null,
        appTree: process.env.PRE_G7_23_APP_TREE ?? null,
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
        batchGroups: batchEntries.map(({ batch: target, sourceMaterial, originals }) => ({
          material: sourceMaterial.name || sourceMaterial.type,
          materialType: sourceMaterial.type,
          materialUuid: sourceMaterial.uuid,
          materialFingerprint: materialFingerprint(sourceMaterial),
          castShadow: target.castShadow,
          receiveShadow: target.receiveShadow,
          frustumCulled: target.perObjectFrustumCulled,
          dynamicSources: originals.filter(({ dynamic }) => dynamic).length,
          sourceCount: originals.length,
          attributeSignatures: [...new Set(originals.map(({ mesh }) => JSON.stringify(attributeSignature(mesh.geometry))))]
            .map((signature) => JSON.parse(signature) as string[]),
          sources: originals.map(({ mesh }) => objectPath(mesh)),
        })),
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
