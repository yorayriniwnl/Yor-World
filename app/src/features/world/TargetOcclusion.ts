import type * as THREE from "three";

export interface TargetRayIntersection {
  object: THREE.Object3D;
  distance: number;
}

export type TargetRayClassification = "target" | "chair" | "resident" | null;

function isWithin(object: THREE.Object3D, root: THREE.Object3D): boolean {
  for (let current: THREE.Object3D | null = object; current; current = current.parent) {
    if (current === root) return true;
  }
  return false;
}

/**
 * Classify target-region ray intersections against the named target geometry.
 * A chair or resident counts as occluding only when its nearest hit is closer
 * than a real target-subtree hit; actor-only rays through empty AABB pixels are
 * ignored.
 */
export function classifyTargetOcclusionRay(
  intersections: readonly TargetRayIntersection[],
  target: THREE.Object3D,
  chair: THREE.Object3D | null,
  residentMeshes: readonly THREE.Object3D[],
): TargetRayClassification {
  const nearestDistance = (matches: (object: THREE.Object3D) => boolean): number => {
    let nearest = Number.POSITIVE_INFINITY;
    for (const intersection of intersections) {
      if (
        Number.isFinite(intersection.distance) &&
        intersection.distance >= 0 &&
        matches(intersection.object)
      ) nearest = Math.min(nearest, intersection.distance);
    }
    return nearest;
  };

  const targetDistance = nearestDistance((object) => isWithin(object, target));
  if (!Number.isFinite(targetDistance)) return null;

  const chairDistance = chair
    ? nearestDistance((object) => isWithin(object, chair))
    : Number.POSITIVE_INFINITY;
  const residentDistance = nearestDistance((object) => residentMeshes.some((root) => isWithin(object, root)));
  if (chairDistance < targetDistance && chairDistance <= residentDistance) return "chair";
  if (residentDistance < targetDistance) return "resident";
  return "target";
}
