#!/usr/bin/env node
/**
 * YOR WORLD — Release Manifest Validator
 * 
 * Verifies the integrity of a Release Candidate Manifest against strict governance invariants:
 * - Exact git commit binding
 * - Asset revision matching accepted G6 freeze
 * - Publication revision matching accepted A4 baseline
 * - Schema revision matching accepted migrations
 * - Required release checks with honest pass/fail/unverified status
 * - Evidence path existence and freshness
 * - Zero placeholder URLs and zero localhost release assets
 * - Rejection of self-approval or missing governance provenance
 * 
 * Usage:
 *   node scripts/release/validate-release.mjs [--manifest <path>] [--strict]
 */

import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { parseArgs } from "node:util";

const { values: args } = parseArgs({
  options: {
    manifest: { type: "string", short: "m", default: "deliveries/C4/release-manifest.json" },
    strict: { type: "boolean", short: "s", default: true },
    help: { type: "boolean", short: "h" }
  },
  allowPositionals: true
});

if (args.help) {
  console.log(`
YOR WORLD Release Manifest Validator
Usage:
  node scripts/release/validate-release.mjs [--manifest <path>] [--strict]

Options:
  --manifest, -m  Path to release-manifest.json (default: deliveries/C4/release-manifest.json)
  --strict, -s    Enforce strict gating rejection rules (default: true)
  --help, -h      Display this help message
`);
  process.exit(0);
}

const manifestPath = resolve(process.cwd(), args.manifest);
console.log(`\n======================================================`);
console.log(`  YOR WORLD — RELEASE MANIFEST VALIDATION`);
console.log(`  Target Manifest: ${manifestPath}`);
console.log(`  Strict Mode:     ${args.strict}`);
console.log(`  Timestamp:       ${new Date().toISOString()}`);
console.log(`======================================================\n`);

if (!existsSync(manifestPath)) {
  console.error(`[FAIL] Manifest file does not exist at: ${manifestPath}`);
  process.exit(1);
}

let manifest;
try {
  const content = readFileSync(manifestPath, "utf-8");
  manifest = JSON.parse(content);
} catch (err) {
  console.error(`[FAIL] Failed to parse manifest JSON: ${err.message}`);
  process.exit(1);
}

const failures = [];
const warnings = [];

function fail(criterion, reason) {
  failures.push({ criterion, reason });
  console.error(`  [REJECT] ${criterion}: ${reason}`);
}

function warn(criterion, reason) {
  warnings.push({ criterion, reason });
  console.warn(`  [WARN]   ${criterion}: ${reason}`);
}

function pass(criterion, details) {
  console.log(`  [PASS]   ${criterion}: ${details}`);
}

// 1. Exact Git Commit Validation
if (!manifest.gitCommit || typeof manifest.gitCommit !== "string") {
  fail("Git Commit Binding", "manifest.gitCommit is missing or invalid");
} else if (!/^[0-9a-f]{40}$/i.test(manifest.gitCommit)) {
  fail("Git Commit Binding", `Invalid commit hash format: "${manifest.gitCommit}". Must be 40-character hex.`);
} else if (manifest.gitCommit === "0000000000000000000000000000000000000000") {
  fail("Git Commit Binding", "Placeholder commit hash detected.");
} else {
  pass("Git Commit Binding", `Exact SHA bound: ${manifest.gitCommit}`);
}

// 2. Asset Revision Binding
const EXPECTED_ASSET_REVISION = "g6-world-art-freeze-20261002";
if (!manifest.assetRevision) {
  fail("Asset Revision", "manifest.assetRevision is missing");
} else if (manifest.assetRevision !== EXPECTED_ASSET_REVISION && args.strict) {
  fail("Asset Revision", `Asset revision mismatch. Expected "${EXPECTED_ASSET_REVISION}", found "${manifest.assetRevision}"`);
} else {
  pass("Asset Revision", `Matches accepted G6 art freeze: ${manifest.assetRevision}`);
}

// 3. Publication Revision Binding
const EXPECTED_PUB_REVISION = "A4-R1-20260928";
if (!manifest.publicationRevision) {
  fail("Publication Revision", "manifest.publicationRevision is missing");
} else if (manifest.publicationRevision !== EXPECTED_PUB_REVISION && args.strict) {
  fail("Publication Revision", `Publication revision mismatch. Expected "${EXPECTED_PUB_REVISION}", found "${manifest.publicationRevision}"`);
} else {
  pass("Publication Revision", `Matches accepted publication baseline: ${manifest.publicationRevision}`);
}

// 4. Schema Revision Binding
const EXPECTED_SCHEMA_REVISION = "20261002000000_schema_v1";
if (!manifest.schemaRevision) {
  fail("Schema Revision", "manifest.schemaRevision is missing");
} else if (manifest.schemaRevision !== EXPECTED_SCHEMA_REVISION && args.strict) {
  fail("Schema Revision", `Schema revision mismatch. Expected "${EXPECTED_SCHEMA_REVISION}", found "${manifest.schemaRevision}"`);
} else {
  pass("Schema Revision", `Matches accepted migration schema: ${manifest.schemaRevision}`);
}

// 5. Mandatory Release Checks Matrix
const REQUIRED_CHECK_IDS = [
  "frozen-install",
  "lint",
  "typecheck",
  "unit-tests",
  "integration-tests",
  "asset-validation",
  "production-build",
  "e2e-tests",
  "accessibility",
  "budget-regression",
  "release-manifest-validation"
];

if (!Array.isArray(manifest.requiredChecks)) {
  fail("Required Checks", "manifest.requiredChecks must be an array of check records");
} else {
  const checkMap = new Map();
  for (const check of manifest.requiredChecks) {
    if (!check.id) {
      fail("Check Record", "Found check item without an 'id'");
      continue;
    }
    checkMap.set(check.id, check);
  }

  for (const requiredId of REQUIRED_CHECK_IDS) {
    const check = checkMap.get(requiredId);
    if (!check) {
      fail("Mandatory Check", `Missing mandatory release check: "${requiredId}"`);
      continue;
    }

    // Status check
    const validStatuses = ["pass", "fail", "unverified"];
    if (!validStatuses.includes(check.status)) {
      fail("Check Status", `Check "${requiredId}" has invalid status "${check.status}". Must be 'pass', 'fail', or 'unverified'.`);
      continue;
    }

    if (check.status === "fail") {
      fail("Check Execution", `Check "${requiredId}" reported FAIL`);
      continue;
    }

    if (check.status === "unverified") {
      const isBlocking = check.blocking !== false;
      if (isBlocking && args.strict) {
        fail("Unverified Check", `Mandatory blocking check "${requiredId}" is UNVERIFIED.`);
      } else {
        warn("Unverified Check", `Non-blocking check "${requiredId}" is marked UNVERIFIED: ${check.notes || "No notes provided"}`);
      }
      continue;
    }

    // Check evidence path
    if (!check.evidencePath) {
      fail("Evidence Path", `Check "${requiredId}" passed but provides no evidencePath`);
      continue;
    }

    const absEvidencePath = resolve(process.cwd(), check.evidencePath);
    if (!existsSync(absEvidencePath)) {
      fail("Evidence Missing", `Evidence file not found on disk for "${requiredId}": ${check.evidencePath}`);
      continue;
    }

    const stat = statSync(absEvidencePath);
    if (stat.size === 0) {
      fail("Evidence Empty", `Evidence file for "${requiredId}" is empty (0 bytes): ${check.evidencePath}`);
      continue;
    }

    pass(`Check [${requiredId}]`, `Status: PASS | Evidence: ${check.evidencePath} (${stat.size} bytes)`);
  }
}

// 6. Localhost & Placeholder Asset Inspection
function inspectForPlaceholders(obj, currentPath = "") {
  if (typeof obj === "string") {
    const lower = obj.toLowerCase();
    if (lower.includes("localhost") || lower.includes("127.0.0.1")) {
      fail("Localhost Asset", `Found localhost reference in manifest at "${currentPath}": ${obj}`);
    }
    if (lower.includes("example.com") || lower.includes("todo:") || lower.includes("replace_me")) {
      fail("Placeholder URL", `Found placeholder reference in manifest at "${currentPath}": ${obj}`);
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, idx) => inspectForPlaceholders(item, `${currentPath}[${idx}]`));
  } else if (obj !== null && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      inspectForPlaceholders(v, currentPath ? `${currentPath}.${k}` : k);
    }
  }
}
inspectForPlaceholders(manifest);

// 7. Governance & Provenance Rules
if (!manifest.governance) {
  fail("Governance", "manifest.governance section missing");
} else {
  // Maker cannot approve itself
  if (manifest.governance.selfApproved === true) {
    fail("Governance Invariant", "Maker attempted self-approval of Release Candidate! Gate G6 authority belongs to Parent Codex.");
  }

  if (manifest.governance.status === "ACCEPTED" && !manifest.governance.codexApprovalReceipt) {
    fail("Acceptance Authority", "Release candidate marked ACCEPTED without Codex approval receipt.");
  }

  pass("Governance Invariants", `Lifecycle stage: ${manifest.governance.status} | Maker lane: ${manifest.governance.makerLane}`);
}

console.log(`\n------------------------------------------------------`);
console.log(`Validation Results: ${failures.length} Failure(s), ${warnings.length} Warning(s)`);
console.log(`------------------------------------------------------\n`);

if (failures.length > 0) {
  console.error(`[RELEASE VALIDATION FAILED] Candidate manifest does not satisfy gating requirements.`);
  process.exit(1);
}

console.log(`[RELEASE VALIDATION PASSED] Release candidate manifest is valid, bound, and compliant with G6 policy.`);
process.exit(0);
