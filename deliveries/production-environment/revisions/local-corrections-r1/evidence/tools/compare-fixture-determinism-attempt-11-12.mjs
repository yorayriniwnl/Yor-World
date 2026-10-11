import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function readGlb(relativePath) {
  const file = path.join(root, relativePath);
  const bytes = fs.readFileSync(file);
  if (bytes.toString('ascii', 0, 4) !== 'glTF' || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length) {
    throw new Error(`Invalid GLB header: ${relativePath}`);
  }
  const jsonLength = bytes.readUInt32LE(12);
  if (bytes.toString('ascii', 16, 20) !== 'JSON') throw new Error(`Missing GLB JSON chunk: ${relativePath}`);
  const document = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength).replace(/[\u0000\u0020]+$/u, ''));
  const binHeader = 20 + jsonLength;
  const binLength = bytes.readUInt32LE(binHeader);
  if (bytes.toString('ascii', binHeader + 4, binHeader + 8) !== 'BIN\0' || binHeader + 8 + binLength !== bytes.length) {
    throw new Error(`Invalid GLB BIN chunk: ${relativePath}`);
  }
  return { bytes, document, binStart: binHeader + 8, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
}

function accessorValues(glb, accessorIndex, componentCount, componentFormat, componentBytes) {
  const accessor = glb.document.accessors[accessorIndex];
  const view = glb.document.bufferViews[accessor.bufferView];
  const stride = view.byteStride ?? componentCount * componentBytes;
  const offset = glb.binStart + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const read = componentFormat === 'f' ? 'readFloatLE' : componentBytes === 2 ? 'readUInt16LE' : 'readUInt32LE';
  const out = [];
  for (let i = 0; i < accessor.count; i++) {
    for (let j = 0; j < componentCount; j++) out.push(glb.bytes[read](offset + i * stride + j * componentBytes));
  }
  return out;
}

function keyRows(glb) {
  const result = new Map();
  for (const node of glb.document.nodes ?? []) {
    if (!Number.isInteger(node.mesh)) continue;
    const mesh = glb.document.meshes[node.mesh];
    for (let primitiveIndex = 0; primitiveIndex < mesh.primitives.length; primitiveIndex++) {
      const primitive = mesh.primitives[primitiveIndex];
      const positionAccessor = glb.document.accessors[primitive.attributes.POSITION];
      const normalAccessor = glb.document.accessors[primitive.attributes.NORMAL];
      const indexAccessor = glb.document.accessors[primitive.indices];
      if (positionAccessor.type !== 'VEC3' || positionAccessor.componentType !== 5126 ||
          normalAccessor.type !== 'VEC3' || normalAccessor.componentType !== 5126 ||
          indexAccessor.type !== 'SCALAR' || ![5123, 5125].includes(indexAccessor.componentType)) {
        throw new Error(`Unexpected fixture accessor layout for ${node.name}`);
      }
      const positions = accessorValues(glb, primitive.attributes.POSITION, 3, 'f', 4);
      const normals = accessorValues(glb, primitive.attributes.NORMAL, 3, 'f', 4);
      const indexFormat = indexAccessor.componentType === 5123 ? 'H' : 'I';
      const indexBytes = indexAccessor.componentType === 5123 ? 2 : 4;
      const view = glb.document.bufferViews[indexAccessor.bufferView];
      const stride = view.byteStride ?? indexBytes;
      const offset = glb.binStart + (view.byteOffset ?? 0) + (indexAccessor.byteOffset ?? 0);
      const indices = Array.from({ length: indexAccessor.count }, (_, i) =>
        glb.bytes[indexFormat === 'H' ? 'readUInt16LE' : 'readUInt32LE'](offset + i * stride));
      if (indices.length % 3) throw new Error(`Non-triangle index count for ${node.name}`);
      const faces = [];
      for (let i = 0; i < indices.length; i += 3) {
        const [a, b, c] = indices.slice(i, i + 3);
        faces.push([[a, b, c], [b, c, a], [c, a, b]].sort((x, y) =>
          x[0] - y[0] || x[1] - y[1] || x[2] - y[2])[0]);
      }
      faces.sort((x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2]);
      const key = `${node.name}::${primitiveIndex}`;
      if (result.has(key)) throw new Error(`Duplicate mesh primitive key: ${key}`);
      result.set(key, { positions, normals, indices, faces, triangleCount: faces.length });
    }
  }
  return result;
}

function compareGeometry(a, b) {
  const left = keyRows(a), right = keyRows(b);
  const sameKeys = left.size === right.size && [...left.keys()].every(key => right.has(key));
  let positionsEqual = sameKeys, canonicalTrianglesEqual = sameKeys, rawIndicesEqual = sameKeys;
  let maxNormalScalarDelta = 0, changedNormalScalarCount = 0, triangles = 0;
  for (const [key, x] of left) {
    const y = right.get(key);
    if (!y) continue;
    triangles += x.triangleCount;
    positionsEqual &&= JSON.stringify(x.positions) === JSON.stringify(y.positions);
    canonicalTrianglesEqual &&= JSON.stringify(x.faces) === JSON.stringify(y.faces);
    rawIndicesEqual &&= JSON.stringify(x.indices) === JSON.stringify(y.indices);
    if (x.normals.length !== y.normals.length) {
      maxNormalScalarDelta = null;
      changedNormalScalarCount = null;
      continue;
    }
    for (let i = 0; i < x.normals.length; i++) {
      const delta = Math.abs(x.normals[i] - y.normals[i]);
      if (delta > 0) changedNormalScalarCount++;
      if (maxNormalScalarDelta === null || delta > maxNormalScalarDelta) maxNormalScalarDelta = delta;
    }
  }
  return { meshPrimitiveCount: left.size, triangles, sameMeshPrimitiveKeys: sameKeys, positionsExactlyEqual: positionsEqual,
    canonicalWindingPreservingTriangleSetsExactlyEqual: canonicalTrianglesEqual, rawIndexArraysExactlyEqual: rawIndicesEqual,
    changedNormalScalarCount, maxNormalScalarDelta };
}

const baselinePath = 'evidence/fixture-attempt-06/runtime/fixture-production.glb';
const firstPath = 'evidence/fixture-attempt-11/runtime/fixture-production.glb';
const secondPath = 'evidence/fixture-attempt-12/runtime/fixture-production.glb';
const baseline = readGlb(baselinePath), first = readGlb(firstPath), second = readGlb(secondPath);
const pairBytesEqual = first.bytes.equals(second.bytes);
const pairJsonEqual = JSON.stringify(first.document) === JSON.stringify(second.document);
const baselineJsonEqual = JSON.stringify(baseline.document) === JSON.stringify(first.document);
const result = {
  kind: 'deterministic fixture export pair and geometry comparison against preserved fixture06',
  sourceSnapshot: 'source-fixture-determinism-attempt-11/source-manifest.json',
  sourceSha256: {
    builder: 'e03a890c26c2c1b97f2d23d813d99e73d058f29ece443ff9bcdf9b55284e0f23',
    artRefinements: '6a293c5a04571f72343860af70c115fa6a3dc22d55fef809998224026c4ba961'
  },
  attempts: [
    { attempt: 'fixture-attempt-11', pythonHashSeed: 0, path: firstPath, bytes: first.bytes.length, sha256: first.sha256 },
    { attempt: 'fixture-attempt-12', pythonHashSeed: 42, path: secondPath, bytes: second.bytes.length, sha256: second.sha256 }
  ],
  pair: { byteForByteEqual: pairBytesEqual, glbJsonEqual: pairJsonEqual },
  againstPreservedFixture06: {
    path: baselinePath, bytes: baseline.bytes.length, sha256: baseline.sha256,
    glbJsonEqual: baselineJsonEqual, ...compareGeometry(baseline, first)
  },
  status: pairBytesEqual && pairJsonEqual && baselineJsonEqual
    && compareGeometry(baseline, first).positionsExactlyEqual
    && compareGeometry(baseline, first).canonicalWindingPreservingTriangleSetsExactlyEqual ? 'PASS' : 'FAIL'
};
const output = path.join(root, 'evidence/fixture-determinism-attempt-11-12.json');
fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify(result, null, 2));
if (result.status !== 'PASS') process.exitCode = 1;
