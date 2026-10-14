import { readFileSync } from "node:fs";
const file = process.argv[2];
const bytes = readFileSync(file);
if (bytes.toString("ascii", 0, 4) !== "glTF") throw new Error("not GLB");
const jsonLength = bytes.readUInt32LE(12);
const json = JSON.parse(bytes.toString("utf8", 20, 20 + jsonLength).replace(/\0+$/g, "").trimEnd());
const targets = new Set(["ai-real-camera", "ai_cam_chassis", "ai_cam_hub", "ai_cam_leg_1", "ai_cam_leg_2", "ai_cam_leg_3", "ai_cam_lens_barrel", "ai_cam_status_ring", "peg_controller_body", "chair-root", "chair-base", "resident"]);
const nodes = json.nodes.map((node, index) => ({ index, ...node })).filter((node) => targets.has(node.name));
process.stdout.write(JSON.stringify({ file, nodes, meshes: json.meshes.map((mesh, index) => ({ index, name: mesh.name, primitives: mesh.primitives?.map((p) => ({ material: p.material, attributes: p.attributes })) })).filter((mesh) => nodes.some((node) => node.mesh === mesh.index)), materials: json.materials.map((material,index)=>({index,name:material.name})).filter((material)=>["Baseboard_Charcoal","Chair_DarkMetal","Door_HardwareBrass","Project_ScannerBlue","Chair_WhiteNylon"].includes(material.name)) }, null, 2));
