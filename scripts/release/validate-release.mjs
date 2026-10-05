#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { inspectComposition } from "./check-release-composition.mjs";
import { buildBundle, git, normalized, policy, readJson, safePath, sha256, writeJson } from "./release-lib.mjs";

const failures = [];
function requireThat(condition, reason) { if (!condition) failures.push(reason); }
try {
  const { values } = parseArgs({ options: { manifest: { type: "string", short: "m", default: policy.deliveryRoot + "/release-manifest.json" }, strict: { type: "boolean", short: "s", default: true }, receipt: { type: "string", short: "r", default: policy.deliveryRoot + "/release-manifest-validation.receipt.json" } } });
  const manifestBytes = fs.readFileSync(safePath(values.manifest));
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  for (const key of ["releaseId", "assetRevision", "publicationRevision", "schemaRevision", "contactAmendment", "canonicalApplicationRoot"]) requireThat(manifest[key] === policy[key], `${key} must equal ${policy[key]}`);
  requireThat(manifest.releaseBundlePath === policy.bundle.path, "releaseBundlePath must identify the RC4 canonical archive");
  requireThat(manifest.gitCommit === undefined || manifest.gitCommit === manifest.sourceCommit, "gitCommit conflicts with sourceCommit");
  const bundle = buildBundle(manifest.sourceCommit); // Requires ancestor, unchanged committed implementation, and matching worktree.
  const actualArchive = fs.readFileSync(safePath(manifest.releaseBundlePath));
  requireThat(actualArchive.equals(bundle.archive), "Archive is not the deterministic bundle of sourceCommit canonical application files");
  requireThat(manifest.releaseBundleSha256 === bundle.sha256 && sha256(actualArchive) === bundle.sha256, "Release bundle SHA-256 mismatch");
  requireThat(manifest.bundleMetadata?.fileCount === bundle.fileCount && manifest.bundleMetadata?.bytes === bundle.bytes, "Bundle file count/byte metadata mismatch");
  const bundleNames = new Set(bundle.files.map((item) => item.path));
  for (const name of ["package.json", "pnpm-lock.yaml", ".env.example", "supabase/migrations/20261001000000_a3_owner_auth_rls.sql", "supabase/migrations/20261001000001_a4_publication_media.sql", "supabase/migrations/20261005000000_github_refresh_state.sql", "supabase/operations/harden-publication-grants.sql"]) requireThat(bundleNames.has(policy.canonicalApplicationRoot + "/" + name), `Required deployable bundle file absent: ${name}`);
  requireThat(manifest.governance?.status === "candidate" && manifest.governance?.selfApproved === false && manifest.governance?.g7Status === "LOCKED", "RC4 must remain candidate, selfApproved false, and G7 LOCKED");
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
  requireThat(checks.length === policy.requiredChecks.length && checks.every((check) => policy.requiredChecks.includes(check.id)), "Required check inventory must match RC4 policy exactly");
  requireThat(new Set(checks.map((check) => check.id)).size === checks.length, "Duplicate required check IDs are forbidden");
  const hashes = [];
  for (const id of policy.requiredChecks) {
    const check = checks.find((item) => item.id === id);
    if (!check) { failures.push(`Missing required check: ${id}`); continue; }
    requireThat(check.status === "pass" && check.blocking === true && check.verificationCategory === "AUTOMATED PASS", `Required check must be blocking automated PASS: ${id}`);
    requireThat(check.sourceCommit === manifest.sourceCommit, `Required check must bind exact candidate sourceCommit: ${id}`);
    requireThat(typeof check.evidencePath === "string" && check.evidencePath.startsWith(policy.deliveryRoot + "/"), `Fresh check evidence must live in RC4 delivery: ${id}`);
    requireThat(check.evidencePath !== values.manifest && check.evidencePath !== manifest.releaseBundlePath, `Circular check evidence: ${id}`);
    if (id === "release-manifest-validation") {
      requireThat(check.evidencePath === policy.deliveryRoot + "/release-manifest-validation.receipt.json", "Manifest validation must identify detached RC4 receipt");
      requireThat(check.evidenceSha256 === undefined, "Detached receipt must not be hashed inside its own input manifest (circular hash)");
      continue;
    }
    hashes.push({ id, path: check.evidencePath, sha256: hashFile(check.evidencePath, check.evidenceSha256, check.evidenceHashMode || "raw") });
  }
  for (const item of manifest.evidenceHashes || []) {
    requireThat(item.path !== values.manifest && item.path !== policy.deliveryRoot + "/release-manifest-validation.receipt.json", `Circular supplemental evidence: ${item.path}`);
    hashFile(item.path, item.sha256, item.hashMode || "raw");
  }
  requireThat(manifest.composition?.path === policy.deliveryRoot + "/release-composition.json", "Manifest must bind canonical RC4 composition report");
  hashFile(manifest.composition?.path, manifest.composition?.sha256, manifest.composition?.hashMode || "raw");
  const recordedComposition = readJson(manifest.composition.path);
  const freshComposition = inspectComposition();
  requireThat(freshComposition.overallStatus === "PASS" && recordedComposition.overallStatus === "PASS", "Production composition did not pass");
  for (const key of ["releaseId", "canonicalApplicationRoot", "routes", "contactAmendment", "contactModules", "actualAssetUrls", "assets", "modules"]) {
    requireThat(JSON.stringify(recordedComposition[key]) === JSON.stringify(freshComposition[key]), `Recorded composition differs from actual production build/source: ${key}`);
  }
  const compositionEvidence = checks.find((check) => check.id === "release-composition");
  requireThat(compositionEvidence?.evidencePath === manifest.composition.path && compositionEvidence?.evidenceSha256 === manifest.composition.sha256, "Composition check must hash the same report as composition binding");
  for (const asset of freshComposition.assets) requireThat(bundleNames.has(asset.path), `Production asset absent from archive: ${asset.path}`);
  for (const module of freshComposition.modules) requireThat(bundleNames.has(module.path), `Actual production module absent from archive: ${module.path}`);
  const receipt = { checkId: "release-manifest-validation", validatorVersion: "3.0.0-full-stack", releaseId: policy.releaseId, sourceCommit: manifest.sourceCommit, verifiedHead: git("rev-parse", "HEAD"), canonicalApplicationRoot: policy.canonicalApplicationRoot, manifestPath: values.manifest, manifestSha256: manifestHash, manifestHashMode: "lf", releaseBundleSha256: bundle.sha256, fileCount: bundle.fileCount, archiveBytes: bundle.bytes, requiredChecksVerified: hashes, detachedReceiptRule: "Output receipt hashes the final input manifest; input manifest names the output receipt without hashing it. This receipt records automated validation, not independent audit or gate acceptance.", overallStatus: failures.length ? "FAIL" : "PASS", failures };
  writeJson(values.receipt, receipt);
  console.log(`${receipt.overallStatus} RC4 manifest: ${hashes.length} hashed checks, ${bundle.fileCount} archived files, source ${manifest.sourceCommit}`);
  if (failures.length) { console.error(failures.join("\n")); process.exitCode = 1; }
} catch (error) { console.error(`FAIL RC4 manifest validation: ${error.message}`); process.exitCode = 1; }
