/** Shared strict evidence contract for the active LOW production-render route. */
export function verifyActiveBenchmark(pacing) {
  const reject = (reason) => { throw new Error(`Active benchmark evidence: ${reason}`); };
  if (pacing.requestedUserPreference !== "low" || (pacing.appliedUserPreference !== undefined && pacing.appliedUserPreference !== "low")) {
    reject("the supported LOW preference must be requested and applied");
  }
  for (const key of ["observedTierCounts", "tierCounts"]) {
    const counts = pacing[key];
    if (!(counts?.low > 0) || Object.entries(counts).some(([tier, count]) => tier !== "low" || !Number.isInteger(count) || count <= 0)) {
      reject(`${key} must contain only observed LOW frames`);
    }
  }
  if (!(pacing.routeDurationMs >= 60000) || pacing.worldContinuouslyActive !== true || pacing.failureReason !== null
    || pacing.failureDiagnostic !== null || pacing.failureMessage !== null || pacing.interactionsCompleted !== 60
    || pacing.actions?.length !== 60 || !(pacing.maxRenderCalls > 0) || !(pacing.maxRenderedTriangles > 0)) {
    reject("requires at least 60 seconds of continuous production renders and 60 acknowledged actions, without failure");
  }
  if (typeof pacing.rendererIdentity !== "string" || !pacing.rendererIdentity) reject("requires the actual WebGL renderer identity");
  const state = pacing.finalRenderState;
  if (!state || state.qualityTier !== "low" || state.observedUserPreference !== "low" || !["HOME", "TRANSITION"].includes(state.lifecycleState)
    || state.canvasConnected !== true || state.canvasVisible !== true || state.visibilityState !== "visible"
    || !(state.lastRenderedFrameTimestamp > 0) || !(state.renderCalls > 0) || !(state.renderedTriangles > 0)
    || typeof state.currentAction !== "string" || !state.currentAction || state.rendererIdentity !== pacing.rendererIdentity
    || state.elapsedRouteTimeMs !== pacing.routeDurationMs) {
    reject("requires complete connected, visible, actively rendering final-state diagnostics");
  }
  const samples = pacing.rawSamples || pacing.frameTimes;
  if (!(pacing.totalFramesSampled >= 100) || !Array.isArray(samples) || samples.length !== pacing.totalFramesSampled
    || samples.some((n) => !Number.isFinite(n) || n <= 0)) reject("requires complete positive raw production frame samples");
  if (!Array.isArray(pacing.rawFrames) || pacing.rawFrames.length < samples.length
    || pacing.observedTierCounts.low !== pacing.rawFrames.length || pacing.tierCounts.low !== pacing.rawFrames.length) {
    reject("observed tier counts must cover every raw rendered frame");
  }
  const positiveFrames = [];
  for (const frame of pacing.rawFrames) {
    if (frame.qualityTier !== "low" || !["HOME", "TRANSITION"].includes(frame.lifecycleState)
      || !Number.isFinite(frame.timestamp) || frame.timestamp <= 0 || !Number.isFinite(frame.durationMs) || frame.durationMs < 0
      || !(frame.renderCalls > 0) || !(frame.renderedTriangles > 0)) reject("every raw frame must represent an active LOW world render");
    if (frame.durationMs > 0) positiveFrames.push(frame.durationMs);
  }
  if (positiveFrames.length !== samples.length || positiveFrames.some((duration, index) => duration !== samples[index])) {
    reject("raw pacing samples must match the corresponding rendered frames");
  }
  if (pacing.actions.some((action) => typeof action.action !== "string" || !action.action || !Number.isFinite(action.latencyMs) || action.latencyMs < 0)) {
    reject("every recorded action must have an identity and measured acknowledgment latency");
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const p95 = sorted[Math.min(Math.floor(sorted.length * 0.95), sorted.length - 1)];
  if (median > 33.3 || p95 > 45) reject("frame median must remain <=33.3 ms and p95 <=45 ms");
  return { median, p95 };
}
