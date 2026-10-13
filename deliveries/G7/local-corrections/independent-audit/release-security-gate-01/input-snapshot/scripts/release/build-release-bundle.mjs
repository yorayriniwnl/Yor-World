#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { assertNoFileCollision, assertPolicyOutput, assertPolicyOutputs, buildBundle, git, policy, writeJson } from "./release-lib.mjs";

try {
  const { values } = parseArgs({ options: { "source-commit": { type: "string" }, output: { type: "string", default: policy.bundle.path }, receipt: { type: "string", default: policy.deliveryRoot + "/bundle-receipt.json" } } });
  assertPolicyOutputs();
  if (values.output !== policy.bundle.path) throw new Error("Bundle output must equal policy.bundle.path");
  const target = assertPolicyOutput(values.output);
  assertPolicyOutput(values.receipt);
  assertNoFileCollision(values.receipt, [values.output], "Bundle and receipt outputs must differ");
  const bundle = buildBundle(values["source-commit"]);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bundle.archive);
  writeJson(values.receipt, { releaseId: policy.releaseId, sourceCommit: values["source-commit"], sourceAppTree: git("rev-parse", values["source-commit"] + ":" + policy.canonicalApplicationRoot), canonicalApplicationRoot: policy.canonicalApplicationRoot, archivePath: values.output, fileCount: bundle.fileCount, bytes: bundle.bytes, sha256: bundle.sha256, inclusionPolicy: policy.bundle.inclusionPolicy, exclusionPolicy: policy.bundle, files: bundle.files });
  console.log(`PASS deterministic ${policy.releaseId} bundle: ${bundle.fileCount} files, ${bundle.bytes} bytes, SHA-256 ${bundle.sha256}`);
} catch (error) {
  console.error(`FAIL ${policy.releaseId} bundle: ${error.message}`);
  process.exitCode = 1;
}
