import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { ROOT } from "../release-lib.mjs";

const hash = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

function fixture(t) {
  const tempParent = fs.realpathSync.native(os.tmpdir());
  const temp = fs.mkdtempSync(path.join(tempParent, "yor-assembler-"));
  const root = path.join(temp, "repo");
  t.after(() => {
    const real = fs.realpathSync.native(temp);
    assert.equal(path.dirname(real), tempParent);
    assert.ok(path.basename(real).startsWith("yor-assembler-"));
    fs.rmSync(real, { recursive: true, force: true });
  });
  const cloned = spawnSync("git", ["clone", "--shared", "--no-checkout", "--quiet", ROOT, root], { encoding: "utf8", windowsHide: true });
  assert.equal(cloned.status, 0, cloned.stderr);

  const tool = "deliveries/G7/preparation/tools/assemble-evidence.py";
  fs.mkdirSync(path.dirname(path.join(root, tool)), { recursive: true });
  fs.copyFileSync(path.join(ROOT, tool), path.join(root, tool));
  const source = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8", windowsHide: true }).stdout.trim();
  const appTree = spawnSync("git", ["rev-parse", source + ":app"], { cwd: root, encoding: "utf8", windowsHide: true }).stdout.trim();
  const policy = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/release/rc6-policy.json"), "utf8"));
  const delivery = "deliveries/G7/fixture-candidate-r7";
  policy.deliveryRoot = delivery;
  policy.bundle.path = delivery + "/yor-world-" + policy.releaseId + ".bundle.tar.gz";
  policy.requiredChecks = [];
  policy.requiredEvidencePaths = [];
  const policyPath = path.join(root, "scripts/release/rc6-policy.json");
  fs.mkdirSync(path.dirname(policyPath), { recursive: true });
  fs.writeFileSync(policyPath, JSON.stringify(policy, null, 2) + "\n");

  const evidenceDir = path.join(root, delivery, "evidence");
  fs.mkdirSync(evidenceDir, { recursive: true });
  const evidenceRelative = delivery + "/evidence/attempt.log";
  const evidenceBytes = Buffer.from("actual isolated execution evidence\n");
  fs.writeFileSync(path.join(root, evidenceRelative), evidenceBytes);
  const execution = {
    id: "isolated-check", attempt: 1, command: ["node", "--test", "isolated.test.mjs"],
    durationSeconds: 0.25, exitCode: 0, sourceCommit: source, evidencePath: evidenceRelative, evidenceSha256: hash(evidenceBytes),
  };
  fs.writeFileSync(path.join(evidenceDir, "execution.jsonl"), JSON.stringify(execution) + "\n");

  const archiveRelative = delivery + "/yor-world-" + policy.releaseId + ".bundle.tar.gz";
  const archiveBytes = Buffer.from("isolated fixture bundle bytes");
  fs.writeFileSync(path.join(root, archiveRelative), archiveBytes);
  const binding = { releaseId: policy.releaseId, sourceCommit: source, sourceAppTree: appTree };
  const bindingBytes = Buffer.from(JSON.stringify(binding, null, 2) + "\n");
  fs.writeFileSync(path.join(root, delivery, "source-binding.json"), bindingBytes);
  const manifest = {
    releaseId: policy.releaseId,
    canonicalApplicationRoot: policy.canonicalApplicationRoot,
    assetRevision: policy.assetRevision,
    publicationRevision: policy.publicationRevision,
    schemaRevision: policy.schemaRevision,
    contactAmendment: policy.contactAmendment,
    sourceCommit: source,
    sourceAppTree: appTree,
    releaseBundlePath: archiveRelative,
    releaseBundleSha256: hash(archiveBytes),
    sourceBinding: { path: delivery + "/source-binding.json", sha256: hash(bindingBytes), hashMode: "lf" },
    requiredChecks: [],
    evidenceHashes: [],
  };
  fs.writeFileSync(path.join(root, delivery, "release-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

  const run = () => spawnSync("python", ["-B", tool, "--repository", ".", "--policy", "scripts/release/rc6-policy.json", "--source", source, "--inventory-only"],
    { cwd: root, encoding: "utf8", windowsHide: true });
  const runPackage = () => spawnSync("python", ["-B", tool, "--repository", ".", "--policy", "scripts/release/rc6-policy.json", "--source", source],
    { cwd: root, encoding: "utf8", windowsHide: true });
  return { root, temp, delivery, source, policy, run, runPackage, execution, evidenceDir };
}

function packageFixture(t) {
  const f = fixture(t);
  for (const name of ["source-binding.json", "release-manifest.json"]) {
    fs.rmSync(path.join(f.root, f.delivery, name));
  }
  const writeJson = (name, value) => {
    const target = path.join(f.root, f.delivery, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify(value, null, 2) + "\n");
  };
  const sourceTree = spawnSync("git", ["rev-parse", f.source + ":app"], { cwd: f.root, encoding: "utf8", windowsHide: true }).stdout.trim();
  const archiveRelative = `${f.delivery}/yor-world-${f.policy.releaseId}.bundle.tar.gz`;
  const archiveBytes = fs.readFileSync(path.join(f.root, archiveRelative));
  writeJson("bundle-receipt.json", {
    releaseId: f.policy.releaseId, sourceCommit: f.source, sourceAppTree: sourceTree,
    archivePath: archiveRelative, sha256: hash(archiveBytes), fileCount: 1, bytes: archiveBytes.length,
  });
  writeJson("release-composition.json", { sourceCommit: f.source, overallStatus: "PASS" });
  writeJson("asset-validation.json", { sourceCommit: f.source, overallStatus: "PASS" });

  const genericEvidence = [
    "evidence/versions.json", "evidence/session.json", "evidence/e2e-discovery.json",
    "evidence/accessibility-discovery.json", "evidence/performance-discovery.json",
    "evidence/e2e-inventory.json", "evidence/accessibility-inventory.json", "evidence/performance-inventory.json",
  ];
  for (const name of genericEvidence) writeJson(name, { sourceCommit: f.source });
  writeJson("evidence/historical-immutability.json", { sourceCommit: f.source, overallStatus: "PASS" });
  const counts = { e2e: 1, accessibility: 1, performance: 1 };
  writeJson("evidence/browser-counts.json", { sourceCommit: f.source, overallStatus: "PASS", discoveredCounts: counts });
  for (const [bucket, filename] of [
    ["e2e", "browser-results.json"], ["accessibility", "browser-results.json"], ["performance", "performance-results.json"],
  ]) writeJson(`evidence/${bucket}/${filename}`, { stats: { expected: counts[bucket], unexpected: 0, flaky: 0, skipped: 0 } });
  writeJson("evidence/performance/enter-exit-stability.json", {
    memoryLeakDetected: "UNKNOWN", heapLeakAbsence: "UNKNOWN", gpuMemoryLeakAbsence: "UNKNOWN",
    domAndRenderCleanupObserved: true,
    cycles: Array.from({ length: 4 }, () => ({
      activeDiagnostics: { renderCalls: 1, renderedTriangles: 1 }, canvasCount: 0,
      stoppedFrames: 1, afterExit: { canvasConnected: false, renderedFrames: 1, contextLost: true },
    })),
  });
  return f;
}

test("inventory-only requires an exact-source inventory and writes a complete portable inventory", async (t) => {
  const f = fixture(t);
  const result = f.run();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /Bound 1 exact-source command identities/);
  const checksums = fs.readFileSync(path.join(f.root, f.delivery, "SHA256SUMS.txt"), "utf8");
  for (const name of [
    f.delivery + "/release-manifest.json",
    f.delivery + "/source-binding.json",
    f.delivery + "/evidence/attempt.log",
    f.delivery + "/evidence/inventory-completed.json",
    f.delivery + "/commands-and-exit-codes.md",
  ]) assert.ok(checksums.includes("  " + name + "\n"), "missing inventory entry " + name);
  const receipt = JSON.parse(fs.readFileSync(path.join(f.root, f.delivery, "inventory-omissions.json"), "utf8"));
  assert.equal(receipt.sourceCommit, f.source);
});

test("package and final inventory use immutable output identities in sequence", async (t) => {
  const f = packageFixture(t);
  const packaged = f.runPackage();
  assert.equal(packaged.status, 0, packaged.stdout + packaged.stderr);

  const packageNames = [
    "package-commands-and-exit-codes.md", "package-inventory-omissions.json", "package-SHA256SUMS.txt",
  ];
  for (const name of packageNames) assert.equal(fs.existsSync(path.join(f.root, f.delivery, name)), true, `missing ${name}`);
  for (const name of ["commands-and-exit-codes.md", "inventory-omissions.json", "SHA256SUMS.txt"])
    assert.equal(fs.existsSync(path.join(f.root, f.delivery, name)), false, `package phase wrote final output ${name}`);
  const preservedNames = [...packageNames, "source-binding.json", "release-manifest.json", "bundle-receipt.json", "evidence/execution.jsonl"];
  const beforeInventory = new Map(preservedNames.map((name) => {
    const target = path.join(f.root, f.delivery, name);
    return [name, fs.readFileSync(target)];
  }));

  const inventoried = f.run();
  assert.equal(inventoried.status, 0, inventoried.stdout + inventoried.stderr);
  for (const name of ["commands-and-exit-codes.md", "inventory-omissions.json", "SHA256SUMS.txt"])
    assert.equal(fs.existsSync(path.join(f.root, f.delivery, name)), true, `missing final output ${name}`);
  for (const [name, bytes] of beforeInventory)
    assert.deepEqual(fs.readFileSync(path.join(f.root, f.delivery, name)), bytes, `package output changed: ${name}`);

  const checksums = fs.readFileSync(path.join(f.root, f.delivery, "SHA256SUMS.txt"), "utf8");
  const completionName = `${f.delivery}/evidence/inventory-completed.json`;
  const completionBytes = fs.readFileSync(path.join(f.root, completionName));
  const completion = JSON.parse(completionBytes);
  assert.equal(completion.phase, "inventory");
  assert.equal(completion.status, "PASS");
  assert.equal(completion.result, "PASS");
  assert.equal(completion.exitCode, 0);
  assert.equal(completion.sourceCommit, f.source);
  assert.equal(completion.deliveryRoot, f.delivery);
  assert.equal(completion.releaseId, f.policy.releaseId);
  assert.ok(Number.isFinite(Date.parse(completion.completedAt)));
  assert.ok(Array.isArray(completion.command) && completion.command.every((part) => typeof part === "string"));
  assert.equal(completion.command[0], "deliveries/G7/preparation/tools/assemble-evidence.py");
  assert.equal(completion.command[completion.command.indexOf("--repository") + 1], ".");
  assert.ok(completion.command.includes("--inventory-only"));
  const completionHashLine = `${hash(completionBytes)}  ${completionName}`;
  assert.equal(checksums.split("\n").filter((line) => line.endsWith(`  ${completionName}`)).length, 1);
  assert.ok(checksums.split("\n").includes(completionHashLine), "final inventory did not hash the exact completion receipt bytes");
  for (const name of [
    `${f.delivery}/package-commands-and-exit-codes.md`, `${f.delivery}/package-inventory-omissions.json`,
    `${f.delivery}/package-SHA256SUMS.txt`, `${f.delivery}/commands-and-exit-codes.md`, completionName,
  ]) assert.ok(checksums.includes(`  ${name}\n`), `final inventory omitted ${name}`);

  const allOutputs = [
    ...preservedNames, "commands-and-exit-codes.md", "inventory-omissions.json", "SHA256SUMS.txt",
    "evidence/inventory-completed.json",
  ];
  const finalHashes = new Map(allOutputs.map((name) => [name, hash(fs.readFileSync(path.join(f.root, f.delivery, name)))]));
  const repeated = f.run();
  assert.equal(repeated.status, 1);
  assert.match(repeated.stderr, /Output case-aliases an existing portable inventory path|Output already exists/);
  for (const name of allOutputs)
    assert.equal(hash(fs.readFileSync(path.join(f.root, f.delivery, name))), finalHashes.get(name), `repeat changed ${name}`);
});

test("interruption before the final receipt leaves no completion claim and cannot resume", async (t) => {
  const f = packageFixture(t);
  const packaged = f.runPackage();
  assert.equal(packaged.status, 0, packaged.stdout + packaged.stderr);
  const packageNames = [
    "package-commands-and-exit-codes.md", "package-inventory-omissions.json", "package-SHA256SUMS.txt",
  ];
  const packageBefore = new Map(packageNames.map((name) => [name, fs.readFileSync(path.join(f.root, f.delivery, name))]));
  const script = String.raw`
import importlib.util
from pathlib import Path
module_path = ${JSON.stringify(path.join(f.root, "deliveries/G7/preparation/tools/assemble-evidence.py"))}
spec = importlib.util.spec_from_file_location("assembler", module_path)
module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
root = Path(${JSON.stringify(f.temp)}) / "injected-write-interruption"
root.mkdir()
commands = root / "commands-and-exit-codes.md"
omissions = root / "inventory-omissions.json"
checksums = root / "SHA256SUMS.txt"
completion = root / "evidence/inventory-completed.json"
outputs = [(commands, b"commands"), (completion, b"completion"), (omissions, b"omissions"), (checksums, b"checksums")]
written = []
def interrupt_before_completion(target, content):
    written.append(target.name)
    if target == completion:
        raise OSError("injected interruption before final completion receipt")
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("xb") as stream: stream.write(content)
try: module.write_preflighted_outputs(outputs, completion, interrupt_before_completion)
except OSError as error: assert "injected interruption before final completion receipt" in str(error), error
else: raise AssertionError("injected final receipt interruption did not occur")
assert written == ["commands-and-exit-codes.md", "inventory-omissions.json", "SHA256SUMS.txt", "inventory-completed.json"], written
assert commands.read_bytes() == b"commands" and omissions.read_bytes() == b"omissions" and checksums.read_bytes() == b"checksums"
assert not completion.exists(), "interrupted writer left a completion claim"
try: module.write_preflighted_outputs(outputs, completion)
except FileExistsError: pass
else: raise AssertionError("interrupted output set was resumed or overwritten")
assert not completion.exists()
print("PASS injected interruption occurs at the last write; no completion receipt or in-place resume")
`;
  const interrupted = spawnSync("python", ["-B", "-c", script], { cwd: f.root, encoding: "utf8", windowsHide: true });
  assert.equal(interrupted.status, 0, `${interrupted.stdout}${interrupted.stderr}`);
  assert.match(interrupted.stdout, /PASS injected interruption occurs at the last write/);
  assert.equal(fs.existsSync(path.join(f.root, f.delivery, "evidence/inventory-completed.json")), false);
  for (const [name, bytes] of packageBefore)
    assert.deepEqual(fs.readFileSync(path.join(f.root, f.delivery, name)), bytes, `package output changed: ${name}`);
});

test("partial completion receipt blocks final inventory before any output write", async (t) => {
  const f = packageFixture(t);
  const packaged = f.runPackage();
  assert.equal(packaged.status, 0, packaged.stdout + packaged.stderr);
  const packageNames = [
    "package-commands-and-exit-codes.md", "package-inventory-omissions.json", "package-SHA256SUMS.txt",
  ];
  const packageHashes = new Map(packageNames.map((name) => [name, hash(fs.readFileSync(path.join(f.root, f.delivery, name)))]));
  const receiptPath = path.join(f.root, f.delivery, "evidence/inventory-completed.json");
  const interruptedBytes = Buffer.from("{\"phase\":\"inventory\",\"status\":\"STARTED\"}\n");
  fs.writeFileSync(receiptPath, interruptedBytes);

  const result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Output case-aliases an existing portable inventory path|Output already exists/);
  assert.deepEqual(fs.readFileSync(receiptPath), interruptedBytes);
  for (const name of ["commands-and-exit-codes.md", "inventory-omissions.json", "SHA256SUMS.txt"])
    assert.equal(fs.existsSync(path.join(f.root, f.delivery, name)), false, `partial final output appeared: ${name}`);
  for (const [name, expected] of packageHashes)
    assert.equal(hash(fs.readFileSync(path.join(f.root, f.delivery, name))), expected, `package output changed: ${name}`);
});

test("empty or source-mismatched execution inventory fails before writing outputs", async (t) => {
  const f = fixture(t);
  const log = path.join(f.evidenceDir, "execution.jsonl");
  fs.writeFileSync(log, JSON.stringify({ ...f.execution, sourceCommit: "a".repeat(40) }) + "\n");
  const result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /empty or contains no records matching sourceCommit/);
  for (const name of ["commands-and-exit-codes.md", "inventory-omissions.json", "SHA256SUMS.txt"]) {
    assert.equal(fs.existsSync(path.join(f.root, f.delivery, name)), false, "unexpected output " + name);
  }
});

test("assembler refuses to overwrite prior root-level R7 reports", async (t) => {
  const f = fixture(t);
  const prior = [
    "deliveries/G7/rc6-candidate-r7/release-composition.json",
    "deliveries/G7/rc6-candidate-r7/gltf-validation-receipt.json",
  ];
  const expected = new Map();
  for (const name of prior) {
    const bytes = Buffer.from(`preserved prior artifact: ${name}\n`);
    const target = path.join(f.root, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
    expected.set(target, bytes);
  }
  const script = `
import importlib.util
from pathlib import Path
module_path = ${JSON.stringify(path.join(f.root, "deliveries/G7/preparation/tools/assemble-evidence.py"))}
spec = importlib.util.spec_from_file_location("assembler", module_path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
root = Path(${JSON.stringify(f.root)})
for name in ${JSON.stringify(prior)}:
    try:
        module.safe_repo_path(root, name, output=True)
    except ValueError as error:
        assert "Preserved release proof cannot be written" in str(error), error
    else:
        raise AssertionError("prior artifact output accepted: " + name)
`;
  const result = spawnSync("python", ["-B", "-c", script], { encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  for (const [target, bytes] of expected) assert.deepEqual(fs.readFileSync(target), bytes);
  assert.equal(fs.existsSync(path.join(f.root, f.delivery, "SHA256SUMS.txt")), false);
});

test("preserved roots and junction aliases reject before any write", async (t) => {
  const f = fixture(t);
  const preserved = path.join(f.root, "deliveries/G7/rc6-candidate-r6");
  fs.mkdirSync(preserved, { recursive: true });
  const sentinel = path.join(preserved, "sentinel.txt");
  fs.writeFileSync(sentinel, "preserve accepted proof\n");
  f.policy.deliveryRoot = "deliveries/G7/rc6-candidate-r6";
  fs.writeFileSync(path.join(f.root, "scripts/release/rc6-policy.json"), JSON.stringify(f.policy, null, 2) + "\n");
  let result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /accepted delivery roots/);
  assert.equal(fs.readFileSync(sentinel, "utf8"), "preserve accepted proof\n");

  const alias = path.join(f.root, "deliveries/G7/fixture-alias-r7");
  fs.symlinkSync(preserved, alias, process.platform === "win32" ? "junction" : "dir");
  f.policy.deliveryRoot = "deliveries/G7/fixture-alias-r7";
  fs.writeFileSync(path.join(f.root, "scripts/release/rc6-policy.json"), JSON.stringify(f.policy, null, 2) + "\n");
  result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Filesystem alias|accepted delivery roots/);
  assert.equal(fs.readFileSync(sentinel, "utf8"), "preserve accepted proof\n");
});

test("hard-linked writer destinations are rejected before the first output", async (t) => {
  const f = fixture(t);
  const sentinel = path.join(f.temp, "sentinel.txt");
  const output = path.join(f.root, f.delivery, "commands-and-exit-codes.md");
  fs.writeFileSync(sentinel, "hardlink sentinel\n");
  fs.linkSync(sentinel, output);
  const result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Hard-linked (?:release output|file) is forbidden/);
  assert.equal(fs.readFileSync(sentinel, "utf8"), "hardlink sentinel\n");
  assert.equal(fs.existsSync(path.join(f.root, f.delivery, "inventory-omissions.json")), false);
  assert.equal(fs.existsSync(path.join(f.root, f.delivery, "SHA256SUMS.txt")), false);
});

test("input/output collisions preserve the existing input and all other outputs", async (t) => {
  const f = fixture(t);
  const outputName = f.delivery + "/commands-and-exit-codes.md";
  const bytes = Buffer.from("input that collides with generated output\n");
  fs.writeFileSync(path.join(f.root, outputName), bytes);
  const log = path.join(f.evidenceDir, "execution.jsonl");
  const collision = { ...f.execution, evidencePath: outputName, evidenceSha256: hash(bytes) };
  fs.writeFileSync(log, JSON.stringify(collision) + "\n");
  const result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Output already exists|collides with an input|Output case-aliases an existing portable inventory path/);
  assert.deepEqual(fs.readFileSync(path.join(f.root, outputName)), bytes);
  assert.equal(fs.existsSync(path.join(f.root, f.delivery, "inventory-omissions.json")), false);
  assert.equal(fs.existsSync(path.join(f.root, f.delivery, "SHA256SUMS.txt")), false);
});
