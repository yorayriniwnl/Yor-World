import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..", "..", "..", "..", "..");
const appRoot = path.join(root, "app");
const domainRoot = path.join(root, "yorayriniwnl.in");
const domainOverride = "src/config/public-base-url.ts";
const testFiles = [
  "tests/e2e/renderer-recovery.spec.ts",
  "tests/e2e/world-fullscreen.spec.ts",
  "tests/e2e/world-reference-composition.spec.ts",
  "tests/unit/camera-director.test.ts",
  "tests/unit/production-lighting.test.ts",
  "tests/unit/reference-composition.test.ts",
  "tests/unit/target-occlusion.test.ts",
  "tests/unit/world-runtime-recovery.test.ts",
];

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function listFiles(directory, relative = "") {
  return readdirSync(path.join(directory, relative), { withFileTypes: true })
    .flatMap((entry) => {
      const child = path.posix.join(relative.replaceAll("\\", "/"), entry.name);
      if (entry.isDirectory()) return listFiles(directory, child);
      return entry.isFile() ? [child] : [];
    })
    .sort();
}

function copyAndDescribe(sourceRelative, domainRelative = sourceRelative) {
  const sourcePath = path.join(appRoot, sourceRelative);
  const domainPath = path.join(domainRoot, domainRelative);
  const source = readFileSync(sourcePath);
  mkdirSync(path.dirname(domainPath), { recursive: true });
  copyFileSync(sourcePath, domainPath);
  const mirror = readFileSync(domainPath);
  if (!source.equals(mirror)) throw new Error(`Raw mirror mismatch after copy: ${sourceRelative}`);
  return {
    sourcePath: `app/${sourceRelative.replaceAll("\\", "/")}`,
    domainPath: domainRelative.replaceAll("\\", "/"),
    sourceSha256: sha256(source),
    domainSha256: sha256(mirror),
    rawBytesEqual: true,
  };
}

const sourceFiles = listFiles(path.join(appRoot, "src"))
  .map((relative) => path.posix.join("src", relative))
  .filter((relative) => relative !== domainOverride)
  .map((relative) => copyAndDescribe(relative));
const mirroredTests = testFiles.map((relative) => copyAndDescribe(relative));

const readme = `# yorayriniwnl.in\n\nThis folder mirrors the canonical YOR WORLD application source in app/, with the intentional domain URL override at src/config/public-base-url.ts. The local Node and pnpm versions are Node 24.19.0 and pnpm 9.15.9.\n\nThe current source is a PRE-G7-13 local visual candidate based on failed PRE-G7-12 source 133529868c8c7279831cbbffe35ab23178012b8c, with the seven-panel scope amendment ${execFileSync("git", ["rev-parse", "HEAD^"], { cwd: root, encoding: "utf8" }).trim()}. Attempt-50 desktop/mobile captures are evidence for the current candidate. The maker report records the actual test outcomes and limitations; independent audit and acceptance remain pending.\n\nThis candidate is not accepted or deployed. G7 remains not accepted. Do not treat the source mirror as a deployment or provider configuration. See source-delivery-manifest.json for source and parity hashes after the source revision is frozen.\n`;
writeFileSync(path.join(domainRoot, "README.md"), readme, "utf8");

const overrideBytes = readFileSync(path.join(domainRoot, domainOverride));
const audit = {
  status: "PASS",
  auditScope: "PRE-G7-13 current canonical src tree except preserved domain override, plus named world tests",
  baseCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  sourceFiles: sourceFiles.length,
  testFiles: mirroredTests.length,
  rawParityFailures: 0,
  domainOverride: {
    path: domainOverride,
    canonicalUrl: "https://yorayriniwnl.in",
    sha256: sha256(overrideBytes),
    preserved: true,
  },
  readmeSha256: sha256(readFileSync(path.join(domainRoot, "README.md"))),
  sourceEntries: sourceFiles,
  testEntries: mirroredTests,
  manifestStatus: "Refreshed after source commit; source-delivery-manifest.json is bound to the committed app tree.",
};
writeFileSync(path.join(here, "mirror-sync-audit.json"), `${JSON.stringify(audit, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ ...audit, sourceEntries: undefined, testEntries: undefined }, null, 2)}\n`);
