import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const evidenceRoot = path.join(here, 'diagnostic-run');
const reusedAppRoot = 'D:\\p33\\app';
const profile = JSON.parse(fs.readFileSync(path.join(evidenceRoot, 'startup-cpu-profile.json'), 'utf8'));
const diagnostic = JSON.parse(fs.readFileSync(path.join(evidenceRoot, 'startup-cpu-profile-diagnostic.json'), 'utf8'));
const nodesById = new Map(profile.nodes.map((node) => [node.id, node]));
const parentById = new Map();
for (const node of profile.nodes) for (const child of node.children ?? []) parentById.set(child, node.id);

const clockAnchors = [
  diagnostic.profilerClock.beforeStart,
  diagnostic.profilerClock.afterStart,
  diagnostic.profilerClock.beforeStop,
  diagnostic.profilerClock.afterStop,
].filter((anchor) => Number.isFinite(anchor?.cdpTimestampSeconds) && Number.isFinite(anchor?.hostEpochMs));
const clockOffsets = clockAnchors.map((anchor) => anchor.hostEpochMs - anchor.cdpTimestampSeconds * 1000);
const clockOffsetMs = clockOffsets.reduce((sum, value) => sum + value, 0) / clockOffsets.length;
const timeOriginEpochMs = diagnostic.browserObservation.observer.timeOrigin;
const samples = [];
let profileTimeUs = profile.startTime;
for (let index = 0; index < profile.samples.length; index += 1) {
  const deltaUs = profile.timeDeltas?.[index] ?? 0;
  profileTimeUs += deltaUs;
  samples.push({ nodeId: profile.samples[index], timeUs: profileTimeUs, deltaUs });
}

function frame(node) {
  const callFrame = node?.callFrame ?? {};
  return {
    nodeId: node?.id ?? null,
    functionName: callFrame.functionName || '(anonymous)',
    url: callFrame.url || '(native/VM)',
    scriptId: callFrame.scriptId || null,
    lineNumber: callFrame.lineNumber ?? null,
    columnNumber: callFrame.columnNumber ?? null,
  };
}

function stackFor(nodeId) {
  const result = [];
  const seen = new Set();
  let current = nodeId;
  while (current !== undefined && !seen.has(current)) {
    seen.add(current);
    result.push(frame(nodesById.get(current)));
    current = parentById.get(current);
  }
  return result.reverse();
}

function aggregateForInterval(startMs, endMs) {
  const startEpochMs = timeOriginEpochMs + startMs;
  const endEpochMs = timeOriginEpochMs + endMs;
  const startProfileUs = (startEpochMs - clockOffsetMs) * 1000;
  const endProfileUs = (endEpochMs - clockOffsetMs) * 1000;
  const selected = samples.filter((sample) => sample.timeUs >= startProfileUs && sample.timeUs <= endProfileUs);
  const self = new Map();
  const inclusive = new Map();
  for (const sample of selected) {
    const weight = Math.max(0, sample.deltaUs);
    self.set(sample.nodeId, (self.get(sample.nodeId) ?? 0) + weight);
    let current = sample.nodeId;
    const seen = new Set();
    while (current !== undefined && !seen.has(current)) {
      seen.add(current);
      inclusive.set(current, (inclusive.get(current) ?? 0) + weight);
      current = parentById.get(current);
    }
  }
  const rank = (map) => [...map.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 12)
    .map(([nodeId, sampledMicroseconds]) => ({
      ...frame(nodesById.get(nodeId)),
      sampleCount: selected.filter((sample) => sample.nodeId === nodeId).length,
      sampledCpuMilliseconds: Number((sampledMicroseconds / 1000).toFixed(2)),
    }));
  const topSelf = rank(self);
  const topInclusive = rank(inclusive);
  const mainFrame = topSelf[0] ? nodesById.get(topSelf[0].nodeId) : null;
  return {
    browserWindowMs: { start: startMs, end: endMs, duration: endMs - startMs },
    mappedProfileWindowMicroseconds: { start: startProfileUs, end: endProfileUs },
    samplesInWindow: selected.length,
    topSelfFrames: topSelf,
    topInclusiveFrames: topInclusive,
    topSelfStack: mainFrame ? stackFor(mainFrame.id) : [],
  };
}

const longTaskWindows = diagnostic.browserObservation.observer.longTasks
  .filter((task) => task.durationMs >= 1000)
  .map((task) => aggregateForInterval(task.startTimeMs, task.startTimeMs + task.durationMs));

const overallSelf = new Map();
for (const sample of samples) overallSelf.set(sample.nodeId, (overallSelf.get(sample.nodeId) ?? 0) + Math.max(0, sample.deltaUs));
const topOverallSelfFrames = [...overallSelf.entries()]
  .sort((left, right) => right[1] - left[1])
  .slice(0, 20)
  .map(([nodeId, sampledMicroseconds]) => ({
    ...frame(nodesById.get(nodeId)),
    sampleCount: samples.filter((sample) => sample.nodeId === nodeId).length,
    sampledCpuMilliseconds: Number((sampledMicroseconds / 1000).toFixed(2)),
    stack: stackFor(nodeId),
  }));

const chunkUrls = [...new Set(profile.nodes.map((node) => node.callFrame?.url).filter((url) => url?.includes('/_next/static/chunks/')))];
const chunkFiles = chunkUrls.map((url) => {
  const fileName = path.basename(new URL(url).pathname);
  const filePath = path.join(reusedAppRoot, '.next/static/chunks', fileName);
  if (!fs.existsSync(filePath)) return { fileName, available: false };
  const bytes = fs.readFileSync(filePath);
  const source = bytes.toString('utf8');
  const lastLine = source.split('\n').at(-1) ?? '';
  const sourceMapMatch = source.match(/sourceMappingURL=([^\s*]+)/);
  const mapPath = sourceMapMatch ? path.join(path.dirname(filePath), sourceMapMatch[1]) : `${filePath}.map`;
  const topFrames = topOverallSelfFrames.filter((candidate) => candidate.url.endsWith(`/${fileName}`));
  const excerpts = topFrames.slice(0, 5).map((candidate) => {
    const lines = source.split('\n');
    const line = lines[candidate.lineNumber] ?? '';
    const start = Math.max(0, (candidate.columnNumber ?? 0) - 180);
    const end = Math.min(line.length, (candidate.columnNumber ?? 0) + 360);
    return { functionName: candidate.functionName, lineNumber: candidate.lineNumber, columnNumber: candidate.columnNumber, excerpt: line.slice(start, end) };
  });
  return {
    fileName,
    available: true,
    byteLength: bytes.byteLength,
    rawSha256: createHash('sha256').update(bytes).digest('hex'),
    sourceMapDirective: sourceMapMatch?.[1] ?? null,
    sourceMapPresent: fs.existsSync(mapPath),
    topFrameExcerpts: excerpts,
    lastLinePrefix: lastLine.slice(0, 240),
  };
});

const analysis = {
  packet: 'PRE-G7-34',
  sourceCommit: diagnostic.sourceCommit,
  appTree: diagnostic.appTree,
  reusedBuildId: diagnostic.reusedBuildId,
  browserVersion: diagnostic.browserVersion,
  profile: {
    startTime: profile.startTime,
    endTime: profile.endTime,
    durationMilliseconds: (profile.endTime - profile.startTime) / 1000,
    sampleCount: profile.samples.length,
    profileNodeCount: profile.nodes.length,
    negativeTimeDeltaCount: profile.timeDeltas.filter((delta) => delta < 0).length,
    timeDeltaSumMicroseconds: profile.timeDeltas.reduce((sum, delta) => sum + delta, 0),
  },
  clockMapping: {
    timeOriginEpochMs,
    cdpToEpochOffsetsMs: clockOffsets,
    meanCdpToEpochOffsetMs: clockOffsetMs,
    offsetSpreadMs: Math.max(...clockOffsets) - Math.min(...clockOffsets),
  },
  longTaskWindows,
  topOverallSelfFrames,
  profiledChunks: chunkFiles,
};

fs.writeFileSync(path.join(evidenceRoot, 'startup-cpu-profile-analysis.json'), `${JSON.stringify(analysis, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify({ sampleCount: analysis.profile.sampleCount, longTaskWindows: longTaskWindows.map((window) => ({ durationMs: window.browserWindowMs.duration, samplesInWindow: window.samplesInWindow, topSelfFrames: window.topSelfFrames.slice(0, 5) })), profiledChunks: chunkFiles.map((chunk) => ({ fileName: chunk.fileName, sourceMapPresent: chunk.sourceMapPresent })) }, null, 2)}\n`);
