#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { parseArgs } from "node:util";
import { assetFiles, policy, safePath, writeJson } from "./release-lib.mjs";

try {
  const { values } = parseArgs({ options: { output: { type: "string", default: policy.deliveryRoot + "/gltf-validation-receipt.json" } } });
  const require = createRequire(path.join(safePath(policy.canonicalApplicationRoot), "package.json"));
  const validator = require("gltf-validator");
  const results = [];
  for (const asset of assetFiles()) {
    const report = await validator.validateBytes(new Uint8Array(fs.readFileSync(safePath(asset.path))), { uri: path.basename(asset.path), maxIssues: 500 });
    const { numErrors, numWarnings, numInfos, messages } = report.issues;
    results.push({ path: asset.path, sha256: asset.sha256, bytes: asset.bytes, numErrors, numWarnings, numInfos, status: numErrors ? "FAIL" : "PASS", messages });
    console.log(`${numErrors ? "FAIL" : "PASS"} ${asset.path}: ${numErrors} errors, ${numWarnings} warnings`);
  }
  const totalErrors = results.reduce((sum, item) => sum + item.numErrors, 0);
  writeJson(values.output, { checkId: "asset-validation", canonicalApplicationRoot: policy.canonicalApplicationRoot, assetRevision: policy.assetRevision, tool: "Khronos glTF-Validator", version: validator.version(), overallStatus: totalErrors ? "FAIL" : "PASS", totalAssetsValidated: results.length, totalErrors, totalWarnings: results.reduce((sum, item) => sum + item.numWarnings, 0), assets: results });
  if (totalErrors) process.exitCode = 1;
} catch (error) { console.error(`FAIL canonical asset validation: ${error.message}`); process.exitCode = 1; }
