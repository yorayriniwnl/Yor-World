import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import zlib from "node:zlib";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const POLICY_PATH = "scripts/release/rc6-policy.json";
export const policy = JSON.parse(fs.readFileSync(path.join(ROOT, POLICY_PATH), "utf8"));
export const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
export const normalized = (bytes) => Buffer.from(bytes.toString("utf8").replace(/\r\n/g, "\n"));
export const isText = (name) => /\.(?:[cm]?[jt]sx?|json|ya?ml|md|txt|log|css|html|sql|svg|patch|toml|example)$/.test(name) || /(?:^|\/)(?:\.gitignore|\.npmrc)$/.test(name);
function filesystemTarget(target) {
  let existing = target;
  const missing = [];
  for (;;) {
    try {
      // lstat also detects dangling links, which must fail realpath rather than
      // being mistaken for an ordinary missing output directory.
      fs.lstatSync(existing);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      const parent = path.dirname(existing);
      if (parent === existing) throw error;
      missing.unshift(path.basename(existing));
      existing = parent;
      continue;
    }
    return path.resolve(fs.realpathSync.native(existing), ...missing);
  }
}
function pathIdentity(target) {
  return process.platform === "win32" ? target.toLowerCase() : target;
}
function containsPath(directory, target) {
  const relative = path.relative(pathIdentity(directory), pathIdentity(target));
  return relative === "" || (relative !== ".." && !relative.startsWith(".." + path.sep) && !path.isAbsolute(relative));
}
function existingRegularFileIdentity(target) {
  try {
    const stat = fs.statSync(target, { bigint: true });
    return stat.isFile() ? { dev: stat.dev, ino: stat.ino, nlink: stat.nlink } : null;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}
function sameExistingFile(left, right) {
  const a = existingRegularFileIdentity(left);
  const b = existingRegularFileIdentity(right);
  return Boolean(a && b && a.dev === b.dev && a.ino === b.ino);
}
export function safePath(name) {
  if (typeof name !== "string" || !name || /[\\\x00-\x1f:<>"|?*]/.test(name) || path.isAbsolute(name) || name.split("/").some((p) => p === ".." || p === "." || !p || /[. ]$/.test(p) || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p))) throw new Error(`Unsafe repository path: ${name}`);
  const resolved = path.resolve(ROOT, name);
  if (!resolved.startsWith(ROOT + path.sep)) throw new Error(`Path escapes repository: ${name}`);
  if (!containsPath(fs.realpathSync.native(ROOT), filesystemTarget(resolved))) throw new Error(`Symlink escapes repository: ${name}`);
  return resolved;
}
export const readJson = (name) => JSON.parse(fs.readFileSync(safePath(name), "utf8"));
const immutableDirectories = [
  "deliveries/C4", "deliveries/G6/full-stack-integration",
  "deliveries/G6/rc4-candidate", "deliveries/G6/rc5-candidate",
  "deliveries/G7/rc6-candidate", "deliveries/G7/rc6-candidate-r2",
  "deliveries/G7/rc6-candidate-r3", "deliveries/G7/rc6-candidate-r4", "deliveries/G7/rc6-candidate-r5",
  "deliveries/G7/rc6-candidate-r6",
  "deliveries/G7/rc6-independent-delta/r6-audit",
  "deliveries/G7/rc6-independent-delta/gate-advice/final-r6",
  "docs/planning/reviews/2026-10-08-rc6-r1",
  "docs/planning/reviews/2026-10-06-g6-r1",
];
const immutableFiles = [
  "deliveries/G7/rc6-candidate-r7/release-composition.json",
  "deliveries/G7/rc6-candidate-r7/gltf-validation-receipt.json",
  "docs/planning/reviews/2026-10-06-g6-r1.md",
  "docs/planning/reviews/2026-10-08-rc6-r1.md",
  "docs/planning/reviews/2026-10-06-rc5-independent-full-stack-audit.md",
  ...[1, 2, 3, 4, 5].map((revision) => `docs/releases/v1.0.0-rc${revision}.md`),
];
export function assertMutableOutput(name) {
  const target = safePath(name);
  const realTarget = filesystemTarget(target);
  // Protect both the reserved names and their filesystem identities. The latter
  // catches contained junctions/symlinks, including not-yet-created descendants.
  const immutable = immutableDirectories.some((name) => {
    const reserved = path.resolve(ROOT, name);
    return containsPath(reserved, target) || containsPath(filesystemTarget(reserved), realTarget);
  }) || immutableFiles.some((name) => {
    const reserved = path.resolve(ROOT, name);
    return pathIdentity(reserved) === pathIdentity(target)
      || pathIdentity(filesystemTarget(reserved)) === pathIdentity(realTarget);
  });
  if (immutable) {
    throw new Error("Accepted RC1-RC5 evidence, audit and G6-R1 are immutable; original RC6, rejected R2, reconciled R3, canonical R4 and incoming R5 proof are preserved; accepted R6, RC6-R1 and its independent/major reviews are immutable");
  }
  const existing = existingRegularFileIdentity(target);
  if (existing && existing.nlink > 1n) {
    throw new Error(`Hard-linked release output is forbidden: ${name}`);
  }
  return target;
}
export function assertNoFileCollision(outputName, inputNames, message) {
  const output = safePath(outputName);
  const outputTarget = filesystemTarget(output);
  for (const inputName of inputNames.filter(Boolean)) {
    const input = safePath(inputName);
    const inputTarget = filesystemTarget(input);
    if (pathIdentity(outputTarget) === pathIdentity(inputTarget) || sameExistingFile(output, input)) {
      throw new Error(message);
    }
  }
  return output;
}
export function assertPolicyOutputs(candidate = policy) {
  const root = assertMutableOutput(candidate.deliveryRoot);
  const archive = assertMutableOutput(candidate.bundle?.path);
  if (!candidate.deliveryRoot.startsWith("deliveries/G7/")
    || candidate.bundle.path !== `${candidate.deliveryRoot}/yor-world-${candidate.releaseId}.bundle.tar.gz`) {
    throw new Error("Archive output policy must bind the canonical bundle inside the current deliveryRoot");
  }
  if (pathIdentity(filesystemTarget(root)) !== pathIdentity(root)
    || pathIdentity(filesystemTarget(archive)) !== pathIdentity(archive)) {
    throw new Error("Archive output policy must use portable paths without filesystem aliases");
  }
  return { root, archive };
}
export function assertPolicyOutput(name, candidate = policy) {
  const { root } = assertPolicyOutputs(candidate);
  const target = assertMutableOutput(name);
  if (!name.startsWith(candidate.deliveryRoot + "/") || !containsPath(root, filesystemTarget(target))) {
    throw new Error("Release output must stay inside the policy deliveryRoot");
  }
  if (pathIdentity(filesystemTarget(target)) !== pathIdentity(target)) {
    throw new Error("Release output must use a portable path without filesystem aliases");
  }
  return target;
}
export function assertUnoccupiedPolicyOutput(name, candidate = policy) {
  const target = assertPolicyOutput(name, candidate);
  try {
    fs.lstatSync(filesystemTarget(target));
  } catch (error) {
    if (error.code === "ENOENT") return target;
    throw error;
  }
  throw new Error(`Release output already exists; preserve the prior attempt: ${name}`);
}
export function writeJson(name, value) {
  const contents = JSON.stringify(value, null, 2) + "\n";
  let target = assertPolicyOutput(name);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  target = assertPolicyOutput(name);
  fs.writeFileSync(target, contents, { flag: "wx" });
  return target;
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
  const protectedPaths = [policy.canonicalApplicationRoot, "scripts/release", ".github/workflows"];
  const changes = git("diff", "--name-only", commit, "HEAD", "--", ...protectedPaths);
  if (changes) throw new Error(`Candidate implementation changed after sourceCommit:\n${changes}`);
  for (const { name, object } of entries) {
    const bytes = fs.readFileSync(safePath(name));
    const blob = execFileSync("git", ["cat-file", "blob", object], { cwd: ROOT });
    if (!bytes.equals(blob) && !(isText(name) && normalized(bytes).equals(blob))) throw new Error(`Working tree differs from sourceCommit: ${name}`);
  }
  const protectedOutput = execFileSync("git", ["ls-tree", "-rz", commit, "--", "scripts/release", ".github/workflows"], { cwd: ROOT, encoding: "utf8" });
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
  const untracked = git("ls-files", "--others", "--exclude-standard", "--", ...protectedPaths);
  if (untracked.split("\n").filter(Boolean).some((name) => bundleIncluded(name)
    || name.startsWith("scripts/release/") || name.startsWith(".github/workflows/"))) {
    throw new Error(`Uncommitted candidate files:\n${untracked}`);
  }
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
export function assertSchemaMigrationInventory(bundleFiles, candidate = policy) {
  const expected = candidate.schemaMigrationInventory;
  const prefix = `${candidate.canonicalApplicationRoot}/supabase/migrations/`;
  if (candidate.schemaRevision !== "20261009000000_schema_v3" || !Array.isArray(expected) || expected.length !== 4) {
    throw new Error("Schema-v3 policy must declare the exact ordered four-migration inventory");
  }
  const names = expected.map((item) => item?.path);
  if (new Set(names).size !== names.length || names.some((name) => typeof name !== "string" || !name.startsWith(prefix))) {
    throw new Error("Schema migration inventory paths must be unique canonical application paths");
  }
  const actual = bundleFiles.filter((item) => typeof item.path === "string"
    && item.path.startsWith(prefix) && /^[^/]+\.sql$/.test(item.path.slice(prefix.length)))
    .sort((left, right) => left.path.localeCompare(right.path, "en"));
  if (actual.length !== expected.length || actual.some((item, index) => item.path !== names[index])) {
    throw new Error("Candidate bundle migration files differ from the exact ordered schema-v3 inventory");
  }
  for (let index = 0; index < expected.length; index++) {
    const binding = expected[index];
    const file = actual[index];
    if (!Number.isSafeInteger(binding.bytes) || binding.bytes <= 0
        || !/^[a-f0-9]{64}$/.test(binding.sha256 || "")
        || file.bytes !== binding.bytes || file.sha256 !== binding.sha256) {
      throw new Error(`Candidate schema migration bytes/hash differ from policy: ${binding.path}`);
    }
  }
  if (!names.at(-1).includes("/20261009000000_")) {
    throw new Error("Schema-v3 forward migration must be the final ordered inventory entry");
  }
  return expected;
}

function exactKeys(value, keys) {
  return value && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function readBoundManifest(binding, expectedPath, expectedRevision, extraKeys = []) {
  if (!exactKeys(binding, ["path", "sha256", "hashMode", "revision", ...extraKeys])
      || binding.path !== expectedPath || binding.hashMode !== "raw"
      || binding.revision !== expectedRevision || !/^[a-f0-9]{64}$/.test(binding.sha256 || "")) {
    throw new Error(`Asset manifest binding is invalid: ${expectedPath}`);
  }
  const bytes = fs.readFileSync(safePath(binding.path));
  if (sha256(bytes) !== binding.sha256) throw new Error(`Raw asset manifest hash differs from policy: ${binding.path}`);
  try { return JSON.parse(bytes.toString("utf8")); }
  catch { throw new Error(`Bound asset manifest is not valid JSON: ${binding.path}`); }
}

export function readBoundAssetManifests(candidate = policy) {
  const manifestPath = `${candidate.canonicalApplicationRoot}/public/asset-manifest.json`;
  const revisionManifestPath = "deliveries/production-environment/revisions/local-corrections-r1/manifest.json";
  const manifest = readBoundManifest(candidate.assetManifestBinding, manifestPath, candidate.assetRevision, ["schemaVersion", "groupCount"]);
  const revisionManifest = readBoundManifest(candidate.artRevisionManifestBinding, revisionManifestPath, candidate.assetRevision);
  if (candidate.assetManifestBinding.schemaVersion !== manifest?.schemaVersion
      || candidate.assetManifestBinding.groupCount !== manifest?.groups?.length) {
    throw new Error("Public asset manifest binding does not match its declared schema/group count");
  }
  const allowedRevisionRoot = ["revision", "schemaVersion", "lane", "notice", "generatedAt", "groups", "gpuEstimateMethod", "evidence"];
  if (!exactKeys(revisionManifest, allowedRevisionRoot)
      || typeof revisionManifest.gpuEstimateMethod !== "string" || !revisionManifest.gpuEstimateMethod
      || typeof revisionManifest.evidence !== "string" || !revisionManifest.evidence) {
    throw new Error("Art revision manifest has an unexpected shape");
  }
  const common = ["revision", "schemaVersion", "lane", "notice", "generatedAt", "groups"];
  if (common.some((key) => stableJson(manifest?.[key]) !== stableJson(revisionManifest[key]))) {
    throw new Error("Public asset manifest differs from its art revision manifest");
  }
  return { manifest, revisionManifest };
}

export function validateVersionedAssetInventory(files, candidate, manifest) {
  const prefix = `${candidate.assetRevision}/`;
  const versionedFiles = files.filter((item) => item.url.startsWith(`/models/${prefix}`));
  const manifestVersionedNames = manifest.groups
    .filter((group) => group.url.startsWith(`/models/${prefix}`))
    .map((group) => group.url.slice("/models/".length));
  const declared = [...(candidate.candidateAssets || []), ...(candidate.retainedCandidateAssets || [])];
  const declaredNames = new Set();
  for (const item of declared) {
    if (!exactKeys(item, item.status === "candidate"
      ? ["filename", "sha256", "bytes", "triangles", "materials", "estimatedGpuBytes", "logicalAssetId", "revision", "tier", "clips", "provenanceId", "approved", "status"]
      : ["filename", "sha256", "bytes", "logicalAssetId", "revision"])
        || item.revision !== candidate.assetRevision || !item.filename.startsWith(prefix)
        || item.filename.includes("\\") || item.filename.split("/").some((part) => !part || part === "." || part === "..")
        || !/^[a-f0-9]{64}$/.test(item.sha256 || "") || !Number.isSafeInteger(item.bytes) || item.bytes <= 0
        || typeof item.logicalAssetId !== "string" || !item.logicalAssetId) {
      throw new Error("Versioned asset policy entry is malformed");
    }
    if (declaredNames.has(item.filename)) throw new Error(`Duplicate versioned asset policy path: ${item.filename}`);
    declaredNames.add(item.filename);
    const actual = files.find((file) => file.url === `/models/${item.filename}`);
    if (!actual || actual.sha256 !== item.sha256 || actual.bytes !== item.bytes) {
      throw new Error(`Versioned asset file differs from exact policy: ${item.filename}`);
    }
  }
  if (declaredNames.size !== versionedFiles.length || versionedFiles.some((file) => !declaredNames.has(file.url.slice("/models/".length)))) {
    throw new Error("Public versioned GLB inventory differs from candidate and retained policy entries");
  }
  const actualNames = versionedFiles.map((file) => file.url.slice("/models/".length)).sort();
  if (JSON.stringify(actualNames) !== JSON.stringify(manifestVersionedNames.sort())) {
    throw new Error("Public versioned GLB inventory differs from manifest-referenced asset URLs");
  }
}

export function assetFiles(candidate = policy) {
  const { manifest } = readBoundAssetManifests(candidate);
  validateActiveAssetManifest(manifest, candidate);
  const publicRoot = safePath(candidate.canonicalApplicationRoot + "/public");
  const knownAssets = [...(candidate.acceptedAssets || []), ...(candidate.retainedCandidateAssets || []), ...(candidate.candidateAssets || [])];
  const files = walk(publicRoot).filter((name) => /\.glb$/i.test(name)).map((full) => {
    const relative = path.relative(ROOT, full).split(path.sep).join("/");
    const bytes = fs.readFileSync(full);
    const hash = sha256(bytes);
    const filename = path.relative(path.join(publicRoot, "models"), full).split(path.sep).join("/");
    const accepted = knownAssets.find((item) => item.filename === filename && item.sha256 === hash && item.bytes === bytes.length);
    if (!accepted) throw new Error(`Asset is outside accepted freeze: ${relative} (${hash})`);
    return { path: relative, url: "/" + path.relative(publicRoot, full).split(path.sep).join("/"), bytes: bytes.length, sha256: hash, accepted };
  });
  for (const name of candidate.requiredProductionModels) {
    if (!files.some((item) => item.url === "/models/" + name)) throw new Error(`Missing frozen production asset: /models/${name}`);
  }
  if (!files.length) throw new Error("Canonical application has no GLB assets");
  validateVersionedAssetInventory(files, candidate, manifest);
  return files;
}

export function validateActiveAssetManifest(manifest, candidate = policy) {
  const rootKeys = ["revision", "schemaVersion", "lane", "notice", "generatedAt", "groups"];
  const groupKeys = ["id", "tier", "url", "sha256", "bytes", "triangles", "materials", "estimatedGpuBytes", "clips", "provenanceId", "approved", "status"];
  const requiredGroupKeys = groupKeys.filter((key) => key !== "status");
  if (!exactKeys(manifest, rootKeys) || manifest.schemaVersion !== 1
      || manifest.revision !== candidate.assetRevision || typeof manifest.lane !== "string" || !manifest.lane
      || typeof manifest.notice !== "string" || !manifest.notice
      || typeof manifest.generatedAt !== "string" || !Number.isFinite(Date.parse(manifest.generatedAt))
      || !Array.isArray(manifest.groups) || !manifest.groups.length || manifest.groups.length > 64
      || !Array.isArray(candidate.activeAssets) || candidate.activeAssets.length !== manifest.groups.length)
    throw new Error("Canonical active asset manifest/revision/inventory is invalid");
  const ids = new Set(); const urls = new Set();
  for (const [index, group] of manifest.groups.entries()) {
    if (!group || Object.keys(group).some((key) => !groupKeys.includes(key))
        || requiredGroupKeys.some((key) => !Object.hasOwn(group, key))
        || ids.has(group.id) || urls.has(group.url)
        || typeof group.id !== "string" || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(group.id)
        || !["high", "medium", "low", "static"].includes(group.tier) || typeof group.approved !== "boolean"
        || (group.status !== undefined && !["candidate", "approved"].includes(group.status))
        || (group.approved === false && group.status !== "candidate")
        || (group.approved === true && group.status === "candidate")
        || !Array.isArray(group.clips) || group.clips.some((clip) => typeof clip !== "string" || !clip)
        || new Set(group.clips).size !== group.clips.length
        || typeof group.provenanceId !== "string" || !group.provenanceId
        || !/^[a-f0-9]{64}$/.test(group.sha256 || "")
        || ["bytes", "triangles", "materials", "estimatedGpuBytes"].some((key) => !Number.isSafeInteger(group[key]) || group[key] < 0)
        || group.bytes <= 0
        || typeof group.url !== "string" || !/^\/models\/[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*\.glb$/.test(group.url)
        || group.url.split("/").slice(1).some((part) => !part || part === "." || part === ".."))
      throw new Error("Canonical active asset group is invalid or duplicated");
    ids.add(group.id); urls.add(group.url);
    const expected = candidate.activeAssets[index];
    const activeKeys = ["logicalAssetId", "url", "sha256", "bytes", "triangles", "materials", "estimatedGpuBytes", "revision", "tier", "clips", "provenanceId", "approved", "status"];
    if (!exactKeys(expected, activeKeys.filter((key) => key !== "status").concat(Object.hasOwn(expected || {}, "status") ? ["status"] : []))
        || expected.logicalAssetId !== group.id || expected.revision !== manifest.revision)
      throw new Error(`Active asset logical ID/revision is not bound: ${group.id}`);
    for (const key of ["url", "sha256", "bytes", "triangles", "materials", "estimatedGpuBytes", "tier", "provenanceId", "approved"])
      if (group[key] !== expected[key]) throw new Error(`Active asset ${group.id} differs from exact policy ${key}`);
    if (stableJson(group.clips) !== stableJson(expected.clips) || group.status !== expected.status)
      throw new Error(`Active asset ${group.id} differs from exact policy clips/status`);
    if (group.url.startsWith(`/models/${manifest.revision}/`)
        && !group.url.endsWith(`.${group.sha256}.glb`))
      throw new Error(`Versioned active asset ${group.id} URL must contain its full SHA-256`);
  }
  const candidates = manifest.groups.filter((group) => group.approved === false);
  if (candidates.length !== candidate.candidateAssets?.length) throw new Error("Active candidate groups differ from candidate asset inventory");
  for (const group of candidates) {
    const expected = candidate.candidateAssets.find((item) => item.logicalAssetId === group.id);
    if (!expected || expected.status !== "candidate" || expected.approved !== false
        || expected.filename !== group.url.slice("/models/".length))
      throw new Error(`Candidate asset ${group.id} lacks an exact unapproved versioned-file binding`);
    for (const key of ["sha256", "bytes", "triangles", "materials", "estimatedGpuBytes", "tier", "provenanceId"])
      if (group[key] !== expected[key]) throw new Error(`Candidate asset ${group.id} differs from exact file policy ${key}`);
    if (stableJson(group.clips) !== stableJson(expected.clips)) throw new Error(`Candidate asset ${group.id} clips differ from policy`);
  }
  return manifest;
}
