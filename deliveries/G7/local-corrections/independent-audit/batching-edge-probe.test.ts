import * as THREE from '../../../../app/node_modules/three/build/three.module.js';
import { describe, expect, it } from '../../../../app/node_modules/vitest/dist/index.js';
import { RigidWorldBatch } from '../../../../app/src/features/world/RigidWorldBatch';

function fixture() {
  const scene = new THREE.Group();
  const geometry = new THREE.BoxGeometry(); geometry.clearGroups();
  const material = new THREE.MeshStandardMaterial();
  const a = new THREE.Mesh(geometry, material), b = new THREE.Mesh(geometry, material);
  b.position.x = 3; scene.add(a, b);
  const owner = new RigidWorldBatch(scene, true);
  const batch = scene.children.find((n) => (n as THREE.BatchedMesh).isBatchedMesh) as THREE.BatchedMesh;
  return {scene,geometry,material,a,b,batch,owner};
}

describe('Independent unsupported live mutation checks', () => {
  it('returns a mesh to its new camera layer set when another layer is enabled', () => {
    const f = fixture(); f.a.layers.set(0); f.a.layers.enable(5); f.owner.update();
    expect(f.batch.getVisibleAt(0)).toBe(false);
    expect(f.a.layers.mask).toBe(33);
    f.owner.dispose();
  });
  it('returns a mesh to native rendering when same-layout position attribute is replaced', () => {
    const f = fixture();
    const previous = f.geometry.getAttribute('position') as THREE.BufferAttribute;
    const replacement = previous.clone(); replacement.setX(0, 42);
    f.geometry.setAttribute('position', replacement); f.owner.update();
    expect(f.batch.getVisibleAt(0)).toBe(false);
    expect(f.a.layers.mask).toBe(1);
    f.owner.dispose();
  });
  it('removes a source mesh from the batch when it leaves the source hierarchy', () => {
    const f = fixture(); f.a.removeFromParent(); f.owner.update();
    expect(f.batch.getVisibleAt(0)).toBe(false);
    expect(f.a.layers.mask).toBe(1);
    f.owner.dispose();
  });
});
