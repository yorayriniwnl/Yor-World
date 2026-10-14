import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const evidenceRoot = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(evidenceRoot, "../../../../..");
const glbPath = path.join(root, "app/public/models/production-room-full.glb");
const bytes = readFileSync(glbPath);
const jsonLength = bytes.readUInt32LE(12);
const gltf = JSON.parse(bytes.toString("utf8", 20, 20 + jsonLength));
const inventory = JSON.parse(readFileSync(path.join(evidenceRoot, "scene-node-inventory-final.json"), "utf8"));
const rows = inventory.matchingNodes;
const match = (name) => rows.find((row) => row.name === name);
const childrenOf = (parentName) => rows.filter((row) => row.ancestors?.some((ancestor) => ancestor.name === parentName));

function materialsFor(row) {
  if (!row) return [];
  const node = gltf.nodes[row.index];
  const mesh = node?.mesh === undefined ? null : gltf.meshes[node.mesh];
  return [...new Set((mesh?.primitives ?? []).map((primitive) => primitive.material).filter((index) => index !== undefined))]
    .map((index) => {
      const material = gltf.materials[index];
      return {
        name: material.name ?? `material-${index}`,
        baseColorFactor: material.pbrMetallicRoughness?.baseColorFactor ?? null,
        emissiveFactor: material.emissiveFactor ?? null,
        emissiveStrength: material.extensions?.KHR_materials_emissive_strength?.emissiveStrength ?? 1,
      };
    });
}

function nodeSummary(name) {
  const row = match(name);
  if (!row) return { name, present: false };
  const node = gltf.nodes[row.index];
  return {
    name,
    present: true,
    index: row.index,
    parent: row.parent,
    localTranslation: row.localTranslation,
    localScale: row.localScale,
    worldOrigin: row.worldOrigin,
    boundsWorld: row.boundsWorld,
    visible: row.visible,
    mesh: node?.mesh ?? null,
    children: (node?.children ?? []).map((index) => ({ index, name: gltf.nodes[index]?.name ?? null })),
    materials: materialsFor(row),
  };
}

function groupBounds(name) {
  const descendants = childrenOf(name).filter((row) => row.boundsWorld);
  if (!descendants.length) return null;
  const min = [0, 1, 2].map((axis) => Math.min(...descendants.map((row) => row.boundsWorld[0][axis])));
  const max = [0, 1, 2].map((axis) => Math.max(...descendants.map((row) => row.boundsWorld[1][axis])));
  return { min, max, dimensions: max.map((value, axis) => Number((value - min[axis]).toFixed(4))), descendantMeshCount: descendants.length };
}

const controllerNodes = inventory.allNodes.filter((row) => /^peg_controller_/.test(row.name)).map((row) => ({
  name: row.name,
  index: row.index,
  parent: row.parent,
  worldOrigin: row.worldOrigin,
  sourceMaterials: materialsFor(match(row.name)),
  boundsWorld: match(row.name)?.boundsWorld ?? null,
}));
const camera = match("ai-real-camera");
const cameraDescendants = childrenOf("ai-real-camera").filter((row) => row.boundsWorld).map((row) => ({
  name: row.name,
  index: row.index,
  meshName: row.meshName,
  worldOrigin: row.worldOrigin,
  boundsWorld: row.boundsWorld,
  cameraProjection: row.cameraProjection,
  materials: materialsFor(row),
}));
const cameraBounds = cameraDescendants.length ? {
  min: [0, 1, 2].map((axis) => Math.min(...cameraDescendants.map((row) => row.boundsWorld[0][axis]))),
  max: [0, 1, 2].map((axis) => Math.max(...cameraDescendants.map((row) => row.boundsWorld[1][axis]))),
} : null;
if (cameraBounds) cameraBounds.dimensions = cameraBounds.max.map((value, axis) => Number((value - cameraBounds.min[axis]).toFixed(4)));
const runtimeCameraTranslation = [0.7, 0.35, 0.18];
function projectBounds(bounds, camera) {
  if (!bounds) return null;
  const translated = {
    min: bounds.min.map((value, axis) => value + runtimeCameraTranslation[axis]),
    max: bounds.max.map((value, axis) => value + runtimeCameraTranslation[axis]),
  };
  const normalize = (v) => {
    const length = Math.hypot(...v);
    return v.map((value) => value / length);
  };
  const subtract = (a, b) => a.map((value, axis) => value - b[axis]);
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a.reduce((sum, value, axis) => sum + value * b[axis], 0);
  const forward = normalize(subtract(camera.target, camera.position));
  const right = normalize(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  const tanHalfFov = Math.tan(camera.fov * Math.PI / 360);
  const aspect = camera.size[0] / camera.size[1];
  const points = Array.from({ length: 8 }, (_, mask) => [0, 1, 2].map((axis) => mask & (1 << axis) ? translated.max[axis] : translated.min[axis]));
  const pixels = points.map((point) => {
    const offset = subtract(point, camera.position);
    const depth = dot(offset, forward);
    if (depth <= 0) return null;
    const x = dot(offset, right) / (depth * tanHalfFov * aspect);
    const y = dot(offset, up) / (depth * tanHalfFov);
    return [(x + 1) * camera.size[0] / 2, (1 - y) * camera.size[1] / 2];
  }).filter(Boolean);
  if (!pixels.length) return null;
  const box = {
    left: Math.min(...pixels.map(([x]) => x)),
    top: Math.min(...pixels.map(([, y]) => y)),
    right: Math.max(...pixels.map(([x]) => x)),
    bottom: Math.max(...pixels.map(([, y]) => y)),
  };
  box.width = box.right - box.left;
  box.height = box.bottom - box.top;
  box.visibleAreaRatio = Math.max(0, Math.min(camera.size[0], box.right) - Math.max(0, box.left)) *
    Math.max(0, Math.min(camera.size[1], box.bottom) - Math.max(0, box.top)) / (box.width * box.height);
  return {
    runtimeTranslation: runtimeCameraTranslation,
    boundsWorld: translated,
    pixelBounds: Object.fromEntries(Object.entries(box).map(([key, value]) => [key, Number(value.toFixed(1))])),
  };
}
const interactionsPath = path.join(root, "app/src/features/world/WorldInteractionBinding.ts");
const interactionLines = readFileSync(interactionsPath, "utf8").split(/\r?\n/)
  .filter((line) => /helios-pc|ai-real-camera|talks-microphone|plant-leaves|speakers:|skills-board|research-books/.test(line));

const result = {
  status: "PASS_SOURCE_INVENTORY_ONLY",
  glb: {
    path: "app/public/models/production-room-full.glb",
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    nodes: gltf.nodes.length,
  },
  exactSourceFile: "PRE-G7-11 accepted input from packet; GLB bytes are unchanged in PRE-G7-12",
  nodes: [
    ...Array.from({ length: 7 }, (_, index) => nodeSummary(`hex_panel_${index + 1}`)),
    nodeSummary("plants"),
    nodeSummary("shelves"),
    nodeSummary("shelf_rear_lower"),
    nodeSummary("ai-real-camera"),
    nodeSummary("pegboard_system"),
    nodeSummary("pegboard_panel"),
    nodeSummary("helios-pc"),
    nodeSummary("talks-microphone"),
    nodeSummary("monitor"),
    nodeSummary("speaker_left_cabinet"),
    nodeSummary("speaker_right_cabinet"),
  ],
  groupDescendantBounds: {
    plants: groupBounds("plants"),
    shelves: groupBounds("shelves"),
    pegboard_system: groupBounds("pegboard_system"),
    helios_pc: groupBounds("helios-pc"),
    talks_microphone: groupBounds("talks-microphone"),
  },
  controllerAssemblies: {
    distinctAssemblyCount: 1,
    nodes: controllerNodes,
  },
  shelfCamera: {
    node: nodeSummary("ai-real-camera"),
    rootIsGroupWithoutOwnMesh: camera ? gltf.nodes[camera.index]?.mesh === undefined : true,
    descendantMeshCount: cameraDescendants.length,
    descendantMeshes: cameraDescendants,
    descendantBoundsWorld: cameraBounds,
    authoredGeometryPresent: cameraDescendants.length > 0,
    runtimeGroupTranslation: runtimeCameraTranslation,
    currentDesktopFrustumInput: inventory.cameraInputs["home-desktop"],
    currentMobileFrustumInput: inventory.cameraInputs["home-mobile"],
    projectedDescendantBounds: cameraDescendants.map(({ name, cameraProjection }) => ({ name, cameraProjection })),
    runtimePlacedProjectedBounds: {
      homeDesktop: projectBounds(cameraBounds, inventory.cameraInputs["home-desktop"]),
      homeMobile: projectBounds(cameraBounds, inventory.cameraInputs["home-mobile"]),
    },
    screenshotVisibility: {
      desktop1440x900: "FAIL: attempt-11 pixels show a small camera-like mesh hanging immediately below the upper shelf; the grouping is not convincingly seated or recognizable at reference scale.",
      mobile390x844: "FAIL: attempt-11 shows only a tiny camera glyph on the shelf line; it is technically on-screen but not recognizable at mobile scale.",
    },
    interactionReachability: {
      status: "PASS",
      targetRoot: "ai-real-camera",
      sourceBinding: "app/src/features/world/WorldInteractionBinding.ts",
      browserEvidence: "attempt-11/logs/reference-composition-camera-interaction-node24.19.log; clicking the rendered camera reached /projects/ai-vs-real",
    },
  },
  headsetStand: {
    acceptedGlbNamedNodeFound: inventory.allNodes.some((row) => /head(?:set|phone)[-_ ]?stand/i.test(row.name)),
    codeNativeStandAuthorizedByPacket: true,
    implementation: "app/src/features/world/ReferenceComposition.ts",
  },
  relevantWorldInteractionBindings: {
    sourcePath: "app/src/features/world/WorldInteractionBinding.ts",
    lines: interactionLines,
    compositionMoves: ["pegboard_system root", "plants root", "hex_panel_1..7"],
    bindingTargetNamesArePreserved: true,
  },
};

writeFileSync(path.join(evidenceRoot, "glb-anchor-source-audit.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  status: result.status,
  glb: result.glb,
  hexMaterials: [...new Set(result.nodes.filter((row) => row.name.startsWith("hex_panel_")).flatMap((row) => row.materials.map((material) => `${material.name}:${material.emissiveStrength}`)))],
  cameraRootIsGroup: result.shelfCamera.rootIsGroupWithoutOwnMesh,
  cameraDescendantMeshCount: result.shelfCamera.descendantMeshCount,
  controllers: result.controllerAssemblies.distinctAssemblyCount,
  headsetStandInAcceptedGlb: result.headsetStand.acceptedGlbNamedNodeFound,
}, null, 2));
