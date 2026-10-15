const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");

const evidenceRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(evidenceRoot, "../../../../..");
const configRel = "app/vitest.config.ts";
const configBytes = fs.readFileSync(path.join(repoRoot, configRel));
const configText = configBytes.toString("utf8");
const configBlobRun = spawnSync("git", ["hash-object", "--", configRel], { cwd: repoRoot, encoding: "utf8" });
if (configBlobRun.status !== 0) throw new Error(configBlobRun.stderr);
const instrumentation = JSON.parse(fs.readFileSync(path.join(__dirname, "instrumentation-state.json"), "utf8"));
const testName = "enforces integrated dependency boundaries: HTML shell stays free of 3D and browser features stay free of server imports";
const receipt = {
  purpose: "single instrumented focused diagnostic; not a unit-gate run",
  command: `pnpm run test:unit -- tests/unit/boundaries.test.ts -t "${testName}"`,
  pnpmArgsAfterExecutable: ["run", "test:unit", "--", "tests/unit/boundaries.test.ts", "-t", testName],
  testFile: "tests/unit/boundaries.test.ts",
  testName,
  timeoutMs: 5000,
  timeoutBasis: "unchanged Vitest default; the repository config has no testTimeout/hookTimeout fields, the test supplies no timeout, and the invocation sets no timeout flags or environment overrides",
  config: {
    path: configRel,
    bytes: configBytes.length,
    rawSha256: crypto.createHash("sha256").update(configBytes).digest("hex"),
    gitBlob: configBlobRun.stdout.trim(),
    hasExplicitTimeout: /\b(?:testTimeout|hookTimeout)\b/.test(configText),
  },
  instrumentedTestMirror: {
    appGitBlob: instrumentation.instrumentedSnapshots[0].gitBlob,
    domainGitBlob: instrumentation.instrumentedSnapshots[1].gitBlob,
    gitBlobsMatch: instrumentation.pairedGitBlobsEqual,
    assertionsAndTestDeclarationsMatchBase: instrumentation.declarationsAssertionsUnchanged,
  },
  runner: "attempt-01/run-focused.cjs",
  processSampler: "attempt-01/process-sampler.ps1",
};
fs.writeFileSync(path.join(__dirname, "diagnostic-invocation.json"), JSON.stringify(receipt, null, 2) + "\n");
process.stdout.write(JSON.stringify(receipt, null, 2) + "\n");
if (!receipt.instrumentedTestMirror.gitBlobsMatch || !receipt.instrumentedTestMirror.assertionsAndTestDeclarationsMatchBase || receipt.config.hasExplicitTimeout) process.exitCode = 1;
