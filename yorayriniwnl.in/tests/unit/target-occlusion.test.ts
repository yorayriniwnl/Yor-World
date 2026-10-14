import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { classifyTargetOcclusionRay } from "../../src/features/world/TargetOcclusion";

describe("target-aware ray occlusion classification", () => {
  it("ignores a chair-only ray through an empty part of the target AABB", () => {
    const scene = new THREE.Group();
    const target = new THREE.Group();
    target.name = "anchor-target";
    const targetMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.2), new THREE.MeshBasicMaterial());
    targetMesh.position.set(0, 0, -5);
    target.add(targetMesh);

    const chair = new THREE.Group();
    chair.name = "chair-root";
    const chairMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.2), new THREE.MeshBasicMaterial());
    chairMesh.position.set(4, 0, -3);
    chair.add(chairMesh);
    scene.add(target, chair);
    scene.updateMatrixWorld(true);

    const raycaster = new THREE.Raycaster(new THREE.Vector3(4, 0, 0), new THREE.Vector3(0, 0, -1));
    const intersections = raycaster.intersectObject(scene, true);
    expect(intersections.map(({ object }) => object)).toContain(chairMesh);
    expect(intersections.map(({ object }) => object)).not.toContain(targetMesh);
    expect(classifyTargetOcclusionRay(intersections, target, chair, [])).toBeNull();
  });

  it("counts a real chair hit as occlusion when the target surface is behind it", () => {
    const scene = new THREE.Group();
    const target = new THREE.Group();
    target.name = "anchor-target";
    const targetMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.2), new THREE.MeshBasicMaterial());
    targetMesh.position.z = -5;
    target.add(targetMesh);

    const chair = new THREE.Group();
    chair.name = "chair-root";
    const chairMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.2), new THREE.MeshBasicMaterial());
    chairMesh.position.z = -3;
    chair.add(chairMesh);
    scene.add(target, chair);
    scene.updateMatrixWorld(true);

    const raycaster = new THREE.Raycaster(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1));
    const intersections = raycaster.intersectObject(scene, true);
    expect(intersections[0]?.object).toBe(chairMesh);
    expect(intersections.some(({ object }) => object === targetMesh)).toBe(true);
    expect(classifyTargetOcclusionRay(intersections, target, chair, [])).toBe("chair");
  });
});
