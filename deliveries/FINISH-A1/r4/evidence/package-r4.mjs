import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const verification = path.resolve(root, "verification");
const workspace = path.resolve(root, "../../..");
const base = "f62a43c5e71c00dcb89e28275ea81d842167db80";
const expectedAppTree = "42ea29ec235225046a75959eb19eb386ac2f821d";
const expectedOutputManifestSha256 = "8038db147824b0a31de1028c330383352177020b2247dd627d1674d6dc14c6af";
const expectedInputManifestSha256 = "516295623cb233c88d358729db0ef7ee4867bf070b61c0d37e33ed59d4883a76";
const allowed = [
  "app/src/app/admin/editor/page.tsx",
  "app/src/app/admin/preview/[slug]/page.tsx",
  "app/src/app/admin/preview/page.tsx",
  "app/src/app/admin/publish/page.tsx",
  "app/src/app/api/admin/media/route.ts",
  "app/src/app/api/admin/preview/media/[id]/route.ts",
  "app/src/app/api/admin/preview/route.ts",
  "app/src/app/api/admin/projects/route.ts",
  "app/src/app/api/admin/publish/route.ts",
  "app/src/app/api/admin/rollback/route.ts",
  "app/src/features/admin/draft-preview.tsx",
  "app/src/features/admin/project-editor.tsx",
  "app/src/features/admin/publish-review.tsx",
  "app/src/features/admin/structured-block-editor.tsx",
  "app/src/features/portfolio/case-study.tsx",
  "app/src/server/content/preview.ts",
  "app/src/server/content/publish.ts",
  "app/src/server/content/revisions.ts",
  "app/src/server/media/manifest.ts",
  "app/tests/e2e/platform/admin-publish.spec.ts",
  "app/tests/e2e/platform/completion-authoring-workflow.spec.ts",
  "app/tests/integration/platform/canonical-platform.test.ts",
  "app/tests/integration/platform/completion-authoring-preview.test.ts",
  "app/tests/integration/platform/publication.test.ts",
  "app/tests/unit/platform/completion-authoring-blocks.test.ts",
];
const allowedSet = new Set(allowed);
const scratchPath = "app/.a1-r4-final-db-20261011";

function git(args, encoding = "utf8") {
  return execFileSync("git", args, { cwd: verification, encoding, maxBuffer: 128 * 1024 * 1024 });
}

function digest(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function readWorkspace(relative) {
  const absolute = path.resolve(workspace, relative);
  const bytes = fs.readFileSync(absolute);
  return { path: relative.split(path.sep).join("/"), bytes, sha256: digest(bytes), origin: "workspace file at recorded governance HEAD" };
}

function readBase(relative) {
  const bytes = git(["show", `${base}:${relative}`], null);
  return { path: relative, bytes, sha256: digest(bytes), origin: `Git object ${base}:${relative}` };
}

if (fs.existsSync(path.join(root, "source")) || fs.existsSync(path.join(root, "source.patch"))) {
  throw new Error("Refusing to overwrite source/ or source.patch; output root is occupied.");
}
for (const pathName of ["changed-paths.json", "source-manifest.json", "input-hashes.json", "package-source-receipt.json"]) {
  if (fs.existsSync(path.join(root, pathName))) throw new Error(`Refusing to overwrite existing package artifact: ${pathName}`);
}

const head = git(["rev-parse", "HEAD"]).trim();
const appTree = git(["rev-parse", "HEAD:app"]).trim();
if (head !== base || appTree !== expectedAppTree) throw new Error(`Unexpected source identity: ${head} / ${appTree}`);

const statusRows = git(["status", "--porcelain=v1", "--untracked-files=normal", "-z"]).split("\0").filter(Boolean);
const unexpected = [];
for (const row of statusRows) {
  const statusPath = row.slice(3).replace(/\/$/, "");
  if (!allowedSet.has(statusPath) && statusPath !== scratchPath) unexpected.push({ row, statusPath });
}
if (unexpected.length) throw new Error(`Unexpected verification worktree paths: ${JSON.stringify(unexpected.slice(0, 20))}`);

const nameStatus = git(["diff", "--name-status", base]).trim().split(/\r?\n/).filter(Boolean).map((line) => {
  const [status, filePath] = line.split("\t");
  return { status, path: filePath };
});
const actualTracked = nameStatus.map((entry) => entry.path).sort();
const expectedTracked = [...allowed].sort();
if (JSON.stringify(actualTracked) !== JSON.stringify(expectedTracked)) {
  throw new Error(`Tracked source change inventory mismatch: ${JSON.stringify({ actualTracked, expectedTracked })}`);
}

const patchBytes = git(["diff", "--binary", "--full-index", "--no-ext-diff", base, "--", ...allowed], null);
const patchText = new TextDecoder("utf-8", { fatal: true }).decode(patchBytes);
if (patchText.startsWith("\uFEFF") || patchText.includes("\0")) throw new Error("Patch is not plain UTF-8 text.");
const patchPaths = [...patchText.matchAll(/^\+\+\+ b\/(.+)$/gm)].map((match) => match[1]);
if (JSON.stringify([...patchPaths].sort()) !== JSON.stringify(expectedTracked)) throw new Error("Patch paths differ from the exhaustive allowlist.");

const sourceRoot = path.join(root, "source");
fs.mkdirSync(sourceRoot, { recursive: false });
const sourceManifest = [];
const changedPaths = nameStatus.map(({ status, path: canonicalPath }) => {
  const sourcePath = canonicalPath.slice("app/".length);
  const sourceAbsolute = path.join(sourceRoot, sourcePath);
  fs.mkdirSync(path.dirname(sourceAbsolute), { recursive: true });
  const replacementAbsolute = path.resolve(verification, canonicalPath);
  const sourceStat = fs.lstatSync(replacementAbsolute);
  if (!sourceStat.isFile() || sourceStat.isSymbolicLink()) throw new Error(`Replacement is not a regular file: ${canonicalPath}`);
  const bytes = fs.readFileSync(replacementAbsolute);
  fs.writeFileSync(sourceAbsolute, bytes);
  const record = {
    status,
    canonicalPatchPath: canonicalPath,
    sourcePath: `source/${sourcePath.split(path.sep).join("/")}`,
    bytes: bytes.length,
    sha256: digest(bytes),
  };
  sourceManifest.push(record);
  return record;
});

fs.writeFileSync(path.join(root, "source.patch"), patchBytes);
fs.writeFileSync(path.join(root, "changed-paths.json"), `${JSON.stringify({
  packet: "FINISH-A1-R4",
  baseCommit: base,
  appTree: expectedAppTree,
  count: changedPaths.length,
  paths: changedPaths,
}, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(root, "source-manifest.json"), `${JSON.stringify({
  packet: "FINISH-A1-R4",
  pathConvention: "source/ mirrors repository app/ tree; source.patch retains canonical app/ paths",
  count: sourceManifest.length,
  paths: sourceManifest,
}, null, 2)}\n`, "utf8");

const workspaceInputs = [
  "AGENTS.md",
  "START_HERE.md",
  "GEMINI.md",
  "docs/planning/delegation-and-work-orders.md",
  "docs/planning/account-operating-model.md",
  "docs/planning/reconciliation-packets/2026-10-10-finish-04.md",
  "docs/planning/reconciliation-packets/2026-10-11-finish-05.md",
  "docs/planning/reconciliation-packets/2026-10-11-finish-07-a1-r4.md",
  "docs/planning/reconciliation-packets/finish-contracts-r2/output-hashes.json",
  "docs/planning/reconciliation-packets/finish-contracts-r2/input-hashes.json",
  "docs/planning/reconciliation-packets/finish-contracts-r2/02-platform-schema-recovery.md",
  "docs/planning/reconciliation-packets/finish-contracts-r2/04-path-ownership.md",
  "docs/planning/reconciliation-packets/finish-contracts-r2/05-handoffs-and-dependencies.md",
  "docs/planning/reviews/2026-10-10-finish-00-r2.md",
  "docs/planning/reviews/2026-10-10-finish-00-r2/decision.json",
  "docs/planning/reviews/2026-10-11-finish-04-reaudit.md",
  "docs/planning/reviews/2026-10-11-finish-04-reaudit/intake.json",
  "docs/planning/production-prompts/repairs-2026-10-11/01-GEMINI1-PLATFORM.md",
  "docs/planning/production-prompts/repairs-2026-10-11/07-GEMINI1-A1-R4.md",
  "docs/planning/production-prompts/corrections-2026-10-10/01-GEMINI1-A1-R3.md",
  "deliveries/completion-audits/FINISH-A1/finish-04/20261010T211756Z-reaudit/report.md",
  "deliveries/completion-audits/FINISH-A1/finish-04/20261010T211756Z-reaudit/findings.json",
  "deliveries/completion-audits/FINISH-A1/finish-04/20261010T211756Z-reaudit/requirement-matrix.json",
  "deliveries/completion-audits/FINISH-A1/finish-04/20261010T211756Z-reaudit/unique-test-summary.json",
  "deliveries/FINISH-A1/r2/report.md",
  "deliveries/FINISH-A1/r2/input-hashes.json",
  "deliveries/FINISH-A1/r2/output-hashes.json",
  "deliveries/FINISH-A1/r2/source.patch",
];
const inputs = workspaceInputs.map(readWorkspace);
const r2SourceRoot = path.join(workspace, "deliveries", "FINISH-A1", "r2", "source");
function walkFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(dir, entry.name);
    return entry.isDirectory() ? walkFiles(absolute) : [absolute];
  });
}
for (const absolute of walkFiles(r2SourceRoot).sort()) {
  const relative = path.relative(workspace, absolute).split(path.sep).join("/");
  inputs.push(readWorkspace(relative));
}
for (const pathName of ["app/package.json", "app/pnpm-lock.yaml", "app/src/contracts/content.ts"]) inputs.push(readBase(pathName));

const outputManifest = inputs.find((entry) => entry.path === "docs/planning/reconciliation-packets/finish-contracts-r2/output-hashes.json");
const inputManifest = inputs.find((entry) => entry.path === "docs/planning/reconciliation-packets/finish-contracts-r2/input-hashes.json");
if (outputManifest.sha256 !== expectedOutputManifestSha256) throw new Error(`Accepted output manifest hash mismatch: ${outputManifest.sha256}`);
if (inputManifest.sha256 !== expectedInputManifestSha256) throw new Error(`Accepted input manifest hash mismatch: ${inputManifest.sha256}`);

const r3Before = readWorkspace("deliveries/FINISH-A1/r4/evidence/r3-before.json");
const r3After = readWorkspace("deliveries/FINISH-A1/r4/evidence/r3-after.json");
const inputHashes = {
  packet: "FINISH-A1-R4",
  capturedAtUtc: new Date().toISOString(),
  identities: {
    sourceCommit: base,
    sourceAppTree: expectedAppTree,
    governanceHead: execFileSync("git", ["rev-parse", "HEAD"], { cwd: workspace, encoding: "utf8" }).trim(),
    coordinatingWorkspaceHead: execFileSync("git", ["rev-parse", "HEAD"], { cwd: workspace, encoding: "utf8" }).trim(),
    acceptedOutputManifestSha256: expectedOutputManifestSha256,
    acceptedInputManifestSha256: expectedInputManifestSha256,
    frozenContract: "app/src/contracts/content.ts (exact-base bytes recorded; no replacement emitted)",
  },
  exactBaseObjects: inputs.filter((entry) => entry.origin.startsWith("Git object ")).map(({ path: filePath, bytes, sha256, origin }) => ({ path: filePath, bytes: bytes.length, sha256, origin })),
  governanceAndAuditInputs: inputs.filter((entry) => !entry.origin.startsWith("Git object ")).map(({ path: filePath, bytes, sha256, origin }) => ({ path: filePath, bytes: bytes.length, sha256, origin })),
  environmentInventoryReceipts: [r3Before, r3After].map(({ path: filePath, bytes, sha256 }) => ({ path: filePath, bytes: bytes.length, sha256 })),
  note: "Hash values are SHA-256 of raw bytes. R3 is inventory context only; it is not a source baseline. R2 is a correction reference only.",
};
fs.writeFileSync(path.join(root, "input-hashes.json"), `${JSON.stringify(inputHashes, null, 2)}\n`, "utf8");

const outputEntries = [
  ...sourceManifest.map(({ sourcePath, bytes, sha256 }) => ({ path: sourcePath, bytes, sha256 })),
  { path: "source.patch", bytes: patchBytes.length, sha256: digest(patchBytes) },
];
const packageReceipt = {
  capturedAtUtc: new Date().toISOString(),
  sourceBase: base,
  appTree,
  acceptedOutputManifestSha256: outputManifest.sha256,
  patchUtf8: true,
  patchBom: false,
  patchContainsNul: false,
  patchBytes: patchBytes.length,
  patchSha256: digest(patchBytes),
  patchPathCount: patchPaths.length,
  patchPaths,
  sourceCount: sourceManifest.length,
  changedPathCount: changedPaths.length,
  transientVerificationPathPreserved: scratchPath,
  outOfRootEvidenceFiles: "See evidence/out-of-root-artifact-lineage.json; originals remain preserved outside R4.",
  outputs: outputEntries,
};
fs.writeFileSync(path.join(root, "package-source-receipt.json"), `${JSON.stringify(packageReceipt, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  sourceBase: base,
  appTree,
  governanceHead: inputHashes.identities.coordinatingWorkspaceHead,
  sourceCount: sourceManifest.length,
  patchBytes: patchBytes.length,
  patchSha256: digest(patchBytes),
  acceptedOutputManifestSha256: outputManifest.sha256,
  r2ReferenceFileCount: inputs.filter((entry) => entry.path.startsWith("deliveries/FINISH-A1/r2/source/")).length,
}, null, 2));
