import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { ROOT, policy, sha256, normalized } from "../release-lib.mjs";

test("current-status CLI rejects fabricated, rejected and changed source acceptance bindings", async (t) => {
  const parent = fs.realpathSync.native(os.tmpdir());
  const temporary = fs.mkdtempSync(path.join(parent, "yor-status-binding-"));
  t.after(() => {
    const resolved = fs.realpathSync.native(temporary);
    assert.equal(path.dirname(resolved), parent);
    assert.ok(path.basename(resolved).startsWith("yor-status-binding-"));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  const root = path.join(temporary, "repo");
  const cloned = spawnSync("git", ["clone", "--shared", "--no-checkout", "--quiet", ROOT, root], { encoding: "utf8", windowsHide: true });
  assert.equal(cloned.status, 0, cloned.stderr);
  const copy = (name) => {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.copyFileSync(path.join(ROOT, name), path.join(root, name));
  };
  const write = (name, value) => {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), JSON.stringify(value));
  };
  const read = (name) => JSON.parse(fs.readFileSync(path.join(ROOT, name), "utf8"));
  const status = read("docs/planning/current-status.json");
  status.acceptedSourcePredecessor.rulingId = "RC6-R1";
  const pred = status.acceptedSourcePredecessor;
  const ruling = read(pred.rulingDecisionPath);
  for (const name of ["scripts/release/check-current-status.mjs", "scripts/release/release-lib.mjs", "scripts/release/rc6-policy.json", "app/package.json",
    "README.md", "START_HERE.md", "docs/planning/delegation-and-work-orders.md", "deliveries/G7/preparation/owner-authorization.json",
    status.acceptedBaseline.rulingDecisionPath, pred.rulingDecisionPath, ruling.releaseBundlePath,
    `${pred.evidenceRoot}/release-manifest.json`, ...["independentAuditor", "majorGateAdvice", "hostedEvidence"].map((key) => ruling[key].path)]) copy(name);
  const reset = () => {
    write("docs/planning/current-status.json", status);
    write(pred.rulingDecisionPath, ruling);
    copy(ruling.releaseBundlePath);
    copy(`${pred.evidenceRoot}/release-manifest.json`);
    copy(ruling.independentAuditor.path);
    write("scripts/release/rc6-policy.json", policy);
  };
  const run = () => spawnSync("node", ["scripts/release/check-current-status.mjs"], { cwd: root, encoding: "utf8", windowsHide: true });
  const cases = [
    ["legitimate pending source", () => {}, true],
    ["original false current accepted claim", () => write("docs/planning/current-status.json", { ...status, currentCandidate: { ...status.currentCandidate, acceptance: "ACCEPTED" } }), false],
    ["original false predecessor accepted claim", () => write("docs/planning/current-status.json", { ...status, acceptedSourcePredecessor: { ...pred, sourceCommit: "f".repeat(40) } }), false],
    ["NOT ACCEPTED ruling string", () => write(pred.rulingDecisionPath, { ...ruling, ruling: "RC6 SOURCE NOT ACCEPTED" }), false],
    ["rejected acceptance disposition", () => write(pred.rulingDecisionPath, { ...ruling, acceptance: "REJECTED" }), false],
    ["wrong Parent authority", () => write(pred.rulingDecisionPath, { ...ruling, authority: "Maker" }), false],
    ["wrong status ruling ID", () => write("docs/planning/current-status.json", { ...status, acceptedSourcePredecessor: { ...pred, rulingId: "RC6-R2" } }), false],
    ["matching fabricated commit and ruling", () => { write("docs/planning/current-status.json", { ...status, acceptedSourcePredecessor: { ...pred, sourceCommit: "f".repeat(40) } }); write(pred.rulingDecisionPath, { ...ruling, sourceCommit: "f".repeat(40) }); }, false],
    ["matching fabricated app tree", () => { write("docs/planning/current-status.json", { ...status, acceptedSourcePredecessor: { ...pred, sourceAppTree: "f".repeat(40) } }); write(pred.rulingDecisionPath, { ...ruling, sourceAppTree: "f".repeat(40) }); }, false],
    ["changed actual archive bytes", () => fs.appendFileSync(path.join(root, ruling.releaseBundlePath), "changed"), false],
    ["changed actual manifest bytes", () => fs.appendFileSync(path.join(root, pred.evidenceRoot, "release-manifest.json"), " "), false],
    ["changed actual independent audit bytes", () => fs.appendFileSync(path.join(root, ruling.independentAuditor.path), "changed"), false],
    ["missing major-gate reference", () => write(pred.rulingDecisionPath, { ...ruling, majorGateAdvice: null }), false],
    ["null identities cannot agree into acceptance", () => {
      const identities = { sourceCommit: null, sourceAppTree: null, releaseBundleSha256: null, manifestSha256: null };
      write("docs/planning/current-status.json", { ...status, acceptedSourcePredecessor: { ...pred, ...identities } });
      write(pred.rulingDecisionPath, { ...ruling, ...identities });
    }, false],
    ["R1 cannot accept the changed R7 current candidate", () => write("docs/planning/current-status.json", { ...status, currentCandidate: { ...pred, evidenceRoot: policy.deliveryRoot } }), false],
    ["noncanonical ruling location", () => {
      write("scratch/fabricated/decision.json", ruling);
      write("docs/planning/current-status.json", { ...status, acceptedSourcePredecessor: { ...pred, rulingDecisionPath: "scratch/fabricated/decision.json" } });
    }, false],
  ];
  for (const [name, mutation, accepted] of cases) await t.test(name, () => {
    reset(); mutation();
    const result = run();
    assert.equal(result.status, accepted ? 0 : 1, `${result.stdout}${result.stderr}`);
    assert.match(result.stdout, accepted ? /^PASS current status/ : /^FAIL current status/);
  });

  await t.test("structurally valid R2 fixture passes; stale policy identities fail", () => {
    reset();
    const evidenceRoot = policy.deliveryRoot;
    const decisionPath = "docs/planning/reviews/2026-10-09-rc6-r2/decision.json";
    const decision = { ...ruling, rulingId: "RC6-R2", releaseBundlePath: `${evidenceRoot}/yor-world-v1.0.0-rc6.bundle.tar.gz` };
    const manifest = { ...read(`${pred.evidenceRoot}/release-manifest.json`), releaseBundlePath: decision.releaseBundlePath };
    write(`${evidenceRoot}/release-manifest.json`, manifest);
    decision.manifestSha256 = sha256(normalized(fs.readFileSync(path.join(root, evidenceRoot, "release-manifest.json"))));
    fs.copyFileSync(path.join(ROOT, ruling.releaseBundlePath), path.join(root, decision.releaseBundlePath));
    write(decisionPath, decision);
    write("scripts/release/rc6-policy.json", { ...policy, assetRevision: decision.assetRevision, schemaRevision: decision.schemaRevision });
    write("docs/planning/current-status.json", { ...status, currentCandidate: { ...pred, rulingId: "RC6-R2", rulingDecisionPath: decisionPath, evidenceRoot, manifestSha256: decision.manifestSha256 } });
    let result = run();
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
    write("scripts/release/rc6-policy.json", policy);
    result = run();
    assert.equal(result.status, 1, `${result.stdout}${result.stderr}`);
    assert.match(result.stderr, /active policy/);
  });
});
