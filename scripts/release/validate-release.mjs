#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { inspectComposition } from "./check-release-composition.mjs";
import { verifyBrowserReport } from "./verify-playwright-results.mjs";
import { verifyActiveBenchmark } from "./verify-active-benchmark.mjs";
import { assertNoFileCollision, assertPolicyOutput, assertPolicyOutputs, buildBundle, git, normalized, policy, readJson, safePath, sha256, writeJson } from "./release-lib.mjs";

const failures = [];
function requireThat(condition, reason) { if (!condition) failures.push(reason); }
try {
  const { values } = parseArgs({ options: { manifest: { type: "string", short: "m", default: policy.deliveryRoot + "/release-manifest.json" }, strict: { type: "boolean", short: "s", default: true }, receipt: { type: "string", short: "r", default: policy.deliveryRoot + "/release-manifest-validation.receipt.json" } } });
  assertPolicyOutputs();
  assertPolicyOutput(values.manifest);
  assertPolicyOutput(values.receipt);
  // These inputs are read independently of manifest bindings. Protect them even
  // when a malformed manifest omits its mandatory evidence declarations.
  const fixedInputSuffixes = new Set([
    "source-binding.json", "release-composition.json", "bundle-receipt.json",
    ...policy.requiredEvidencePaths,
    "evidence/e2e/browser-results.json", "evidence/accessibility/browser-results.json",
    "evidence/performance/performance-results.json",
    ...["active-route-frame-pacing.json", "cold-loads-desktop-1440x900.json",
      "cold-loads-mobile-390x844.json", "cold-loads-narrow-320x600.json",
      "enter-exit-stability.json", "public-payloads.json"].map((name) => "evidence/performance/" + name),
  ]);
  const inputPaths = [values.manifest, policy.bundle.path,
    ...[...fixedInputSuffixes].map((suffix) => policy.deliveryRoot + "/" + suffix)];
  assertNoFileCollision(values.receipt, inputPaths, "Validation receipt must not overwrite its inputs");
  const manifestBytes = fs.readFileSync(safePath(values.manifest));
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  inputPaths.push(
    manifest.sourceBinding?.path, manifest.composition?.path,
    ...(manifest.evidenceHashes || []).map((item) => item.path),
    ...(manifest.requiredChecks || []).filter((item) => item.id !== "release-manifest-validation").map((item) => item.evidencePath));
  assertNoFileCollision(values.receipt, inputPaths, "Validation receipt must not overwrite its inputs");
  for (const key of ["releaseId", "assetRevision", "publicationRevision", "schemaRevision", "contactAmendment", "canonicalApplicationRoot"]) requireThat(manifest[key] === policy[key], `${key} must equal ${policy[key]}`);
  if (manifest.releaseBundlePath !== policy.bundle.path) throw new Error("releaseBundlePath must identify the current canonical archive");
  requireThat(manifest.gitCommit === undefined || manifest.gitCommit === manifest.sourceCommit, "gitCommit conflicts with sourceCommit");
  const bundle = buildBundle(manifest.sourceCommit); // Requires ancestor, unchanged committed implementation, and matching worktree.
  const sourceAppTree = git("rev-parse", manifest.sourceCommit + ":" + policy.canonicalApplicationRoot);
  requireThat(manifest.sourceAppTree === sourceAppTree, "sourceAppTree must equal the exact sourceCommit application tree");
  const actualArchive = fs.readFileSync(safePath(manifest.releaseBundlePath));
  requireThat(actualArchive.equals(bundle.archive), "Archive is not the deterministic bundle of sourceCommit canonical application files");
  requireThat(manifest.releaseBundleSha256 === bundle.sha256 && sha256(actualArchive) === bundle.sha256, "Release bundle SHA-256 mismatch");
  requireThat(manifest.bundleMetadata?.fileCount === bundle.fileCount && manifest.bundleMetadata?.bytes === bundle.bytes, "Bundle file count/byte metadata mismatch");
  const bundleNames = new Set(bundle.files.map((item) => item.path));
  for (const name of ["package.json", "pnpm-lock.yaml", ".env.example", "supabase/migrations/20261001000000_a3_owner_auth_rls.sql", "supabase/migrations/20261001000001_a4_publication_media.sql", "supabase/migrations/20261005000000_github_refresh_state.sql", "supabase/operations/harden-publication-grants.sql"]) requireThat(bundleNames.has(policy.canonicalApplicationRoot + "/" + name), `Required deployable bundle file absent: ${name}`);
  for (const [key, value] of Object.entries(policy.candidateGovernance)) {
    requireThat(manifest.governance?.[key] === value, `Candidate governance must preserve ${key}=${JSON.stringify(value)}`);
  }
  requireThat(policy.candidateGovernance.status === "candidate" && policy.candidateGovernance.selfApproved === false,
    "Maker policy must not self-accept the successor candidate");
  const manifestHash = sha256(normalized(manifestBytes));
  const hashFile = (name, expected, mode = "raw") => {
    requireThat(/^[a-f0-9]{64}$/.test(expected || "") && !/^0+$/.test(expected || ""), `Invalid mandatory SHA-256: ${name}`);
    requireThat(["raw", "lf"].includes(mode), `Unknown hash mode for ${name}`);
    const bytes = fs.readFileSync(safePath(name));
    requireThat(bytes.length > 0, `Empty evidence: ${name}`);
    const computed = sha256(mode === "lf" ? normalized(bytes) : bytes);
    requireThat(computed === expected, `Evidence hash mismatch: ${name}`);
    return computed;
  };
  requireThat(Array.isArray(manifest.requiredChecks), "requiredChecks must be an array");
  const checks = manifest.requiredChecks || [];
  requireThat(checks.length === policy.requiredChecks.length && checks.every((check) => policy.requiredChecks.includes(check.id)), "Required check inventory must match current policy exactly");
  requireThat(new Set(checks.map((check) => check.id)).size === checks.length, "Duplicate required check IDs are forbidden");
  const hashes = [];
  for (const id of policy.requiredChecks) {
    const check = checks.find((item) => item.id === id);
    if (!check) { failures.push(`Missing required check: ${id}`); continue; }
    requireThat(check.status === "pass" && check.blocking === true && check.verificationCategory === "AUTOMATED PASS", `Required check must be blocking automated PASS: ${id}`);
    requireThat(check.sourceCommit === manifest.sourceCommit, `Required check must bind exact candidate sourceCommit: ${id}`);
    requireThat(typeof check.evidencePath === "string" && check.evidencePath.startsWith(policy.deliveryRoot + "/"), `Fresh check evidence must live in current delivery: ${id}`);
    requireThat(check.evidencePath !== values.manifest && check.evidencePath !== manifest.releaseBundlePath, `Circular check evidence: ${id}`);
    if (id === "release-manifest-validation") {
      requireThat(check.evidencePath === policy.deliveryRoot + "/release-manifest-validation.receipt.json", "Manifest validation must identify the detached current receipt");
      requireThat(check.evidenceSha256 === undefined, "Detached receipt must not be hashed inside its own input manifest (circular hash)");
      continue;
    }
    hashes.push({ id, path: check.evidencePath, sha256: hashFile(check.evidencePath, check.evidenceSha256, check.evidenceHashMode || "raw") });
  }
  requireThat(Array.isArray(manifest.evidenceHashes), "evidenceHashes must bind all required current candidate evidence");
  const supplemental = manifest.evidenceHashes || [];
  requireThat(new Set(supplemental.map((item) => item.path)).size === supplemental.length, "Duplicate supplemental evidence paths are forbidden");
  for (const item of supplemental) {
    requireThat(typeof item.path === "string" && item.path.startsWith(policy.deliveryRoot + "/"), `Supplemental evidence must live in current delivery: ${item.path}`);
    requireThat(item.path !== values.manifest && item.path !== policy.deliveryRoot + "/release-manifest-validation.receipt.json", `Circular supplemental evidence: ${item.path}`);
    hashFile(item.path, item.sha256, item.hashMode || "raw");
  }
  for (const suffix of policy.requiredEvidencePaths) {
    requireThat(supplemental.some((item) => item.path === policy.deliveryRoot + "/" + suffix), `Missing mandatory candidate evidence hash: ${suffix}`);
  }
  const sourceBindingPath = policy.deliveryRoot + "/source-binding.json";
  requireThat(manifest.sourceBinding?.path === sourceBindingPath, "Manifest must bind canonical source-binding.json");
  hashFile(manifest.sourceBinding?.path, manifest.sourceBinding?.sha256, manifest.sourceBinding?.hashMode || "raw");
  const sourceBindingEvidence = supplemental.find((item) => item.path === sourceBindingPath);
  requireThat(sourceBindingEvidence?.sha256 === manifest.sourceBinding.sha256
    && (sourceBindingEvidence?.hashMode || "raw") === (manifest.sourceBinding.hashMode || "raw"), "Source binding must use the same hash in both manifest bindings");
  const sourceBinding = readJson(sourceBindingPath);
  for (const key of ["releaseId", "sourceCommit", "sourceAppTree", "canonicalApplicationRoot", "assetRevision", "publicationRevision", "schemaRevision", "contactAmendment", "releaseBundlePath", "releaseBundleSha256"]) {
    requireThat(sourceBinding[key] === manifest[key], `Source binding conflicts with manifest: ${key}`);
  }
  const bundleReceipt = readJson(policy.deliveryRoot + "/bundle-receipt.json");
  requireThat(bundleReceipt.releaseId === policy.releaseId && bundleReceipt.sourceCommit === manifest.sourceCommit
    && bundleReceipt.sourceAppTree === sourceAppTree && bundleReceipt.canonicalApplicationRoot === policy.canonicalApplicationRoot
    && bundleReceipt.archivePath === manifest.releaseBundlePath && bundleReceipt.sha256 === bundle.sha256
    && bundleReceipt.fileCount === bundle.fileCount && bundleReceipt.bytes === bundle.bytes
    && JSON.stringify(bundleReceipt.files) === JSON.stringify(bundle.files), "Bundle receipt must bind the exact regenerated source archive");
  for (const [directory, filename, count] of [["e2e", "browser-results.json", policy.expectedBrowserChecks.e2e], ["accessibility", "browser-results.json", policy.expectedBrowserChecks.accessibility], ["performance", "performance-results.json", policy.expectedBrowserChecks.performance]]) {
    verifyBrowserReport(readJson(policy.deliveryRoot + "/evidence/" + directory + "/" + filename), count);
  }
  requireThat(manifest.composition?.path === policy.deliveryRoot + "/release-composition.json", "Manifest must bind canonical current composition report");
  hashFile(manifest.composition?.path, manifest.composition?.sha256, manifest.composition?.hashMode || "raw");
  const recordedComposition = readJson(manifest.composition.path);
  const pacing = readJson(policy.deliveryRoot + "/evidence/performance/active-route-frame-pacing.json");
  verifyActiveBenchmark(pacing);
  for (const filename of ["active-route-frame-pacing.json", "cold-loads-desktop-1440x900.json", "cold-loads-mobile-390x844.json", "cold-loads-narrow-320x600.json", "enter-exit-stability.json", "public-payloads.json"]) {
    const report = readJson(policy.deliveryRoot + "/evidence/performance/" + filename);
    requireThat(report.canonicalApplicationRoot === policy.canonicalApplicationRoot && report.buildId === recordedComposition.buildId, `Performance report must bind the recorded candidate production build: ${filename}`);
  }
  const freshComposition = inspectComposition();
  requireThat(freshComposition.overallStatus === "PASS" && recordedComposition.overallStatus === "PASS", "Production composition did not pass");
  for (const key of ["releaseId", "canonicalApplicationRoot", "routes", "runtimeEntrypoints", "contactAmendment", "contactModules", "actualAssetUrls", "assets", "modules"]) {
    requireThat(JSON.stringify(recordedComposition[key]) === JSON.stringify(freshComposition[key]), `Recorded composition differs from actual production build/source: ${key}`);
  }
  const compositionEvidence = checks.find((check) => check.id === "release-composition");
  requireThat(compositionEvidence?.evidencePath === manifest.composition.path && compositionEvidence?.evidenceSha256 === manifest.composition.sha256, "Composition check must hash the same report as composition binding");
  for (const asset of freshComposition.assets) requireThat(bundleNames.has(asset.path), `Production asset absent from archive: ${asset.path}`);
  for (const module of freshComposition.modules) requireThat(bundleNames.has(module.path), `Actual production module absent from archive: ${module.path}`);
  const receipt = { checkId: "release-manifest-validation", validatorVersion: "5.0.0-rc6-full-stack", releaseId: policy.releaseId, sourceCommit: manifest.sourceCommit, sourceAppTree, verifiedHead: git("rev-parse", "HEAD"), canonicalApplicationRoot: policy.canonicalApplicationRoot, manifestPath: values.manifest, manifestSha256: manifestHash, manifestHashMode: "lf", releaseBundleSha256: bundle.sha256, fileCount: bundle.fileCount, archiveBytes: bundle.bytes, requiredChecksVerified: hashes, detachedReceiptRule: "Output receipt hashes the final input manifest; input manifest names the output receipt without hashing it. This receipt records automated validation, not independent audit or gate acceptance.", overallStatus: failures.length ? "FAIL" : "PASS", failures };
  writeJson(values.receipt, receipt);
  console.log(`${receipt.overallStatus} ${policy.releaseId} manifest: ${hashes.length} hashed checks, ${bundle.fileCount} archived files, source ${manifest.sourceCommit}`);
  if (failures.length) { console.error(failures.join("\n")); process.exitCode = 1; }
} catch (error) { console.error(`FAIL ${policy.releaseId} manifest validation: ${error.message}`); process.exitCode = 1; }
