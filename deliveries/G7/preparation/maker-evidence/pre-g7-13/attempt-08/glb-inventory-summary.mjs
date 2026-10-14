import { readFileSync } from "node:fs";

const inventory = JSON.parse(readFileSync(new URL("./glb-inventory.json", import.meta.url), "utf8"));
const plantRows = inventory.targets.filter((row) => row.ancestors.includes("plants") || row.name === "plants");
const panels = inventory.targets.filter((row) => /^hex_panel_[1-7]$/.test(row.name ?? ""));
const tabletopRows = inventory.targets.filter((row) => row.name === "desk_top" || row.name === "desk_mat");
const cameraRows = inventory.targets.filter((row) => row.name === "ai-real-camera" || row.ancestors.includes("ai-real-camera"));
const details = {
  glb: inventory.glb,
  hexPanelGeometry: panels.map((row) => ({
    node: row.name,
    path: row.path,
    localTranslation: row.local.translation,
    mesh: row.meshInfo.map((mesh) => ({
      mesh: mesh.meshName,
      material: mesh.materialName,
      baseColorFactor: mesh.material?.pbrMetallicRoughness?.baseColorFactor ?? null,
      emissiveFactor: mesh.material?.emissiveFactor ?? [0, 0, 0],
      localBounds: mesh.localBounds,
      worldBounds: mesh.worldBounds,
      uniquePositionCount: mesh.uniquePositionCount,
      indexCount: mesh.indexCount,
      uniquePositions: [...new Map(mesh.firstVertices.map((vertex) => [vertex.map((value) => Number(value.toFixed(6))).join(","), vertex])).values()],
    })),
  })),
  plantsHierarchyAndMeshBounds: plantRows.map((row) => ({
    node: row.name,
    path: row.path,
    parentPath: row.ancestors.join("/"),
    localTranslation: row.local.translation,
    mesh: row.meshInfo.map((mesh) => ({ mesh: mesh.meshName, material: mesh.materialName, localBounds: mesh.localBounds, worldBounds: mesh.worldBounds })),
  })),
  desktopSurfaceNodes: tabletopRows.map((row) => ({
    node: row.name,
    path: row.path,
    localTranslation: row.local.translation,
    mesh: row.meshInfo.map((mesh) => ({ mesh: mesh.meshName, material: mesh.materialName, localBounds: mesh.localBounds, worldBounds: mesh.worldBounds })),
  })),
  cameraHierarchy: cameraRows.map((row) => ({
    node: row.name,
    path: row.path,
    localTranslation: row.local.translation,
    children: row.children,
    mesh: row.meshInfo.map((mesh) => ({ mesh: mesh.meshName, material: mesh.materialName, localBounds: mesh.localBounds, worldBounds: mesh.worldBounds })),
  })),
  namedMaterialUsers: inventory.materials,
};
process.stdout.write(`${JSON.stringify(details, null, 2)}\n`);
