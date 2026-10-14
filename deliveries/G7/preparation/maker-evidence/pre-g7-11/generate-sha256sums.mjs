import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";

const sourceCommit = "cfdc744f69cd257c8ac0cbaad78b8805c48f20d5";
const requestedDeliveryCommit = process.argv[2] || "HEAD";
const deliveryCommit = execFileSync("git", ["rev-parse", "--verify", `${requestedDeliveryCommit}^{commit}`], { encoding: "utf8" }).trim();
const evidencePrefix = "deliveries/G7/preparation/maker-evidence/pre-g7-11/";
const sourcePaths = execFileSync("git", ["diff-tree", "--no-commit-id", "--name-only", "-r", sourceCommit], { encoding: "utf8" })
  .trim().split(/\r?\n/).filter(Boolean);
const deliveryPaths = execFileSync("git", ["diff-tree", "--no-commit-id", "--name-only", "-r", deliveryCommit], { encoding: "utf8" })
  .trim().split(/\r?\n/).filter(Boolean);
const stagedPaths = execFileSync("git", ["diff", "--cached", "--name-only"], { encoding: "utf8" })
  .trim().split(/\r?\n/).filter(Boolean);
const staged = new Set(stagedPaths);
const inScope = (path) => path.startsWith(evidencePrefix)
  || path.startsWith("yorayriniwnl.in/src/")
  || path.startsWith("yorayriniwnl.in/tests/")
  || path === "yorayriniwnl.in/README.md"
  || path === "yorayriniwnl.in/source-delivery-manifest.json"
  || (path.startsWith("app/") && sourcePaths.includes(path));
const paths = [...new Set([...sourcePaths, ...deliveryPaths, ...stagedPaths])]
  .filter((path) => inScope(path) && !path.endsWith("/SHA256SUMS.txt"))
  .sort();

const lines = paths.map((path) => {
  const objectRef = staged.has(path) ? `:${path}` : `HEAD:${path}`;
  const bytes = execFileSync("git", ["cat-file", "blob", objectRef], { maxBuffer: 64 * 1024 * 1024 });
  const digest = createHash("sha256").update(bytes).digest("hex");
  return `${digest}  ${path}`;
});

writeFileSync(`${evidencePrefix}SHA256SUMS.txt`, `${lines.join("\n")}\n`, "utf8");
process.stdout.write(`SHA256SUMS generated from ${paths.length} exact Git blob entries (staged paths over base commit ${deliveryCommit}).\n`);
