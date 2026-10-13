import fs from "node:fs";
import path from "node:path";

function identity(value) {
  return process.platform === "win32" ? value.toLowerCase() : value;
}

function validatePart(part, original) {
  if (!part || part === "." || part === ".." || /[\x00-\x1f<>:\"|?*]/.test(part)
      || part.includes("/") || part.includes("\\")
      || /[. ]$/.test(part) || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)) {
    throw new Error(`Unsafe output path: ${original}`);
  }
}

function normalizedParts(value, label) {
  if (typeof value !== "string" || !value) throw new Error(`${label} must be a non-empty string`);
  const normalized = value.replaceAll("\\", "/");
  if (normalized.startsWith("/") || /^[a-zA-Z]:/.test(normalized)) throw new Error(`Unsafe output path: ${value}`);
  const parts = normalized.split("/");
  for (const part of parts) validatePart(part, value);
  return { normalized, parts };
}

function assertPlainDirectory(target, root) {
  const stat = fs.lstatSync(target);
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error(`Output path contains a symlink, junction, or non-directory component: ${target}`);
  }
  const actual = fs.realpathSync.native(target);
  if (identity(actual) !== identity(target) || !isWithin(root, actual)) {
    throw new Error(`Output path contains a filesystem alias: ${target}`);
  }
}

function isWithin(parent, target) {
  const relative = path.relative(identity(parent), identity(target));
  return relative === "" || (relative !== ".." && !relative.startsWith(".." + path.sep) && !path.isAbsolute(relative));
}

/** Validate existing ancestors before creating any missing parent component. */
function ensureParent(root, components) {
  let current = root;
  let missingAt = components.length;
  for (let index = 0; index < components.length; index += 1) {
    current = path.join(current, components[index]);
    try {
      assertPlainDirectory(current, root);
    } catch (error) {
      if (error.code === "ENOENT") {
        missingAt = index;
        break;
      }
      throw error;
    }
  }
  for (let index = missingAt; index < components.length; index += 1) {
    current = path.join(index === missingAt ? root : path.join(root, ...components.slice(0, index)), components[index]);
    try {
      fs.mkdirSync(current);
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
    assertPlainDirectory(current, root);
  }
  return path.join(root, ...components);
}

function lstatIfPresent(target) {
  try { return fs.lstatSync(target); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

function ensureArtifactDirectory(target, root) {
  assertPlainDirectory(target, root);
}

function writeExclusive(target, bytes, message) {
  if (lstatIfPresent(target)) throw new Error(message);
  try {
    fs.writeFileSync(target, bytes, { flag: "wx" });
  } catch (error) {
    if (error.code === "EEXIST") throw new Error(message);
    throw error;
  }
}

/**
 * Exclusively reserves a fresh observation receipt and raw artifact directory.
 * Rejects path aliases and preserves existing receipts and interrupted attempts.
 */
export function reserveAttempt(root, outputRelative, allowedPrefix = "deliveries/G7/evidence") {
  const rootInput = path.resolve(root);
  const rootStat = fs.lstatSync(rootInput);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) throw new Error("Workspace root must be a real directory");
  const canonicalRoot = fs.realpathSync.native(rootInput);
  if (identity(canonicalRoot) !== identity(rootInput)) throw new Error("Workspace root must not be a filesystem alias");

  const output = normalizedParts(outputRelative, "Output path");
  const prefix = normalizedParts(allowedPrefix, "Allowed output prefix");
  if (prefix.parts.length >= output.parts.length
      || prefix.parts.some((part, index) => identity(part) !== identity(output.parts[index]))) {
    throw new Error(`Output must stay inside ${allowedPrefix}: ${outputRelative}`);
  }
  const parentParts = output.parts.slice(0, -1);
  const dir = ensureParent(canonicalRoot, parentParts);
  const base = output.parts.at(-1);
  const ext = path.extname(base);
  const stem = ext ? base.slice(0, -ext.length) : base;
  const artifactBase = `${stem}-raw`;
  const artifactDir = path.join(dir, artifactBase);

  const existingEntries = fs.readdirSync(dir);
  for (const entry of existingEntries) {
    if (identity(entry) === identity(base)) {
      throw new Error(`Existing live receipt must be preserved: ${outputRelative}`);
    }
  }
  for (const entry of existingEntries) {
    const entryExt = path.extname(entry);
    const entryStem = entryExt ? entry.slice(0, -entryExt.length) : entry;
    if (identity(entryStem) === identity(stem) && identity(entry) !== identity(base) && !entry.endsWith("-raw")) {
      throw new Error(`Basename collision with existing file: ${entry}`);
    }
  }
  for (const entry of existingEntries) {
    if (identity(entry) === identity(artifactBase)) {
      throw new Error(`Raw artifact directory already exists; preserve historical attempt: ${path.relative(canonicalRoot, artifactDir)}`);
    }
  }

  // mkdir is the atomic reservation. Any pre-existing/interrupted attempt is retained.
  try { fs.mkdirSync(artifactDir); }
  catch (error) {
    if (error.code === "EEXIST") {
      throw new Error(`Raw artifact directory already exists; preserve historical attempt: ${path.relative(canonicalRoot, artifactDir)}`);
    }
    throw error;
  }
  ensureArtifactDirectory(artifactDir, canonicalRoot);

  const resolvedOutput = path.join(dir, base);
  return {
    output: resolvedOutput,
    artifactDir,
    relativeOutput: output.normalized,
    relativeArtifactDir: path.relative(canonicalRoot, artifactDir).split(path.sep).join("/"),
    writeArtifact(filename, bytes) {
      validatePart(filename, filename);
      ensureArtifactDirectory(artifactDir, canonicalRoot);
      const target = path.join(artifactDir, filename);
      writeExclusive(target, bytes, `Cannot overwrite existing raw artifact: ${filename}`);
      return target;
    },
    writeReceipt(data) {
      ensureParent(canonicalRoot, parentParts);
      ensureArtifactDirectory(artifactDir, canonicalRoot);
      writeExclusive(resolvedOutput, JSON.stringify(data, null, 2) + "\n", `Cannot overwrite existing receipt: ${outputRelative}`);
    },
  };
}
