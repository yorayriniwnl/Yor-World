const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "../../../../../../");
const relativePaths = [
  "app/tests/unit/boundaries.test.ts",
  "yorayriniwnl.in/tests/unit/boundaries.test.ts",
];
const source = fs.readFileSync(path.join(repoRoot, relativePaths[0]), "utf8");
const mirror = fs.readFileSync(path.join(repoRoot, relativePaths[1]), "utf8");
function gitBlob(relativePath) {
  const result = spawnSync("git", ["hash-object", "--", relativePath], { cwd: repoRoot, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || `git hash-object failed for ${relativePath}`);
  return result.stdout.trim();
}
const beforeBlobs = relativePaths.map(gitBlob);
if (beforeBlobs[0] !== beforeBlobs[1]) throw new Error(`test/mirror baseline blobs differ: ${beforeBlobs.join(" / ")}`);

const insert = `
interface DiagnosticTimingStart {
  wallStart: number;
  cpuStart: NodeJS.CpuUsage;
}

interface DiagnosticTimingTotal {
  calls: number;
  wallMs: number;
  userCpuMicroseconds: number;
  systemCpuMicroseconds: number;
}

const diagnosticTimingEnabled = process.env.PRE_G7_19_BOUNDARY_TIMING === "1";
const diagnosticTimingFile = process.env.PRE_G7_19_BOUNDARY_TIMING_FILE;
const diagnosticTimingTotals = new Map<string, DiagnosticTimingTotal>();

function beginDiagnosticTiming(): DiagnosticTimingStart | undefined {
  if (!diagnosticTimingEnabled) return undefined;
  return { wallStart: performance.now(), cpuStart: process.cpuUsage() };
}

function endDiagnosticTiming(name: string, start: DiagnosticTimingStart | undefined) {
  if (!start) return;
  const wallMs = performance.now() - start.wallStart;
  const cpu = process.cpuUsage(start.cpuStart);
  const total = diagnosticTimingTotals.get(name) ?? {
    calls: 0,
    wallMs: 0,
    userCpuMicroseconds: 0,
    systemCpuMicroseconds: 0,
  };
  total.calls += 1;
  total.wallMs += wallMs;
  total.userCpuMicroseconds += cpu.user;
  total.systemCpuMicroseconds += cpu.system;
  diagnosticTimingTotals.set(name, total);
}

function measureDiagnosticTiming<T>(name: string, operation: () => T): T {
  const start = beginDiagnosticTiming();
  try {
    return operation();
  } finally {
    endDiagnosticTiming(name, start);
  }
}

function flushDiagnosticTiming(testName: string) {
  if (!diagnosticTimingEnabled || !diagnosticTimingFile) return;
  const report = {
    packet: "PRE-G7-19",
    testName,
    pid: process.pid,
    node: process.version,
    phases: Object.fromEntries(diagnosticTimingTotals),
    note: "moduleValidation is inclusive of nested parse, AST traversal, and import-resolution phases; phase totals overlap.",
  };
  appendFileSync(diagnosticTimingFile, JSON.stringify(report) + "\\n", "utf8");
}
`;

function instrument(text) {
  const original = text.replace(/\r\n/g, "\n");
  let result = original;
  const replaceOnce = (from, to, label) => {
    const occurrences = result.split(from).length - 1;
    if (occurrences !== 1) throw new Error(`${label}: expected 1 exact match, found ${occurrences}`);
    result = result.replace(from, to);
  };

  replaceOnce(
    'import { readdirSync, readFileSync, existsSync } from "node:fs";\n',
    'import { appendFileSync, readdirSync, readFileSync, existsSync } from "node:fs";\nimport { performance } from "node:perf_hooks";\n',
    "Node imports",
  );
  replaceOnce(
    `interface SourceFileSnapshot {\n  path: string;\n  normalizedPath: string;\n  text: string;\n}\n`,
    `interface SourceFileSnapshot {\n  path: string;\n  normalizedPath: string;\n  text: string;\n}\n${insert}`,
    "timing helpers",
  );
  replaceOnce(
    `function getSourceFileSnapshots(): SourceFileSnapshot[] {\n  if (!sourceFileSnapshots) {\n    sourceFileSnapshots = files("src").map((path) => ({\n      path,\n      normalizedPath: path.replace(/\\\\/g, "/"),\n      text: readFileSync(path, "utf8"),\n    }));\n    sourceFileSnapshotsByPath = new Map(\n      sourceFileSnapshots.map((snapshot) => [snapshot.normalizedPath, snapshot] as const),\n    );\n  }\n  return sourceFileSnapshots;\n}`,
    `function getSourceFileSnapshots(): SourceFileSnapshot[] {\n  const timingStart = beginDiagnosticTiming();\n  try {\n    if (!sourceFileSnapshots) {\n      sourceFileSnapshots = files("src").map((path) => ({\n        path,\n        normalizedPath: path.replace(/\\\\/g, "/"),\n        text: readFileSync(path, "utf8"),\n      }));\n      sourceFileSnapshotsByPath = new Map(\n        sourceFileSnapshots.map((snapshot) => [snapshot.normalizedPath, snapshot] as const),\n      );\n    }\n    return sourceFileSnapshots;\n  } finally {\n    endDiagnosticTiming("sourceDiscoveryRead", timingStart);\n  }\n}`,
    "source discovery/read phase",
  );
  replaceOnce(
    `  const sourceFile = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true);\n  const results: DiscoveredImport[] = [];`,
    `  const sourceFile = measureDiagnosticTiming("typescriptParsing", () =>\n    ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true),\n  );\n  const results: DiscoveredImport[] = [];`,
    "TypeScript parse phase",
  );
  replaceOnce(
    `  function record(specifier: string, kind: DiscoveredImport["kind"], node: ts.Node) {\n    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;\n    let resolved = specifier;\n    if (specifier.startsWith("@/")) {\n      resolved = normalize(join("src", specifier.slice(2))).replace(/\\\\/g, "/");\n    } else if (specifier.startsWith(".")) {\n      resolved = normalize(join(dirname(filePath), specifier)).replace(/\\\\/g, "/");\n    }\n    results.push({ specifier, kind, line, resolvedPath: resolved });\n  }`,
    `  function record(specifier: string, kind: DiscoveredImport["kind"], node: ts.Node) {\n    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;\n    let resolved = specifier;\n    const timingStart = beginDiagnosticTiming();\n    try {\n      if (specifier.startsWith("@/")) {\n        resolved = normalize(join("src", specifier.slice(2))).replace(/\\\\/g, "/");\n      } else if (specifier.startsWith(".")) {\n        resolved = normalize(join(dirname(filePath), specifier)).replace(/\\\\/g, "/");\n      }\n    } finally {\n      endDiagnosticTiming("importResolution", timingStart);\n    }\n    results.push({ specifier, kind, line, resolvedPath: resolved });\n  }`,
    "import resolution phase",
  );
  replaceOnce(
    `  visit(sourceFile);\n  const snapshot = { sourceFile, imports: results };`,
    `  measureDiagnosticTiming("astTraversal", () => visit(sourceFile));\n  const snapshot = { sourceFile, imports: results };`,
    "AST traversal phase",
  );
  replaceOnce(
    `it("enforces integrated dependency boundaries: HTML shell stays free of 3D and browser features stay free of server imports", () => {\n  const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { dependencies: Record<string, string> };\n  expect(Object.keys(packageJson.dependencies).sort()).toEqual([\n    "@supabase/ssr", "@supabase/supabase-js", "next", "pg", "react", "react-dom", "server-only", "sharp", "three", "zod"\n  ]);\n  for (const version of Object.values(packageJson.dependencies)) expect(version).toMatch(/^\\d+\\.\\d+\\.\\d+$/);\n  for (const snapshot of getSourceFileSnapshots()) {\n    validateProductionModule(snapshot.normalizedPath, snapshot.text);\n  }\n});`,
    `it("enforces integrated dependency boundaries: HTML shell stays free of 3D and browser features stay free of server imports", () => {\n  const bodyTimingStart = beginDiagnosticTiming();\n  try {\n    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { dependencies: Record<string, string> };\n    expect(Object.keys(packageJson.dependencies).sort()).toEqual([\n      "@supabase/ssr", "@supabase/supabase-js", "next", "pg", "react", "react-dom", "server-only", "sharp", "three", "zod"\n    ]);\n    for (const version of Object.values(packageJson.dependencies)) expect(version).toMatch(/^\\d+\\.\\d+\\.\\d+$/);\n    for (const snapshot of getSourceFileSnapshots()) {\n      measureDiagnosticTiming("moduleValidation", () =>\n        validateProductionModule(snapshot.normalizedPath, snapshot.text),\n      );\n    }\n  } finally {\n    endDiagnosticTiming("boundaryTestBodyTotal", bodyTimingStart);\n    flushDiagnosticTiming("enforces integrated dependency boundaries: HTML shell stays free of 3D and browser features stay free of server imports");\n  }\n});`,
    "integrated boundary test body instrumentation",
  );
  return result;
}

const newlineByPath = new Map(relativePaths.map((rel) => {
  const text = fs.readFileSync(path.join(repoRoot, rel), "utf8");
  return [rel, text.includes("\r\n") ? "\r\n" : "\n"];
}));
for (const rel of relativePaths) {
  const original = fs.readFileSync(path.join(repoRoot, rel), "utf8");
  const changed = instrument(original);
  const newline = newlineByPath.get(rel);
  fs.writeFileSync(path.join(repoRoot, rel), newline === "\r\n" ? changed.replace(/\n/g, "\r\n") : changed, "utf8");
}
const afterBlobs = relativePaths.map(gitBlob);
if (afterBlobs[0] !== afterBlobs[1]) throw new Error(`test/mirror instrumented blobs differ: ${afterBlobs.join(" / ")}`);
process.stdout.write(JSON.stringify({
  instrumentedPaths: relativePaths,
  beforeGitBlobs: beforeBlobs,
  afterGitBlobs: afterBlobs,
  pairedBlobsEqual: true,
  instrumentationIsEnvironmentGated: true,
  assertionsAndTraversalRetainedByTransform: true,
}, null, 2) + "\n");
