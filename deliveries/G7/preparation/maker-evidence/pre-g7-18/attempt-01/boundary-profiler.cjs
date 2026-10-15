const { readdirSync, readFileSync, existsSync } = require("node:fs");
const { dirname, join, normalize } = require("node:path");
const crypto = require("node:crypto");
const ts = require("typescript");
const { performance } = require("node:perf_hooks");
const slash = String.fromCharCode(92);
const toSlashes = (p) => p.split(slash).join("/");
const isCode = (p) => [".ts",".tsx",".js",".jsx",".mts",".cts",".mjs",".cjs"].includes(p.slice(p.lastIndexOf(".")));
const count = { readdir: 0, dirs: 0, files: 0, snapshots: 0, bytes: 0, parseCalls: 0, astNodes: 0, imports: 0, clientModules: 0, visits: 0, maxVisitedPerClient: 0, edges: 0, existsChecks: 0, resolvedEdges: 0 };
const ms = { treeWalk: 0, snapshotRead: 0, parseAndWalk: 0, allModulesPass: 0, contractsPass: 0, clientGraph: 0, existsSync: 0 };
const started = performance.now();
function files(root) {
  count.readdir++;
  const t = performance.now();
  const entries = readdirSync(root, { withFileTypes: true });
  ms.treeWalk += performance.now() - t;
  count.dirs++;
  const list = entries.flatMap((e) => e.isDirectory() ? files(join(root, e.name)) : [join(root, e.name)]);
  count.files += list.length;
  return list;
}
const paths = files("src");
const snapshots = [];
const byPath = new Map();
for (const path of paths) {
  const t = performance.now();
  const text = readFileSync(path, "utf8");
  ms.snapshotRead += performance.now() - t;
  count.bytes += Buffer.byteLength(text);
  const normalizedPath = toSlashes(path);
  const snapshot = { path, normalizedPath, text };
  snapshots.push(snapshot);
  byPath.set(normalizedPath, snapshot);
}
count.snapshots = snapshots.length;
const cache = new Map();
function parsed(filePath, text) {
  let byText = cache.get(filePath);
  if (!byText) { byText = new Map(); cache.set(filePath, byText); }
  if (byText.has(text)) return byText.get(text);
  const t = performance.now();
  const sourceFile = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true);
  const imports = [];
  function record(specifier, kind, node) {
    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    let resolved = specifier;
    if (specifier.startsWith("@/")) resolved = toSlashes(normalize(join("src", specifier.slice(2))));
    else if (specifier.startsWith(".")) resolved = toSlashes(normalize(join(dirname(filePath), specifier)));
    imports.push({ specifier, kind, line, resolvedPath: resolved });
  }
  function visit(node) {
    count.astNodes++;
    if (ts.isImportDeclaration(node)) {
      if (ts.isStringLiteral(node.moduleSpecifier)) record(node.moduleSpecifier.text, node.importClause ? "import" : "side-effect-import", node);
    } else if (ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) record(node.moduleSpecifier.text, "export-from", node);
    } else if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) { const a = node.arguments[0]; if (a && ts.isStringLiteral(a)) record(a.text, "dynamic-import", node); }
      else if (ts.isIdentifier(node.expression) && node.expression.text === "require") { const a = node.arguments[0]; if (a && ts.isStringLiteral(a)) record(a.text, "require", node); }
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) record(node.argument.literal.text, "import-type", node);
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  ms.parseAndWalk += performance.now() - t;
  count.parseCalls++;
  count.imports += imports.length;
  const result = { sourceFile, imports };
  byText.set(text, result);
  return result;
}
function extract(path, text) { return parsed(path, text).imports; }
let t = performance.now();
for (const s of snapshots) if (!s.normalizedPath.endsWith(".css")) parsed(s.normalizedPath, s.text);
ms.allModulesPass = performance.now() - t;
t = performance.now();
for (const path of files("src/contracts")) { count.contractFiles++; parsed(toSlashes(path), readFileSync(path, "utf8")); }
ms.contractsPass = performance.now() - t;
t = performance.now();
const clients = snapshots.filter(s => isCode(s.path) && (s.text.trimStart().startsWith('"use client"') || s.text.trimStart().startsWith("'use client'")));
count.clientModules = clients.length;
for (const source of clients) {
  const pending = [source.path];
  const visited = new Set();
  while (pending.length) {
    const current = pending.pop();
    if (visited.has(current)) continue;
    visited.add(current);
    count.visits++;
    const normalized = toSlashes(current);
    const text = byPath.get(normalized)?.text ?? readFileSync(current, "utf8");
    for (const edge of extract(normalized, text)) {
      if (edge.specifier === "sharp" || edge.specifier.startsWith("sharp/")) throw new Error("Unexpected sharp import: " + current);
      if (!edge.specifier.startsWith(".") && !edge.specifier.startsWith("@/")) continue;
      count.edges++;
      const target = edge.resolvedPath;
      const candidates = [target, target + ".ts", target + ".tsx", join(target, "index.ts"), join(target, "index.tsx")];
      let resolved = null;
      for (const candidate of candidates) {
        const check = performance.now();
        count.existsChecks++;
        const exists = existsSync(candidate);
        ms.existsSync += performance.now() - check;
        if (exists && isCode(candidate)) { resolved = candidate; break; }
      }
      if (resolved) { count.resolvedEdges++; pending.push(resolved); }
    }
  }
  count.maxVisitedPerClient = Math.max(count.maxVisitedPerClient, visited.size);
}
ms.clientGraph = performance.now() - t;
ms.total = performance.now() - started;
const report = {
  diagnostic: "standalone measurement of the same source snapshot/import graph algorithm; no Vitest invocation and no edits to test code",
  sourcePathCount: paths.length,
  sourcePathSetSha256Sorted: crypto.createHash("sha256").update(paths.slice().sort().join(String.fromCharCode(10))).digest("hex"),
  count, milliseconds: ms, processCpuMicroseconds: process.cpuUsage()
};
process.stdout.write(JSON.stringify(report, null, 2) + String.fromCharCode(10));
