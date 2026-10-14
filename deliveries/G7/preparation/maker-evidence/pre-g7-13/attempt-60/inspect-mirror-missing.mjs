import { access, readFile } from "node:fs/promises";
import path from "node:path";
const root = process.cwd();
const manifest = JSON.parse(await readFile(path.join(root, "yorayriniwnl.in/source-delivery-manifest.json"), "utf8"));
for (const kind of ["sourceFiles", "testFiles"]) {
  for (const entry of manifest.mirror[kind]) {
    try { await access(path.join(root, entry.sourcePath)); }
    catch { console.log(JSON.stringify({ kind, ...entry })); }
  }
}
