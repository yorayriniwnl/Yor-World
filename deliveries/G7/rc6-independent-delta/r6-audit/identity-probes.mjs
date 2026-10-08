// Own execution of exact frozen production bytes in a labelled isolated Git fixture.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { spawnSync, execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../../..");
const SOURCE = process.argv[2];
if (!/^[a-f0-9]{40}$/.test(SOURCE || "")) throw new Error("Exact frozen source required");
const hash = value => crypto.createHash("sha256").update(value).digest("hex");
const raw = name => execFileSync("git", ["show", SOURCE + ":" + name], { cwd: ROOT });
const parent = fs.realpathSync.native(os.tmpdir());
const scratch = fs.mkdtempSync(path.join(parent, "yor-r6-independent-identity-"));
const fixture = path.join(scratch, "repo");
const sourceInputs = [];
for (const name of execFileSync("git", ["ls-tree", "-r", "--name-only", SOURCE, "--", "scripts/release"], { cwd: ROOT, encoding: "utf8" }).trim().split("\n").filter(n => /\.mjs$|rc6-policy\.json$/.test(n))) {
  const bytes = raw(name);
  fs.mkdirSync(path.dirname(path.join(fixture, name)), { recursive: true });
  fs.writeFileSync(path.join(fixture, name), bytes);
  sourceInputs.push({ path: name, sourceSha256: hash(bytes) });
}
fs.mkdirSync(path.join(fixture, "app"));
fs.writeFileSync(path.join(fixture, "app/NOT-LIVE-AUDIT-FIXTURE.txt"), "Synthetic source fixture; no production/service/browser proof.\n");
const git = (...args) => execFileSync("git", args, { cwd: fixture, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
git("init"); git("config", "core.autocrlf", "false");
git("config", "user.name", "Independent audit fixture"); git("config", "user.email", "audit@example.invalid");
git("add", "app", "scripts/release"); git("commit", "-m", "Synthetic frozen-source output identity fixture");
const fixtureCommit = git("rev-parse", "HEAD");
const lib = await import(pathToFileURL(path.join(fixture, "scripts/release/release-lib.mjs")).href);
const policy = lib.policy, delivery = policy.deliveryRoot, archive = policy.bundle.path;
const manifestName = delivery + "/release-manifest.json";
const cases = [];
function execute(script, args) {
  const command = ["node", "scripts/release/" + script, ...args];
  const result = spawnSync(command[0], command.slice(1), { cwd: fixture, encoding: "utf8", windowsHide: true });
  return { command, exitCode: result.status, stdout: result.stdout, stderr: result.stderr };
}
function write(name, data) {
  fs.mkdirSync(path.dirname(path.join(fixture, name)), { recursive: true });
  fs.writeFileSync(path.join(fixture, name), data);
}
function reject(label, operation, watched = [], expected = /./) {
  const before = watched.map(name => ({ name, exists: fs.existsSync(path.join(fixture, name)), bytes: fs.existsSync(path.join(fixture, name)) ? fs.readFileSync(path.join(fixture, name)) : null }));
  let message = "", executed = null, rejected = false;
  try {
    const value = operation();
    if (value?.exitCode !== undefined) { executed = value; message = value.stderr; rejected = value.exitCode === 1; }
  } catch (error) { message = error.message; rejected = true; }
  const preservation = before.map(item => ({ path: item.name,
    beforeSha256: item.bytes ? hash(item.bytes) : null,
    afterSha256: fs.existsSync(path.join(fixture, item.name)) ? hash(fs.readFileSync(path.join(fixture, item.name))) : null,
    unchanged: item.exists === fs.existsSync(path.join(fixture, item.name)) && (!item.exists || item.bytes.equals(fs.readFileSync(path.join(fixture, item.name)))) }));
  cases.push({ label, rejected, message, executed, preservation, status: rejected && expected.test(message) && preservation.every(item => item.unchanged) ? "PASS" : "FAIL" });
}

const upperArchive = path.posix.dirname(archive) + "/" + path.posix.basename(archive).toUpperCase();
reject("builder uppercase archive receipt, absent outputs", () => execute("build-release-bundle.mjs", ["--source-commit", fixtureCommit, "--receipt", upperArchive]), [archive, delivery + "/bundle-receipt.json"], /differ|overwrite|collision|alias/i);
const canonical = execute("build-release-bundle.mjs", ["--source-commit", fixtureCommit]);
const bundleReceipt = JSON.parse(fs.readFileSync(path.join(fixture, delivery + "/bundle-receipt.json"), "utf8"));
const bundleBytes = fs.readFileSync(path.join(fixture, archive));
cases.push({ label: "canonical distinct builder outputs remain usable", executed: canonical,
  archiveSha256: hash(bundleBytes), archiveBytes: bundleBytes.length, receiptSha256: bundleReceipt.sha256,
  status: canonical.exitCode === 0 && bundleBytes[0] === 0x1f && bundleBytes[1] === 0x8b && hash(bundleBytes) === bundleReceipt.sha256 ? "PASS" : "FAIL" });
reject("builder uppercase archive receipt, existing gzip", () => execute("build-release-bundle.mjs", ["--source-commit", fixtureCommit, "--receipt", upperArchive]), [archive], /differ|overwrite|collision|alias/i);

const minimal = { sourceCommit: fixtureCommit, sourceAppTree: git("rev-parse", fixtureCommit + ":app"),
  releaseBundlePath: archive, sourceBinding: { path: delivery + "/source-binding.json" },
  composition: { path: delivery + "/release-composition.json" }, evidenceHashes: [],
  requiredChecks: [{ id: "release-manifest-validation", evidencePath: delivery + "/release-manifest-validation.receipt.json" }] };
function setupManifest(extra = {}) { write(manifestName, JSON.stringify({ ...minimal, ...extra }, null, 2) + "\n"); }
setupManifest();
const upperManifest = delivery + "/RELEASE-MANIFEST.JSON";
reject("validator uppercase manifest receipt", () => execute("validate-release.mjs", ["--strict", "--receipt", upperManifest]), [manifestName, archive], /overwrite|collision|alias/i);
reject("validator uppercase archive receipt", () => execute("validate-release.mjs", ["--strict", "--receipt", upperArchive]), [manifestName, archive], /overwrite|collision|alias/i);

const mandatory = new Set(["source-binding.json", "bundle-receipt.json", "release-composition.json", ...policy.requiredEvidencePaths]);
for (const suffix of mandatory) {
  if (suffix === "release-manifest-validation.receipt.json") continue;
  const name = delivery + "/" + suffix;
  if (name === manifestName || name === archive) continue;
  write(name, "{\"syntheticReadOnlySentinel\":true}\n"); setupManifest({ sourceBinding: undefined, composition: undefined });
  const alias = path.posix.dirname(name) + "/" + path.posix.basename(name).toUpperCase();
  reject("validator implicit mandatory read-only receipt: " + suffix, () => execute("validate-release.mjs", ["--strict", "--receipt", alias]), [name, manifestName, archive], /overwrite|collision|alias/i);
}
for (const [field, name] of [["evidenceHashes", delivery + "/extra-hash-input.json"], ["requiredChecks", delivery + "/extra-check-input.log"]]) {
  write(name, "Synthetic dynamic read-only input.\n");
  setupManifest(field === "evidenceHashes" ? { evidenceHashes: [{ path: name, sha256: hash(fs.readFileSync(path.join(fixture, name))) }] }
    : { requiredChecks: [...minimal.requiredChecks, { id: "custom-read-only-check", evidencePath: name }] });
  const alias = path.posix.dirname(name) + "/" + path.posix.basename(name).toUpperCase();
  reject("validator manifest-declared read-only receipt: " + field, () => execute("validate-release.mjs", ["--strict", "--receipt", alias]), [name, manifestName], /overwrite|collision|alias/i);
}

const protectedName = "deliveries/G7/rc6-candidate-r5/SYNTHETIC-PROTECTED-SENTINEL.json";
write(protectedName, "{\"syntheticProtectedSentinel\":true}\n");
const hardOutput = delivery + "/hardlink-output.json";
fs.linkSync(path.join(fixture, protectedName), path.join(fixture, hardOutput));
const stat = fs.statSync(path.join(fixture, hardOutput), { bigint: true });
reject("JS mutable output hard link to protected R5 sentinel", () => lib.writeJson(hardOutput, { forbidden: true }), [protectedName, hardOutput], /hard.?link|link count|multiple.*link/i);
cases.at(-1).fileId = { dev: String(stat.dev), ino: String(stat.ino), nlink: String(stat.nlink) };
cases.push({ label: "readers can inspect hard-linked input", status: lib.readJson(hardOutput).syntheticProtectedSentinel === true ? "PASS" : "FAIL" });
const hardReceipt = delivery + "/hardlink-receipt.json";
fs.linkSync(path.join(fixture, protectedName), path.join(fixture, hardReceipt));
reject("builder receipt hard link rejected before archive write", () => execute("build-release-bundle.mjs", ["--source-commit", fixtureCommit, "--receipt", hardReceipt]), [protectedName, archive, hardReceipt], /hard.?link|link count|multiple.*link/i);
fs.unlinkSync(path.join(fixture, hardReceipt));
for (const name of ["deliveries/G7/rc6-candidate-r5/new/receipt.json", "DELIVERIES/G7/RC6-CANDIDATE-R4/new/receipt.json"]) {
  reject("reserved historical output: " + name, () => lib.writeJson(name, { forbidden: true }), [protectedName], /immutable|preserved/i);
}
const junction = delivery + "/protected-alias";
fs.symlinkSync(path.join(fixture, "deliveries/G7/rc6-candidate-r5"), path.join(fixture, junction), process.platform === "win32" ? "junction" : "dir");
reject("nested junction into protected R5", () => lib.writeJson(junction + "/new/receipt.json", { forbidden: true }), [protectedName], /immutable|preserved/i);
const outside = path.join(scratch, "outside"); fs.mkdirSync(outside);
fs.symlinkSync(outside, path.join(fixture, delivery + "/outside-alias"), process.platform === "win32" ? "junction" : "dir");
reject("nested junction outside repository", () => lib.writeJson(delivery + "/outside-alias/new/receipt.json", { forbidden: true }), [], /escapes repository/i);

const result = { createdAt: new Date().toISOString(), sourceCommit: SOURCE, platform: process.platform,
  reviewer: "/root/r6_independent_audit", executionClass: "Own production CLI/library execution of frozen source in labelled synthetic isolated Git fixture",
  fixturePath: fixture, fixtureCommit, frozenSourceInputs: sourceInputs, cases,
  actualCandidateOrHistoryWrites: false, productionEvidence: false,
  overallStatus: cases.every(item => item.status === "PASS") ? "PASS" : "FAIL" };
fs.writeFileSync(path.join(HERE, "identity-probes.json"), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify({ sourceCommit: SOURCE, fixturePath: fixture, cases: cases.map(({ label, status, message }) => ({ label, status, message })), overallStatus: result.overallStatus }, null, 2));
const resolved = fs.realpathSync.native(scratch), relative = path.relative(parent, resolved);
if (resolved !== scratch || !relative.startsWith("yor-r6-independent-identity-") || relative.includes(path.sep)) throw new Error("Unsafe fixture cleanup target");
fs.rmSync(resolved, { recursive: true, force: true });
if (result.overallStatus !== "PASS") process.exitCode = 1;
