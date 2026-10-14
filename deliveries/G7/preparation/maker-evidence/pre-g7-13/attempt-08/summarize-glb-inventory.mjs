import { readFileSync } from "node:fs";

const inventory = JSON.parse(readFileSync(new URL("./glb-inventory.json", import.meta.url), "utf8"));
const rows = inventory.targets;
const simplified = (row, keepVertices = false) => ({
  index: row.index,
  name: row.name,
  path: row.path,
  ancestors: row.ancestors,
  children: row.children,
  local: row.local,
  meshes: row.meshInfo.map((mesh) => ({
    meshName: mesh.meshName,
    materialName: mesh.materialName,
    material: mesh.material,
    localBounds: mesh.localBounds,
    worldBounds: mesh.worldBounds,
    vertexCount: mesh.vertexCount,
    uniquePositionCount: mesh.uniquePositionCount,
    indexCount: mesh.indexCount,
    ...(keepVertices ? { firstVertices: mesh.firstVertices, indices: mesh.indices } : {}),
  })),
});
const hexes = rows.filter((row) => /^hex_panel_[1-7]$/.test(row.name ?? "")).map((row) => simplified(row, true));
const plants = rows.filter((row) => row.name === "plants" || row.ancestors.includes("plants")).map((row) => simplified(row));
const tabletop = rows.filter((row) => row.meshInfo.some((mesh) => ["Desk_IvoryTop", "Desk_MatTopography"].includes(mesh.materialName))).map((row) => simplified(row));
const camera = rows.filter((row) => row.name === "ai-real-camera").map((row) => simplified(row));
const consoleArea = rows.filter((row) => ["talks-microphone", "desk"].includes(row.name) || row.meshInfo.some((mesh) => ["Desk_IvoryTop", "Desk_MatTopography"].includes(mesh.materialName))).map((row) => simplified(row));
const result = {
  glb: inventory.glb,
  hexPanelMeshGeometry: hexes,
  plantsHierarchyAndMeshBounds: plants,
  cameraHierarchy: camera,
  tabletopMaterialUsers: tabletop,
  consolePlacementInputs: consoleArea,
  namedMaterialUsers: inventory.materials,
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
