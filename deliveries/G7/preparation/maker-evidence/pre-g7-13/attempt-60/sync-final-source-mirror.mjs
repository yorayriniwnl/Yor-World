import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, "yorayriniwnl.in", "source-delivery-manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const normalized = (bytes) => Buffer.from(bytes.toString("utf8").replace(/\r\n?/g, "\n"), "utf8");
const normalizedSha256 = (bytes) => sha256(normalized(bytes));
const synced = [];
const parityFailures = [];
for (const entry of [{ sourcePath: "app/tests/integration/production-lighting.test.ts", domainPath: "tests/integration/production-lighting.test.ts" }]) {
  if (!manifest.mirror.testFiles.some((existing) => existing.sourcePath === entry.sourcePath)) manifest.mirror.testFiles.push(entry);
}
const removed = [];
const deletedCanonical = [
  { sourcePath: "app/src/features/world/TargetOcclusion.ts", domainPath: "src/features/world/TargetOcclusion.ts" },
];

for (const item of deletedCanonical) {
  manifest.mirror.sourceFiles = manifest.mirror.sourceFiles.filter((entry) => entry.sourcePath !== item.sourcePath && entry.domainPath !== item.domainPath);
  const sourcePath = path.join(root, item.sourcePath);
  try { await readFile(sourcePath); }
  catch {
    await rm(path.join(root, "yorayriniwnl.in", item.domainPath), { force: true });
    removed.push(item);
  }
}

for (const kind of ["sourceFiles", "testFiles"]) {
  const entries = manifest.mirror[kind];
  for (const entry of entries) {
    const sourcePath = path.join(root, entry.sourcePath);
    const mirrorPath = path.join(root, "yorayriniwnl.in", entry.domainPath);
    const sourceBytes = await readFile(sourcePath);
    await mkdir(path.dirname(mirrorPath), { recursive: true });
    const beforeBytes = await readFile(mirrorPath).catch(() => null);
    if (!beforeBytes || !beforeBytes.equals(sourceBytes)) {
      await copyFile(sourcePath, mirrorPath);
      synced.push({ kind, sourcePath: entry.sourcePath, domainPath: entry.domainPath, sourceSha256: sha256(sourceBytes) });
    }
    const mirrorBytes = await readFile(mirrorPath);
    Object.assign(entry, {
      sourceSha256: sha256(sourceBytes),
      domainSha256: sha256(mirrorBytes),
      rawBytesEqual: sourceBytes.equals(mirrorBytes),
      normalizedSha256: normalizedSha256(sourceBytes),
      normalizedContentEqual: normalized(sourceBytes).equals(normalized(mirrorBytes)),
    });
    if (!entry.rawBytesEqual || !entry.normalizedContentEqual) parityFailures.push(entry.sourcePath);
  }
}

const override = manifest.mirror.domainOverride;
const overridePath = path.join(root, "yorayriniwnl.in", override.path);
const overrideBytes = await readFile(overridePath);
override.sha256 = sha256(overrideBytes);
override.preserved = true;

manifest.mirror.sourceFiles.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath));
manifest.mirror.testFiles.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath));
manifest.mirror.audit = {
  ...manifest.mirror.audit,
  status: parityFailures.length === 0 ? "PASS" : "FAIL",
  sourceFiles: manifest.mirror.sourceFiles.length,
  testFiles: manifest.mirror.testFiles.length,
  rawParityFailures: parityFailures.length,
  readmeSha256: sha256(await readFile(path.join(root, "yorayriniwnl.in", "README.md"))),
  evidence: "deliveries/G7/preparation/maker-evidence/pre-g7-13/attempt-60/final-mirror-sync-audit.json",
};

const audit = {
  schemaVersion: 1,
  result: parityFailures.length === 0 ? "PASS" : "FAIL",
  sourceBaseCommit: manifest.sourceIdentity.sourceCommit,
  sourceFiles: manifest.mirror.sourceFiles.length,
  testFiles: manifest.mirror.testFiles.length,
  synced,
  removed,
  parityFailures,
  domainOverride: { path: override.path, canonicalUrl: override.canonicalUrl, sha256: override.sha256, preserved: true },
};
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
await writeFile(path.join(root, "deliveries/G7/preparation/maker-evidence/pre-g7-13/attempt-60/final-mirror-sync-audit.json"), `${JSON.stringify(audit, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ...audit, syncCount: synced.length }, null, 2));
if (parityFailures.length) process.exitCode = 1;
