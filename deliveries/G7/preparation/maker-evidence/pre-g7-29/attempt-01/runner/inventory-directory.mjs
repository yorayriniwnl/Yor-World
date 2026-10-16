import { createReadStream } from "node:fs";
import { lstat, readdir, readlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

const root = path.resolve(process.argv[2] || "");
const output = path.resolve(process.argv[3] || "");
const label = process.argv[4] || "output";
const entries = [];
async function sha256(file) {
  const hash = createHash("sha256");
  await new Promise((resolve, reject) => {
    const stream = createReadStream(file);
    stream.on("data", chunk => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  return hash.digest("hex");
}
async function walk(current) {
  const children = await readdir(current, { withFileTypes: true });
  children.sort((a, b) => a.name.localeCompare(b.name, "en"));
  for (const child of children) {
    const absolute = path.join(current, child.name);
    const relative = path.relative(root, absolute).split(path.sep).join("/");
    if (child.isDirectory()) {
      await walk(absolute);
    } else if (child.isFile()) {
      const stat = await lstat(absolute);
      entries.push({ path: relative, type: "file", bytes: stat.size, sha256: await sha256(absolute) });
    } else if (child.isSymbolicLink()) {
      const target = await readlink(absolute);
      const bytes = Buffer.from(target, "utf8");
      entries.push({ path: relative, type: "symlink", target, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
    } else {
      throw new Error("Unsupported output entry: " + absolute);
    }
  }
}
await walk(root);
entries.sort((a, b) => a.path.localeCompare(b.path, "en"));
const canonical = entries.map(e => [e.path, e.type, e.bytes, e.sha256, e.target || ""].join("\0")).join("\n") + "\n";
const inventory = {
  schemaVersion: 1,
  generatedAtUtc: new Date().toISOString(),
  root: label,
  selfExclusion: "inventory output is outside the inventoried root",
  fileCount: entries.filter(e => e.type === "file").length,
  symlinkCount: entries.filter(e => e.type === "symlink").length,
  totalBytes: entries.reduce((sum, e) => sum + e.bytes, 0),
  canonicalInventorySha256: createHash("sha256").update(canonical).digest("hex"),
  entries,
};
await writeFile(output, JSON.stringify(inventory, null, 2) + "\n");
process.stdout.write(JSON.stringify({
  root: label,
  fileCount: inventory.fileCount,
  symlinkCount: inventory.symlinkCount,
  totalBytes: inventory.totalBytes,
  canonicalInventorySha256: inventory.canonicalInventorySha256,
  output,
}, null, 2) + "\n");