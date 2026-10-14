const fs = require("node:fs");
for (const file of process.argv.slice(2)) {
  const diagnostics = JSON.parse(fs.readFileSync(file, "utf8"));
  const snapshot = diagnostics.snapshot;
  const chromeFile = file.replace("-anchor-diagnostics.json", "-closed-chrome.json");
  const chrome = fs.existsSync(chromeFile) ? JSON.parse(fs.readFileSync(chromeFile, "utf8")) : null;
  console.log(JSON.stringify({
    label: diagnostics.label,
    viewport: diagnostics.viewport,
    preset: snapshot.camera.preset,
    target: snapshot.camera.target,
    fov: snapshot.camera.fov,
    anchors: snapshot.anchors.filter((anchor) => [
      "hex_panel_1", "hex_panel_4", "lightbar_emissive", "ai-real-camera", "plants", "pot_ivy",
      "monitor", "speaker_left_cabinet", "speaker_right_cabinet", "talks-microphone",
      "console-code-native", "helios-pc", "pegboard_system", "peg_controller_body",
      "controller-code-native", "headset-stand-code-native", "headset-code-native", "desk",
    ].includes(anchor.name)).map((anchor) => ({
      name: anchor.name,
      pixelBounds: anchor.pixelBounds,
      firstRenderableTargetSamples: anchor.sampledRegionHits?.target,
      chairSamples: anchor.sampledRegionHits?.chair,
      residentSamples: anchor.sampledRegionHits?.resident,
    })),
    closedChrome: chrome?.boxes ?? null,
    coveredRatio: chrome?.coveredRatio ?? null,
  }));
}
