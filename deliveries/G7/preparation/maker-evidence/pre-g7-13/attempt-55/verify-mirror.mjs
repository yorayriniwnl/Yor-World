import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const evidenceDir = "deliveries/G7/preparation/maker-evidence/pre-g7-13/attempt-55";
const manifestPath = path.join(root, "yorayriniwnl.in/source-delivery-manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const baseline = JSON.parse(execFileSync("git", ["show", "HEAD:yorayriniwnl.in/source-delivery-manifest.json"], { cwd: root, encoding: "utf8" }));
const targetSource = "app/src/features/world/world.module.css";
const targetDomain = "src/features/world/world.module.css";
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const normalize = (bytes) => Buffer.from(bytes.toString("utf8").replace(/\r\n/g, "\n"), "utf8");
const errors = [];
let normalizedPairCount = 0;
let rawEqualPairCount = 0;
let targetRowFound = false;

for (const section of ["sourceFiles", "testFiles"]) {
  for (const row of manifest.mirror[section]) {
    const sourceBytes = readFileSync(path.join(root, row.sourcePath));
    const domainBytes = readFileSync(path.join(root, "yorayriniwnl.in", row.domainPath));
    const sourceNormalized = normalize(sourceBytes);
    const domainNormalized = normalize(domainBytes);
    const sourceNormalizedHash = sha256(sourceNormalized);
    if (!sourceNormalized.equals(domainNormalized)) errors.push(`normalized source/domain mismatch: ${row.sourcePath}`);
    else normalizedPairCount++;
    if (sourceNormalizedHash !== row.normalizedSha256) errors.push(`manifest normalized hash mismatch: ${row.sourcePath}`);
    if (sourceBytes.equals(domainBytes)) rawEqualPairCount++;
    if (row.sourcePath === targetSource && row.domainPath === targetDomain) {
      targetRowFound = true;
      if (!sourceBytes.equals(domainBytes)) errors.push("changed world.module.css pair is not byte-identical");
      if (sha256(sourceBytes) !== row.sourceSha256 || sha256(domainBytes) !== row.domainSha256) errors.push("world.module.css raw hashes mismatch manifest");
    }
  }
}
if (!targetRowFound) errors.push("changed world.module.css row missing from manifest");

const withoutTarget = (value) => {
  const copy = JSON.parse(JSON.stringify(value));
  copy.mirror.sourceFiles = copy.mirror.sourceFiles.filter((row) => !(row.sourcePath === targetSource && row.domainPath === targetDomain));
  return copy;
};
const unchangedRowsPreserved = JSON.stringify(withoutTarget(manifest)) === JSON.stringify(withoutTarget(baseline));
if (!unchangedRowsPreserved) errors.push("manifest changed beyond world.module.css source row");

const override = manifest.mirror.domainOverride;
const baselineOverride = baseline.mirror.domainOverride;
if (JSON.stringify(override) !== JSON.stringify(baselineOverride)) errors.push("domain override manifest metadata changed");
const overridePath = path.join(root, "yorayriniwnl.in", override.path);
const overrideBytes = readFileSync(overridePath);
const overrideGitPath = `yorayriniwnl.in/${override.path}`;
const committedOverrideBytes = execFileSync("git", ["show", `HEAD:${overrideGitPath}`], { cwd: root });
const overrideRawEqualToCommittedBlob = overrideBytes.equals(committedOverrideBytes);
const overrideNormalizedPreserved = normalize(overrideBytes).equals(normalize(committedOverrideBytes));
const overrideMatchesManifestCommit = sha256(committedOverrideBytes) === override.sha256;
const overrideContainsCanonicalUrl = overrideBytes.toString("utf8").includes(override.canonicalUrl);
let overrideTrackedPathClean = false;
try {
  execFileSync("git", ["diff", "--quiet", "HEAD", "--", overrideGitPath], { cwd: root });
  overrideTrackedPathClean = true;
} catch {}
if (!overrideNormalizedPreserved) errors.push("canonical URL override content differs from committed baseline");
if (!overrideMatchesManifestCommit) errors.push("canonical URL override committed hash mismatch manifest");
if (!overrideContainsCanonicalUrl) errors.push("canonical URL override does not contain its declared URL");
if (!overrideTrackedPathClean) errors.push("canonical URL override has a tracked Git diff");

const result = {
  status: errors.length ? "FAIL" : "PASS",
  sourceRows: manifest.mirror.sourceFiles.length,
  testRows: manifest.mirror.testFiles.length,
  normalizedPairCount,
  rawEqualPairCount,
  changedPair: { sourcePath: targetSource, domainPath: targetDomain, rawEqual: targetRowFound },
  unchangedManifestRowsPreserved: unchangedRowsPreserved,
  domainOverride: {
    path: override.path,
    canonicalUrl: override.canonicalUrl,
    manifestMatchesCommit: overrideMatchesManifestCommit,
    worktreeRawEqualsCommittedBlob: overrideRawEqualToCommittedBlob,
    rawBlobHashMatchesManifest: overrideMatchesManifestCommit,
    normalizedContentPreserved: overrideNormalizedPreserved,
    trackedPathClean: overrideTrackedPathClean,
    checkoutEolConversionOnly: !overrideRawEqualToCommittedBlob && overrideNormalizedPreserved && overrideTrackedPathClean,
  },
  errors,
};
writeFileSync(path.join(root, evidenceDir, "mirror-verification.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (errors.length) process.exitCode = 1;
