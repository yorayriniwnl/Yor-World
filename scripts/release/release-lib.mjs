import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import zlib from "node:zlib";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const POLICY_PATH = "scripts/release/rc3-policy.json";
export const policy = JSON.parse(fs.readFileSync(path.join(ROOT, POLICY_PATH), "utf8"));
export const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
export const normalized = (bytes) => Buffer.from(bytes.toString("utf8").replace(/\r\n/g, "\n"));
export const isText = (name) => /\.(?:[cm]?[jt]sx?|json|ya?ml|md|txt|log|css|html|sql|svg|patch|toml|example)$/.test(name) || /(?:^|\/)(?:\.gitignore|\.npmrc)$/.test(name);
export function safePath(name) {
  if (typeof name !== "string" || !name || name.includes("\\") || name.includes("\0") || /^[A-Za-z]:/.test(name) || path.isAbsolute(name) || name.split("/").some((p) => p === ".." || p === "." || !p)) throw new Error(`Unsafe repository path: ${name}`);
  const resolved = path.resolve(ROOT, name);
  if (!resolved.startsWith(ROOT + path.sep)) throw new Error(`Path escapes repository: ${name}`);
  let existing = resolved;
  while (!fs.existsSync(existing)) existing = path.dirname(existing);
  const real = fs.realpathSync(existing);
  const relative = path.relative(fs.realpathSync(ROOT), real);
  if (relative.startsWith(".." + path.sep) || relative === ".." || path.isAbsolute(relative)) throw new Error(`Symlink escapes repository: ${name}`);
  return resolved;
}
export const readJson = (name) => JSON.parse(fs.readFileSync(safePath(name), "utf8"));
export function writeJson(name, value) {
  const target = safePath(name);
  if (name.startsWith("deliveries/C4/")) throw new Error("Historical C4 evidence is immutable");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(value, null, 2) + "\n");
}
export const git = (...args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim();
export function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((item) => {
    const full = path.join(directory, item.name);
    if (item.isSymbolicLink()) throw new Error(`Symlink is forbidden: ${full}`);
    return item.isDirectory() ? walk(full) : [full];
  }).sort();
}
export function bundleIncluded(name) {
  if (name === POLICY_PATH) return true;
  if (!name.startsWith(policy.canonicalApplicationRoot + "/")) return false;
  const parts = name.split("/");
  if (parts.some((part) => policy.bundle.excludedDirectories.includes(part))) return false;
  const base = parts.at(-1);
  if (base.startsWith(".env") && base !== ".env.example") return false;
  return !policy.bundle.excludedFilePatterns.some((pattern) => new RegExp(pattern).test(name));
}
export function sourceEntries(commit) {
  if (!/^[a-f0-9]{40}$/.test(commit) || /^0+$/.test(commit)) throw new Error("sourceCommit must be a full non-placeholder Git SHA");
  if (git("cat-file", "-t", commit) !== "commit") throw new Error("sourceCommit is not a Git commit");
  git("merge-base", "--is-ancestor", commit, "HEAD");
  const output = execFileSync("git", ["ls-tree", "-rz", commit, "--", policy.canonicalApplicationRoot, POLICY_PATH], { cwd: ROOT, encoding: "utf8" });
  const entries = output.split("\0").filter(Boolean).map((record) => {
    const [metadata, name] = record.split("\t");
    const [mode, type, object] = metadata.split(" ");
    if (type !== "blob" || !["100644", "100755"].includes(mode)) throw new Error(`Unsupported source entry: ${name}`);
    return { name, mode, object };
  }).filter(({ name }) => bundleIncluded(name)).sort((a, b) => a.name.localeCompare(b.name, "en"));
  if (entries.length === 0) throw new Error("Canonical application is absent from sourceCommit");
  return entries;
}
export function verifySourceTree(commit) {
  const entries = sourceEntries(commit);
  const protectedPaths = [policy.canonicalApplicationRoot, "scripts/release", ".github/workflows/ci.yml"];
  const changes = git("diff", "--name-only", commit, "HEAD", "--", ...protectedPaths);
  if (changes) throw new Error(`Candidate implementation changed after sourceCommit:\n${changes}`);
  for (const { name, object } of entries) {
    const bytes = fs.readFileSync(safePath(name));
    const blob = execFileSync("git", ["cat-file", "blob", object], { cwd: ROOT });
    if (!bytes.equals(blob) && !(isText(name) && normalized(bytes).equals(blob))) throw new Error(`Working tree differs from sourceCommit: ${name}`);
  }
  const protectedOutput = execFileSync("git", ["ls-tree", "-rz", commit, "--", "scripts/release", ".github/workflows/ci.yml"], { cwd: ROOT, encoding: "utf8" });
  for (const record of protectedOutput.split("\0").filter(Boolean)) {
    const [metadata, name] = record.split("\t");
    const [mode, type, object] = metadata.split(" ");
    if (type !== "blob" || !["100644", "100755"].includes(mode)) throw new Error(`Unsupported implementation entry: ${name}`);
    const bytes = fs.readFileSync(safePath(name));
    const blob = execFileSync("git", ["cat-file", "blob", object], { cwd: ROOT });
    if (!bytes.equals(blob) && !(isText(name) && normalized(bytes).equals(blob))) throw new Error(`Working implementation differs from sourceCommit: ${name}`);
  }
  const dirty = git("diff", "--name-only", "HEAD", "--", ...protectedPaths);
  if (dirty) throw new Error(`Candidate implementation has uncommitted changes:\n${dirty}`);
  const untracked = git("ls-files", "--others", "--exclude-standard", "--", policy.canonicalApplicationRoot, "scripts/release");
  if (untracked.split("\n").filter(Boolean).some(bundleIncluded)) throw new Error(`Uncommitted candidate files:\n${untracked}`);
  return entries;
}
function tarHeader(name, size, mode) {
  const header = Buffer.alloc(512);
  let shortName = name;
  let prefix = "";
  if (Buffer.byteLength(name) > 100) {
    const split = name.lastIndexOf("/");
    shortName = name.slice(split + 1);
    prefix = name.slice(0, split);
  }
  if (Buffer.byteLength(shortName) > 100 || Buffer.byteLength(prefix) > 155) throw new Error(`USTAR path too long: ${name}`);
  const put = (value, start, length) => header.write(value, start, length, "utf8");
  const octal = (value, start, length) => put(value.toString(8).padStart(length - 1, "0") + "\0", start, length);
  put(shortName, 0, 100); octal(mode === "100755" ? 0o755 : 0o644, 100, 8);
  octal(0, 108, 8); octal(0, 116, 8); octal(size, 124, 12); octal(0, 136, 12);
  put("        ", 148, 8); put("0", 156, 1); put("ustar\0", 257, 6); put("00", 263, 2); put(prefix, 345, 155);
  const checksum = header.reduce((sum, value) => sum + value, 0);
  put(checksum.toString(8).padStart(6, "0") + "\0 ", 148, 8);
  return header;
}
export function buildBundle(commit) {
  const entries = verifySourceTree(commit);
  const chunks = [];
  const files = [];
  for (const entry of entries) {
    const bytes = execFileSync("git", ["cat-file", "blob", entry.object], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
    chunks.push(tarHeader(entry.name, bytes.length, entry.mode), bytes, Buffer.alloc((512 - bytes.length % 512) % 512));
    files.push({ path: entry.name, bytes: bytes.length, sha256: sha256(bytes) });
  }
  chunks.push(Buffer.alloc(1024));
  const archive = zlib.gzipSync(Buffer.concat(chunks), { level: 9, mtime: 0 });
  archive[9] = 255; // Platform-independent gzip OS byte; USTAR has zero timestamps/UID/GID.
  return { archive, files, fileCount: files.length, sha256: sha256(archive), bytes: archive.length };
}
export function assetFiles() {
  const publicRoot = safePath(policy.canonicalApplicationRoot + "/public");
  const files = walk(publicRoot).filter((name) => /\.glb$/i.test(name)).map((full) => {
    const relative = path.relative(ROOT, full).split(path.sep).join("/");
    const bytes = fs.readFileSync(full);
    const hash = sha256(bytes);
    const accepted = policy.acceptedAssets.find((item) => item.sha256 === hash && item.bytes === bytes.length);
    if (!accepted) throw new Error(`Asset is outside accepted freeze: ${relative} (${hash})`);
    return { path: relative, url: "/" + path.relative(publicRoot, full).split(path.sep).join("/"), bytes: bytes.length, sha256: hash, accepted };
  });
  for (const name of policy.requiredProductionModels) {
    if (!files.some((item) => item.url === "/models/" + name)) throw new Error(`Missing frozen production asset: /models/${name}`);
  }
  if (!files.length) throw new Error("Canonical application has no GLB assets");
  return files;
}
