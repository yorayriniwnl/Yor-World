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
  "app/tests/e2e/world-reference-composition.spec.ts",
  "app/tests/unit/camera-director.test.ts",
  "app/tests/unit/production-lighting.test.ts",
  "app/tests/unit/reference-composition.test.ts",
]);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const normalizeLf = (bytes) => Buffer.from(bytes.toString("utf8").replace(/\r\n/g, "\n"), "utf8");
const results = [];
const errors = [];
let rawEqual = 0;
let normalizedOnly = 0;
for (const section of ["sourceFiles", "testFiles"]) {
  const currentRows = manifest.mirror[section];
  const baselineRows = baseline.mirror[section];
  const baselineByKey = new Map(baselineRows.map((row) => [`${row.sourcePath}\n${row.domainPath}`, row]));
  for (const row of currentRows) {
    const source = readFileSync(path.join(root, row.sourcePath));
    const domain = readFileSync(path.join(root, "yorayriniwnl.in", row.domainPath));
    const exact = source.equals(domain);
    const normalized = normalizeLf(source).equals(normalizeLf(domain));
    if (exact) rawEqual++;
    else if (normalized) normalizedOnly++;
    if (!normalized) errors.push(`normalized mismatch: ${row.sourcePath}`);
    const prior = baselineByKey.get(`${row.sourcePath}\n${row.domainPath}`);
    if (!updatedPaths.has(row.sourcePath) && prior && JSON.stringify(row) !== JSON.stringify(prior)) {
      errors.push(`unchanged manifest row rewritten: ${row.sourcePath}`);
    }
    if (updatedPaths.has(row.sourcePath) && (!exact || row.rawBytesEqual !== true || row.normalizedContentEqual !== true || row.sourceSha256 !== sha256(source) || row.domainSha256 !== sha256(domain) || row.normalizedSha256 !== sha256(normalizeLf(source)))) {
      errors.push(`updated-row hash/parity mismatch: ${row.sourcePath}`);
    }
  }
  results.push({ section, rowCount: currentRows.length });
}
const override = manifest.mirror.domainOverride;
const overrideBytes = readFileSync(path.join(root, "yorayriniwnl.in", override.path));
const baselineOverrideBytes = execFileSync("git", ["show", `HEAD:yorayriniwnl.in/${override.path}`], { cwd: root });
const overrideBaselineMatches = sha256(baselineOverrideBytes) === override.sha256;
const overrideNormalizedMatchesBaseline = normalizeLf(overrideBytes).equals(normalizeLf(baselineOverrideBytes));
if (!overrideBaselineMatches) errors.push("canonical base-URL override manifest hash does not match committed bytes");
if (!overrideNormalizedMatchesBaseline) errors.push("canonical base-URL override normalized content differs from committed bytes");
const out = { status: errors.length ? "FAIL" : "PASS", results, updatedPairCount: updatedPaths.size, rawEqualRows: rawEqual, normalizedOnlyRows: normalizedOnly, unchangedManifestRowsPreserved: true, domainOverride: { path: override.path, canonicalUrl: override.canonicalUrl, worktreeRawSha256: sha256(overrideBytes), worktreeNormalizedSha256: sha256(normalizeLf(overrideBytes)), committedRawSha256: sha256(baselineOverrideBytes), manifestSha256: override.sha256, manifestMatchesCommittedBytes: overrideBaselineMatches, normalizedContentPreserved: overrideNormalizedMatchesBaseline }, errors };
process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
if (errors.length) process.exitCode = 1;
