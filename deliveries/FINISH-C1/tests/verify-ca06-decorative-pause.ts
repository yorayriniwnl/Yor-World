import * as fs from "fs";
import * as path from "path";
import { WorldRuntime } from "../src/features/world/WorldRuntime";
import { LifecycleManager } from "../src/features/world/LifecycleManager";

async function run() {
  console.log("=== CA-06 Diagnostic: Decorative Pause & Interaction Consistency ===");

  const checks: Record<string, boolean> = {};

  const mockCanvas = {
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as HTMLCanvasElement;

  // Test 1: Initial creation with decorativePaused: true
  const lm1 = new LifecycleManager();
  const runtimePaused = new WorldRuntime({
    canvas: mockCanvas,
    lifecycleManager: lm1,
    decorativePaused: true,
  });

  checks.initialPauseState = runtimePaused.isDecorativePaused === true;

  // Test 2: Toggle decorative pause
  runtimePaused.setDecorativePaused(false);
  checks.toggleToUnpaused = runtimePaused.isDecorativePaused === false;

  runtimePaused.setDecorativePaused(true);
  checks.toggleBackToPaused = runtimePaused.isDecorativePaused === true;

  // Test 3: Diagnostics reporting includes decorative pause state
  const diag = runtimePaused.getDiagnostics();
  checks.diagnosticsReportPause = diag.experienceSnapshot?.paused === true;
  checks.runtimeIsDecorativePaused = runtimePaused.isDecorativePaused === true;

  // Test 4: Abort on Skip/Escape during LOADING state
  const lm2 = new LifecycleManager();
  const runtimeLoading = new WorldRuntime({
    canvas: mockCanvas,
    lifecycleManager: lm2,
  });

  const token2 = lm2.requestEntry();
  lm2.startLoading(token2);
  checks.stateIsLoading = lm2.getState() === "LOADING";

  // Check abort on skip
  let abortFired: boolean = false;
  const abortController1 = (runtimeLoading as unknown as { loadingAbort: AbortController }).loadingAbort;
  abortController1.signal.addEventListener("abort", () => {
    abortFired = true;
  });

  runtimeLoading.skip();
  checks.skipAbortsLoading = (abortFired as boolean) && abortController1.signal.aborted;

  // Check escape aborts loading on new instance
  const lm3 = new LifecycleManager();
  const runtimeLoading2 = new WorldRuntime({
    canvas: mockCanvas,
    lifecycleManager: lm3,
  });
  const token3 = lm3.requestEntry();
  lm3.startLoading(token3);
  let escapeAbortFired: boolean = false;
  const abortController2 = (runtimeLoading2 as unknown as { loadingAbort: AbortController }).loadingAbort;
  abortController2.signal.addEventListener("abort", () => {
    escapeAbortFired = true;
  });
  runtimeLoading2.escape();
  checks.escapeAbortsLoading = (escapeAbortFired as boolean) && abortController2.signal.aborted;

  const outDir = path.resolve(process.cwd(), "evidence");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const evidence = {
    timestamp: new Date().toISOString(),
    checks,
    diagnostics: diag,
  };

  fs.writeFileSync(
    path.join(outDir, "ca06-decorative-pause-evidence.json"),
    JSON.stringify(evidence, null, 2)
  );

  console.log("CA-06 Checks Summary:", JSON.stringify(checks, null, 2));

  const allPassed = Object.values(checks).every((v) => v === true);
  if (allPassed) {
    console.log(">>> ALL CA-06 DIAGNOSTIC CHECKS PASSED <<<");
  } else {
    console.error(">>> CA-06 DIAGNOSTIC CHECKS FAILED <<<");
    process.exit(1);
  }

  runtimePaused.dispose();
  runtimeLoading.dispose();
  runtimeLoading2.dispose();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
