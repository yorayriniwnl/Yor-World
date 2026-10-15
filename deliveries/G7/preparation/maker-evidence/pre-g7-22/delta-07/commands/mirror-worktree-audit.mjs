import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const manifest = JSON.parse(await readFile(path.join(root, "yorayriniwnl.in/source-delivery-manifest.json"), "utf8"));
const override = manifest.mirror.domainOverride.path;
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const normalize = (bytes) => Buffer.from(bytes.toString("utf8").replace(/\r\n?/g, "\n"), "utf8");
const rows = [];

for (const [kind, entries] of [["source", manifest.mirror.sourceFiles], ["test", manifest.mirror.testFiles]]) {
  for (const entry of entries) {
    const source = await readFile(path.join(root, entry.sourcePath));
    const domain = await readFile(path.join(root, "yorayriniwnl.in", entry.domainPath));
    const normalizedEqual = normalize(source).equals(normalize(domain));
    rows.push({
      kind,
      sourcePath: entry.sourcePath,
      domainPath: entry.domainPath,
      rawBytesEqual: source.equals(domain),
      normalizedContentEqual: normalizedEqual,
      intentionalOverride: entry.domainPath === override,
      sourceSha256: sha256(source),
      domainSha256: sha256(domain),
    });
  }
}

const overrideSource = await readFile(path.join(root, "app", override));
const overrideDomain = await readFile(path.join(root, "yorayriniwnl.in", override));
const mismatches = rows.filter((row) => !row.normalizedContentEqual && !row.intentionalOverride);
const result = {
  status: mismatches.length === 0 ? "PASS" : "FAIL",
  sourceCount: manifest.mirror.sourceFiles.length,
  testCount: manifest.mirror.testFiles.length,
  normalizedMismatchCount: mismatches.length,
  mismatches,
  override: {
    path: override,
    sourceSha256: sha256(overrideSource),
    domainSha256: sha256(overrideDomain),
    intentionallyDifferent: !normalize(overrideSource).equals(normalize(overrideDomain)),
  },
  files: rows,
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (mismatches.length) process.exitCode = 1;
