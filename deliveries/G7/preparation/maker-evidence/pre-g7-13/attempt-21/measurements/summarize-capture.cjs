const fs = require("node:fs");
const path = require("node:path");

const folder = __dirname;
const summaries = fs.readdirSync(folder)
  .filter((name) => name.endsWith("-capture-frame.json"))
  .map((name) => {
    const frame = JSON.parse(fs.readFileSync(path.join(folder, name), "utf8"));
    const snapshot = frame.snapshot;
    return {
      file: name,
      screenshot: frame.screenshot,
      capturedAt: frame.browser.capturedAt,
      url: frame.browser.pageUrl,
      origin: frame.browser.pageOrigin,
      viewport: frame.browser.viewport,
      runtimeState: frame.browser.runtimeState,
      cameraSource: snapshot?.camera?.source ?? null,
      rendererFrame: snapshot?.rendererCamera?.rendererFrame ?? null,
      qualityTier: snapshot?.rendererCamera?.qualityTier ?? null,
      hexPanelBatchMemberships: snapshot?.rendererCamera?.hexPanelBatchMemberships?.map((panel) => ({
        panelName: panel.panelName,
        layerMask: panel.panelLayerMask,
        batches: panel.batches.map((batch) => ({
          id: batch.batchObjectId,
          visible: batch.batchVisible,
          batchLayerMask: batch.batchLayerMask,
          instanceIndex: batch.batchInstanceIndex,
        })),
      })) ?? [],
      anchorRaySamples: snapshot?.anchors
        ?.filter((anchor) => ["speaker_left_cabinet", "lightbar_emissive"].includes(anchor.name))
        .map((anchor) => ({
          name: anchor.name,
          pixelBounds: anchor.pixelBounds,
          sampledRegionHits: anchor.sampledRegionHits,
        })) ?? [],
    };
  });

console.log(JSON.stringify(summaries, null, 2));
