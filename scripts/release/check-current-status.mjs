#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { policy, readJson, sha256 } from "./release-lib.mjs";

export function inspectCurrentStatus() {
  const status = readJson("docs/planning/current-status.json");
  const ruling = readJson(status.acceptedBaseline.rulingDecisionPath);
  const authorization = readJson("deliveries/G7/preparation/owner-authorization.json");
  const pkg = readJson("app/package.json");
  const failures = [];
  const requireThat = (condition, reason) => { if (!condition) failures.push(reason); };
  requireThat(ruling.ruling === "G6 ACCEPTED" && ruling.rulingId === status.acceptedBaseline.rulingId,
    "Accepted baseline must identify an actual independent-review Parent G6 ruling");
  for (const key of ["releaseId", "sourceCommit", "sourceAppTree", "releaseBundleSha256"]) {
    requireThat(status.acceptedBaseline[key] === ruling[key], `Accepted baseline differs from immutable ruling: ${key}`);
  }
  requireThat(status.currentCandidate.releaseId === policy.releaseId && pkg.version === policy.releaseId.replace(/^v/, ""),
    "Current candidate, release policy and application package version must agree");
  requireThat(authorization.deploymentAuthorized === true && authorization.acceptanceClaim === false
    && authorization.authorizationId === status.g7.ownerAuthorizationId,
  "Production preparation requires actual owner authorization; authorization does not accept G7");
  const publicState = `Current candidate: ${policy.releaseId}`;
  for (const name of ["README.md", "START_HERE.md", "docs/planning/delegation-and-work-orders.md"]) {
    const text = fs.readFileSync(new URL("../../" + name, import.meta.url), "utf8");
    for (const token of [publicState, status.acceptedBaseline.rulingId, status.g7.status, status.g7.ownerAuthorizationId]) {
      requireThat(text.includes(token), `${name} is missing current status: ${token}`);
    }
  }
  if (status.g7.acceptance === "ACCEPTED") {
    requireThat(status.currentCandidate.acceptance === "ACCEPTED" && typeof status.g7.rulingDecisionPath === "string"
      && /^https:\/\//.test(status.g7.productionOrigin || ""), "Completed G7 requires an accepted successor, actual HTTPS origin and separate ruling");
    if (status.g7.rulingDecisionPath) {
      const g7 = readJson(status.g7.rulingDecisionPath);
      requireThat(g7.ruling === "G7 ACCEPTED" && g7.ownerAuthorizationId === authorization.authorizationId,
        "G7 status cannot substitute for an actual Parent G7 ruling");
    }
  }
  return { overallStatus: failures.length ? "FAIL" : "PASS", failures,
    acceptedBaseline: status.acceptedBaseline.rulingId, currentCandidate: status.currentCandidate.releaseId,
    g7Status: status.g7.status, ownerAuthorizationId: authorization.authorizationId,
    currentStatusSha256: sha256(fs.readFileSync(new URL("../../docs/planning/current-status.json", import.meta.url))) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = inspectCurrentStatus();
    console.log(`${result.overallStatus} current status: ${result.currentCandidate}; accepted baseline ${result.acceptedBaseline}; G7 ${result.g7Status}`);
    if (result.failures.length) { console.error(result.failures.join("\n")); process.exitCode = 1; }
  } catch (error) { console.error(`FAIL current status: ${error.message}`); process.exitCode = 1; }
}
