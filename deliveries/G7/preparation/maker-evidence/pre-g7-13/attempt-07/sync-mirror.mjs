import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, "yorayriniwnl.in/source-delivery-manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const baseline = JSON.parse(execFileSync("git", ["show", "HEAD:yorayriniwnl.in/source-delivery-manifest.json"], { cwd: root, encoding: "utf8" }));
const pairs = [
  ["app/src/features/world/ProductionLighting.ts", "src/features/world/ProductionLighting.ts", "sourceFiles"],
  ["app/src/features/world/ReferenceComposition.ts", "src/features/world/ReferenceComposition.ts", "sourceFiles"],
  ["app/src/features/world/SceneIntegrator.ts", "src/features/world/SceneIntegrator.ts", "sourceFiles"],
  ["app/tests/e2e/world-reference-composition.spec.ts", "tests/e2e/world-reference-composition.spec.ts", "testFiles"],
  ["app/tests/unit/production-lighting.test.ts", "tests/unit/production-lighting.test.ts", "testFiles"],
  ["app/tests/unit/reference-composition.test.ts", "tests/unit/reference-composition.test.ts", "testFiles"],
];
const changedSourcePaths = new Set(pairs.map(([sourcePath]) => sourcePath));
for (const section of ["sourceFiles", "testFiles"]) {
  const currentRows = manifest.mirror[section];
  const currentByKey = new Map(currentRows.map((row) => [`${row.sourcePath}\n${row.domainPath}`, row]));
  const baselineRows = baseline.mirror[section];
  const baselineKeys = new Set(baselineRows.map((row) => `${row.sourcePath}\n${row.domainPath}`));
  manifest.mirror[section] = [
    ...baselineRows.map((row) => changedSourcePaths.has(row.sourcePath)
      ? currentByKey.get(`${row.sourcePath}\n${row.domainPath}`) ?? row
      : row),
    ...currentRows.filter((row) => !baselineKeys.has(`${row.sourcePath}\n${row.domainPath}`)),
  ];
}
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const normalizeLf = (bytes) => Buffer.from(bytes.toString("utf8").replace(/\r\n/g, "\n"), "utf8");
const results = [];

for (const [sourcePath, relativeDomainPath, section] of pairs) {
  const sourceAbsolute = path.join(root, sourcePath);
  const domainAbsolute = path.join(root, "yorayriniwnl.in", relativeDomainPath);
  const sourceBytes = readFileSync(sourceAbsolute);
  copyFileSync(sourceAbsolute, domainAbsolute);
  const domainBytes = readFileSync(domainAbsolute);
  const row = manifest.mirror[section].find((entry) => entry.sourcePath === sourcePath && entry.domainPath === relativeDomainPath);
  if (!row) throw new Error(`Missing manifest row for ${sourcePath}`);
  row.sourceSha256 = sha256(sourceBytes);
  row.domainSha256 = sha256(domainBytes);
  row.normalizedSha256 = sha256(normalizeLf(sourceBytes));
  row.rawBytesEqual = sourceBytes.equals(domainBytes);
  row.normalizedContentEqual = normalizeLf(sourceBytes).equals(normalizeLf(domainBytes));
  if (!row.rawBytesEqual || !row.normalizedContentEqual) throw new Error(`Parity failed for ${sourcePath}`);
  results.push({ sourcePath, domainPath: relativeDomainPath, sourceSha256: row.sourceSha256, domainSha256: row.domainSha256, normalizedSha256: row.normalizedSha256, rawBytesEqual: row.rawBytesEqual, normalizedContentEqual: row.normalizedContentEqual });
}

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ pairCount: results.length, results }, null, 2)}\n`);
