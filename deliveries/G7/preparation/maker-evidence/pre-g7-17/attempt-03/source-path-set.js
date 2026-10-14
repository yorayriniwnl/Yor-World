const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
function files(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(path.join(root, entry.name)) : [path.join(root, entry.name)]
  );
}
const discovered = files("src").map((file) => file.replace(/\\/g, "/"));
const sorted = [...discovered].sort();
const hash = (value) => crypto.createHash("sha256").update(value, "utf8").digest("hex");
console.log(`count=${discovered.length}`);
console.log(`sortedPathSetSha256=${hash(sorted.join("\n") + "\n")}`);
console.log(`traversalPathListSha256=${hash(discovered.join("\n") + "\n")}`);
console.log(sorted.join("\n"));