// A contained hard link is not resolved by realpath. Probe only isolated sentinel files.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../../..");
const SOURCE = "30240b672ae31537d8090b11b60f8bf808a27670";
const hash = data => crypto.createHash("sha256").update(data).digest("hex");
const parent = fs.realpathSync.native(os.tmpdir());
const scratch = fs.mkdtempSync(path.join(parent, "yor-r4-hardlink-audit-"));
const fixture = path.join(scratch, "repo");
const release = path.join(fixture, "scripts/release");
fs.mkdirSync(release, { recursive: true });
const frozenInputs = [];
for (const name of ["scripts/release/release-lib.mjs", "scripts/release/rc6-policy.json"]) {
  const raw = execFileSync("git", ["show", SOURCE + ":" + name], { cwd: ROOT });
  frozenInputs.push({ path: name, frozenSourceSha256: hash(raw) });
  fs.writeFileSync(path.join(fixture, name), raw);
}
const preservedName = "deliveries/G7/rc6-candidate-r3/preserved-fixture.json";
const outputName = "deliveries/G7/rc6-candidate-r4/output-fixture.json";
const preserved = path.join(fixture, preservedName);
const output = path.join(fixture, outputName);
fs.mkdirSync(path.dirname(preserved), { recursive: true });
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(preserved, "Preserved sentinel in an isolated fixture; not actual R3 proof.\n");
fs.linkSync(preserved, output);
const before = fs.readFileSync(preserved);
const preservedStat = fs.statSync(preserved, { bigint: true });
const outputStat = fs.statSync(output, { bigint: true });
const sameFileIdentity = preservedStat.dev === outputStat.dev && preservedStat.ino === outputStat.ino;
const lib = await import(pathToFileURL(path.join(release, "release-lib.mjs")).href);
let guardResult = "REJECTED";
let errorMessage = null;
try { lib.assertPolicyOutput(outputName); guardResult = "ALLOWED"; lib.writeJson(outputName, { fixture: "Synthetic hardlink probe only" }); }
catch (error) { errorMessage = error.message; }
const after = fs.readFileSync(preserved);
const confirmed = sameFileIdentity && guardResult === "ALLOWED" && !before.equals(after);
const receipt = { measuredAt: new Date().toISOString(), source: SOURCE, platform: process.platform,
  executionClass: "Own frozen guard/writeJson execution in an isolated hard-link fixture; no actual candidate/history writes",
  fixturePath: fixture, frozenInputs, preservedName, outputName,
  preservedFileId: { dev: String(preservedStat.dev), ino: String(preservedStat.ino), nlink: String(preservedStat.nlink) },
  outputFileId: { dev: String(outputStat.dev), ino: String(outputStat.ino), nlink: String(outputStat.nlink) },
  sameFileIdentity, guardResult, errorMessage, isolatedPreservedSentinelChanged: !before.equals(after),
  beforeSha256: hash(before), afterSha256: hash(after), actualCandidateOrHistoryWrites: false,
  confirmedDefect: confirmed, reproductionStatus: confirmed ? "PASS" : "NOT REPRODUCED",
  limits: "Requires an existing filesystem hard-link alias; ordinary Git checkouts and default candidate proof do not create this alias. No real historical damage observed." };
fs.writeFileSync(path.join(HERE, "hardlink-output-probe.json"), JSON.stringify(receipt, null, 2) + "\n");
console.log(JSON.stringify(receipt, null, 2));
const resolved = fs.realpathSync.native(scratch);
const relative = path.relative(parent, resolved);
if (resolved !== scratch || !relative.startsWith("yor-r4-hardlink-audit-") || relative.includes(path.sep)) throw new Error("Unsafe fixture cleanup target");
fs.rmSync(resolved, { recursive: true, force: true });
if (!confirmed) process.exitCode = 1;
