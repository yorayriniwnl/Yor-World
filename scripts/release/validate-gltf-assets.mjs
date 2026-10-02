#!/usr/bin/env node
/**
 * YOR WORLD — Khronos glTF Asset Validator for Release Candidate
 * 
 * Executes Khronos glTF-Validator against every release-bound GLB binary.
 * Enforces zero validator errors; records warnings separately per project policy.
 * 
 * Usage:
 *   node scripts/release/validate-gltf-assets.mjs [--output <path>]
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

let validator;
const candidateValidatorPaths = [
  path.resolve(process.cwd(), "deliveries/C3/source/node_modules/gltf-validator"),
  "gltf-validator",
  "C:/Users/yoray/AppData/Local/Temp/yor-w2-r2-bd64528b2b4e4470ba732b54db7e00f7/node_modules/gltf-validator",
];

for (const p of candidateValidatorPaths) {
  try {
    validator = require(p);
    break;
  } catch {
    // continue searching
  }
}

if (!validator) {
  console.error("[FATAL] Could not resolve 'gltf-validator' module. Please ensure dependencies are installed.");
  process.exit(1);
}

const RELEASE_ASSET_TARGETS = [
  "deliveries/production-environment/runtime/production-room-full.glb",
  "deliveries/production-environment/runtime/group-a-essential.glb",
  "deliveries/production-environment/runtime/group-b-props.glb",
  "deliveries/production-environment/runtime/on-demand-projects.glb",
  "deliveries/production-environment/runtime/mobile-room-lod.glb",
  "deliveries/B4/resident-production.glb",
  "deliveries/B4/fixture-production.glb",
  "deliveries/interaction-assets/runtime/interaction-assets.glb",
  "deliveries/interaction-assets/runtime/interaction-assets-mobile.glb",
  "deliveries/C3/source/public/models/interaction-assets.glb",
  "deliveries/C3/source/public/models/interaction-assets-mobile.glb",
  "deliveries/C3/source/public/models/workstation-sample.glb",
  "deliveries/C3/source/public/models/room-blockout.glb",
  "deliveries/C3/source/public/models/avatar-proof.glb",
  "deliveries/C3/source/public/models/fixture-proof.glb",
];

async function runAssetValidation() {
  console.log("\n======================================================");
  console.log("  YOR WORLD — 3D GLTF/GLB ASSET VALIDATION (G6 REWORK)");
  console.log(`  Validator:   Khronos glTF-Validator v${validator.version()}`);
  console.log(`  Timestamp:   ${new Date().toISOString()}`);
  console.log(`  Total Assets: ${RELEASE_ASSET_TARGETS.length}`);
  console.log("======================================================\n");

  const results = [];
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const relPath of RELEASE_ASSET_TARGETS) {
    const absPath = path.resolve(process.cwd(), relPath);
    if (!fs.existsSync(absPath)) {
      console.error(`[FAIL] Asset file not found: ${relPath}`);
      totalErrors++;
      results.push({
        path: relPath,
        status: "MISSING",
        errors: 1,
        warnings: 0,
        messages: ["File does not exist on disk."],
      });
      continue;
    }

    const bytes = fs.readFileSync(absPath);
    if (bytes.length === 0) {
      console.error(`[FAIL] Asset file is empty (0 bytes): ${relPath}`);
      totalErrors++;
      results.push({
        path: relPath,
        status: "EMPTY",
        errors: 1,
        warnings: 0,
        messages: ["File size is 0 bytes."],
      });
      continue;
    }

    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    const validation = await validator.validateBytes(new Uint8Array(bytes), {
      uri: path.basename(relPath),
      maxIssues: 500,
    });

    const issues = validation.issues || {};
    const numErrors = issues.numErrors || 0;
    const numWarnings = issues.numWarnings || 0;
    const numInfos = issues.numInfos || 0;

    totalErrors += numErrors;
    totalWarnings += numWarnings;

    const pass = numErrors === 0;
    const statusText = pass ? "PASS" : "FAIL";
    console.log(
      `  [${statusText}] ${relPath.padEnd(65)} | ${String(bytes.length).padStart(8)} B | ${sha256.slice(0, 8)} | Err: ${numErrors} | Warn: ${numWarnings} | Info: ${numInfos}`
    );

    if (numErrors > 0) {
      const errorMessages = (issues.messages || []).filter((m) => m.severity === 0);
      for (const msg of errorMessages.slice(0, 5)) {
        console.error(`         -> ERROR [${msg.code}]: ${msg.message} (${msg.pointer || ""})`);
      }
    }

    results.push({
      path: relPath,
      sha256,
      bytes: bytes.length,
      status: statusText,
      numErrors,
      numWarnings,
      numInfos,
      warningsSummary: (issues.messages || [])
        .filter((m) => m.severity === 1)
        .slice(0, 5)
        .map((m) => `[${m.code}] ${m.message}`),
    });
  }

  const receipt = {
    tool: "Khronos glTF-Validator",
    version: validator.version(),
    validatedAt: new Date().toISOString(),
    overallStatus: totalErrors === 0 ? "PASS" : "FAIL",
    totalAssetsValidated: RELEASE_ASSET_TARGETS.length,
    totalErrors,
    totalWarnings,
    assets: results,
  };

  const receiptDir = path.resolve(process.cwd(), "deliveries/C4");
  if (fs.existsSync(receiptDir)) {
    const receiptPath = path.join(receiptDir, "gltf-validation-receipt.json");
    fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2), "utf-8");
    console.log(`\nValidation receipt written to: ${receiptPath}`);
  }

  console.log("\n------------------------------------------------------");
  console.log(`Summary: ${results.length} Validated | ${totalErrors} Errors | ${totalWarnings} Warnings`);
  console.log("------------------------------------------------------\n");

  if (totalErrors > 0) {
    console.error(`[ASSET VALIDATION FAILED] Found ${totalErrors} error(s) in release-bound GLB assets.`);
    process.exit(1);
  }

  console.log("[ASSET VALIDATION PASSED] All release-bound GLB assets satisfy Khronos glTF specifications.");
  process.exit(0);
}

runAssetValidation().catch((err) => {
  console.error("[FATAL] Validation script execution error:", err);
  process.exit(1);
});
