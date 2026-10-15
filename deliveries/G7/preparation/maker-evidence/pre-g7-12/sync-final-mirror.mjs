import { createHash } from "node:crypto";
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const evidenceRoot = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(evidenceRoot, "../../../../..");
const manifestPath = path.join(root, "yorayriniwnl.in/source-delivery-manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const parentCommit = "67026f26bb80d81de4edf632b3038b0239eea4de";
const sourceCommit = "43d3c0289fd5afe5970d799c77f9a701b4d71d0e";
const resultingAppTree = "77f3af861ffe4d6b96154fcfba792490b3cc45dc";

const sourcePaths = [
  "app/src/features/world/CameraDirector.ts",
  "app/src/features/world/ProductionLighting.ts",
  "app/src/features/world/ReferenceComposition.ts",
  "app/src/features/world/SceneIntegrator.ts",
  "app/src/features/world/WorldRuntime.ts",
  "app/src/features/world/WorldRoot.tsx",
  "app/src/features/world/world.module.css",
];
const testPaths = [
  "app/tests/e2e/world-reference-composition.spec.ts",
  "app/tests/unit/camera-director.test.ts",
  "app/tests/unit/reference-composition.test.ts",
  "app/tests/integration/production-lighting.test.ts",
];

function normalizedHash(bytes) {
  return createHash("sha256").update(bytes.toString("utf8").replace(/\r\n/g, "\n")).digest("hex");
}

function syncRow(sourcePath, domainPath) {
  const sourceAbsolute = path.join(root, sourcePath);
  const domainAbsolute = path.join(root, "yorayriniwnl.in", domainPath);
  copyFileSync(sourceAbsolute, domainAbsolute);
  const sourceBytes = readFileSync(sourceAbsolute);
  const domainBytes = readFileSync(domainAbsolute);
  const sourceSha256 = normalizedHash(sourceBytes);
  const domainSha256 = normalizedHash(domainBytes);
  if (!sourceBytes.equals(domainBytes) || sourceSha256 !== domainSha256) {
    throw new Error(`Mirror copy mismatch: ${sourcePath} -> ${domainPath}`);
  }
  return {
    sourcePath,
    domainPath,
    sourceSha256,
    domainSha256,
    normalizedSha256: sourceSha256,
    rawBytesEqual: true,
    normalizedContentEqual: true,
  };
}

const override = manifest.mirror.domainOverride;
const currentOverrideHash = normalizedHash(readFileSync(path.join(root, "yorayriniwnl.in", override.path)));
if (currentOverrideHash !== override.sha256) throw new Error("The recorded domain URL override changed before sync.");

const sourceRows = new Map(manifest.mirror.sourceFiles.map((row) => [row.sourcePath, row]));
for (const sourcePath of sourcePaths) {
  const domainPath = sourcePath.slice("app/".length);
  sourceRows.set(sourcePath, syncRow(sourcePath, domainPath));
}
manifest.mirror.sourceFiles = [...sourceRows.values()].sort((a, b) => a.sourcePath.localeCompare(b.sourcePath));

const testRows = new Map(manifest.mirror.testFiles.map((row) => [row.sourcePath, row]));
for (const sourcePath of testPaths) {
  const domainPath = sourcePath.slice("app/".length);
  testRows.set(sourcePath, syncRow(sourcePath, domainPath));
}
manifest.mirror.testFiles = [...testRows.values()].sort((a, b) => a.sourcePath.localeCompare(b.sourcePath));
for (const row of [...manifest.mirror.sourceFiles, ...manifest.mirror.testFiles]) {
  const sourceBytes = readFileSync(path.join(root, row.sourcePath));
  const domainBytes = readFileSync(path.join(root, "yorayriniwnl.in", row.domainPath));
  const sourceSha256 = normalizedHash(sourceBytes);
  const domainSha256 = normalizedHash(domainBytes);
  if (sourceSha256 !== domainSha256) throw new Error(`Mirror audit mismatch: ${row.sourcePath} -> ${row.domainPath}`);
  row.sourceSha256 = sourceSha256;
  row.domainSha256 = domainSha256;
  row.normalizedSha256 = sourceSha256;
  row.rawBytesEqual = sourceBytes.equals(domainBytes);
  row.normalizedContentEqual = true;
}
manifest.sourceIdentity = {
  parentCommit,
  sourceCommit,
  acceptedInputCommit: "cfdc744f69cd257c8ac0cbaad78b8805c48f20d5",
  acceptedInputAppTree: "915c26f4b9a1fa075614ea64959750f9e486187c",
  resultingAppTree,
};
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

const readmePath = path.join(root, "yorayriniwnl.in/README.md");
writeFileSync(readmePath, `# yorayriniwnl.in\n\nThis folder is the local YOR WORLD website source for \`https://yorayriniwnl.in\`.\n\n## Run locally\n\nUse Node.js \`24.19.0\` and pnpm \`9.15.9\`. From this folder:\n\n\`\`\`sh\npnpm install --frozen-lockfile\npnpm dev\n\`\`\`\n\nCopy \`.env.example\` to \`.env.local\` before configuring local services. Backend-dependent features need the services documented in \`.env.example\`.\n\n## Source identity and review status\n\nThe frozen accepted input is PRE-G7-11 app source commit \`cfdc744f69cd257c8ac0cbaad78b8805c48f20d5\`, app tree \`915c26f4b9a1fa075614ea64959750f9e486187c\`. This local candidate is bound to PRE-G7-12 maker source commit \`${sourceCommit}\`, app tree \`${resultingAppTree}\`, based on packet/status commit \`${parentCommit}\`. The manifest records the mirrored source and test hashes plus the intentional \`https://yorayriniwnl.in\` canonical URL override.\n\nPRE-G7-12 remains a maker candidate and is **NOT ACCEPTED**. The visual anchor ledger records material and source-asset limitations; no visual completion is claimed. This source is **NOT DEPLOYED. G7 NOT ACCEPTED.**\n`, "utf8");

writeFileSync(path.join(evidenceRoot, "mirror-sync-result.json"), `${JSON.stringify({
  status: "PASS",
  parentCommit,
  sourceCommit,
  appTree: resultingAppTree,
  syncedSourceFiles: sourcePaths.length,
  manifestSourceFiles: manifest.mirror.sourceFiles.length,
  syncedTestFiles: testPaths.length,
  manifestTestRows: manifest.mirror.testFiles.length,
  normalizedMirrorPairsVerified: manifest.mirror.sourceFiles.length + manifest.mirror.testFiles.length,
  rawByteDifferences: [...manifest.mirror.sourceFiles, ...manifest.mirror.testFiles].filter((row) => !row.rawBytesEqual).length,
  domainOverride: { path: override.path, sha256: currentOverrideHash },
}, null, 2)}\n`, "utf8");
