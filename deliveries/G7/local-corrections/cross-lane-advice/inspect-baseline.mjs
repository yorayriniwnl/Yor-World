import fs from 'node:fs';
import crypto from 'node:crypto';
import { Matrix4, Quaternion, Vector3 } from '../../../../app/node_modules/three/build/three.module.js';

const files = ['production-room-full.glb', 'group-b-props.glb', 'fixture-production.glb'];
const evidence = { kind: 'read-only GLB JSON hierarchy inspection; no rendered visual acceptance', files: [] };
for (const name of files) {
  const bytes = fs.readFileSync(`app/public/models/${name}`);
  const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'));
  const parents = new Map();
  json.nodes.forEach((node, i) => (node.children ?? []).forEach(child => parents.set(child, i)));
  const worlds = new Map();
  function world(i) {
    if (worlds.has(i)) return worlds.get(i);
    const n = json.nodes[i];
    const local = n.matrix ? new Matrix4().fromArray(n.matrix) : new Matrix4().compose(
      new Vector3(...(n.translation ?? [0, 0, 0])), new Quaternion(...(n.rotation ?? [0, 0, 0, 1])), new Vector3(...(n.scale ?? [1, 1, 1])));
    const result = parents.has(i) ? world(parents.get(i)).clone().multiply(local) : local;
    worlds.set(i, result);
    return result;
  }
  const inspected = json.nodes.flatMap((node, i) => /certificate|painting|desk_clock|chair-root|chair-base/.test(node.name ?? '') ? [{
    name: node.name, parent: parents.has(i) ? json.nodes[parents.get(i)].name : null,
    localTranslation: node.translation ?? null, worldTranslation: new Vector3().setFromMatrixPosition(world(i)).toArray(),
    worldMatrix: world(i).toArray(),
  }] : []);
  evidence.files.push({ name, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), nodes: inspected });
}
console.log(JSON.stringify(evidence, null, 2));
