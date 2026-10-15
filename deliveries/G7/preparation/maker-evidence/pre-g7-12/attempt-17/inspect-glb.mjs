import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from '../../../../../../app/node_modules/three/build/three.module.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../../../../../');
const glbPath = path.join(repo, 'app/public/models/production-room-full.glb');
const bytes = fs.readFileSync(glbPath);
const jsonLength = bytes.readUInt32LE(12);
const jsonType = bytes.readUInt32LE(16);
if (jsonType !== 0x4e4f534a) throw new Error('First GLB chunk is not JSON');
const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8').replace(/\0+$/, '').trim());
const parent = new Map();
for (const [parentIndex, node] of (gltf.nodes ?? []).entries()) {
  for (const child of node.children ?? []) parent.set(child, parentIndex);
}
const local = (node) => {
  if (node.matrix) return new THREE.Matrix4().fromArray(node.matrix);
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...(node.translation ?? [0, 0, 0])),
    new THREE.Quaternion(...(node.rotation ?? [0, 0, 0, 1])),
    new THREE.Vector3(...(node.scale ?? [1, 1, 1])),
  );
};
const world = new Map();
const getWorld = (index) => {
  if (world.has(index)) return world.get(index).clone();
  const matrix = local(gltf.nodes[index]);
  if (parent.has(index)) matrix.premultiply(getWorld(parent.get(index)));
  world.set(index, matrix.clone());
  return matrix;
};
const materialInfo = (index) => {
  if (index === undefined) return null;
  const material = gltf.materials?.[index] ?? {};
  return { index, name: material.name, pbr: material.pbrMetallicRoughness, emissiveFactor: material.emissiveFactor, alphaMode: material.alphaMode, extensions: material.extensions };
};
const meshInfo = (index, matrix) => {
  const mesh = gltf.meshes?.[index] ?? {};
  const primitives = (mesh.primitives ?? []).map((primitive) => {
    const positions = gltf.accessors?.[primitive.attributes?.POSITION];
    let bounds = null;
    if (positions?.min && positions?.max) {
      const box = new THREE.Box3(new THREE.Vector3(...positions.min), new THREE.Vector3(...positions.max));
      box.applyMatrix4(matrix);
      bounds = { min: box.min.toArray(), max: box.max.toArray() };
    }
    return { material: materialInfo(primitive.material), positionAccessor: primitive.attributes?.POSITION, bounds };
  });
  return { index, name: mesh.name, primitives };
};
const nameOf = (i) => gltf.nodes[i]?.name ?? `#${i}`;
const relevant = /pegboard_system|plants|shelves|ai-real-camera|hex_panel_[1-7]|Light_(CeilingAmbient|CyanFill|HexWall|TaskDownlight)|monitor|speaker_(left|right)|talks-microphone|helios-pc|desk|chair|resident|character|keyboard|controller/i;
const out = {
  model: path.relative(repo, glbPath).replaceAll('\\', '/'),
  fileBytes: bytes.length,
  scenes: (gltf.scenes ?? []).map((scene) => ({ name: scene.name, roots: (scene.nodes ?? []).map(nameOf) })),
  relevantNodes: (gltf.nodes ?? []).flatMap((node, index) => {
    if (!relevant.test(node.name ?? '')) return [];
    const matrix = getWorld(index);
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    matrix.decompose(position, quaternion, scale);
    const chain = [];
    for (let current = index; current !== undefined; current = parent.get(current)) chain.unshift(nameOf(current));
    const lightIndex = node.extensions?.KHR_lights_punctual?.light;
    const light = lightIndex === undefined ? null : gltf.extensions?.KHR_lights_punctual?.lights?.[lightIndex];
    return [{ index, name: node.name, parent: parent.has(index) ? nameOf(parent.get(index)) : null, chain, local: { translation: node.translation ?? [0,0,0], rotation: node.rotation ?? [0,0,0,1], scale: node.scale ?? [1,1,1] }, world: { position: position.toArray(), quaternion: quaternion.toArray(), scale: scale.toArray() }, extras: node.extras ?? null, light, mesh: node.mesh === undefined ? null : meshInfo(node.mesh, matrix) }];
  }),
  materials: (gltf.materials ?? []).map((material, index) => ({ index, name: material.name, pbr: material.pbrMetallicRoughness, emissiveFactor: material.emissiveFactor, alphaMode: material.alphaMode, extensions: material.extensions })),
};
fs.writeFileSync(path.join(here, 'glb-node-inventory.json'), `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify({ inventory: 'glb-node-inventory.json', nodes: out.relevantNodes.length, materials: out.materials.length, modelBytes: out.fileBytes }, null, 2));
