import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const evidenceRoot = path.join(repoRoot, "deliveries/G7/preparation/maker-evidence/pre-g7-13");
const oldInventoryPath = path.join(evidenceRoot, "final-checksums.json");
const oldInventory = JSON.parse(await readFile(oldInventoryPath, "utf8"));
const sha256 = async (filePath) => createHash("sha256").update(await readFile(filePath)).digest("hex");
const relativeEvidencePath = (filePath) => path.relative(evidenceRoot, filePath).split(path.sep).join("/");

const protectedEntries = oldInventory.files.filter(({ path: filePath }) =>
  filePath.startsWith("attempt-24/") || filePath.startsWith("attempt-50/"));
const protected24 = protectedEntries.filter(({ path: filePath }) => filePath.startsWith("attempt-24/"));
const protected50 = protectedEntries.filter(({ path: filePath }) => filePath.startsWith("attempt-50/"));
if (protected24.length !== 13 || protected50.length !== 112) {
  throw new Error(`Protected historical inventory counts changed: attempt24=${protected24.length}, attempt50=${protected50.length}`);
}
for (const entry of protectedEntries) {
  const actual = await sha256(path.join(evidenceRoot, entry.path));
  if (actual !== entry.sha256) throw new Error(`Protected historical evidence changed: ${entry.path}`);
}

const walkFiles = async (directory) => {
  const output = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const itemPath = path.join(directory, item.name);
    if (item.isDirectory()) output.push(...await walkFiles(itemPath));
    else if (item.isFile()) output.push(itemPath);
  }
  return output;
};

const selectedPaths = [
  ...protectedEntries.map(({ path: filePath }) => path.join(evidenceRoot, filePath)),
  ...await Promise.all([57, 59, 60].map((number) => walkFiles(path.join(evidenceRoot, `attempt-${number}`)))).then((groups) => groups.flat()),
  path.join(evidenceRoot, "REPORT.md"),
  path.join(repoRoot, "yorayriniwnl.in/README.md"),
  path.join(repoRoot, "yorayriniwnl.in/source-delivery-manifest.json"),
];
const uniquePaths = [...new Set(selectedPaths)].sort((a, b) => relativeEvidencePath(a).localeCompare(relativeEvidencePath(b)));
const files = [];
for (const filePath of uniquePaths) {
  files.push({ path: relativeEvidencePath(filePath), sha256: await sha256(filePath) });
}

const attempt50Shots = Object.fromEntries(["desktop", "mobile"].map((label) => {
  const filePath = label === "desktop"
    ? "attempt-50/screenshots/studio-reference-desktop-1440x900.png"
    : "attempt-50/screenshots/studio-reference-mobile-390x844.png";
  return [label, { path: filePath, sha256: files.find((entry) => entry.path === filePath)?.sha256 }];
}));
const auditPath = path.join(evidenceRoot, "attempt-60/original-source-glb-audit.json");
const auditSourcePath = path.join(evidenceRoot, "pre-edit-source-glb-audit.json");
const [auditBytes, originalAuditBytes] = await Promise.all([readFile(auditPath), readFile(auditSourcePath)]);
if (!auditBytes.equals(originalAuditBytes)) throw new Error("Copied original-source audit differs from the pre-edit inventory.");
const audit = JSON.parse(auditBytes.toString("utf8"));

const result = {
  schemaVersion: 2,
  integrityStatus: "PASS",
  sourceCommit: "a3459c158af880319269196f85c0c922ee86c5d6",
  appTree: "23c7dac82746d7db84632e228efe3224736b9266",
  visualCandidate: "attempt-60",
  attempt24: {
    fileCount: protected24.length,
    historicalSha256Verified: true,
    preservationNote: "All 13 attempt-24 entries match the previous recorded SHA-256 inventory byte-for-byte.",
  },
  attempt50: {
    fileCount: protected50.length,
    status: "historical and superseded by attempt-60",
    historicalSha256Verified: true,
    desktopScreenshot: attempt50Shots.desktop,
    mobileScreenshot: attempt50Shots.mobile,
  },
  attempt57: {
    fileCount: files.filter(({ path: filePath }) => filePath.startsWith("attempt-57/")).length,
    note: "Selected preserved cyan-floor ROI evidence from the final bounded named-light calibration iteration.",
  },
  attempt59: {
    fileCount: files.filter(({ path: filePath }) => filePath.startsWith("attempt-59/")).length,
    note: "Final source validation logs/results on the flag-off production build.",
  },
  attempt60: {
    fileCount: files.filter(({ path: filePath }) => filePath.startsWith("attempt-60/")).length,
    buildId: "xIHSU0bJryjz1m7psTbjB",
    compositionResult: "PASS 3/3; desktop 1440x900, mobile 390x844, compact 320x600, landscape 844x390",
    originalAudit: {
      path: "attempt-60/original-source-glb-audit.json",
      sha256: await sha256(auditPath),
      sourceBaseCommit: audit.sourceBase.commit,
      sourceAppTree: audit.sourceBase.appTree,
      glbSha256: audit.glb.sha256,
      glbBytes: audit.glb.bytes,
    },
  },
  files,
  omittedSelfHash: "final-checksums.json is excluded because it cannot contain its own stable SHA-256.",
};
await writeFile(oldInventoryPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({
  integrityStatus: result.integrityStatus,
  sourceCommit: result.sourceCommit,
  appTree: result.appTree,
  attempt24FilesVerified: protected24.length,
  attempt50FilesVerified: protected50.length,
  attempt57Files: result.attempt57.fileCount,
  attempt59Files: result.attempt59.fileCount,
  attempt60Files: result.attempt60.fileCount,
  totalInventoryFiles: files.length,
  auditCopyIdentical: true,
}, null, 2));
