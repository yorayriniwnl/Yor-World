import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const glbPath = path.join(root, "app/public/models/production-room-full.glb");
const bytes = await readFile(glbPath);
if (bytes.toString("ascii", 0, 4) !== "glTF") throw new Error("Not a GLB file");
const jsonLength = bytes.readUInt32LE(12);
const document = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString("utf8"));
const wanted = new Set(["Hex_LilacEmissive", "Hex_VioletEmissive", "Lightbar_WarmTask"]);
const materialRows = [];
for (const [materialIndex, material] of (document.materials ?? []).entries()) {
  if (!wanted.has(material.name)) continue;
  const meshIndices = (document.meshes ?? []).flatMap((mesh, meshIndex) =>
    (mesh.primitives ?? []).some((primitive) => primitive.material === materialIndex) ? [meshIndex] : []);
  const userNodes = (document.nodes ?? []).flatMap((node, nodeIndex) => meshIndices.includes(node.mesh)
    ? [{ index: nodeIndex, name: node.name, mesh: node.mesh }]
    : []);
  materialRows.push({
    materialIndex,
    name: material.name,
    pbrMetallicRoughness: material.pbrMetallicRoughness ?? null,
    emissiveFactor: material.emissiveFactor ?? [0, 0, 0],
    emissiveStrength: material.extensions?.KHR_materials_emissive_strength?.emissiveStrength ?? 1,
    alphaMode: material.alphaMode ?? "OPAQUE",
    extensionsUsed: document.extensionsUsed ?? [],
    userNodes,
  });
}
const result = {
  path: "app/public/models/production-room-full.glb",
  sha256: createHash("sha256").update(bytes).digest("hex"),
  fileBytes: bytes.length,
  gltfColorManagement: { assetGenerator: document.asset?.generator ?? null, extensionsUsed: document.extensionsUsed ?? [] },
  materials: materialRows,
};
await writeFile(path.join(root, "deliveries/G7/preparation/maker-evidence/pre-g7-13/attempt-60/reproduced-glb-material-baseline.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
