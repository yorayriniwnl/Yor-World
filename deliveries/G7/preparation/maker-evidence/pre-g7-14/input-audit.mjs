import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const evidence = path.join(root, "deliveries/G7/preparation/maker-evidence/pre-g7-14");
const manifestPath = path.join(root, "yorayriniwnl.in/source-delivery-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const entries = [...manifest.mirror.sourceFiles, ...manifest.mirror.testFiles];
const digest = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const normalized = (bytes) => Buffer.from(bytes.toString("utf8").replace(/\r\n?/g, "\n"), "utf8");
const failures = [];
let rawHashDiff = 0;
let sourceManifestHashFailures = 0;
let normalizedManifestHashFailures = 0;
for (const entry of entries) {
  const sourcePath = path.join(root, entry.sourcePath);
  const domainPath = path.join(root, "yorayriniwnl.in", entry.domainPath);
  if (!fs.existsSync(sourcePath) || !fs.existsSync(domainPath)) {
    failures.push({ sourcePath: entry.sourcePath, domainPath: entry.domainPath, reason: "missing" });
    continue;
  }
  const source = fs.readFileSync(sourcePath);
  const domain = fs.readFileSync(domainPath);
  const sourceNormalized = normalized(source);
  const domainNormalized = normalized(domain);
  if (!source.equals(domain)) rawHashDiff++;
  if (!sourceNormalized.equals(domainNormalized)) failures.push({ sourcePath: entry.sourcePath, domainPath: entry.domainPath, reason: "normalized content differs" });
  if (digest(source) !== entry.sourceSha256) sourceManifestHashFailures++;
  if (digest(sourceNormalized) !== entry.normalizedSha256) normalizedManifestHashFailures++;
}
const assets = [];
for (const subdir of ["public/models", "public/textures"]) {
  const dir = path.join(root, "app", subdir);
  for (const name of fs.readdirSync(dir).sort()) {
    const file = path.join(dir, name);
    if (fs.statSync(file).isFile()) assets.push({ path: `app/${subdir}/${name}`, bytes: fs.statSync(file).size, sha256: digest(fs.readFileSync(file)) });
  }
}
for (const name of fs.readdirSync(path.join(root, "app/src/contracts")).sort()) {
  const file = path.join(root, "app/src/contracts", name);
  if (fs.statSync(file).isFile()) assets.push({ path: `app/src/contracts/${name}`, bytes: fs.statSync(file).size, sha256: digest(fs.readFileSync(file)) });
}
for (const rel of ["app/src/features/world/CameraDirector.ts", "app/src/features/world/types.ts", "app/public/asset-manifest.json"]) {
  const file = path.join(root, rel);
  assets.push({ path: rel, bytes: fs.statSync(file).size, sha256: digest(fs.readFileSync(file)) });
}
const copiedInputs = [];
for (const name of ["authorized-packet.md", "pre-g7-13-parent-ruling.md", "pre-g7-13-full-integration.log"]) {
  const file = path.join(evidence, "input", name);
  copiedInputs.push({ path: `input/${name}`, bytes: fs.statSync(file).size, sha256: digest(fs.readFileSync(file)) });
}
const result = {
  scope: "PRE-G7-14 input audit; pre-edit evidence",
  acceptedInput: {
    sourceCommit: "a3459c158af880319269196f85c0c922ee86c5d6",
    appTree: "23c7dac82746d7db84632e228efe3224736b9266",
    priorEvidenceHead: "498d6e1329ce651a816cd17935af5fa25bf01ba2",
  },
  mirror: {
    sourceFiles: manifest.mirror.sourceFiles.length,
    testFiles: manifest.mirror.testFiles.length,
    total: entries.length,
    rawByteDifferences: rawHashDiff,
    normalizedContentFailures: failures,
    sourceManifestHashFailures,
    normalizedManifestHashFailures,
    domainOverride: manifest.mirror.domainOverride,
    manifestSourceCommit: manifest.sourceIdentity.sourceCommit,
    manifestResultingAppTree: manifest.sourceIdentity.resultingAppTree,
    manifestIdentityMatchesAcceptedInput: manifest.sourceIdentity.sourceCommit === "a3459c158af880319269196f85c0c922ee86c5d6" && manifest.sourceIdentity.resultingAppTree === "23c7dac82746d7db84632e228efe3224736b9266",
  },
  glbsTexturesContractsAndCameraHashes: assets,
  copiedInputs,
};
fs.writeFileSync(path.join(evidence, "pre-edit-input-audit.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({
  ...result.mirror,
  failures: failures.length,
  assetAndContractHashes: assets.length,
  inputSnapshots: copiedInputs,
}));
if (failures.length || sourceManifestHashFailures || normalizedManifestHashFailures) process.exitCode = 1;