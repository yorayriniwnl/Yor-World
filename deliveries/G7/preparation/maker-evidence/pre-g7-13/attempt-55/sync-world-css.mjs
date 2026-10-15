import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const sourcePath = "app/src/features/world/world.module.css";
const domainPath = "yorayriniwnl.in/src/features/world/world.module.css";
const manifestPath = "yorayriniwnl.in/source-delivery-manifest.json";
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const normalize = (bytes) => Buffer.from(bytes.toString("utf8").replace(/\r\n/g, "\n"), "utf8");

copyFileSync(path.join(root, sourcePath), path.join(root, domainPath));
const sourceBytes = readFileSync(path.join(root, sourcePath));
const domainBytes = readFileSync(path.join(root, domainPath));
if (!sourceBytes.equals(domainBytes)) throw new Error("World CSS mirror is not byte-identical");

const manifest = JSON.parse(readFileSync(path.join(root, manifestPath), "utf8"));
const baseline = JSON.parse(execFileSync("git", ["show", `HEAD:${manifestPath}`], { cwd: root, encoding: "utf8" }));
const sourceRow = manifest.mirror.sourceFiles.find((row) => row.sourcePath === sourcePath && row.domainPath === "src/features/world/world.module.css");
if (!sourceRow) throw new Error("World CSS source-delivery manifest row is missing");
sourceRow.sourceSha256 = sha256(sourceBytes);
sourceRow.domainSha256 = sha256(domainBytes);
sourceRow.normalizedSha256 = sha256(normalize(sourceBytes));
sourceRow.rawBytesEqual = true;
sourceRow.normalizedContentEqual = true;

const withoutTarget = (value) => {
  const copy = JSON.parse(JSON.stringify(value));
  copy.mirror.sourceFiles = copy.mirror.sourceFiles.filter((row) => !(row.sourcePath === sourcePath && row.domainPath === "src/features/world/world.module.css"));
  return copy;
};
if (JSON.stringify(withoutTarget(manifest)) !== JSON.stringify(withoutTarget(baseline))) {
  throw new Error("Manifest changed beyond the World CSS row");
}
writeFileSync(path.join(root, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
process.stdout.write(JSON.stringify({
  status: "PASS",
  sourcePath,
  domainPath,
  rawBytesEqual: true,
  sourceSha256: sha256(sourceBytes),
  normalizedSha256: sha256(normalize(sourceBytes)),
  unchangedRowsPreserved: true,
}, null, 2) + "\n");
