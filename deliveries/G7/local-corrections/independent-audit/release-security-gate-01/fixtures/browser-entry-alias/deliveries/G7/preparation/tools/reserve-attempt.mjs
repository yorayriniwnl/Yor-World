import fs from "node:fs";
import path from "node:path";

function pathIdentity(target) {
  return process.platform === "win32" ? target.toLowerCase() : target;
}

/**
 * Exclusively reserves a fresh observation receipt and raw artifact directory.
 * Prevents basename collisions, case alias collisions, symlink escapes,
 * and truncation of existing interrupted or prior attempt files.
 */
export function reserveAttempt(root, outputRelative, allowedPrefix = "deliveries/G7/evidence") {
  if (typeof outputRelative !== "string" || !outputRelative) {
    throw new Error("Output path must be a non-empty string");
  }
  const normalized = outputRelative.split("\\").join("/");
  if (normalized.startsWith("/") || normalized.split("/").some((part) => !part || part === "." || part === ".." || /[. ]$/.test(part))) {
    throw new Error(`Unsafe output path: ${outputRelative}`);
  }
  if (!normalized.startsWith(allowedPrefix + "/")) {
    throw new Error(`Output must stay inside ${allowedPrefix}: ${outputRelative}`);
  }
  const resolved = path.resolve(root, outputRelative);
  const expectedPrefix = path.resolve(root, allowedPrefix);
  if (!resolved.startsWith(expectedPrefix + path.sep)) {
    throw new Error(`Output escapes allowed directory: ${outputRelative}`);
  }

  const dir = path.dirname(resolved);
  const base = path.basename(resolved);
  const ext = path.extname(base);
  const stem = ext ? base.slice(0, -ext.length) : base;

  // Verify parent directory exists or create it safely
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Check for existing receipt or basename collisions in the parent directory
  const existingEntries = fs.readdirSync(dir);
  for (const entry of existingEntries) {
    if (pathIdentity(entry) === pathIdentity(base)) {
      throw new Error(`Existing live receipt must be preserved: ${outputRelative}`);
    }
    // Basename collision: another file with the same stem but different extension or case
    const entryExt = path.extname(entry);
    const entryStem = entryExt ? entry.slice(0, -entryExt.length) : entry;
    if (pathIdentity(entryStem) === pathIdentity(stem) && pathIdentity(entry) !== pathIdentity(base)) {
      if (!entry.endsWith("-raw")) {
        throw new Error(`Basename collision with existing file: ${entry}`);
      }
    }
  }

  // Derive unique raw artifact directory bound to the receipt
  const artifactDir = resolved.slice(0, ext ? -ext.length : undefined) + "-raw";
  const artifactBase = path.basename(artifactDir);

  for (const entry of existingEntries) {
    if (pathIdentity(entry) === pathIdentity(artifactBase)) {
      throw new Error(`Raw artifact directory already exists; preserve historical attempt: ${path.relative(root, artifactDir)}`);
    }
  }

  // Exclusively create raw artifact directory
  fs.mkdirSync(artifactDir);
  const stat = fs.lstatSync(artifactDir);
  if (stat.isSymbolicLink()) {
    throw new Error(`Artifact directory must not be a symbolic link: ${artifactDir}`);
  }

  return {
    output: resolved,
    artifactDir,
    relativeOutput: normalized,
    relativeArtifactDir: path.relative(root, artifactDir).split(path.sep).join("/"),
    writeArtifact(filename, bytes) {
      const target = path.join(artifactDir, filename);
      if (fs.existsSync(target)) {
        throw new Error(`Cannot overwrite existing raw artifact: ${filename}`);
      }
      fs.writeFileSync(target, bytes, { flag: "wx" });
      return target;
    },
    writeReceipt(data) {
      if (fs.existsSync(resolved)) {
        throw new Error(`Cannot overwrite existing receipt: ${outputRelative}`);
      }
      fs.writeFileSync(resolved, JSON.stringify(data, null, 2) + "\n", { flag: "wx" });
    },
  };
}
