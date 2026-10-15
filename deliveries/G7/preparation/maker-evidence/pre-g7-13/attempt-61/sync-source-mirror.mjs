import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const mirrorRoot = path.join(root, "yorayriniwnl.in");
const manifestPath = path.join(mirrorRoot, "source-delivery-manifest.json");
const readmePath = path.join(mirrorRoot, "README.md");
const evidencePath = "deliveries/G7/preparation/maker-evidence/pre-g7-13/attempt-61/final-mirror-sync-audit.json";
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const normalizedSha256 = (bytes) => sha256(Buffer.from(bytes.toString("utf8").replace(/\r\n?/g, "\n"), "utf8"));
const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const appTree = execFileSync("git", ["rev-parse", "HEAD:app"], { cwd: root, encoding: "utf8" }).trim();
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const overridePath = manifest.mirror.domainOverride.path;

for (const [kind, entries] of [["source", manifest.mirror.sourceFiles], ["test", manifest.mirror.testFiles]]) {
  for (const entry of entries) {
    const sourcePath = path.join(root, entry.sourcePath);
    const mirrorPath = path.join(mirrorRoot, entry.domainPath);
    const sourceBytes = await readFile(sourcePath);
    if (entry.domainPath !== overridePath) {
      await mkdir(path.dirname(mirrorPath), { recursive: true });
      await copyFile(sourcePath, mirrorPath);
    }
    const mirrorBytes = await readFile(mirrorPath);
    const sourceHash = sha256(sourceBytes);
    const mirrorHash = sha256(mirrorBytes);
    Object.assign(entry, {
      sourceSha256: sourceHash,
      domainSha256: mirrorHash,
      normalizedSha256: normalizedSha256(sourceBytes),
      rawBytesEqual: sourceHash === mirrorHash,
      normalizedContentEqual: normalizedSha256(sourceBytes) === normalizedSha256(mirrorBytes),
    });
    if (entry.domainPath !== overridePath && !entry.normalizedContentEqual) {
      throw new Error(`Mirror mismatch after sync: ${kind} ${entry.sourcePath}`);
    }
  }
}

const readme = `# yorayriniwnl.in\n\nThis folder mirrors the canonical YOR WORLD application source in \`app/\`, with the intentional domain URL override at \`src/config/public-base-url.ts\`. The local runtime is Node 24.19.0 with pnpm 9.15.9.\n\nThe current PRE-G7-13 local candidate is bound to source commit \`${sourceCommit}\` and app tree \`${appTree}\`. Attempt-60 desktop and mobile captures document the scene candidate; attempt-61 records the mobile camera endpoint precision correction and its verification.\n\nThis candidate is not accepted or deployed. Independent delta audit and parent acceptance remain pending; G7 remains not accepted. See \`source-delivery-manifest.json\` for source identity and parity hashes.\n`;
await writeFile(readmePath, readme, "utf8");

manifest.sourceIdentity.sourceCommit = sourceCommit;
manifest.sourceIdentity.resultingAppTree = appTree;
manifest.sourceIdentity.formalAcceptance = "pending independent delta audit and parent acceptance; maker does not self-accept";
manifest.mirror.domainOverride.sha256 = sha256(await readFile(path.join(mirrorRoot, overridePath)));
manifest.mirror.audit = {
  status: "PASS",
  sourceFiles: manifest.mirror.sourceFiles.length,
  testFiles: manifest.mirror.testFiles.length,
  rawParityFailures: [...manifest.mirror.sourceFiles, ...manifest.mirror.testFiles]
    .filter((entry) => entry.domainPath !== overridePath && !entry.rawBytesEqual).length,
  baseCommit: sourceCommit,
  readmeSha256: sha256(await readFile(readmePath)),
  evidence: evidencePath,
};
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  result: manifest.mirror.audit.rawParityFailures === 0 ? "PASS" : "FAIL",
  sourceCommit,
  appTree,
  sourceFiles: manifest.mirror.audit.sourceFiles,
  testFiles: manifest.mirror.audit.testFiles,
  rawParityFailures: manifest.mirror.audit.rawParityFailures,
  override: manifest.mirror.domainOverride,
}, null, 2));
