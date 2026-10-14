import fs from "node:fs";
const input = new URL("./measurements/speaker-transform-sweep.json", import.meta.url);
const data = JSON.parse(fs.readFileSync(input, "utf8"));
for (const record of data.candidates) {
  console.log(`${record.variant}: offset=${record.offsetMeters.join(",")}`);
  for (const name of ["desk", "ai-real-camera", "speaker_right_cabinet", "helios-pc", "peg_controller_body", "headset-code-native"]) {
    const a = record.anchors.find((candidate) => candidate.name === name);
    const b = a?.pixelBounds;
    const h = a?.sampledRegionHits;
    console.log(`  ${name}: bounds=${b ? [b.left, b.top, b.right, b.bottom].map((v) => Number(v.toFixed(1))).join(",") : "null"}; target=${h?.target ?? "n/a"}/${h?.targetSamples ?? "n/a"}; actor=${h ? h.chair + h.resident : "n/a"}; ratio=${h?.occluderRatio === null ? "null" : (h?.occluderRatio?.toFixed(3) ?? "n/a")}`);
  }
}
