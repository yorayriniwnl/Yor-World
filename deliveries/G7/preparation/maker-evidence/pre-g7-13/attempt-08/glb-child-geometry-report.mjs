import { readFileSync } from "node:fs";

const inventory = JSON.parse(readFileSync(new URL("./glb-inventory.json", import.meta.url), "utf8"));
const lines = [];
lines.push(`GLB ${inventory.glb.path} sha256=${inventory.glb.sha256} bytes=${inventory.glb.sizeBytes} nodes=${inventory.glb.jsonNodeCount} meshes=${inventory.glb.meshCount} materials=${inventory.glb.materialCount}`);
lines.push("HEX PANEL MESHES:");
for (const row of inventory.targets.filter((item) => /^hex_panel_[1-7]$/.test(item.name ?? ""))) {
  for (const mesh of row.meshInfo) {
    const unique = [...new Map(mesh.firstVertices.map((vertex) => [vertex.map((value) => Number(value.toFixed(6))).join(","), vertex])).values()];
    lines.push(`${row.name} ${row.path} local=${JSON.stringify(row.local.translation)} mesh=${mesh.meshName} material=${mesh.materialName} bounds=${JSON.stringify(mesh.localBounds)} uniqueVertexCount=${mesh.uniquePositionCount} triangleIndexCount=${mesh.indexCount} uniqueVertices=${JSON.stringify(unique)}`);
  }
}
lines.push("PLANT ROOT AND DESCENDANTS (world mesh bounds):");
for (const row of inventory.targets.filter((item) => item.name === "plants" || item.ancestors.includes("plants"))) {
  if (!row.meshInfo.length) lines.push(`${row.name} ${row.path} parent=${row.ancestors.join("/")} local=${JSON.stringify(row.local.translation)} children=${row.children.map((child) => child.name).join(",")}`);
  for (const mesh of row.meshInfo) lines.push(`${row.name} ${row.path} local=${JSON.stringify(row.local.translation)} mesh=${mesh.meshName} material=${mesh.materialName} worldBounds=${JSON.stringify(mesh.worldBounds)}`);
}
lines.push("DESKTOP SURFACES:");
for (const row of inventory.targets.filter((item) => ["desk_top", "desk_mat"].includes(item.name ?? ""))) {
  for (const mesh of row.meshInfo) lines.push(`${row.name} ${row.path} local=${JSON.stringify(row.local.translation)} mesh=${mesh.meshName} material=${mesh.materialName} worldBounds=${JSON.stringify(mesh.worldBounds)}`);
}
lines.push("SHELVES:");
for (const row of inventory.targets.filter((item) => ["shelf_rear_upper", "shelf_rear_lower"].includes(item.name ?? ""))) {
  for (const mesh of row.meshInfo) lines.push(`${row.name} ${row.path} local=${JSON.stringify(row.local.translation)} mesh=${mesh.meshName} material=${mesh.materialName} worldBounds=${JSON.stringify(mesh.worldBounds)}`);
}
lines.push("CAMERA ROOT AND DESCENDANTS:");
for (const row of inventory.targets.filter((item) => item.name === "ai-real-camera" || item.ancestors.includes("ai-real-camera") || item.name?.startsWith("ai_cam_"))) {
  if (!row.meshInfo.length) lines.push(`${row.name} ${row.path} parent=${row.ancestors.join("/")} local=${JSON.stringify(row.local.translation)} children=${row.children.map((child) => child.name).join(",")}`);
  for (const mesh of row.meshInfo) lines.push(`${row.name} ${row.path} local=${JSON.stringify(row.local.translation)} mesh=${mesh.meshName} material=${mesh.materialName} worldBounds=${JSON.stringify(mesh.worldBounds)}`);
}
lines.push("MATERIAL INVENTORY / USERS:");
for (const material of inventory.materials) lines.push(`${material.name}: ${material.users.map((user) => `${user.node}(${user.path})`).join(", ")}`);
process.stdout.write(`${lines.join("\n")}\n`);
