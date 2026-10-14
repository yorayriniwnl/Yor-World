import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../../..");
const glbPath = path.join(root, "app/public/models/production-room-full.glb");
const bytes = readFileSync(glbPath);
const sha256 = createHash("sha256").update(bytes).digest("hex");
if (bytes.toString("ascii", 0, 4) !== "glTF") throw new Error("Expected GLB v2 header");
const jsonLength = bytes.readUInt32LE(12);
const jsonType = bytes.readUInt32LE(16);
if (jsonType !== 0x4e4f534a) throw new Error("Expected JSON chunk first");
const gltf = JSON.parse(bytes.toString("utf8", 20, 20 + jsonLength));
const binHeader = 20 + jsonLength;
const binLength = bytes.readUInt32LE(binHeader);
const binType = bytes.readUInt32LE(binHeader + 4);
if (binType !== 0x004e4942) throw new Error("Expected BIN chunk second");
const binary = bytes.subarray(binHeader + 8, binHeader + 8 + binLength);

const multiply = (a, b) => {
  const out = Array(16).fill(0);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      for (let index = 0; index < 4; index += 1) out[column * 4 + row] += a[index * 4 + row] * b[column * 4 + index];
    }
  }
  return out;
};
const localMatrix = (node) => {
  if (node.matrix) return node.matrix;
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];
  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  return [
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    tx, ty, tz, 1,
  ];
};
const transform = (m, [x, y, z]) => [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
const transformedBounds = (m, bounds) => {
  if (!bounds) return null;
  const corners = Array.from({ length: 8 }, (_, mask) => transform(m, [
    mask & 1 ? bounds.max[0] : bounds.min[0],
    mask & 2 ? bounds.max[1] : bounds.min[1],
    mask & 4 ? bounds.max[2] : bounds.min[2],
  ]));
  return {
    min: [0, 1, 2].map((axis) => Math.min(...corners.map((corner) => corner[axis]))),
    max: [0, 1, 2].map((axis) => Math.max(...corners.map((corner) => corner[axis]))),
  };
};
const accessorBytes = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const typeComponents = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
function getAccessor(index) {
  const accessor = gltf.accessors[index];
  const view = gltf.bufferViews[accessor.bufferView];
  const componentSize = accessorBytes[accessor.componentType];
  const components = typeComponents[accessor.type];
  const stride = view.byteStride ?? componentSize * components;
  const offset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const values = [];
  for (let item = 0; item < accessor.count; item += 1) {
    const tuple = [];
    for (let component = 0; component < components; component += 1) {
      const cursor = offset + item * stride + component * componentSize;
      if (accessor.componentType === 5126) tuple.push(binary.readFloatLE(cursor));
      else if (accessor.componentType === 5125) tuple.push(binary.readUInt32LE(cursor));
      else if (accessor.componentType === 5123) tuple.push(binary.readUInt16LE(cursor));
      else if (accessor.componentType === 5121) tuple.push(binary.readUInt8(cursor));
      else if (accessor.componentType === 5122) tuple.push(binary.readInt16LE(cursor));
      else tuple.push(binary.readInt8(cursor));
    }
    values.push(tuple);
  }
  return { accessor, values };
}
function nodeMeshInfo(node) {
  if (node.mesh === undefined) return [];
  const mesh = gltf.meshes[node.mesh];
  return mesh.primitives.map((primitive) => {
    const positionIndex = primitive.attributes.POSITION;
    const position = positionIndex === undefined ? null : getAccessor(positionIndex);
    const indices = primitive.indices === undefined ? null : getAccessor(primitive.indices);
    const material = primitive.material === undefined ? null : gltf.materials[primitive.material];
    const values = position?.values ?? [];
    const unique = new Set(values.map((tuple) => tuple.map((number) => Number(number.toFixed(6))).join(",")));
    return {
      meshName: mesh.name ?? null,
      materialName: material?.name ?? null,
      material: material ? { pbrMetallicRoughness: material.pbrMetallicRoughness, emissiveFactor: material.emissiveFactor, alphaMode: material.alphaMode } : null,
      positionAccessor: positionIndex,
      vertexCount: position?.accessor.count ?? 0,
      uniquePositionCount: unique.size,
      localBounds: position?.accessor.min && position.accessor.max ? { min: position.accessor.min, max: position.accessor.max } : null,
      firstVertices: values.slice(0, 32),
      indexCount: indices?.accessor.count ?? null,
      indices: indices?.values.flat().slice(0, 48) ?? null,
    };
  });
}

const nodes = gltf.nodes;
const allRows = [];
function visit(index, parentMatrix, parentPath, ancestors) {
  const node = nodes[index];
  const world = multiply(parentMatrix, localMatrix(node));
  const nodePath = [...parentPath, node.name || `node-${index}`];
  const pathLabel = nodePath.join("/");
  const meshInfo = nodeMeshInfo(node).map((mesh) => ({ ...mesh, worldBounds: transformedBounds(world, mesh.localBounds) }));
  allRows.push({ index, name: node.name ?? null, path: pathLabel, ancestors, children: (node.children ?? []).map((child) => ({ index: child, name: nodes[child].name ?? null })), local: { translation: node.translation ?? [0, 0, 0], scale: node.scale ?? [1, 1, 1], rotation: node.rotation ?? [0, 0, 0, 1] }, worldMatrix: world, meshInfo });
  for (const child of node.children ?? []) visit(child, world, nodePath, [...ancestors, node.name ?? `node-${index}`]);
}
const scene = gltf.scenes[gltf.scene ?? 0];
for (const index of scene.nodes) visit(index, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], [], []);

const targetNames = new Set([
  "plants", "ai-real-camera", "hex_panel_1", "hex_panel_2", "hex_panel_3", "hex_panel_4", "hex_panel_5", "hex_panel_6", "hex_panel_7",
  "lightbar_emissive", "monitor", "speaker_left_cabinet", "speaker_right_cabinet", "talks-microphone", "helios-pc", "pegboard_system",
  "peg_controller_body", "desk", "desk-top", "desktop", "desk_surface", "desktop_surface", "Desk_IvoryTop", "shelf_rear_upper", "shelf_rear_lower",
]);
const targetRows = allRows.filter((row) => targetNames.has(row.name) || row.ancestors.includes("plants") || row.name?.startsWith("ai_cam_") || /desk|plant|speaker|monitor|microphone|camera|hex_panel|pegboard|lightbar/i.test(row.name ?? ""));
const materialUsers = new Map();
for (const row of allRows) {
  for (const mesh of row.meshInfo) {
    if (!mesh.materialName) continue;
    const users = materialUsers.get(mesh.materialName) ?? [];
    users.push({ node: row.name, path: row.path, mesh: mesh.meshName });
    materialUsers.set(mesh.materialName, users);
  }
}

const result = {
  glb: { path: "app/public/models/production-room-full.glb", sizeBytes: bytes.length, sha256, jsonNodeCount: nodes.length, meshCount: gltf.meshes.length, materialCount: gltf.materials.length },
  targets: targetRows,
  materials: [...materialUsers.entries()].filter(([name]) => /Hex_|Lightbar_WarmTask|Desk_IvoryTop|Plant_|Door_OakWood|Project_ScannerBlue|Pegboard_Perforated/i.test(name)).map(([name, users]) => ({ name, users })),
};
const output = `${JSON.stringify(result, null, 2)}\n`;
writeFileSync(new URL("./glb-inventory.json", import.meta.url), output, "utf8");
process.stdout.write(output);
