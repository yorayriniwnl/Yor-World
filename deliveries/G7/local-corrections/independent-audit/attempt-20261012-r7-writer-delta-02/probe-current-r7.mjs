import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const audit = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(audit, "../../../../..");
const work = path.join(audit, ".work", "r7-writer-delta-02");
fs.mkdirSync(work, { recursive: false });
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const run = (program, args, cwd) => spawnSync(program, args, { cwd, encoding: "utf8", windowsHide: true });
const probes = {};

const { reserveAttempt } = await import(pathToFileURL(path.join(root, "deliveries/G7/preparation/tools/reserve-attempt.mjs")).href);
probes.missingAncestors = [];
const parentParts = ["deliveries", "G7", "evidence"];
for (let firstMissing = 0; firstMissing < parentParts.length; firstMissing += 1) {
  const fixture = path.join(work, `reserve-first-missing-${firstMissing}`);
  fs.mkdirSync(fixture);
  for (let index = 0; index < firstMissing; index += 1) fs.mkdirSync(path.join(fixture, ...parentParts.slice(0, index + 1)), { recursive: true });
  const reservation = reserveAttempt(fixture, "deliveries/G7/evidence/attempt.json");
  reservation.writeArtifact("probe.txt", Buffer.from(`case ${firstMissing}\n`));
  reservation.writeReceipt({ status: "PASS", firstMissing });
  const wrongParent = path.join(fixture, "evidence");
  const expectedParent = path.join(fixture, ...parentParts);
  probes.missingAncestors.push({
    firstMissingIndex: firstMissing,
    expectedParentCreated: fs.statSync(expectedParent).isDirectory(),
    receiptCreated: fs.statSync(reservation.output).isFile(),
    rawArtifactCreated: fs.statSync(path.join(reservation.artifactDir, "probe.txt")).isFile(),
    wrongRootEvidenceCreated: fs.existsSync(wrongParent),
  });
}

const bundleRoot = path.join(work, "bundle-fixture");
const cloneRoot = path.join(bundleRoot, "repo");
fs.mkdirSync(bundleRoot);
const clone = run("git", ["clone", "--shared", "--no-checkout", "--quiet", root, cloneRoot], root);
if (clone.status !== 0) throw new Error(`clone failed: ${clone.stderr}`);
const releaseSource = path.join(root, "scripts/release");
const releaseTarget = path.join(cloneRoot, "scripts/release");
fs.mkdirSync(releaseTarget, { recursive: true });
for (const name of fs.readdirSync(releaseSource).filter((name) => name.endsWith(".mjs") || name === "rc6-policy.json")) {
  fs.copyFileSync(path.join(releaseSource, name), path.join(releaseTarget, name));
}
const policy = JSON.parse(fs.readFileSync(path.join(releaseSource, "rc6-policy.json"), "utf8"));
const source = run("git", ["rev-parse", "HEAD"], cloneRoot).stdout.trim();
const receiptRelative = `${policy.deliveryRoot}/bundle-receipt.json`;
const archiveRelative = policy.bundle.path;
const receipt = path.join(cloneRoot, ...receiptRelative.split("/"));
const archive = path.join(cloneRoot, ...archiveRelative.split("/"));
fs.mkdirSync(path.dirname(receipt), { recursive: true });
const originalReceipt = Buffer.from("preserve this occupied receipt\n");
fs.writeFileSync(receipt, originalReceipt, { flag: "wx" });
const build = run("node", ["scripts/release/build-release-bundle.mjs", "--source-commit", source], cloneRoot);
probes.occupiedBundleReceipt = {
  exitCode: build.status,
  stdout: build.stdout,
  stderr: build.stderr,
  sourceCommit: source,
  occupiedReceiptPreserved: sha(fs.readFileSync(receipt)) === sha(originalReceipt),
  archiveCreatedDespiteReceiptCollision: fs.existsSync(archive),
  archiveBytes: fs.existsSync(archive) ? fs.statSync(archive).size : 0,
};

const assemblerTest = fs.readFileSync(path.join(root, "scripts/release/tests/assemble-evidence.test.mjs"), "utf8");
const start = assemblerTest.indexOf("function fixture(t)");
const end = assemblerTest.indexOf("\ntest(", start);
if (start < 0 || end <= start) throw new Error("could not extract isolated assembler fixture");
const fixtureFactory = new Function("fs", "os", "path", "spawnSync", "assert", "ROOT", "hash", assemblerTest.slice(start, end) + "\nreturn fixture;")(
  fs,
  { tmpdir: () => path.join(work, "assembler-work") },
  path,
  spawnSync,
  await import("node:assert/strict").then((module) => module.default),
  root,
  sha,
);
fs.mkdirSync(path.join(work, "assembler-work"));
const fixture = fixtureFactory({ after() {} });
const firstInventory = fixture.run();
const artifactNames = ["commands-and-exit-codes.md", "inventory-omissions.json", "SHA256SUMS.txt"];
const before = Object.fromEntries(artifactNames.map((name) => [name, sha(fs.readFileSync(path.join(fixture.root, fixture.delivery, name)))]));
const secondInventory = fixture.run();
const after = Object.fromEntries(artifactNames.map((name) => [name, sha(fs.readFileSync(path.join(fixture.root, fixture.delivery, name)))]));
probes.sequentialAssembler = {
  scope: "Two actual inventory-only CLI invocations in an isolated current-source fixture; candidate-driver/package phase not executed",
  firstExitCode: firstInventory.status,
  firstStdout: firstInventory.stdout,
  firstStderr: firstInventory.stderr,
  secondExitCode: secondInventory.status,
  secondStdout: secondInventory.stdout,
  secondStderr: secondInventory.stderr,
  outputsBeforeSecond: before,
  outputsAfterSecond: after,
  earlierOutputsPreserved: JSON.stringify(before) === JSON.stringify(after),
};

probes.sourceIdentity = { head: run("git", ["rev-parse", "HEAD"], root).stdout.trim() };
fs.writeFileSync(path.join(audit, "probe-results.json"), JSON.stringify(probes, null, 2) + "\n");
console.log(JSON.stringify({
  missingAncestors: probes.missingAncestors,
  occupiedBundleReceipt: { exitCode: probes.occupiedBundleReceipt.exitCode, archiveCreatedDespiteReceiptCollision: probes.occupiedBundleReceipt.archiveCreatedDespiteReceiptCollision, occupiedReceiptPreserved: probes.occupiedBundleReceipt.occupiedReceiptPreserved, stderr: probes.occupiedBundleReceipt.stderr },
  sequentialAssembler: { firstExitCode: probes.sequentialAssembler.firstExitCode, secondExitCode: probes.sequentialAssembler.secondExitCode, earlierOutputsPreserved: probes.sequentialAssembler.earlierOutputsPreserved, stderr: probes.sequentialAssembler.secondStderr },
  sourceIdentity: probes.sourceIdentity,
}));