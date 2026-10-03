import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

// Read-only production source/asset diagnostic. The optional output argument writes
// only its diagnostic receipt. No production source, geometry or transform is changed.
const appRoot = path.resolve(process.argv[2] ?? "app");
const repoRoot = path.dirname(appRoot);
const requireApp = createRequire(path.join(appRoot, "package.json"));
const threeModule = path.join(path.dirname(requireApp.resolve("three")), "three.module.js");
const THREE = await import(pathToFileURL(threeModule).href);
const { GLTFLoader } = await import(pathToFileURL(requireApp.resolve("three/examples/jsm/loaders/GLTFLoader.js")).href);
const ts = (await import(pathToFileURL(requireApp.resolve("typescript")).href)).default;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

// Execute the actual exported position function and presets selected from source
// ASTs. This avoids maintaining a diagnostic copy of the entrance trajectory.
const cameraSource = readFileSync(path.join(appRoot, "src/features/world/CameraDirector.ts"), "utf8");
const entranceSource = readFileSync(path.join(appRoot, "src/features/world/EntranceCoordinator.ts"), "utf8");
const cameraAst = ts.createSourceFile("CameraDirector.ts", cameraSource, ts.ScriptTarget.Latest, true);
const cameraStatement = cameraAst.statements.find((statement) => ts.isVariableStatement(statement)
  && statement.declarationList.declarations.some((declaration) => declaration.name.getText(cameraAst) === "CAMERA_PRESETS"));
const entranceAst = ts.createSourceFile("EntranceCoordinator.ts", entranceSource, ts.ScriptTarget.Latest, true);
const positionFunction = entranceAst.statements.find((statement) => ts.isFunctionDeclaration(statement)
  && statement.name?.text === "entrancePositionAt");
if (!cameraStatement || !positionFunction) throw new Error("Production camera presets/function not found");
const extractedAstSource = `import * as THREE from '${pathToFileURL(threeModule).href}';\n${cameraStatement.getText(cameraAst)}\n${positionFunction.getText(entranceAst)}`;
const extractedJs = ts.transpileModule(extractedAstSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { entrancePositionAt } = await import(`data:text/javascript;base64,${Buffer.from(extractedJs).toString("base64")}`);

// Preserve actual binary POSITION/index buffers and node hierarchy/matrices.
// Materials are omitted in memory because this Node diagnostic does not decode
// bitmap images. Diagnostic raycasts use both triangle sides conservatively.
const assetPath = path.join(appRoot, "public/models/production-room-full.glb");
const asset = readFileSync(assetPath);
const jsonLength = asset.readUInt32LE(12);
const json = JSON.parse(asset.subarray(20, 20 + jsonLength).toString("utf8"));
for (const mesh of json.meshes) for (const primitive of mesh.primitives) delete primitive.material;
delete json.materials;
delete json.textures;
delete json.images;
const encoded = Buffer.from(JSON.stringify(json));
const jsonChunk = Buffer.alloc(Math.ceil(encoded.length / 4) * 4, 32);
encoded.copy(jsonChunk);
const binaryChunks = asset.subarray(20 + jsonLength);
const glb = Buffer.alloc(20 + jsonChunk.length + binaryChunks.length);
glb.writeUInt32LE(0x46546c67, 0);
glb.writeUInt32LE(2, 4);
glb.writeUInt32LE(glb.length, 8);
glb.writeUInt32LE(jsonChunk.length, 12);
glb.writeUInt32LE(0x4e4f534a, 16);
jsonChunk.copy(glb, 20);
binaryChunks.copy(glb, 20 + jsonChunk.length);
const room = (await new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength), "")).scene;
room.updateMatrixWorld(true);
const hinge = room.getObjectByName("door-hinge");
const leaf = room.getObjectByName("door_leaf");
if (!hinge || !leaf) throw new Error("Frozen hinge/leaf absent");
const hingeMeshes = [];
hinge.traverse((node) => {
  if (!node.isMesh) return;
  for (const material of Array.isArray(node.material) ? node.material : [node.material]) material.side = THREE.DoubleSide;
  const bounds = new THREE.Box3().setFromObject(node);
  hingeMeshes.push({
    name: node.name, parent: node.parent?.name,
    worldPosition: node.getWorldPosition(new THREE.Vector3()).toArray(),
    vertices: node.geometry.getAttribute("position").count,
    triangles: (node.geometry.index?.count ?? node.geometry.getAttribute("position").count) / 3,
    bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
  });
});
const cases = [];
for (const isMobile of [false, true]) {
  const positions = [entrancePositionAt(0, isMobile), entrancePositionAt(0.65, isMobile), entrancePositionAt(1, isMobile)];
  const segments = [];
  for (let index = 1; index < positions.length; index++) {
    const start = positions[index - 1];
    const end = positions[index];
    const delta = end.clone().sub(start);
    const length = delta.length();
    const raycaster = new THREE.Raycaster(start, delta.normalize(), 0, length);
    const hits = raycaster.intersectObject(hinge, true);
    segments.push({
      start: start.toArray(), end: end.toArray(), length,
      triangleHits: hits.map((hit) => ({ node: hit.object.name, faceIndex: hit.faceIndex, point: hit.point.toArray(), distance: hit.distance })),
    });
  }
  cases.push({ isMobile, segments });
}
const leafBounds = new THREE.Box3().setFromObject(leaf);
const receipt = {
  status: cases.every((entry) => entry.segments.every((segment) => segment.triangleHits.length === 0)) ? "PASS" : "FAIL",
  diagnosticOnly: true,
  acceptance: "NOT RUN; maker execution diagnostic only, G6 remains ACTIVE / REWORK and G7 LOCKED",
  capturedAt: new Date().toISOString(),
  nodeVersion: process.version,
  threeRevision: THREE.REVISION,
  typescriptVersion: ts.version,
  appRoot,
  gitHead: execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim(),
  relevantWorktreeStatus: execFileSync("git", ["status", "--short", "--", "app/src/features/world/CameraDirector.ts", "app/src/features/world/EntranceCoordinator.ts", "app/public/models/production-room-full.glb"], { cwd: repoRoot, encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean),
  hashes: {
    cameraSourceSha256: sha256(cameraSource), entranceSourceSha256: sha256(entranceSource),
    extractedAstSourceSha256: sha256(extractedAstSource), extractedJsSha256: sha256(extractedJs),
    frozenAssetSha256: sha256(asset), frozenAssetBytes: asset.length,
    scriptSha256: sha256(readFileSync(new URL(import.meta.url))),
  },
  method: "Actual current entrancePositionAt/presets extracted from source AST; complete two-segment triangle raycasts against every frozen door-hinge descendant, using both material sides and unmodified mesh buffers/transforms",
  limitations: [
    "This checks geometric path intersections, not browser rendering or animation performance.",
    "The immutable asset's inherited hinge/leaf translations place the leaf subtree outside the entrance corridor. This pre-existing frozen asset condition is disclosed for independent audit; no asset or runtime transform repair is authorized or performed here.",
    "The source was an uncommitted candidate when this receipt was recorded; its actual bytes are bound by the recorded source hashes, not certified by gitHead.",
  ],
  hinge: { position: hinge.position.toArray(), rotation: hinge.rotation.toArray(), worldMatrix: hinge.matrixWorld.toArray() },
  leafBounds: { min: leafBounds.min.toArray(), max: leafBounds.max.toArray() },
  hingeMeshes, cases,
};
const rendered = `${JSON.stringify(receipt, null, 2)}\n`;
if (process.argv[3]) writeFileSync(path.resolve(process.argv[3]), rendered, "utf8");
process.stdout.write(rendered);
if (receipt.status !== "PASS") process.exitCode = 1;
