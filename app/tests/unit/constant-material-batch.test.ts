import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { ConstantMaterialBatch, constantMaterialShader } from "../../src/features/world/ConstantMaterialBatch";
import { attributeLayout, eligible, LOW_BATCH_ORIGINAL_LAYER } from "../../src/features/world/LowQualityBatch";

function fixture(options: { linked?: boolean; shadowType?: THREE.ShadowMapType } = {}) {
  const scene = new THREE.Scene();
  const materials = [
    new THREE.MeshStandardMaterial({ color: "#e982f8", roughness: 0.24, metalness: 0.05, emissive: "#220011", emissiveIntensity: 0.4 }),
    new THREE.MeshStandardMaterial({ color: "#496dd5", roughness: 0.78, metalness: 0.3, emissive: "#001122", emissiveIntensity: 0.8 }),
  ];
  const geometry = new THREE.BoxGeometry();
  geometry.clearGroups();
  const meshes = materials.map((material, index) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = index * 1.25;
    scene.add(mesh);
    return mesh;
  });
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 50);
  camera.position.set(0, 0, 8);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  const program = {} as WebGLProgram;
  const context = {
    LINK_STATUS: 0x8b82,
    getProgramParameter: vi.fn(() => options.linked !== false),
  };
  const renderer = {
    sortObjects: true,
    shadowMap: { enabled: options.shadowType !== undefined, type: options.shadowType ?? THREE.PCFShadowMap },
    compile: vi.fn(),
    properties: { get: vi.fn(() => ({ programs: new Map([["fixture", { program }]]) })) },
    getContext: () => context,
  } as unknown as THREE.WebGLRenderer;
  return { scene, materials, geometry, meshes, camera, renderer };
}

function findBatch(scene: THREE.Scene): THREE.Mesh | undefined {
  const batch = scene.getObjectByName("rigid-world-constant-material-batch");
  return batch?.type === "Mesh" ? batch as THREE.Mesh : undefined;
}

describe("constant PBR parameter batching", () => {
  it("injects per-vertex PBR constants without changing the pinned standard shader structure", () => {
    const shader = constantMaterialShader(THREE.ShaderLib.standard.vertexShader, THREE.ShaderLib.standard.fragmentShader);
    expect(shader.vertexShader).toContain("attribute vec2 yorRoughMetal;");
    expect(shader.vertexShader).toContain("attribute vec3 yorEmission;");
    expect(shader.vertexShader).toContain("vYorRoughMetal = yorRoughMetal;");
    expect(shader.fragmentShader).toContain("vec3 totalEmissiveRadiance = vYorEmission;");
    expect(shader.fragmentShader).toContain("float roughnessFactor = vYorRoughMetal.x;");
    expect(shader.fragmentShader).toContain("float metalnessFactor = vYorRoughMetal.y;");
  });

  it("combines distinct constant materials while preserving source hierarchy, raycast identity and exact per-vertex values", () => {
    const { scene, materials, geometry, meshes, camera, renderer } = fixture();
    const batcher = new ConstantMaterialBatch(scene, camera, renderer);
    const batch = findBatch(scene)!;
    expect(batch).toBeDefined();
    expect(renderer.compile).toHaveBeenCalledOnce();
    expect(batcher.claimed).toEqual(new Set(meshes));
    expect(meshes.map((mesh) => mesh.parent)).toEqual([scene, scene]);
    expect(meshes.map((mesh) => mesh.raycast)).toEqual([THREE.Mesh.prototype.raycast, THREE.Mesh.prototype.raycast]);
    expect(meshes.map((mesh) => mesh.layers.mask)).toEqual([1 << LOW_BATCH_ORIGINAL_LAYER, 1 << LOW_BATCH_ORIGINAL_LAYER]);

    const colors = batch.geometry.getAttribute("color").array as Float32Array;
    const roughMetal = batch.geometry.getAttribute("yorRoughMetal").array as Float32Array;
    const emissions = batch.geometry.getAttribute("yorEmission").array as Float32Array;
    expect(new Set(Array.from({ length: colors.length / 3 }, (_, index) => colors[index * 3]!.toFixed(3))).size).toBeGreaterThan(1);
    expect(new Set(Array.from({ length: roughMetal.length / 2 }, (_, index) => roughMetal[index * 2]!.toFixed(2)))).toEqual(new Set(["0.24", "0.78"]));
    expect(new Set(Array.from({ length: emissions.length / 3 }, (_, index) => emissions[index * 3]!.toFixed(3))).size).toBeGreaterThan(1);
    expect(batch.material).not.toBe(materials[0]);
    expect(batch.geometry).not.toBe(geometry);
    batcher.dispose();
  });

  it("keeps source color buffers on the native path instead of overwriting material-color inputs", () => {
    const { scene, geometry, meshes, camera, renderer } = fixture();
    const position = geometry.getAttribute("position");
    geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(position.count * 3).fill(0.07), 3));
    expect(attributeLayout(geometry)).not.toBeNull();
    expect(meshes.every((mesh) => eligible(mesh, new Set(), true))).toBe(true);
    const batcher = new ConstantMaterialBatch(scene, camera, renderer);
    const originalGeometry = meshes.map((mesh) => mesh.geometry);
    const originalMaterials = meshes.map((mesh) => mesh.material);

    expect(findBatch(scene)).toBeUndefined();
    expect(batcher.claimed.size).toBe(0);
    expect(meshes.every((mesh) => !mesh.material.vertexColors)).toBe(true);
    expect(geometry.getAttribute("color").array).toEqual(new Float32Array(position.count * 3).fill(0.07));

    meshes[1]!.position.x += 0.2;
    batcher.update();

    expect(meshes.map((mesh) => mesh.geometry)).toEqual(originalGeometry);
    expect(meshes.map((mesh) => mesh.material)).toEqual(originalMaterials);
    expect(meshes.map((mesh) => mesh.layers.mask)).toEqual([1, 1]);
    batcher.dispose();
  });

  it("retires only a source whose material changes and restores every source on idempotent cleanup", () => {
    const { scene, materials, geometry, meshes, camera, renderer } = fixture();
    const batcher = new ConstantMaterialBatch(scene, camera, renderer);
    const batch = findBatch(scene)!;
    const disposeBatchGeometry = vi.spyOn(batch.geometry, "dispose");
    const disposeBatchMaterial = vi.spyOn(batch.material as THREE.Material, "dispose");
    const disposeSourceGeometry = vi.spyOn(geometry, "dispose");
    const disposeSourceMaterial = vi.spyOn(materials[0]!, "dispose");

    materials[0]!.roughness = 0.5;
    batcher.update();
    expect(meshes[0]!.layers.mask).toBe(1);
    expect(meshes[1]!.layers.mask).toBe(1 << LOW_BATCH_ORIGINAL_LAYER);
    expect(batch.geometry.drawRange.count).toBeLessThan(geometry.index!.count * 2);

    batcher.dispose();
    batcher.dispose();
    expect(meshes.map((mesh) => mesh.layers.mask)).toEqual([1, 1]);
    expect(meshes.map((mesh) => mesh.parent)).toEqual([scene, scene]);
    expect(disposeBatchGeometry).toHaveBeenCalledOnce();
    expect(disposeBatchMaterial).toHaveBeenCalledOnce();
    expect(disposeSourceGeometry).not.toHaveBeenCalled();
    expect(disposeSourceMaterial).not.toHaveBeenCalled();
  });

  it("falls back without mutating originals when the shader fails to link or the renderer uses an unsupported shadow type", () => {
    const failed = fixture({ linked: false });
    const failedBatcher = new ConstantMaterialBatch(failed.scene, failed.camera, failed.renderer);
    expect(findBatch(failed.scene)).toBeUndefined();
    expect(failed.meshes.map((mesh) => mesh.layers.mask)).toEqual([1, 1]);
    expect(failed.meshes.map((mesh) => mesh.parent)).toEqual([failed.scene, failed.scene]);
    failedBatcher.dispose();

    const unsupported = fixture({ shadowType: THREE.BasicShadowMap });
    const fallback = new ConstantMaterialBatch(unsupported.scene, unsupported.camera, unsupported.renderer);
    expect(findBatch(unsupported.scene)).toBeUndefined();
    expect(unsupported.meshes.map((mesh) => mesh.layers.mask)).toEqual([1, 1]);
    fallback.dispose();
  });
});
