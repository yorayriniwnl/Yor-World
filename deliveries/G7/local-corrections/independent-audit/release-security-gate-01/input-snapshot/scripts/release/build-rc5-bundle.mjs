#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { assertMutableOutput, buildBundle, git, policy, writeJson } from "./release-lib.mjs";

try {
  if (policy.releaseId !== "v1.0.0-rc5") throw new Error("Historical RC5 builder requires its original source checkout. Use build-release-bundle.mjs for the current candidate.");
  const { values } = parseArgs({ options: { "source-commit": { type: "string" }, output: { type: "string", default: policy.bundle.path }, receipt: { type: "string", default: policy.deliveryRoot + "/bundle-receipt.json" } } });
  const target = assertMutableOutput(values.output);
  assertMutableOutput(values.receipt);
  const bundle = buildBundle(values["source-commit"]);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bundle.archive);
  writeJson(values.receipt, { releaseId: policy.releaseId, sourceCommit: values["source-commit"], sourceAppTree: git("rev-parse", values["source-commit"] + ":" + policy.canonicalApplicationRoot), canonicalApplicationRoot: policy.canonicalApplicationRoot, archivePath: values.output, fileCount: bundle.fileCount, bytes: bundle.bytes, sha256: bundle.sha256, inclusionPolicy: policy.bundle.inclusionPolicy, exclusionPolicy: policy.bundle, files: bundle.files });
  console.log(`PASS deterministic ${policy.releaseId} bundle: ${bundle.fileCount} files, ${bundle.bytes} bytes, SHA-256 ${bundle.sha256}`);
} catch (error) {
  console.error(`FAIL ${policy.releaseId} bundle: ${error.message}`);
  process.exitCode = 1;
}
