import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";

const THREE = await import(pathToFileURL(path.join(process.cwd(), "node_modules/three/build/three.module.js")));
const inputs = {
  room: "../deliveries/production-environment/revisions/local-corrections-r1/evidence/build-attempt-18/runtime/production-room-full.glb",
  fixture: "../deliveries/production-environment/revisions/local-corrections-r1/evidence/fixture-attempt-06/runtime/fixture-production.glb",
  resident: "public/models/resident-production.glb",
};
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

function readGlb(file) {
  const bytes = fs.readFileSync(file);
  const jsonLength = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.toString("utf8", 20, 20 + jsonLength).trim());
  const binaryStart = 28 + jsonLength;
  const binaryLength = bytes.readUInt32LE(20 + jsonLength);
  return { json, binary: bytes.subarray(binaryStart, binaryStart + binaryLength) };
}

function readAccessor(gltf, binary, accessorIndex) {
  const accessor = gltf.accessors[accessorIndex];
  const view = gltf.bufferViews[accessor.bufferView];
  const componentBytes = accessor.componentType === 5126 ? 4 : accessor.componentType === 5123 ? 2 : 1;
  const componentCount = accessor.type === "VEC4" ? 4
    : accessor.type === "VEC3" ? 3
      : accessor.type === "VEC2" ? 2
        : accessor.type === "MAT4" ? 16 : 1;
  const stride = view.byteStride || componentBytes * componentCount;
  const start = (view.byteOffset || 0) + (accessor.byteOffset || 0);
  const values = [];
  for (let row = 0; row < accessor.count; row += 1) {
    const components = [];
    for (let column = 0; column < componentCount; column += 1) {
      const offset = start + row * stride + column * componentBytes;
      components.push(accessor.componentType === 5126
        ? binary.readFloatLE(offset)
        : accessor.componentType === 5123 ? binary.readUInt16LE(offset) : binary.readUInt8(offset));
    }
    values.push(components);
  }
  return values;
}

function loadAsset(file) {
  const { json, binary } = readGlb(file);
  const objects = json.nodes.map((node) => {
    const object = new THREE.Object3D();
    object.name = node.name || "";
    if (node.matrix) {
      object.matrix.fromArray(node.matrix);
      object.matrixAutoUpdate = false;
    } else {
      object.position.fromArray(node.translation || [0, 0, 0]);
      object.quaternion.fromArray(node.rotation || [0, 0, 0, 1]);
      object.scale.fromArray(node.scale || [1, 1, 1]);
    }
    return object;
  });
  for (let index = 0; index < json.nodes.length; index += 1) {
    for (const child of json.nodes[index].children || []) objects[index].add(objects[child]);
  }
  const scene = new THREE.Group();
  for (const root of json.scenes[json.scene || 0].nodes) scene.add(objects[root]);
  scene.updateMatrixWorld(true);

  const ownVertices = objects.map(() => []);
  for (let index = 0; index < json.nodes.length; index += 1) {
    const node = json.nodes[index];
    if (node.mesh == null) continue;
    for (const primitive of json.meshes[node.mesh].primitives) {
      const positions = readAccessor(json, binary, primitive.attributes.POSITION)
        .map((position) => new THREE.Vector3(...position));
      let worldVertices = positions;
      if (node.skin != null) {
        const skin = json.skins[node.skin];
        const joints = readAccessor(json, binary, primitive.attributes.JOINTS_0);
        const weights = readAccessor(json, binary, primitive.attributes.WEIGHTS_0);
        const inverseBind = readAccessor(json, binary, skin.inverseBindMatrices);
        const palette = skin.joints.map((joint, jointIndex) =>
          objects[joint].matrixWorld.clone().multiply(new THREE.Matrix4().fromArray(inverseBind[jointIndex])));
        worldVertices = positions.map((position, vertexIndex) => {
          const skinned = new THREE.Vector3();
          for (let influence = 0; influence < 4; influence += 1) {
            const weight = weights[vertexIndex][influence];
            if (weight) {
              skinned.add(position.clone()
                .applyMatrix4(palette[joints[vertexIndex][influence]])
                .multiplyScalar(weight));
            }
          }
          return skinned.applyMatrix4(objects[index].matrixWorld);
        });
      } else {
        worldVertices = positions.map((position) => position.applyMatrix4(objects[index].matrixWorld));
      }
      ownVertices[index].push(...worldVertices);
    }
  }

  const subtree = (name) => {
    const root = json.nodes.findIndex((node) => node.name === name);
    const vertices = [];
    if (root < 0) return vertices;
    const visit = (index) => {
      vertices.push(...ownVertices[index]);
      for (const child of json.nodes[index].children || []) visit(child);
    };
    visit(root);
    return vertices;
  };
  const group = (predicate) => ownVertices.flatMap((vertices, index) =>
    predicate(json.nodes[index].name || "") ? vertices : []);
  return { subtree, group };
}

function projectBounds(points, camera, width, height) {
  const projected = points.map((point) => point.clone().project(camera));
  const pixelsX = projected.map((point) => (point.x + 1) * width / 2);
  const pixelsY = projected.map((point) => (1 - point.y) * height / 2);
  return {
    vertexCount: points.length,
    x: [Math.min(...pixelsX), Math.max(...pixelsX)].map((value) => Number(value.toFixed(1))),
    y: [Math.min(...pixelsY), Math.max(...pixelsY)].map((value) => Number(value.toFixed(1))),
  };
}

const room = loadAsset(inputs.room);
const fixture = loadAsset(inputs.fixture);
const resident = loadAsset(inputs.resident);
const anchors = {
  resident: resident.subtree("resident-body"),
  chair: fixture.subtree("chair-root"),
  monitor: room.subtree("monitor"),
  keyboard: room.group((name) => /^keyboard_body$|^keycaps_main$|^keycap_/.test(name)),
  mouse: room.group((name) => /^mouse_/.test(name)),
  deskPhone: room.subtree("contact_phone_screen"),
};
const output = {
  method: "Project GLB mesh vertices through the mobile HOME perspective camera; resident vertices are transformed by the GLB bind-pose joint matrices and inverse bind matrices, with no animation sampling.",
  inputs: Object.fromEntries(Object.entries(inputs).map(([name, file]) => [name, {
    path: file,
    sha256: sha256(file),
  }])),
  camera: {
    preset: "home-mobile",
    position: [-0.33, 2.05, 0.35],
    target: [0.37, 1.08, -1.25],
    horizontalFitTargetDeg: 58,
    maxVerticalFovDeg: 100,
  },
  viewports: [],
};
for (const [width, height] of [[390, 844], [320, 600]]) {
  const aspect = width / height;
  const verticalFit = THREE.MathUtils.radToDeg(
    2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(58) / 2) / aspect),
  );
  const fov = THREE.MathUtils.clamp(verticalFit, 38, 100);
  const camera = new THREE.PerspectiveCamera(fov, aspect, 0.05, 30);
  camera.position.fromArray(output.camera.position);
  camera.lookAt(...output.camera.target);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  output.viewports.push({
    width,
    height,
    aspect,
    verticalFovDeg: Number(fov.toFixed(4)),
    effectiveHorizontalFovDeg: Number(THREE.MathUtils.radToDeg(
      2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(fov) / 2) * aspect),
    ).toFixed(4)),
    anchors: Object.fromEntries(Object.entries(anchors).map(([name, points]) =>
      [name, projectBounds(points, camera, width, height)])),
  });
}
const outputPath = path.resolve(process.cwd(), "../deliveries/G7/local-corrections/ui/attempt-20261012T-mobile-camera-crop-02/projected-bounds-replay-01.json");
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ outputPath, viewports: output.viewports }, null, 2));
