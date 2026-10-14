import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, "yorayriniwnl.in/source-delivery-manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const baseline = JSON.parse(execFileSync("git", ["show", "HEAD:yorayriniwnl.in/source-delivery-manifest.json"], { cwd: root, encoding: "utf8" }));
const changedSourcePaths = new Set([
  "app/src/features/world/ProductionLighting.ts",
  "app/src/features/world/ReferenceComposition.ts",
  "app/src/features/world/SceneIntegrator.ts",
  "app/tests/e2e/world-reference-composition.spec.ts",
  "app/tests/unit/production-lighting.test.ts",
  "app/tests/unit/reference-composition.test.ts",
]);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const normalizeLf = (bytes) => Buffer.from(bytes.toString("utf8").replace(/\r\n/g, "\n"), "utf8");
const failures = [];
let normalizedEqualCount = 0;
let changedPairsRawEqual = 0;
let unchangedManifestRowsPreserved = 0;
const total = manifest.mirror.sourceFiles.length + manifest.mirror.testFiles.length;

for (const [section, entries] of [["sourceFiles", manifest.mirror.sourceFiles], ["testFiles", manifest.mirror.testFiles]]) {
  const baselineRows = new Map(baseline.mirror[section].map((row) => [`${row.sourcePath}\n${row.domainPath}`, row]));
  for (const entry of entries) {
    const source = readFileSync(path.join(root, entry.sourcePath));
    const domain = readFileSync(path.join(root, "yorayriniwnl.in", entry.domainPath));
    const sourceSha256 = sha256(source);
    const domainSha256 = sha256(domain);
    const normalizedSource = normalizeLf(source);
    const normalizedDomain = normalizeLf(domain);
    const normalizedSha256 = sha256(normalizedSource);
    const rawBytesEqual = source.equals(domain);
    const normalizedContentEqual = normalizedSource.equals(normalizedDomain);

    if (normalizedContentEqual) normalizedEqualCount += 1;
    if (!normalizedContentEqual || normalizedSha256 !== sha256(normalizedDomain)) {
      failures.push({ sourcePath: entry.sourcePath, domainPath: entry.domainPath, reason: "normalized content mismatch" });
    }

    if (changedSourcePaths.has(entry.sourcePath)) {
      if (rawBytesEqual) changedPairsRawEqual += 1;
      if (entry.sourceSha256 !== sourceSha256 || entry.domainSha256 !== domainSha256 || entry.normalizedSha256 !== normalizedSha256 || entry.rawBytesEqual !== rawBytesEqual || entry.normalizedContentEqual !== normalizedContentEqual) {
        failures.push({ sourcePath: entry.sourcePath, domainPath: entry.domainPath, reason: "changed-pair hash/flags mismatch", expected: { sourceSha256, domainSha256, normalizedSha256, rawBytesEqual, normalizedContentEqual }, manifest: entry });
      }
    } else {
      const baselineRow = baselineRows.get(`${entry.sourcePath}\n${entry.domainPath}`);
      if (!baselineRow || JSON.stringify(entry) !== JSON.stringify(baselineRow)) {
        failures.push({ sourcePath: entry.sourcePath, domainPath: entry.domainPath, reason: "unchanged manifest row differs from HEAD baseline" });
      } else {
        unchangedManifestRowsPreserved += 1;
      }
    }
  }
}

if (changedPairsRawEqual !== changedSourcePaths.size) {
  failures.push({ reason: "not all changed mirror pairs are byte-exact", expected: changedSourcePaths.size, actual: changedPairsRawEqual });
}
if (normalizedEqualCount !== total) {
  failures.push({ reason: "not all manifest pairs are normalized-equal", expected: total, actual: normalizedEqualCount });
}
if (unchangedManifestRowsPreserved !== total - changedSourcePaths.size) {
  failures.push({ reason: "unexpected count of unchanged manifest rows", expected: total - changedSourcePaths.size, actual: unchangedManifestRowsPreserved });
}

const overridePath = "src/config/public-base-url.ts";
const overrideBytes = readFileSync(path.join(root, "yorayriniwnl.in", overridePath));
const appDefaultBytes = readFileSync(path.join(root, "app", overridePath));
const override = {
  path: overridePath,
  rawSha256: sha256(overrideBytes),
  normalizedSha256: sha256(normalizeLf(overrideBytes)),
  manifestNormalizedSha256: manifest.mirror.domainOverride.sha256,
  appDefaultRawSha256: sha256(appDefaultBytes),
  manifestAppDefaultSha256: manifest.mirror.domainOverride.appDefaultSha256,
  unchangedFromHead: spawnSync("git", ["diff", "--quiet", "HEAD", "--", `yorayriniwnl.in/${overridePath}`, `app/${overridePath}`], { cwd: root }).status === 0,
};
if (override.normalizedSha256 !== override.manifestNormalizedSha256 || override.appDefaultRawSha256 !== override.manifestAppDefaultSha256 || !override.unchangedFromHead) {
  failures.push({ override });
}

const eolProbePath = "app/src/app/(public)/about/page.tsx";
const eolDomainPath = "src/app/(public)/about/page.tsx";
const eolProbeSource = readFileSync(path.join(root, eolProbePath));
const eolProbeDomain = readFileSync(path.join(root, "yorayriniwnl.in", eolDomainPath));
const eolProbeHead = execFileSync("git", ["show", `HEAD:${eolProbePath}`], { cwd: root });
const eolProbeDomainHead = execFileSync("git", ["show", `HEAD:yorayriniwnl.in/${eolDomainPath}`], { cwd: root });
const eolProbe = {
  gitCoreAutocrlf: spawnSync("git", ["config", "--get", "core.autocrlf"], { cwd: root, encoding: "utf8" }).stdout.trim(),
  headBlobRawSha256: sha256(eolProbeHead),
  domainHeadBlobRawSha256: sha256(eolProbeDomainHead),
  worktreeSourceRawSha256: sha256(eolProbeSource),
  worktreeDomainRawSha256: sha256(eolProbeDomain),
  sourceRawDiffersFromHeadBlob: !eolProbeSource.equals(eolProbeHead),
  domainRawDiffersFromHeadBlob: !eolProbeDomain.equals(eolProbeDomainHead),
  sourceDomainRawEqual: eolProbeSource.equals(eolProbeDomain),
  normalizedEqual: normalizeLf(eolProbeSource).equals(normalizeLf(eolProbeDomain)),
  manifestRowPreservedFromHead: JSON.stringify(manifest.mirror.sourceFiles.find((row) => row.sourcePath === eolProbePath)) === JSON.stringify(baseline.mirror.sourceFiles.find((row) => row.sourcePath === eolProbePath)),
};
if (!eolProbe.normalizedEqual || !eolProbe.manifestRowPreservedFromHead || eolProbe.gitCoreAutocrlf.toLowerCase() !== "true") failures.push({ eolProbe });

const result = { status: failures.length ? "FAIL" : "PASS", manifestRows: total, changedPairsRawEqual, unchangedManifestRowsPreserved, normalizedEqualCount, failures, checkoutEolConversion: eolProbe, domainOverride: override };
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (failures.length) process.exitCode = 1;
