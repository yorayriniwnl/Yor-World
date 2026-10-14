const fs = require("node:fs");
for (const file of process.argv.slice(2)) {
  const report = JSON.parse(fs.readFileSync(file, "utf8"));
  const measured = report.snapshot;
  console.log(JSON.stringify({
    label: report.label,
    viewport: report.viewport,
    camera: measured.camera,
    anchors: measured.anchors.filter((anchor) => [
      "hex_panel_1", "hex_panel_4", "lightbar_emissive", "ai-real-camera", "plants", "pot_ivy",
      "monitor", "speaker_left_cabinet", "console-code-native", "peg_controller_body",
      "controller-code-native", "helios-pc", "chair-root", "resident", "desk",
    ].includes(anchor.name)).map((anchor) => ({
      name: anchor.name,
      pixelBounds: anchor.pixelBounds,
      target: anchor.sampledRegionHits?.target,
      targetSurface: anchor.sampledRegionHits?.targetSurface,
      chair: anchor.sampledRegionHits?.chair,
      resident: anchor.sampledRegionHits?.resident,
      other: anchor.sampledRegionHits?.other,
    })),
  }));
}
