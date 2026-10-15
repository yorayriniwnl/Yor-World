const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const evidenceRoot = __dirname;
const repoRoot = path.resolve(evidenceRoot, "..", "..", "..", "..", "..");
const appRoot = path.join(repoRoot, "app");
const nodeBin = path.dirname(process.execPath);
const pnpmEntry =
  "C:\\Users\\ayush\\AppData\\Local\\pnpm\\store\\v11\\links\\@\\pnpm\\9.15.9\\3d51f653a61d6f9b811790f44bb80b908ca8d24c424e6e53e491ea81b7f96a43\\node_modules\\pnpm\\bin\\pnpm.cjs";
const pnpmPackage = path.resolve(pnpmEntry, "..", "..", "package.json");
const pnpmVersion = JSON.parse(fs.readFileSync(pnpmPackage, "utf8")).version;

const labels = {
  install: {
    directory: "setup",
    filename: "install",
    args: ["install", "--offline", "--frozen-lockfile"],
    displayCommand: "pnpm install --offline --frozen-lockfile",
  },
  build: {
    directory: "build",
    filename: "build",
    args: ["run", "build"],
    displayCommand: "pnpm run build",
  },
};

const label = process.argv[2];
if (!labels[label] || process.argv.length !== 3) {
  throw new Error("Use exactly one label: install or build.");
}
if (process.version !== "v24.19.0" || pnpmVersion !== "9.15.9") {
  throw new Error(`Unexpected toolchain: ${process.version} / pnpm ${pnpmVersion}`);
}

const phase = labels[label];
const outputDir = path.join(evidenceRoot, phase.directory);
const startMs = Date.now();
const startUtc = new Date(startMs).toISOString();
const env = { ...process.env };
env.PATH = `${nodeBin}${path.delimiter}${env.PATH || ""}`;

const child = spawn(process.execPath, [pnpmEntry, ...phase.args], {
  cwd: appRoot,
  env,
  windowsHide: true,
  stdio: ["ignore", "pipe", "pipe"],
});

const stdout = [];
const stderr = [];
child.stdout.on("data", (chunk) => stdout.push(Buffer.from(chunk)));
child.stderr.on("data", (chunk) => stderr.push(Buffer.from(chunk)));

child.on("error", (error) => {
  stderr.push(Buffer.from(`${error.stack || error}\n`, "utf8"));
});

child.on("close", async (exitCode, signal) => {
  const endMs = Date.now();
  const stdoutPath = path.join(outputDir, `${phase.filename}.stdout.log`);
  const stderrPath = path.join(outputDir, `${phase.filename}.stderr.log`);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(stdoutPath, Buffer.concat(stdout));
  fs.writeFileSync(stderrPath, Buffer.concat(stderr));

  const receipt = {
    label,
    command: phase.displayCommand,
    argv: phase.args,
    workingDirectory: appRoot,
    runner: __filename,
    node: { version: process.version, executable: process.execPath },
    pnpm: { version: pnpmVersion, entry: pnpmEntry },
    childRuntimeResolution: {
      pinnedNodeDirectoryPrependedToPath: nodeBin,
      otherEnvironmentChanges: "none",
    },
    startedAtUtc: startUtc,
    finishedAtUtc: new Date(endMs).toISOString(),
    elapsedMs: endMs - startMs,
    exitCode,
    signal,
    result: exitCode === 0 && !signal ? "PASS" : "FAIL",
    stdout: path.relative(evidenceRoot, stdoutPath).replaceAll("\\", "/"),
    stderr: path.relative(evidenceRoot, stderrPath).replaceAll("\\", "/"),
  };
  const receiptPath = path.join(outputDir, `${phase.filename}-run.json`);
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(receipt)}\n`);
  process.exitCode = receipt.result === "PASS" ? 0 : 1;
});
