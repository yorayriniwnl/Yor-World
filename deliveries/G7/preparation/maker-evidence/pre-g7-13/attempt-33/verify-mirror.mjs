import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, "yorayriniwnl.in/source-delivery-manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const baseline = JSON.parse(execFileSync("git", ["show", "HEAD:yorayriniwnl.in/source-delivery-manifest.json"], { cwd: root, encoding: "utf8" }));
const updatedPaths = new Set([
  "app/src/features/world/CameraDirector.ts",
  "app/src/features/world/ProductionLighting.ts",
  "app/src/features/world/ReferenceComposition.ts",
  "app/src/features/world/SceneIntegrator.ts",
  "app/src/features/world/WorldRoot.tsx",
  "app/tests/e2e/renderer-recovery.spec.ts",
  "app/tests/e2e/world-fullscreen.spec.ts",
  "app/tests/e2e/world-reference-composition.spec.ts",
  "app/tests/integration/production-camera.test.ts",
  "app/tests/integration/runtime/frozen-world-binding.test.ts",
  "app/tests/unit/camera-director.test.ts",
  "app/tests/unit/production-lighting.test.ts",
  "app/tests/unit/reference-composition.test.ts",
]);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const normalizeLf = (bytes) => Buffer.from(bytes.toString("utf8").replace(/\r\n/g, "\n"), "utf8");
const errors = [];
let rawEqual = 0;
let normalizedOnly = 0;
let updatedRawEqual = 0;
for (const section of ["sourceFiles", "testFiles"]) {
  const rows = manifest.mirror[section];
  const baselineRows = baseline.mirror[section];
  const baselineByKey = new Map(baselineRows.map((row) => [`${row.sourcePath}\n${row.domainPath}`, row]));
  for (const row of rows) {
    const source = readFileSync(path.join(root, row.sourcePath));
    const domain = readFileSync(path.join(root, "yorayriniwnl.in", row.domainPath));
    const exact = source.equals(domain);
    const normalized = normalizeLf(source).equals(normalizeLf(domain));
    if (exact) rawEqual++;
    else if (normalized) normalizedOnly++;
    if (!normalized) errors.push(`normalized parity mismatch: ${row.sourcePath}`);
    const prior = baselineByKey.get(`${row.sourcePath}\n${row.domainPath}`);
    if (!updatedPaths.has(row.sourcePath) && prior && JSON.stringify(row) !== JSON.stringify(prior)) {
      errors.push(`unchanged manifest row rewritten: ${row.sourcePath}`);
    }
    if (updatedPaths.has(row.sourcePath)) {
      if (exact) updatedRawEqual++;
      if (!exact || row.rawBytesEqual !== true || row.normalizedContentEqual !== true
        || row.sourceSha256 !== sha256(source) || row.domainSha256 !== sha256(domain)
        || row.normalizedSha256 !== sha256(normalizeLf(source))) {
        errors.push(`updated pair manifest hash/parity mismatch: ${row.sourcePath}`);
      }
    }
  }
}
if (updatedRawEqual !== updatedPaths.size) errors.push(`updated pairs raw equal ${updatedRawEqual}/${updatedPaths.size}`);

const override = manifest.mirror.domainOverride;
const overrideBytes = readFileSync(path.join(root, "yorayriniwnl.in", override.path));
const committedOverrideBytes = execFileSync("git", ["show", `HEAD:yorayriniwnl.in/${override.path}`], { cwd: root });
const overrideMatchesCommit = sha256(committedOverrideBytes) === override.sha256;
const overrideNormalizedPreserved = normalizeLf(overrideBytes).equals(normalizeLf(committedOverrideBytes));
if (!overrideMatchesCommit) errors.push("canonical base-URL override manifest hash differs from committed bytes");
if (!overrideNormalizedPreserved) errors.push("canonical base-URL override differs from committed content");

const out = {
  status: errors.length ? "FAIL" : "PASS",
  sourceRows: manifest.mirror.sourceFiles.length,
  testRows: manifest.mirror.testFiles.length,
  updatedPairCount: updatedPaths.size,
  updatedPairsRawEqual: updatedRawEqual,
  allRowsRawEqual: rawEqual,
  allRowsNormalizedOnly: normalizedOnly,
  unchangedManifestRowsPreserved: errors.every((error) => !error.startsWith("unchanged manifest row rewritten")),
  domainOverride: {
    path: override.path,
    canonicalUrl: override.canonicalUrl,
    worktreeRawSha256: sha256(overrideBytes),
    committedRawSha256: sha256(committedOverrideBytes),
    manifestSha256: override.sha256,
    manifestMatchesCommit: overrideMatchesCommit,
    normalizedContentPreserved: overrideNormalizedPreserved,
  },
  errors,
};
process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
if (errors.length) process.exitCode = 1;
