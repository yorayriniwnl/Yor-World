import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const audit = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(audit, "../../../../..");
const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");
const inputs = [
  "deliveries/G7/preparation/tools/candidate-driver.py",
  "deliveries/G7/preparation/tools/assemble-evidence.py",
  "deliveries/G7/preparation/tools/reserve-attempt.mjs",
  "scripts/release/build-release-bundle.mjs",
  "scripts/release/release-lib.mjs",
  "scripts/release/rc6-policy.json",
  "scripts/release/tests/policy-output.test.mjs",
  "scripts/release/tests/reserve-attempt.test.mjs",
  "scripts/release/tests/assemble-evidence.test.mjs",
];
const snapshotRoot = path.join(audit, "input-snapshot");
const inputRecords = [];
for (const relative of inputs) {
  const source = path.join(root, ...relative.split("/"));
  const bytes = fs.readFileSync(source);
  const destination = path.join(snapshotRoot, ...relative.split("/"));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  inputRecords.push({ path: relative, bytes: bytes.length, sha256: sha(bytes), snapshotPath: path.relative(audit, destination).split(path.sep).join("/") });
}
const git = (...args) => spawnSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true });
const testLogPath = path.join(audit, "focused-tests.log");
const testLog = fs.readFileSync(testLogPath);
const testText = testLog.toString("utf8");
const outputs = ["writer-probes.json", "probe-results.json", "focused-tests.log", "probe-writers-current.mjs", "probe-current-r7-v2.mjs", "delta-comparison.json", "report.md", "input-hashes.json"];
const outputRecords = outputs.map((relative) => {
  const bytes = fs.readFileSync(path.join(audit, relative));
  return { path: relative, bytes: bytes.length, sha256: sha(bytes) };
});
const packageVersions = {};
for (const [key, command, args] of [
  ["node", "node", ["--version"]], ["python", "python", ["--version"]], ["git", "git", ["--version"]], ["pnpm", "pnpm", ["--version"]],
]) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", windowsHide: true });
  packageVersions[key] = { exitCode: result.status, version: (String(result.stdout ?? "") + String(result.stderr ?? "")).trim() || "NOT AVAILABLE" };
}
const branch = git("branch", "--show-current").stdout.trim();
const status = git("status", "--porcelain").stdout;
const inputManifest = {
  hashPolicy: "SHA-256 raw bytes; all inspected implementation/test inputs copied into input-snapshot/",
  sourceIdentity: { branch, head: git("rev-parse", "HEAD").stdout.trim(), workingTreeDirty: status.length > 0 },
  files: inputRecords,
};
fs.writeFileSync(path.join(audit, "input-hashes.json"), JSON.stringify(inputManifest, null, 2) + "\n");
const execution = {
  sourceIdentity: inputManifest.sourceIdentity,
  toolVersions: packageVersions,
  commands: [
    { command: "node --test scripts/release/tests/policy-output.test.mjs scripts/release/tests/reserve-attempt.test.mjs scripts/release/tests/assemble-evidence.test.mjs", exitCode: 0, log: { path: "focused-tests.log", sha256: sha(testLog), bytes: testLog.length }, summary: { tests: Number(testText.match(/ℹ tests\s+(\d+)/)?.[1] ?? 0), pass: Number(testText.match(/ℹ pass\s+(\d+)/)?.[1] ?? 0), fail: Number(testText.match(/ℹ fail\s+(\d+)/)?.[1] ?? 0) } },
    { command: "node probe-writers-current.mjs", exitCode: 1, expectedDiagnosticExit: true, evidence: "writer-probes.json; R7-WRITER-01 and R7-WRITER-02 reproduce; hard-link, preserved-alias and interrupted-attempt controls pass" },
    { command: "node probe-current-r7-v2.mjs", exitCode: 0, evidence: "probe-results.json; missing-parent indices and sequential inventory-only outputs" },
  ],
  outputFiles: outputRecords,
  scopeLimits: ["No candidate driver invocation", "No actual R7 packaging, browser, provider, deployment or G7 execution", "Bundle writer probe uses the current entrypoint body and copied current guards with only buildBundle/git substituted by nonwriting synthetic dependencies"],
};
fs.writeFileSync(path.join(audit, "execution-receipts.json"), JSON.stringify(execution, null, 2) + "\n");
console.log(JSON.stringify({ sourceIdentity: inputManifest.sourceIdentity, inputs: inputRecords.length, tests: execution.commands[0].summary, outputFiles: outputRecords.length, tools: packageVersions }));