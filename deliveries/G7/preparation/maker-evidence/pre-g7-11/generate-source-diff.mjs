import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const evidenceDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(evidenceDirectory, "../../../../../");
const parentCommit = "9da8f5632cb0c54fe148f7a4995a52eb6735f410";
const sourceCommit = "cfdc744f69cd257c8ac0cbaad78b8805c48f20d5";
const canonicalAppDiff = execFileSync("git", ["diff", "--binary", `${parentCommit}..${sourceCommit}`, "--", "app"], { cwd: root, maxBuffer: 64 * 1024 * 1024 });
const domainDeliveryDiff = execFileSync("git", ["diff", "--binary", sourceCommit, "--", "yorayriniwnl.in"], { cwd: root, maxBuffer: 64 * 1024 * 1024 });
const output = Buffer.concat([canonicalAppDiff, domainDeliveryDiff]);
writeFileSync(path.join(evidenceDirectory, "scoped-source.patch"), output);
process.stdout.write(JSON.stringify({
  parentCommit,
  sourceCommit,
  canonicalAppDiffBytes: canonicalAppDiff.length,
  domainDeliveryDiffBytes: domainDeliveryDiff.length,
  outputPath: "deliveries/G7/preparation/maker-evidence/pre-g7-11/scoped-source.patch",
}, null, 2) + "\n");
