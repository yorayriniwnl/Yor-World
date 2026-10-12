import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { ROOT } from "../release-lib.mjs";

const inputs = [
  "scripts/release/check-current-status.mjs",
  "scripts/release/release-lib.mjs",
  "scripts/release/rc6-policy.json",
  "docs/planning/current-status.json",
  "docs/planning/reviews/2026-10-06-g6-r1/decision.json",
  "docs/planning/reviews/2026-10-08-rc6-r1/decision.json",
  "deliveries/G7/preparation/owner-authorization.json",
  "app/package.json",
  "README.md",
  "START_HERE.md",
  "docs/planning/delegation-and-work-orders.md",
];

function createFixture(t) {
  const tmp = fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()), "yor-status-fixture-"));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

  for (const filename of inputs) {
    const src = path.join(ROOT, filename);
    const dest = path.join(tmp, filename);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }

  const run = () => spawnSync("node", ["scripts/release/check-current-status.mjs"], { cwd: tmp, encoding: "utf8" });
  const readStatus = () => JSON.parse(fs.readFileSync(path.join(tmp, "docs/planning/current-status.json"), "utf8"));
  const writeStatus = (status) => fs.writeFileSync(path.join(tmp, "docs/planning/current-status.json"), JSON.stringify(status, null, 2) + "\n");

  return { tmp, run, readStatus, writeStatus };
}

test("check-current-status validates bindings and rejects false accepted claims", async (t) => {
  await t.test("legitimate-pending status passes verification", () => {
    const result = spawnSync("node", ["scripts/release/check-current-status.mjs"], { cwd: ROOT, encoding: "utf8" });
    assert.equal(result.status, 0, `Expected 0: ${result.stdout}${result.stderr}`);
    assert.match(result.stdout, /^PASS/);
  });

  await t.test("mixed G7 negative and positive claims are rejected", (st) => {
    const f = createFixture(st);
    const status = f.readStatus();
    status.g7.status = "G7 NOT ACCEPTED / ACCEPTED";
    status.g7.acceptance = "NOT ACCEPTED";
    f.writeStatus(status);

    const result = f.run();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /G7 visible status label must agree with its acceptance disposition/);
  });

  await t.test("false-current-accepted with nonexistent ruling or zeroed identities fails", (st) => {
    const f = createFixture(st);
    const status = f.readStatus();
    status.currentCandidate.sourceCommit = "0".repeat(40);
    status.currentCandidate.sourceAppTree = "0".repeat(40);
    status.currentCandidate.releaseBundleSha256 = "0".repeat(64);
    status.currentCandidate.manifestSha256 = "0".repeat(64);
    status.currentCandidate.acceptance = "ACCEPTED";
    status.currentCandidate.rulingDecisionPath = "docs/planning/reviews/does-not-exist/decision.json";
    f.writeStatus(status);

    const result = f.run();
    assert.equal(result.status, 1, "False current accepted claim must fail");
    assert.match(result.stderr, /ruling decision missing or invalid|Current candidate/i);
  });

  await t.test("false-predecessor-accepted with nonexistent ruling or zeroed identities fails", (st) => {
    const f = createFixture(st);
    const status = f.readStatus();
    status.acceptedSourcePredecessor.sourceCommit = "0".repeat(40);
    status.acceptedSourcePredecessor.sourceAppTree = "0".repeat(40);
    status.acceptedSourcePredecessor.releaseBundleSha256 = "0".repeat(64);
    status.acceptedSourcePredecessor.manifestSha256 = "0".repeat(64);
    status.acceptedSourcePredecessor.acceptance = "ACCEPTED";
    status.acceptedSourcePredecessor.rulingDecisionPath = "docs/planning/reviews/does-not-exist/decision.json";
    f.writeStatus(status);

    const result = f.run();
    assert.equal(result.status, 1, "False predecessor accepted claim must fail");
    assert.match(result.stderr, /ruling decision missing or invalid|Accepted predecessor/i);
  });

  await t.test("pending candidate status claiming ACCEPTED in text fails without an accepted ruling", (st) => {
    const f = createFixture(st);
    const status = f.readStatus();
    status.currentCandidate.status = "UNOFFICIALLY ACCEPTED BY MAKER";
    status.currentCandidate.acceptance = "NOT ACCEPTED";
    status.currentCandidate.rulingDecisionPath = null;
    f.writeStatus(status);

    const result = f.run();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Current candidate status label must agree with its acceptance disposition/);
  });

  await t.test("pending candidate cannot reference an accepted ruling", (st) => {
    const f = createFixture(st);
    const status = f.readStatus();
    status.currentCandidate.rulingDecisionPath = "docs/planning/reviews/2026-10-08-rc6-r1/decision.json";
    f.writeStatus(status);

    const result = f.run();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Pending current candidate must not reference an accepted ruling/);
  });
});
