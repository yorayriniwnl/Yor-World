import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";

const repoRoot = resolve("C:/g7c");
const evidenceRoot = resolve(repoRoot, "deliveries/G7/preparation/maker-evidence/pre-g7-10/runtime");
const checksumPath = resolve(evidenceRoot, "SHA256SUMS.txt");
const extraFiles = [
  "app/src/features/world/WorldRuntime.ts",
  "app/tests/unit/world-runtime-recovery.test.ts",
];

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesBelow(fullPath));
    else if (fullPath !== checksumPath) files.push(fullPath);
  }
  return files;
}

const allFiles = [
  ...await filesBelow(evidenceRoot),
  ...extraFiles.map((path) => resolve(repoRoot, path)),
];
const lines = [];
for (const fullPath of allFiles) {
  const digest = createHash("sha256").update(await readFile(fullPath)).digest("hex");
  const repoPath = relative(repoRoot, fullPath).replaceAll("\\", "/");
  lines.push(`${digest}  ${repoPath}`);
}
lines.sort((left, right) => left.localeCompare(right));
const output = `${lines.join("\n")}\n`;

if (process.argv.includes("--check")) {
  const actual = await readFile(checksumPath, "utf8");
  if (actual !== output) {
    console.error("SHA256SUMS.txt does not match the current evidence/source files.");
    process.exitCode = 1;
  } else {
    console.log(`PASS: verified ${lines.length} SHA-256 entries.`);
  }
} else {
  await writeFile(checksumPath, output);
  console.log(`Wrote ${lines.length} SHA-256 entries to ${relative(repoRoot, checksumPath).replaceAll("\\", "/")}.`);
}
