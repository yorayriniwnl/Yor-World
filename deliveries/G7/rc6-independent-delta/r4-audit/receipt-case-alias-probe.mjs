// Execute frozen production builder code only in an isolated labelled Git fixture.
// No actual candidate/history input is modified.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../../..");
const SOURCE = "30240b672ae31537d8090b11b60f8bf808a27670";
const hash = value => crypto.createHash("sha256").update(value).digest("hex");
const sourceBytes = name => execFileSync("git", ["show", SOURCE + ":" + name], { cwd: ROOT });
const tmpParent = fs.realpathSync.native(os.tmpdir());
const scratch = fs.mkdtempSync(path.join(tmpParent, "yor-r4-input-alias-"));
const fixture = path.join(scratch, "repo");
const release = path.join(fixture, "scripts/release");
fs.mkdirSync(release, { recursive: true });
const inputs = [];
for (const name of ["scripts/release/release-lib.mjs", "scripts/release/build-release-bundle.mjs", "scripts/release/rc6-policy.json"]) {
  const bytes = sourceBytes(name);
  inputs.push({ path: name, frozenSourceSha256: hash(bytes) });
  fs.writeFileSync(path.join(fixture, name), bytes);
}
fs.mkdirSync(path.join(fixture, "app"));
fs.writeFileSync(path.join(fixture, "app", "NOT-LIVE-AUDIT-FIXTURE.txt"), "Synthetic isolated Git source. No production/browser/service execution.\n");
const git = (...args) => execFileSync("git", args, { cwd: fixture, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
git("init");
git("config", "core.autocrlf", "false");
git("config", "user.name", "Independent audit fixture");
git("config", "user.email", "audit-fixture@example.invalid");
git("add", "app", "scripts/release");
git("commit", "-m", "Labelled isolated case-alias fixture; not candidate evidence");
const fixtureCommit = git("rev-parse", "HEAD");
const policy = JSON.parse(fs.readFileSync(path.join(release, "rc6-policy.json"), "utf8"));
const canonical = policy.bundle.path;
const alias = path.posix.dirname(canonical) + "/" + path.posix.basename(canonical).toUpperCase();
const command = ["scripts/release/build-release-bundle.mjs", "--source-commit", fixtureCommit, "--receipt", alias];
const executed = spawnSync("node", command, { cwd: fixture, encoding: "utf8", windowsHide: true });
const canonicalFile = path.join(fixture, canonical);
const aliasFile = path.join(fixture, alias);
const actual = fs.existsSync(canonicalFile) ? fs.readFileSync(canonicalFile) : null;
let overwrittenByReceipt = false;
let parsed = null;
try { parsed = JSON.parse(actual.toString("utf8")); overwrittenByReceipt = parsed.archivePath === canonical && parsed.sourceCommit === fixtureCommit; }
catch {}
const sameFilesystemTarget = fs.existsSync(canonicalFile) && fs.existsSync(aliasFile)
  && fs.realpathSync.native(canonicalFile).toLowerCase() === fs.realpathSync.native(aliasFile).toLowerCase();
const confirmed = process.platform === "win32" && executed.status === 0 && sameFilesystemTarget
  && overwrittenByReceipt && parsed.sha256 !== hash(actual);
const receipt = { measuredAt: new Date().toISOString(), source: SOURCE, platform: process.platform,
  executionClass: "Own production CLI execution in a labelled temporary Git fixture; no actual candidate/history writes",
  fixturePath: fixture, fixtureCommit, frozenInputs: inputs, command: ["node", ...command],
  cwd: fixture, exitCode: executed.status, stdout: executed.stdout, stderr: executed.stderr,
  canonicalOutput: canonical, receiptCaseAlias: alias, sameFilesystemTarget,
  canonicalArchiveOverwrittenByJsonReceipt: overwrittenByReceipt,
  actualCanonicalFileSha256: actual ? hash(actual) : null,
  receiptDeclaredArchiveSha256: parsed?.sha256 ?? null,
  preservedOrCandidateWrites: false, confirmedDefect: confirmed,
  reproductionStatus: confirmed ? "PASS" : "NOT REPRODUCED",
  limits: "Default candidate-driver receipts use distinct canonical filenames and strict final archive validation would reject this corruption; no accepted history or silent release acceptance demonstrated" };
fs.writeFileSync(path.join(HERE, "receipt-case-alias-probe.json"), JSON.stringify(receipt, null, 2) + "\n");
fs.writeFileSync(path.join(HERE, "receipt-case-alias-probe.log"), executed.stdout + "\n--- STDERR ---\n" + executed.stderr);
console.log(JSON.stringify(receipt, null, 2));
// Verify the precise temporary root before any recursive cleanup.
const resolved = fs.realpathSync.native(scratch);
const relative = path.relative(tmpParent, resolved);
if (resolved !== scratch || !relative.startsWith("yor-r4-input-alias-") || relative.includes(path.sep)) throw new Error("Unsafe fixture cleanup target");
fs.rmSync(resolved, { recursive: true, force: true });
if (!confirmed) process.exitCode = 1;
