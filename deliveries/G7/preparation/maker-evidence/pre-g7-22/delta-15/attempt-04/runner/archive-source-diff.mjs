import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const outputRoot = path.resolve(root, "deliveries/G7/preparation/maker-evidence/pre-g7-22/delta-15/attempt-04");
const addedTests = [
  "app/tests/unit/static-batch-production-report.test.ts",
  "yorayriniwnl.in/tests/unit/static-batch-production-report.test.ts",
];
const trackedPaths = [
  "app/src/features/world/LowQualityBatch.ts",
  "app/src/features/world/WorldRuntime.ts",
  "app/src/features/world/types.ts",
  "app/tests/unit/low-quality-batch.test.ts",
  "yorayriniwnl.in/src/features/world/LowQualityBatch.ts",
  "yorayriniwnl.in/src/features/world/WorldRuntime.ts",
  "yorayriniwnl.in/src/features/world/types.ts",
  "yorayriniwnl.in/tests/unit/low-quality-batch.test.ts",
];

function git(args) {
  const result = spawnSync("git", args, { cwd: root, windowsHide: true, encoding: null });
  if (result.error) throw result.error;
  if (result.status !== 0 && !args.includes("--no-index")) {
    throw new Error(`git ${args.join(" ")} failed (${result.status}): ${result.stderr?.toString("utf8") ?? ""}`);
  }
  return result.stdout ?? Buffer.alloc(0);
}

const head = git(["rev-parse", "HEAD"]).toString("utf8").trim();
const branch = git(["branch", "--show-current"]).toString("utf8").trim();
const trackedDiff = git(["diff", "--binary", "HEAD", "--", ...trackedPaths]);
const additionDiffs = addedTests.map((file) => git(["diff", "--no-index", "--binary", "--", "/dev/null", file]));
const patchBytes = Buffer.concat([
  trackedDiff,
  ...additionDiffs.flatMap((diff) => [Buffer.from("\n"), diff]),
]);
const patchPath = path.join(outputRoot, "delta15-experiment-rejected.patch");
mkdirSync(path.dirname(patchPath), { recursive: true });
writeFileSync(patchPath, patchBytes);

const archivedTests = [];
for (const sourcePath of addedTests) {
  const destinationPath = path.join(outputRoot, "added-tests", sourcePath);
  mkdirSync(path.dirname(destinationPath), { recursive: true });
  copyFileSync(sourcePath, destinationPath);
  const bytes = readFileSync(destinationPath);
  archivedTests.push({ path: path.relative(root, destinationPath).replaceAll("\\", "/"), sourcePath, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
}

const patchHash = createHash("sha256").update(patchBytes).digest("hex");
writeFileSync(`${patchPath}.sha256`, `${patchHash}  ${path.basename(patchPath)}\n`, "utf8");
const manifest = {
  status: "REJECTED / UNACCEPTED; archival snapshot only",
  role: "local Codex maker substitute, not Gemini #3",
  branch,
  sourceHead: head,
  trackedPaths,
  addedTests,
  archivedTests,
  patch: { path: path.relative(root, patchPath).replaceAll("\\", "/"), bytes: patchBytes.length, sha256: patchHash },
  note: "Contains the exact experimental working-tree diff for the listed app and mirror source/test paths before restoration. It is not an accepted source delta.",
};
writeFileSync(path.join(outputRoot, "source-diff-archive.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
