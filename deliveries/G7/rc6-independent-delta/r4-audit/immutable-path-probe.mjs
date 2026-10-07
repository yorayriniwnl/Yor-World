// Independent guard-only probe. Never writes to any accepted output.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { assertMutableOutput, ROOT, sha256 } from "../../../../scripts/release/release-lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = process.argv[2];
if (!/^[a-f0-9]{40}$/.test(source ?? "")) throw new Error("An exact source commit is required");
const committed = execFileSync("git", ["show", source + ":scripts/release/release-lib.mjs"], { cwd: ROOT });
const current = fs.readFileSync(path.join(ROOT, "scripts/release/release-lib.mjs"));
if (current.toString().replace(/\r\n/g, "\n") !== committed.toString()) throw new Error("Current guard differs from frozen source");
const acceptedFiles = [
  "deliveries/G7/rc6-candidate-r3/release-manifest.json",
  "deliveries/G7/rc6-candidate/release-manifest.json",
  "deliveries/G7/rc6-candidate-r2/release-manifest.json",
  "deliveries/G6/rc5-candidate/release-manifest.json",
  "docs/releases/v1.0.0-rc5.md",
  "docs/planning/reviews/2026-10-06-g6-r1.md",
  "docs/planning/reviews/2026-10-06-rc5-independent-full-stack-audit.md",
];
const before = Object.fromEntries(acceptedFiles.map(name => [name, sha256(fs.readFileSync(path.join(ROOT, name)))]));
const probes = [
  ...acceptedFiles,
  "Deliveries/G7/RC6-CANDIDATE-R3/new/output.json",
  "Deliveries/G7/RC6-CANDIDATE/new/output.json",
  "Deliveries/G7/RC6-CANDIDATE-R2/new/output.json",
  "Deliveries/G6/rc5-candidate/release-manifest.json",
  "Docs/releases/v1.0.0-rc5.md",
  "Docs/planning/reviews/2026-10-06-g6-r1.md",
  "DELIVERIES/G6/RC5-CANDIDATE/new/nonexistent/output.json",
  "docs/planning/reviews/2026-10-06-g6-r1/new/nonexistent/output.json",
];
const results = probes.map(name => {
  try { assertMutableOutput(name); return { path: name, observed: "ALLOWED" }; }
  catch (error) { return { path: name, observed: "REJECTED", message: error.message }; }
});
const after = Object.fromEntries(acceptedFiles.map(name => [name, sha256(fs.readFileSync(path.join(ROOT, name)))]));
const noAcceptedChanges = JSON.stringify(before) === JSON.stringify(after);
const receipt = { measuredAt: new Date().toISOString(), source, platform: process.platform,
  command: "node deliveries/G7/rc6-independent-delta/r4-audit/immutable-path-probe.mjs " + source,
  writesToAcceptedOutputs: false, results, beforeHashes: before, afterHashes: after, noAcceptedChanges,
  overallStatus: noAcceptedChanges && results.every(result => result.observed === "REJECTED") ? "PASS" : "FAIL" };
fs.writeFileSync(path.join(here, "immutable-path-probe.json"), JSON.stringify(receipt, null, 2) + "\n");
console.log(JSON.stringify(receipt, null, 2));
if (receipt.overallStatus !== "PASS") process.exitCode = 1;
