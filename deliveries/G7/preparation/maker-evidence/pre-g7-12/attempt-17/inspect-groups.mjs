import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as THREE from '../../../../../../app/node_modules/three/build/three.module.js';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../../../../');
const file = path.join(root, 'app/public/models/production-room-full.glb');
const data = fs.readFileSync(file);
const json = JSON.parse(data.subarray(20, 20 + data.readUInt32LE(12)).toString('utf8').replace(/\0+$/, '').trim());
const parents = new Map();
for (const [index, node] of json.nodes.entries()) for (const child of node.children ?? []) parents.set(child, index);
const nameIndex = new Map(json.nodes.map((node, index) => [node.name, index]));
const worldCache = new Map();
function world(index) {
  if (worldCache.has(index)) return worldCache.get(index).clone();
  const node = json.nodes[index];
  const matrix = node.matrix ? new THREE.Matrix4().fromArray(node.matrix) : new THREE.Matrix4().compose(
    new THREE.Vector3(...(node.translation ?? [0, 0, 0])),
    new THREE.Quaternion(...(node.rotation ?? [0, 0, 0, 1])),
    new THREE.Vector3(...(node.scale ?? [1, 1, 1])),
  );
  if (parents.has(index)) matrix.premultiply(world(parents.get(index)));
  worldCache.set(index, matrix.clone());
  return matrix;
}
function subtree(index, result = []) {
  result.push(index);
  for (const child of json.nodes[index].children ?? []) subtree(child, result);
  return result;
}
function boundsFor(index) {
  const bounds = new THREE.Box3();
  const descendants = subtree(index);
  for (const childIndex of descendants) {
    const mesh = json.meshes?.[json.nodes[childIndex].mesh];
    if (!mesh) continue;
    for (const primitive of mesh.primitives ?? []) {
      const accessor = json.accessors?.[primitive.attributes?.POSITION];
      if (!accessor?.min || !accessor?.max) continue;
      bounds.union(new THREE.Box3(new THREE.Vector3(...accessor.min), new THREE.Vector3(...accessor.max)).applyMatrix4(world(childIndex)));
    }
  }
  return { descendants: descendants.length, min: bounds.isEmpty() ? null : bounds.min.toArray(), max: bounds.isEmpty() ? null : bounds.max.toArray() };
}
function summary(name) {
  const index = nameIndex.get(name);
  if (index === undefined) return { name, missing: true };
  const matrix = world(index);
  const pos = new THREE.Vector3(); const quat = new THREE.Quaternion(); const scale = new THREE.Vector3(); matrix.decompose(pos, quat, scale);
  return { name, index, parent: parents.has(index) ? json.nodes[parents.get(index)].name : null, worldPosition: pos.toArray(), subtreeBounds: boundsFor(index), children: (json.nodes[index].children ?? []).map((child) => ({ name: json.nodes[child].name, ...boundsFor(child) })) };
}
const names = ['desk','monitor','audio_and_accessories','plants','shelves','essential_lights','pegboard_system','ai-real-camera','helios-pc','talks-microphone','console','game-console','headset-stand'];
const result = { source: 'app/public/models/production-room-full.glb', modelSha256: createHash('sha256').update(data).digest('hex'), groups: names.map(summary) };
fs.writeFileSync(path.join(here, 'glb-group-bounds.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(result.groups.map((group) => {
  const fmt = (v) => Array.isArray(v) ? v.map((x) => x.toFixed(2)).join(',') : String(v);
  if (group.missing) return `${group.name}: missing`;
  return `${group.name}: pos=${fmt(group.worldPosition)} bounds=${group.subtreeBounds.min ? `${fmt(group.subtreeBounds.min)}..${fmt(group.subtreeBounds.max)}` : 'empty'} (${group.subtreeBounds.descendants} nodes) children=${group.children?.map((child) => child.name).join(',') ?? ''}`;
}).join('\n'));
