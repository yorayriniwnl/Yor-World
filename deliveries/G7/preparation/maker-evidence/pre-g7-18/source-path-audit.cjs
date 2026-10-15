const { readdirSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const { createHash } = require("node:crypto");
function walk(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(root, entry.name)) : [join(root, entry.name)]);
}
const orderedTraversal = walk("src").map(path => path.replace(/\\/g, "/"));
const sorted = [...orderedTraversal].sort();
const hash = value => createHash("sha256").update(value, "utf8").digest("hex");
const audit = {
  count: orderedTraversal.length,
  sortedPathSetSha256: hash(sorted.join("\n") + "\n"),
  traversalPathListSha256: hash(orderedTraversal.join("\n") + "\n"),
  sortedPaths: sorted,
  traversalPaths: orderedTraversal,
};
writeFileSync("../deliveries/G7/preparation/maker-evidence/pre-g7-18/source-path-audit.json", JSON.stringify(audit, null, 2) + "\n");
process.stdout.write(JSON.stringify({count:audit.count,sortedPathSetSha256:audit.sortedPathSetSha256,traversalPathListSha256:audit.traversalPathListSha256})+"\n");