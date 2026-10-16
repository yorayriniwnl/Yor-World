import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";

globalThis.self ??= globalThis;
const appRoot = path.resolve(process.cwd(), "app");
const { GLTFLoader } = await import(pathToFileURL(path.join(appRoot, "node_modules/three/examples/jsm/loaders/GLTFLoader.js")));
const THREE = await import(pathToFileURL(path.join(appRoot, "node_modules/three/build/three.module.js")));
const assets = ["production-room-full.glb", "resident-production.glb", "fixture-production.glb"];
const results = [];
const outputPath = process.argv[2] ? path.resolve(process.argv[2]) : null;

for (const asset of assets) {
  const source = readFileSync(path.join(appRoot, "public/models", asset));
  const buffer = source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
  const gltf = await new GLTFLoader().parseAsync(buffer, "");
  gltf.scene.animations = gltf.animations;
  gltf.scene.updateWorldMatrix(true, true);
  const meshes = [];
  gltf.scene.traverse((node) => {
    if (!node.isMesh) return;
    const geometry = node.geometry;
    const extent = geometry.index?.count ?? geometry.getAttribute("position")?.count ?? 0;
    const sorted = [...geometry.groups].sort((a, b) => a.start - b.start || a.count - b.count);
    let cursor = 0;
    let gapOrOverlap = false;
    for (const group of sorted) {
      if (group.start !== cursor) gapOrOverlap = true;
      cursor = group.start + group.count;
    }
    const fullCoverage = sorted.length > 0 && !gapOrOverlap && cursor === extent;
    const oneMaterial = !Array.isArray(node.material);
    let combinedGroupCount = null;
    if (oneMaterial && sorted.length > 0) {
      const vertices = geometry.getAttribute("position").count;
      const indices = geometry.index?.count ?? 0;
      const combined = new THREE.BatchedMesh(1, vertices, indices, node.material);
      combined.addGeometry(geometry);
      combinedGroupCount = combined.geometry.groups.length;
      combined.dispose();
    }
    meshes.push({
      name: node.name,
      material: oneMaterial ? (node.material.name || node.material.type) : node.material.map((m) => m.name || m.type),
      oneMaterial,
      indexed: Boolean(geometry.index),
      extent,
      groupCount: geometry.groups.length,
      groups: geometry.groups.map(({ start, count, materialIndex }) => ({ start, count, materialIndex })),
      allGroupsMaterialIndexZero: geometry.groups.every(({ materialIndex }) => materialIndex === 0),
      groupCoverage: fullCoverage ? "full-once" : geometry.groups.length === 0 ? "none" : gapOrOverlap ? "gap-or-overlap" : `ends-at-${cursor}-of-${extent}`,
      batchedGeometryGroupCount: combinedGroupCount,
    });
  });
  results.push({
    asset,
    sha256: createHash("sha256").update(source).digest("hex"),
    meshCount: meshes.length,
    groupedMeshes: meshes.filter(({ groupCount }) => groupCount > 0).length,
    groupedSingleMaterialMeshes: meshes.filter(({ groupCount, oneMaterial }) => groupCount > 0 && oneMaterial).length,
    oneMaterialGroupsWithMaterialIndexZero: meshes.filter(({ groupCount, oneMaterial, allGroupsMaterialIndexZero }) => groupCount > 0 && oneMaterial && allGroupsMaterialIndexZero).length,
    fullCoverageSingleMaterialMeshes: meshes.filter(({ groupCount, oneMaterial, allGroupsMaterialIndexZero, groupCoverage }) => groupCount > 0 && oneMaterial && allGroupsMaterialIndexZero && groupCoverage === "full-once").length,
    meshes,
  });
}

const output = `${JSON.stringify({ schema: "pre-g7-23-source-group-inspection-v1", results }, null, 2)}\n`;
if (outputPath) {
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, output, "utf8");
}
process.stdout.write(output);
