import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const glbPath = new URL('../../../../../../app/public/models/fixture-production.glb', import.meta.url);
const outputPath = new URL('./chair-descendant-inventory.json', import.meta.url);
const bytes = readFileSync(glbPath);
if (bytes.toString('ascii', 0, 4) !== 'glTF') throw new Error('fixture-production.glb has an invalid GLB header');
if (bytes.readUInt32LE(4) !== 2) throw new Error('fixture-production.glb is not GLB version 2');
const jsonChunkLength = bytes.readUInt32LE(12);
if (bytes.readUInt32LE(16) !== 0x4e4f534a) throw new Error('GLB JSON chunk is missing');
const document = JSON.parse(bytes.toString('utf8', 20, 20 + jsonChunkLength));

const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function multiply(a, b) {
  const out = Array(16).fill(0);
  for (let column = 0; column < 4; column++) {
    for (let row = 0; row < 4; row++) {
      for (let k = 0; k < 4; k++) out[column * 4 + row] += a[k * 4 + row] * b[column * 4 + k];
    }
  }
  return out;
}
function localMatrix(node) {
  if (node.matrix) return node.matrix;
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];
  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  const r00 = 1 - 2 * (y * y + z * z);
  const r01 = 2 * (x * y - z * w);
  const r02 = 2 * (x * z + y * w);
  const r10 = 2 * (x * y + z * w);
  const r11 = 1 - 2 * (x * x + z * z);
  const r12 = 2 * (y * z - x * w);
  const r20 = 2 * (x * z - y * w);
  const r21 = 2 * (y * z + x * w);
  const r22 = 1 - 2 * (x * x + y * y);
  return [r00 * sx, r10 * sx, r20 * sx, 0, r01 * sy, r11 * sy, r21 * sy, 0, r02 * sz, r12 * sz, r22 * sz, 0, tx, ty, tz, 1];
}
function transformPoint(matrix, [x, y, z]) {
  return [
    matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
    matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
    matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14],
  ];
}
function primitiveBounds(primitive, worldMatrix) {
  const accessorIndex = primitive.attributes?.POSITION;
  const accessor = accessorIndex === undefined ? null : document.accessors?.[accessorIndex];
  if (!accessor?.min || !accessor?.max) return null;
  const corners = [];
  for (const x of [accessor.min[0], accessor.max[0]]) {
    for (const y of [accessor.min[1], accessor.max[1]]) {
      for (const z of [accessor.min[2], accessor.max[2]]) corners.push(transformPoint(worldMatrix, [x, y, z]));
    }
  }
  return {
    positionAccessor: accessorIndex,
    vertexCount: accessor.count,
    local: { min: accessor.min, max: accessor.max },
    world: {
      min: [0, 1, 2].map(axis => Math.min(...corners.map(point => point[axis]))),
      max: [0, 1, 2].map(axis => Math.max(...corners.map(point => point[axis]))),
    },
  };
}

const selectedScene = document.scenes?.[document.scene ?? 0];
const entries = [];
function visit(index, parentMatrix, parentPath) {
  const node = document.nodes[index];
  const worldMatrix = multiply(parentMatrix, localMatrix(node));
  const path = parentPath ? `${parentPath}/${node.name ?? `node_${index}`}` : (node.name ?? `node_${index}`);
  const isChairDescendant = /(?:^|\/)(?:chair-root|chair-base)(?:\/|$)/.test(path);
  if (isChairDescendant) {
    const mesh = node.mesh === undefined ? null : document.meshes[node.mesh];
    entries.push({
      nodeIndex: index,
      name: node.name ?? null,
      path,
      nodeMesh: node.mesh ?? null,
      localTransform: {
        translation: node.translation ?? [0, 0, 0],
        rotationQuaternion: node.rotation ?? [0, 0, 0, 1],
        scale: node.scale ?? [1, 1, 1],
      },
      worldMatrix,
      children: (node.children ?? []).map(child => document.nodes[child]?.name ?? `node_${child}`),
      primitives: (mesh?.primitives ?? []).map((primitive, primitiveIndex) => ({
        primitiveIndex,
        material: primitive.material === undefined ? null : document.materials?.[primitive.material]?.name ?? `material_${primitive.material}`,
        bounds: primitiveBounds(primitive, worldMatrix),
      })),
    });
  }
  for (const child of node.children ?? []) visit(child, worldMatrix, path);
}
for (const root of selectedScene?.nodes ?? []) visit(root, identity, '');

const result = {
  source: 'app/public/models/fixture-production.glb',
  sourceAbsolutePath: fileURLToPath(glbPath),
  sha256: createHash('sha256').update(bytes).digest('hex'),
  byteLength: bytes.length,
  scene: document.scene ?? 0,
  gltfNodeCount: document.nodes?.length ?? 0,
  chairDescendantCount: entries.length,
  entries,
};
writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`Wrote ${entries.length} chair descendants from ${bytes.length} GLB bytes to ${fileURLToPath(outputPath)}\n`);
