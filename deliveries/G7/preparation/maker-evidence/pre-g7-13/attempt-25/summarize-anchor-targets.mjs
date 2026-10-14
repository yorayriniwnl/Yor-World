import { readFileSync } from "node:fs";
const data = JSON.parse(readFileSync(process.argv[2], "utf8"));
const names = new Set(["chair-root", "chair-base", "resident", "ai-real-camera", "pegboard_system", "peg_controller_body", "controller-code-native"]);
const snapshot = data.captureFrame?.snapshot ?? data.snapshot ?? data;
const anchors = (snapshot.anchors ?? []).filter((anchor) => names.has(anchor.name));
process.stdout.write(JSON.stringify({ label: data.label, viewport: data.viewport, camera: snapshot.camera, anchors }, null, 2));
