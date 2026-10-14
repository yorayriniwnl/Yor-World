import { readFileSync } from "node:fs";

const source = new URL("./measurements/anchor-bounds-summary.json", import.meta.url);
const views = JSON.parse(readFileSync(source, "utf8"));
const selected = new Set([
  "plants", "ai-real-camera", "hex_panel_1", "hex_panel_2", "hex_panel_3", "hex_panel_4", "hex_panel_5", "hex_panel_6", "hex_panel_7",
  "lightbar_emissive", "monitor", "speaker_left_cabinet", "speaker_right_cabinet", "talks-microphone", "console-code-native",
  "helios-pc", "pegboard_system", "peg_controller_body", "controller-code-native", "headset-code-native", "headset-stand-code-native",
  "desk", "chair-root", "chair-base",
]);
for (const view of views) {
  process.stdout.write(`VIEW ${view.viewport.width}x${view.viewport.height} camera=${JSON.stringify(view.camera)}\n`);
  for (const anchor of view.anchors.filter((item) => selected.has(item.name))) {
    process.stdout.write(`${anchor.name} pos=${JSON.stringify(anchor.worldPosition)} scale=${JSON.stringify(anchor.worldScale)} bounds=${JSON.stringify(anchor.worldBounds)} pixels=${JSON.stringify(anchor.pixelBounds)} materials=${JSON.stringify(anchor.materials?.map(({ name, color, emissive, emissiveIntensity }) => ({ name, color, emissive, emissiveIntensity })))} occlusion=${JSON.stringify(anchor.sampledRegionHits)}\n`);
  }
}
