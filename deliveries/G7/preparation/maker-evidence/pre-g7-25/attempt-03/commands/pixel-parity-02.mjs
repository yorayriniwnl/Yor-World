import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const [baselineRootArg, candidateRootArg, outputArg] = process.argv.slice(2);
if (!baselineRootArg || !candidateRootArg || !outputArg) throw new Error('usage: pixel-parity-01.mjs <baseline-attempt-dir> <candidate-e2e-dir> <output-json>');
const appRoot = process.cwd();
const require = createRequire(path.join(appRoot, 'package.json'));
const sharp = require('sharp');
const baselineRoot = path.resolve(baselineRootArg);
const candidateRoot = path.resolve(candidateRootArg);
const outputPath = path.resolve(outputArg);
const baselineManifestPath = path.join(baselineRoot, 'required-viewports.json');
const candidateMetadataPath = path.join(path.dirname(candidateRoot), 'commands', 'composition-e2e-02.metadata.json');
const readJson = async (file) => JSON.parse((await readFile(file, 'utf8')).replace(/^\\uFEFF/, ''));
const baselineManifest = await readJson(baselineManifestPath);
const candidateCommand = await readJson(candidateMetadataPath);
const specs = [
  { key: 'desktop-1440x900-chrome', label: 'desktop-1440x900', browser: 'Chrome', file: 'studio-reference-desktop-1440x900-chrome.png', runtime: 'desktop-1440x900-chrome-runtime-scene.json' },
  { key: 'desktop-1440x900-edge', label: 'desktop-1440x900', browser: 'Edge', file: 'studio-reference-desktop-1440x900-edge.png', runtime: 'desktop-1440x900-edge-runtime-scene.json' },
  { key: 'mobile-390x844-chrome', label: 'mobile-390x844', browser: 'Chrome', file: 'studio-reference-mobile-390x844-chrome.png', runtime: 'mobile-390x844-chrome-runtime-scene.json' },
  { key: 'mobile-390x844-edge', label: 'mobile-390x844', browser: 'Edge', file: 'studio-reference-mobile-390x844-edge.png', runtime: 'mobile-390x844-edge-runtime-scene.json' },
  { key: 'responsive-320x600-chrome', label: 'compact-320x600', browser: 'Chrome', file: 'studio-reference-compact-320x600-chrome.png', runtime: 'responsive-320x600-chrome-runtime-scene.json' },
  { key: 'responsive-320x600-edge', label: 'compact-320x600', browser: 'Edge', file: 'studio-reference-compact-320x600-edge.png', runtime: 'responsive-320x600-edge-runtime-scene.json' },
  { key: 'responsive-844x390-chrome', label: 'landscape-844x390', browser: 'Chrome', file: 'studio-reference-landscape-844x390-chrome.png', runtime: 'responsive-844x390-chrome-runtime-scene.json' },
  { key: 'responsive-844x390-edge', label: 'landscape-844x390', browser: 'Edge', file: 'studio-reference-landscape-844x390-edge.png', runtime: 'responsive-844x390-edge-runtime-scene.json' },
];
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const decode = async (file) => {
  const bytes = await readFile(file);
  const decoded = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { bytes, data: decoded.data, info: decoded.info };
};
const compare = (a, b) => {
  if (a.info.width !== b.info.width || a.info.height !== b.info.height || a.info.channels !== b.info.channels) {
    throw new Error(`decoded image dimensions/channels differ: ${a.info.width}x${a.info.height}x${a.info.channels} vs ${b.info.width}x${b.info.height}x${b.info.channels}`);
  }
  let changedPixels = 0;
  let absoluteDifferenceSum = 0;
  let maxChannelDifference = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    let pixelChanged = false;
    for (let c = 0; c < 4; c++) {
      const diff = Math.abs(a.data[i + c] - b.data[i + c]);
      if (diff) pixelChanged = true;
      absoluteDifferenceSum += diff;
      if (diff > maxChannelDifference) maxChannelDifference = diff;
    }
    if (pixelChanged) changedPixels++;
  }
  const totalPixels = a.info.width * a.info.height;
  return {
    totalPixels,
    changedPixels,
    identicalPixels: totalPixels - changedPixels,
    changedPixelPercent: Number((changedPixels / totalPixels * 100).toFixed(8)),
    meanAbsoluteChannelDifference: Number((absoluteDifferenceSum / a.data.length).toFixed(9)),
    maxChannelDifference,
  };
};
const findBaseline = (spec) => baselineManifest.captures.find((c) => c.label === spec.key);
const captures = [];
for (const spec of specs) {
  const baselineRecord = findBaseline(spec);
  if (!baselineRecord) throw new Error(`baseline manifest missing ${spec.key}`);
  const baselineFile = path.join(baselineRoot, 'screenshots', spec.file);
  const candidateFile = path.join(candidateRoot, 'screenshots', spec.file);
  const candidateMeasurementPath = path.join(candidateRoot, 'measurements', spec.runtime);
  const candidateScene = await readJson(candidateMeasurementPath);
  const baselineDecoded = await decode(baselineFile);
  const candidateDecoded = await decode(candidateFile);
  const stats = compare(baselineDecoded, candidateDecoded);
  const baselineQuality = baselineRecord.qualityTier;
  const candidateQuality = candidateScene.runtime.qualityTier;
  captures.push({
    key: spec.key,
    viewport: { width: candidateScene.viewport.width, height: candidateScene.viewport.height },
    browser: spec.browser,
    qualityTier: { baseline: baselineQuality, candidate: candidateQuality, same: baselineQuality === candidateQuality },
    renderBudget: {
      ceiling: baselineRecord.ceilings.inclusiveRenderCalls,
      baselineObserved: baselineRecord.runtime.renderCalls,
      candidateInclusiveObserved: candidateScene.runtimeSnapshot.renderCalls,
      candidateMainPass: candidateScene.runtimeSnapshot.mainPassRenderCalls,
      candidateShadowPass: candidateScene.runtimeSnapshot.shadowPassRenderCalls,
      candidateSplitSumsToInclusive: candidateScene.runtimeSnapshot.mainPassRenderCalls + candidateScene.runtimeSnapshot.shadowPassRenderCalls === candidateScene.runtimeSnapshot.renderCalls,
      candidateOverCeiling: candidateScene.runtimeSnapshot.renderCalls - baselineRecord.ceilings.inclusiveRenderCalls,
      candidateRenderedTriangles: candidateScene.runtimeSnapshot.renderedTriangles,
      triangleCeiling: baselineRecord.ceilings.visibleTriangles,
      trianglesWithinCeiling: candidateScene.runtimeSnapshot.renderedTriangles <= baselineRecord.ceilings.visibleTriangles,
    },
    screenshot: {
      baseline: {
        path: path.relative(baselineRoot, baselineFile).replaceAll('\\', '/'),
        bytes: baselineDecoded.bytes.length,
        sha256: sha256(baselineDecoded.bytes),
        width: baselineDecoded.info.width,
        height: baselineDecoded.info.height,
      },
      candidate: {
        path: path.relative(candidateRoot, candidateFile).replaceAll('\\', '/'),
        bytes: candidateDecoded.bytes.length,
        sha256: sha256(candidateDecoded.bytes),
        width: candidateDecoded.info.width,
        height: candidateDecoded.info.height,
      },
      rawDecodedRgba: stats,
    },
  });
}
const crossBrowser = [];
for (const label of ['desktop-1440x900', 'mobile-390x844', 'compact-320x600', 'landscape-844x390']) {
  const chrome = captures.find((c) => c.key.endsWith('-chrome') && c.key.includes(label.split('-')[0]));
  const keyByLabel = {
    'desktop-1440x900': ['desktop-1440x900-chrome', 'desktop-1440x900-edge'],
    'mobile-390x844': ['mobile-390x844-chrome', 'mobile-390x844-edge'],
    'compact-320x600': ['responsive-320x600-chrome', 'responsive-320x600-edge'],
    'landscape-844x390': ['responsive-844x390-chrome', 'responsive-844x390-edge'],
  }[label];
  const [chromeKey, edgeKey] = keyByLabel;
  const a = captures.find((c) => c.key === chromeKey);
  const b = captures.find((c) => c.key === edgeKey);
  crossBrowser.push({
    viewport: label,
    chromeSha256: a.screenshot.candidate.sha256,
    edgeSha256: b.screenshot.candidate.sha256,
    byteIdenticalCandidatePngs: a.screenshot.candidate.sha256 === b.screenshot.candidate.sha256 && a.screenshot.candidate.bytes === b.screenshot.candidate.bytes,
    rawDecodedRgbaIdentical: JSON.stringify(compare(await decode(path.join(candidateRoot, 'screenshots', specs.find((s) => s.key === chromeKey).file)), await decode(path.join(candidateRoot, 'screenshots', specs.find((s) => s.key === edgeKey).file)))) === JSON.stringify({ totalPixels: captures.find((c) => c.key === chromeKey).screenshot.rawDecodedRgba.totalPixels, changedPixels: 0, identicalPixels: captures.find((c) => c.key === chromeKey).screenshot.rawDecodedRgba.totalPixels, changedPixelPercent: 0, meanAbsoluteChannelDifference: 0, maxChannelDifference: 0 }),
  });
}
const result = {
  schemaVersion: 1,
  tool: { name: 'pixel-parity-01.mjs', sharp: sharp.versions.sharp, libvips: sharp.versions.vips, decodedSpace: 'RGBA bytes as decoded by Sharp/libvips; no resizing or image normalization' },
  baseline: {
    committedSource: baselineManifest.source.commit,
    appTree: baselineManifest.source.appTree,
    originalCaptureDirectory: 'C:/p25/deliveries/G7/preparation/maker-evidence/pre-g7-25/attempt-02/accepted-root-capture-budget-check-failed',
    copiedCaptureDirectory: path.relative(path.dirname(outputPath), baselineRoot).replaceAll('\\', '/'),
    manifestPath: path.relative(path.dirname(outputPath), baselineManifestPath).replaceAll('\\', '/'),
    manifestSha256: sha256(await readFile(baselineManifestPath)),
    generatedAtUtc: baselineManifest.generatedAtUtc,
  },
  candidate: {
    sourceCommit: candidateCommand.sourceHead,
    acceptedBaseCommit: candidateCommand.acceptedBaseCommit,
    acceptedBaseAppTree: candidateCommand.acceptedBaseAppTree,
    rootTree: candidateCommand.candidateRootTree,
    appTree: candidateCommand.candidateAppTree,
    mirrorTree: candidateCommand.candidateMirrorTree,
    commandReceipt: path.relative(path.dirname(outputPath), candidateMetadataPath).replaceAll('\\', '/'),
    e2eExitCode: candidateCommand.osExitCode,
    e2eStdoutSha256: candidateCommand.stdout.sha256,
    e2eStderrSha256: candidateCommand.stderr.sha256,
  },
  captures,
  candidateChromeEdgePairs: crossBrowser,
};
await writeFile(outputPath, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ captures: captures.length, sameTierCount: captures.filter((c) => c.qualityTier.same).length, allCallCeilingsPass: captures.every((c) => c.renderBudget.candidateInclusiveObserved <= c.renderBudget.ceiling), output: outputPath }, null, 2));

