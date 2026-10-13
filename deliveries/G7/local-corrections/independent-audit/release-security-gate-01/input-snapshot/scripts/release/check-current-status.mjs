#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { policy, readJson, sha256, normalized, safePath, git } from "./release-lib.mjs";

export function inspectCurrentStatus() {
  const status = readJson("docs/planning/current-status.json");
  const ruling = readJson(status.acceptedBaseline.rulingDecisionPath);
  const authorization = readJson("deliveries/G7/preparation/owner-authorization.json");
  const pkg = readJson("app/package.json");
  const failures = [];
  const requireThat = (condition, reason) => { if (!condition) failures.push(reason); };
  function verifyReference(reference, label) {
    try {
      requireThat(reference && typeof reference.path === "string" && /^[a-f0-9]{64}$/.test(reference.sha256 || "")
        && ["lf", "raw"].includes(reference.hashMode), `${label} requires an exact path, SHA-256 and hash mode`);
      if (!reference?.path) return;
      const bytes = fs.readFileSync(safePath(reference.path));
      requireThat(sha256(reference.hashMode === "lf" ? normalized(bytes) : bytes) === reference.sha256,
        `${label} bytes differ from ruling reference`);
    } catch (error) { requireThat(false, `${label} missing or invalid: ${error.message}`); }
  }
  function verifyAcceptedSource(claim, decision, label, expectedId, expectedPath, evidenceRoot) {
    requireThat(claim.rulingId === expectedId, `${label} must identify ruling ${expectedId}`);
    requireThat(claim.rulingDecisionPath === expectedPath, `${label} must use its canonical Parent ruling path`);
    requireThat(decision.rulingId === expectedId && decision.ruling === "RC6 SOURCE ACCEPTED"
      && decision.acceptance === "ACCEPTED" && decision.authority === "Parent Codex",
    `${label} requires an explicit accepted Parent source ruling`);
    requireThat(claim.evidenceRoot === evidenceRoot, `${label} evidence root differs from its assigned candidate`);
    for (const key of ["releaseId", "sourceCommit", "sourceAppTree", "releaseBundleSha256", "manifestSha256"]) {
      const shape = key === "releaseId" ? claim[key] === "v1.0.0-rc6"
        : new RegExp(`^[a-f0-9]{${key.includes("Sha256") ? 64 : 40}}$`).test(claim[key] || "");
      requireThat(shape && claim[key] === decision[key], `${label} differs from ruling or has invalid identity: ${key}`);
    }
    requireThat(decision.releaseBundlePath === `${evidenceRoot}/yor-world-v1.0.0-rc6.bundle.tar.gz`,
      `${label} bundle path differs from candidate evidence root`);
    try {
      requireThat(git("cat-file", "-t", claim.sourceCommit) === "commit"
        && git("rev-parse", `${claim.sourceCommit}:app`) === claim.sourceAppTree,
      `${label} application tree differs from actual Git source`);
      requireThat(sha256(fs.readFileSync(safePath(decision.releaseBundlePath))) === decision.releaseBundleSha256,
        `${label} archive bytes differ from ruling`);
      const manifestPath = `${evidenceRoot}/release-manifest.json`;
      verifyReference({ path: manifestPath, sha256: decision.manifestSha256, hashMode: "lf" }, `${label} manifest`);
      const manifest = readJson(manifestPath);
      for (const key of ["releaseId", "sourceCommit", "sourceAppTree", "releaseBundleSha256", "assetRevision", "schemaRevision", "publicationRevision", "contactAmendment"])
        requireThat(manifest[key] === decision[key], `${label} manifest differs from ruling: ${key}`);
    } catch (error) { requireThat(false, `${label} source/archive binding missing or invalid: ${error.message}`); }
    for (const key of ["independentAuditor", "majorGateAdvice", "hostedEvidence"]) verifyReference(decision[key], `${label} ${key}`);
  }
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
  if (status.acceptedSourcePredecessor) {
    if (status.acceptedSourcePredecessor.acceptance === "ACCEPTED") {
      requireThat(typeof status.acceptedSourcePredecessor.rulingDecisionPath === "string",
        "Accepted predecessor requires an actual ruling decision path");
      let predRuling = null;
      try {
        predRuling = readJson(status.acceptedSourcePredecessor.rulingDecisionPath);
      } catch (err) {
        requireThat(false, `Accepted predecessor ruling decision missing or invalid: ${err.message}`);
      }
      if (predRuling) verifyAcceptedSource(status.acceptedSourcePredecessor, predRuling, "Accepted predecessor", "RC6-R1",
        "docs/planning/reviews/2026-10-08-rc6-r1/decision.json", "deliveries/G7/rc6-candidate-r6");
    }
  }
  if (status.currentCandidate.acceptance === "ACCEPTED") {
    requireThat(typeof status.currentCandidate.rulingDecisionPath === "string",
      "Accepted current candidate requires an actual ruling decision path");
    let candRuling = null;
    try {
      candRuling = readJson(status.currentCandidate.rulingDecisionPath);
    } catch (err) {
      requireThat(false, `Current candidate ruling decision missing or invalid: ${err.message}`);
    }
    if (candRuling) {
      requireThat(/^docs\/planning\/reviews\/\d{4}-\d{2}-\d{2}-rc6-r2\/decision\.json$/.test(status.currentCandidate.rulingDecisionPath),
        "Current candidate must use a new canonical RC6-R2 ruling");
      verifyAcceptedSource(status.currentCandidate, candRuling, "Current candidate", "RC6-R2",
        status.currentCandidate.rulingDecisionPath, policy.deliveryRoot);
      for (const key of ["assetRevision", "schemaRevision", "publicationRevision", "contactAmendment"])
        requireThat(candRuling[key] === policy[key], `Current source ruling differs from active policy: ${key}`);
    }
  } else {
    requireThat(status.currentCandidate.rulingDecisionPath === null,
      "Pending current candidate must not reference an accepted ruling decision path");
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
