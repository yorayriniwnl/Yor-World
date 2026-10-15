import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const evidenceRoot = path.join(repoRoot, "deliveries/G7/preparation/maker-evidence/pre-g7-13");
const inventoryPath = path.join(evidenceRoot, "final-checksums.json");
const previous = JSON.parse(await readFile(inventoryPath, "utf8"));
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const evidenceRel = (file) => path.relative(evidenceRoot, file).split(path.sep).join("/");

const walk = async (dir) => {
  const result = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) result.push(...await walk(full));
    else if (item.isFile()) result.push(full);
  }
  return result;
};

const protectedEntries = previous.files.filter(({ path: p }) => p.startsWith("attempt-24/") || p.startsWith("attempt-50/"));
const protected24 = protectedEntries.filter(({ path: p }) => p.startsWith("attempt-24/"));
const protected50 = protectedEntries.filter(({ path: p }) => p.startsWith("attempt-50/"));
if (protected24.length !== 13 || protected50.length !== 112) {
  throw new Error(`Protected historical counts changed: attempt24=${protected24.length}, attempt50=${protected50.length}`);
}
for (const entry of protectedEntries) {
  const actual = digest(await readFile(path.join(evidenceRoot, entry.path)));
  if (actual !== entry.sha256) throw new Error(`Protected historical bytes changed: ${entry.path}`);
}

const additions = [];
for (const number of [61, 62, 63, 64, 65, 66]) {
  const dir = path.join(evidenceRoot, `attempt-${number}`);
  additions.push(...await walk(dir));
}
const oldByPath = new Map(previous.files.map((entry) => [entry.path, entry]));
const allPaths = new Set([...oldByPath.keys(), ...additions.map(evidenceRel)]);
allPaths.add("REPORT.md");
allPaths.add("../../../../../yorayriniwnl.in/README.md");
allPaths.add("../../../../../yorayriniwnl.in/source-delivery-manifest.json");

const files = [];
for (const filePath of [...allPaths].sort()) {
  const absolute = path.resolve(evidenceRoot, filePath);
  const currentSha = digest(await readFile(absolute));
  const old = oldByPath.get(filePath);
  if (old) {
    const entry = { ...old };
    delete entry.currentWorktreeSha256;
    if (currentSha !== old.sha256) entry.currentWorktreeSha256 = currentSha;
    files.push(entry);
  } else {
    files.push({ path: filePath, sha256: currentSha });
  }
}

const attempt = (number) => files.filter(({ path: p }) => p.startsWith(`attempt-${number}/`));
const priorBlobBasis = previous.committedBlobHashBasis ?? {};
const result = {
  ...previous,
  integrityStatus: "PENDING_FINAL_BLOB_BIND",
  sourceCommit: "034d87951555731ff03d413b380556471e4ad73a",
  appTree: "0ea10ae3cadb00526e13293248fbef3b3007537e",
  mirrorSyncCommit: "e21901eff03097ab0ecda2278e2949aa2eba5db9",
  visualCandidate: "attempt-64",
  attempt24: {
    fileCount: protected24.length,
    historicalSha256Verified: true,
    preservationNote: "All 13 selected attempt-24 entries match the previous recorded SHA-256 inventory byte-for-byte.",
  },
  attempt50: {
    ...previous.attempt50,
    fileCount: protected50.length,
    status: "historical and superseded by attempt-64",
    historicalSha256Verified: true,
  },
  attempt61: {
    fileCount: attempt(61).length,
    sourceCommit: "034d87951555731ff03d413b380556471e4ad73a",
    appTree: "0ea10ae3cadb00526e13293248fbef3b3007537e",
    fullIntegration: "FAIL 285/286; canonical-fixture default timeout; unchanged policy",
    flagOffBuildId: "XCQS-sAWChbQlXVUq93Rn",
  },
  attempt64: {
    fileCount: attempt(64).length,
    buildId: "7fiIu3DKa8U_TUYczP3uR",
    compositionResult: "PASS 3/3; desktop 1440x900, mobile 390x844, compact 320x600, landscape 844x390",
  },
  attempt65: {
    fileCount: attempt(65).length,
    lintStatus: "INTERRUPTED; wrapper exited 1 without LINT_EXIT marker; preserved before attempt-66 rerun",
  },
  attempt66: {
    fileCount: attempt(66).length,
    lint: "PASS, exit 0",
    typecheck: "PASS, exit 0",
    unit: "PASS, 324/324, exit 0",
    recoveryFullscreen: "FAIL, 12/13, exit 1; isolated first recovery retry PASS 1/1",
    candidateX404: "PASS, 1/1, exit 0",
    cleanProfileSmoke: "PASS, 8/8, exit 0",
    buildId: "7fiIu3DKa8U_TUYczP3uR",
  },
  files,
  committedBlobHashBasis: {
    gitCommit: priorBlobBasis.gitCommit,
    algorithm: "SHA-256 over exact blob bytes returned by git cat-file --batch",
    entryCount: files.length,
    reportIncluded: true,
    checksumInventorySelfExcluded: true,
    status: "Pending final evidence commit; previous basis retained until exact blob refresh.",
  },
};
result.omittedSelfHash = "final-checksums.json is excluded because it cannot contain its own stable SHA-256.";
await writeFile(inventoryPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({
  integrityStatus: result.integrityStatus,
  sourceCommit: result.sourceCommit,
  appTree: result.appTree,
  attempt24FilesVerified: protected24.length,
  attempt50FilesVerified: protected50.length,
  attempt61Files: attempt(61).length,
  attempt64Files: attempt(64).length,
  attempt65Files: attempt(65).length,
  attempt66Files: attempt(66).length,
  totalInventoryFiles: files.length,
}, null, 2));
