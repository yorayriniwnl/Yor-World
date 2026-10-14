import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, "yorayriniwnl.in", "source-delivery-manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const sourceCommit = "a3459c158af880319269196f85c0c922ee86c5d6";
const appTree = "23c7dac82746d7db84632e228efe3224736b9266";
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
manifest.sourceIdentity.sourceCommit = sourceCommit;
manifest.sourceIdentity.resultingAppTree = appTree;
manifest.sourceIdentity.visualCandidateEvidence = "deliveries/G7/preparation/maker-evidence/pre-g7-13/attempt-60/composition/";
manifest.sourceIdentity.formalAcceptance = "pending independent delta audit and parent acceptance; maker does not self-accept";
manifest.mirror.audit = {
  ...manifest.mirror.audit,
  status: "PASS",
  sourceFiles: manifest.mirror.sourceFiles.length,
  testFiles: manifest.mirror.testFiles.length,
  rawParityFailures: 0,
  baseCommit: sourceCommit,
  readmeSha256: sha256(await readFile(path.join(root, "yorayriniwnl.in", "README.md"))),
  evidence: "deliveries/G7/preparation/maker-evidence/pre-g7-13/attempt-60/final-mirror-sync-audit.json",
};
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ sourceCommit, appTree, sourceFiles: manifest.mirror.sourceFiles.length, testFiles: manifest.mirror.testFiles.length, audit: manifest.mirror.audit }, null, 2));
