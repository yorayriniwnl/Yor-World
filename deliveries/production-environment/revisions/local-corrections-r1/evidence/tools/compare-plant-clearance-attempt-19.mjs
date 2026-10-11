import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const beforePath = 'evidence/build-attempt-18/authored-scene.json';
const afterPath = 'evidence/build-attempt-19/authored-scene.json';
const before = JSON.parse(fs.readFileSync(path.join(root, beforePath), 'utf8'));
const after = JSON.parse(fs.readFileSync(path.join(root, afterPath), 'utf8'));
const oldNodes = new Map(before.nodes.map(node => [node.name, node]));
const newNodes = new Map(after.nodes.map(node => [node.name, node]));
const expected = [0, 0, -0.45];
// Blender's matrix_world decomposition changes some rotated stem matrix values
// by one 7-decimal reporting unit when applying a translation. Keep that
// bounded float tolerance explicit while still checking every scene node.
const same = (a, b, tolerance = 2e-7) => a.length === b.length && a.every((value, i) => Math.abs(value - b[i]) <= tolerance);
const shift = (values, delta) => values.map((value, i) => value + delta[i]);
const rows = [];
const mismatches = [];

if (oldNodes.size !== newNodes.size || [...oldNodes.keys()].some(name => !newNodes.has(name))) {
  throw new Error('Attempt18/19 authored scene node inventories differ');
}

for (const [name, oldNode] of oldNodes) {
  const newNode = newNodes.get(name);
  const plant = name === 'pot_monstera' || name.startsWith('monstera_');
  const positionDelta = newNode.worldPosition.map((value, i) => value - oldNode.worldPosition[i]);
  const expectedPosition = plant ? expected : [0, 0, 0];
  const positionPass = same(positionDelta, expectedPosition);
  let boundsPass = true;
  if (oldNode.worldBounds || newNode.worldBounds) {
    if (!oldNode.worldBounds || !newNode.worldBounds) boundsPass = false;
    else boundsPass = same(newNode.worldBounds.min, shift(oldNode.worldBounds.min, expectedPosition))
      && same(newNode.worldBounds.max, shift(oldNode.worldBounds.max, expectedPosition));
  }
  const matrixPass = oldNode.worldMatrixBlender.length === newNode.worldMatrixBlender.length
    && oldNode.worldMatrixBlender.every((oldRow, row) => {
      const delta = newNode.worldMatrixBlender[row].map((value, column) => value - oldRow[column]);
      const expectedRow = Array(4).fill(0);
      if (plant && row === 1) expectedRow[3] = 0.45;
      return same(delta, expectedRow);
    });
  const staticDataPass = oldNode.type === newNode.type && oldNode.parent === newNode.parent
    && JSON.stringify(oldNode.materials ?? []) === JSON.stringify(newNode.materials ?? [])
    && oldNode.polygons === newNode.polygons;
  const pass = positionPass && boundsPass && matrixPass && staticDataPass;
  rows.push({ name, plant, positionDelta, positionPass, boundsPass, matrixPass, staticDataPass, status: pass ? 'PASS' : 'FAIL' });
  if (!pass) mismatches.push(name);
}

const plantRows = rows.filter(row => row.plant);
const otherRows = rows.filter(row => !row.plant);
const result = {
  kind: 'attempt18-to-19 floor-monstera transform and clearance delta check',
  baseline: beforePath,
  candidate: afterPath,
  camera: { runtimeFloorPosition: [-1.55, 1.05], source: 'documented home desktop camera' },
  plant: {
    objectCount: plantRows.length,
    runtimeOffsetM: expected,
    oldPotCenterFloorPosition: [-1.65, 0.85],
    newPotCenterFloorPosition: [-1.65, 0.40],
    oldCameraFloorDistanceM: Math.hypot(-1.65 + 1.55, 0.85 - 1.05),
    newCameraFloorDistanceM: Math.hypot(-1.65 + 1.55, 0.40 - 1.05),
    distanceIncreaseFactor: Math.hypot(-1.65 + 1.55, 0.40 - 1.05) / Math.hypot(-1.65 + 1.55, 0.85 - 1.05)
  },
  sceneNodeCount: rows.length,
  movedPlantObjects: plantRows.length,
  unchangedOtherObjects: otherRows.length,
  mismatches,
  rows,
  status: mismatches.length === 0 && plantRows.length === 16 ? 'PASS' : 'FAIL'
};
const output = path.join(root, 'evidence/plant-clearance-attempt-19-r1.json');
fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ status: result.status, sceneNodeCount: result.sceneNodeCount, movedPlantObjects: result.movedPlantObjects,
  unchangedOtherObjects: result.unchangedOtherObjects, oldCameraFloorDistanceM: result.plant.oldCameraFloorDistanceM,
  newCameraFloorDistanceM: result.plant.newCameraFloorDistanceM, distanceIncreaseFactor: result.plant.distanceIncreaseFactor,
  mismatches }, null, 2));
if (result.status !== 'PASS') process.exitCode = 1;
