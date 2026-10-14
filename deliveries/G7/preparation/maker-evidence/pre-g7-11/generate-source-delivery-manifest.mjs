import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const evidenceDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(evidenceDirectory, "../../../../../");
const appRoot = path.join(root, "app");
const domainRoot = path.join(root, "yorayriniwnl.in");
const parentCommit = "9da8f5632cb0c54fe148f7a4995a52eb6735f410";
const acceptedInputCommit = "95729282af3d84b4e3158158546643935e737b7a";
const acceptedInputAppTree = "e53f3ea9c6c80f471832e46d548206105699c32b";
const auditOnly = process.argv.includes("--audit-only");

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function normalized(buffer) {
  if (buffer.includes(0)) return buffer;
  return Buffer.from(buffer.toString("utf8").replace(/\r\n/g, "\n"), "utf8");
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

function describePair(sourceRelativePath, domainRelativePath = sourceRelativePath) {
  const source = readFileSync(path.join(appRoot, sourceRelativePath));
  const mirror = readFileSync(path.join(domainRoot, domainRelativePath));
  const normalizedSource = normalized(source);
  const normalizedMirror = normalized(mirror);
  const normalizedEqual = normalizedSource.equals(normalizedMirror);
  if (!normalizedEqual) {
    throw new Error(`Source mirror content differs: ${sourceRelativePath} -> ${domainRelativePath}`);
  }
  return {
    sourcePath: `app/${sourceRelativePath.replaceAll("\\", "/")}`,
    domainPath: domainRelativePath.replaceAll("\\", "/"),
    sourceSha256: sha256(source),
    domainSha256: sha256(mirror),
    normalizedSha256: sha256(normalizedSource),
    rawBytesEqual: source.equals(mirror),
    normalizedContentEqual: normalizedEqual,
  };
}

const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const sourceTree = auditOnly
  ? null
  : execFileSync("git", ["write-tree"], { cwd: root, encoding: "utf8" }).trim();
const resultingAppTree = sourceTree
  ? execFileSync("git", ["rev-parse", `${sourceTree}:app`], { cwd: root, encoding: "utf8" }).trim()
  : execFileSync("git", ["rev-parse", `${sourceCommit}:app`], { cwd: root, encoding: "utf8" }).trim();
const sourceFiles = listFiles(path.join(appRoot, "src"))
  .filter((relative) => relative.replaceAll("\\", "/") !== "config/public-base-url.ts")
  .map((relative) => describePair(path.join("src", relative)));
const testFiles = [
  "tests/unit/world-runtime-recovery.test.ts",
  "tests/e2e/world-fullscreen.spec.ts",
].map((relative) => describePair(relative));
const domainOverridePath = "src/config/public-base-url.ts";
const domainOverride = readFileSync(path.join(domainRoot, domainOverridePath));
const appDefault = readFileSync(path.join(appRoot, domainOverridePath));
const overrideText = domainOverride.toString("utf8");
if (!overrideText.includes('"https://yorayriniwnl.in"')) {
  throw new Error("Domain canonical URL override does not point at https://yorayriniwnl.in");
}

if (auditOnly) {
  const manifest = JSON.parse(readFileSync(path.join(domainRoot, "source-delivery-manifest.json"), "utf8"));
  const manifestSources = [...manifest.mirror.sourceFiles, ...manifest.mirror.testFiles];
  const auditedSources = [...sourceFiles, ...testFiles];
  if (manifest.sourceIdentity.parentCommit !== parentCommit) {
    throw new Error("Manifest parent commit does not match the PRE-G7-11 packet base");
  }
  if (manifest.sourceIdentity.sourceCommit !== sourceCommit) {
    throw new Error("Manifest source commit does not match the committed canonical app source");
  }
  if (manifest.sourceIdentity.resultingAppTree !== resultingAppTree) {
    throw new Error("Manifest app tree does not match the committed canonical app source");
  }
  if (JSON.stringify(manifestSources) !== JSON.stringify(auditedSources)) {
    throw new Error("Manifest mirror hashes or file inventory do not match the current canonical source");
  }
  if (manifest.mirror.domainOverride.sha256 !== sha256(domainOverride)) {
    throw new Error("Manifest domain override hash does not match the current override");
  }
  console.log(JSON.stringify({
    parentCommit,
    sourceCommit,
    resultingAppTree,
    sourceFiles: sourceFiles.length,
    testFiles: testFiles.length,
    rawByteDifferences: [...sourceFiles, ...testFiles].filter((file) => !file.rawBytesEqual).length,
    normalizedParityFailures: 0,
    domainOverride: {
      path: domainOverridePath,
      sha256: sha256(domainOverride),
      canonicalUrl: "https://yorayriniwnl.in",
    },
  }, null, 2));
  process.exit(0);
}

const manifest = {
  schemaVersion: 1,
  sourceIdentity: {
    parentCommit,
    sourceCommit,
    acceptedInputCommit,
    acceptedInputAppTree,
    resultingAppTree,
  },
  mirror: {
    sourceRoot: "app",
    deliveryRoot: "yorayriniwnl.in",
    sourceFiles,
    testFiles,
    domainOverride: {
      path: domainOverridePath,
      canonicalUrl: "https://yorayriniwnl.in",
      reason: "Intentional domain-specific canonical metadata, robots, and sitemap origin.",
      sha256: sha256(domainOverride),
      appDefaultSha256: sha256(appDefault),
    },
    excludedOrGeneratedPaths: [
      "node_modules/",
      ".next/",
      ".accepted-source-stage/",
      "test-results*/",
      "playwright-report/",
      "evidence/",
      "*.tsbuildinfo",
      ".env* (except .env.example)",
      "AGENTS.md",
      "CLAUDE.md",
      "local-next.stderr.log",
      "local-next.stdout.log",
      "/index.html",
      "/styles.css",
      "/favicon.svg",
      "/robots.txt",
      "/sitemap.xml",
      "/about/",
      "/contact/",
      "/projects/",
      "/resume/",
    ],
  },
};

const manifestPath = path.join(domainRoot, "source-delivery-manifest.json");
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
writeFileSync(
  path.join(evidenceDirectory, "source-delivery-manifest-generation.json"),
  `${JSON.stringify({
    parentCommit,
    sourceCommit,
    sourceFiles: sourceFiles.length,
    testFiles: testFiles.length,
    appTree: resultingAppTree,
    domainOverrideSha256: sha256(domainOverride),
    normalizedParityFailures: 0,
    manifestPath: "yorayriniwnl.in/source-delivery-manifest.json",
  }, null, 2)}\n`,
  "utf8"
);
console.log(JSON.stringify({
  manifestPath: "yorayriniwnl.in/source-delivery-manifest.json",
  sourceFiles: sourceFiles.length,
  testFiles: testFiles.length,
  resultingAppTree,
  rawByteDifferences: [...sourceFiles, ...testFiles].filter((file) => !file.rawBytesEqual).length,
  normalizedParityFailures: 0,
}, null, 2));
