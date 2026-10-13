#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { parseArgs } from "node:util";
import { assetFiles, normalized, policy, readJson, ROOT, safePath, sha256, walk, writeJson } from "./release-lib.mjs";

export function inspectComposition() {
  const app = safePath(policy.canonicalApplicationRoot);
  const require = createRequire(path.join(app, "package.json"));
  const ts = require("typescript");
  const appPaths = readJson(policy.canonicalApplicationRoot + "/.next/server/app-paths-manifest.json");
  const routePaths = readJson(policy.canonicalApplicationRoot + "/.next/app-path-routes-manifest.json");
  const prerender = readJson(policy.canonicalApplicationRoot + "/.next/prerender-manifest.json");
  const buildId = fs.readFileSync(path.join(app, ".next/BUILD_ID"), "utf8").trim();
  const failures = [];
  const required = [...policy.requiredPublicRoutes, ...policy.requiredAdminRoutes, ...policy.requiredApiRoutes];
  const routes = [];
  const sourceFiles = walk(path.join(app, "src")).filter((name) => /\.[cm]?[jt]sx?$/.test(name));
  const byRoute = new Map();
  for (const name of sourceFiles.filter((name) => /[\\/]app[\\/].*[\\/](page|route)\.[jt]sx?$/.test(name))) {
    const pieces = path.relative(path.join(app, "src/app"), name).split(path.sep).slice(0, -1).filter((segment) => !segment.startsWith("("));
    byRoute.set("/" + pieces.join("/"), name);
  }
  for (const route of required) {
    const keys = Object.keys(routePaths).filter((key) => routePaths[key] === route);
    const compiled = keys.map((key) => appPaths[key]).filter(Boolean);
    if (!keys.length || !compiled.length || !compiled.every((name) => fs.existsSync(path.join(app, ".next/server", name)))) failures.push(`Route is missing compiled server artifact: ${route}`);
    if (!byRoute.has(route)) failures.push(`Route source is missing: ${route}`);
    if (policy.requiredApiRoutes.includes(route) && prerender.routes?.[route]) failures.push(`Accepted API is unexpectedly prerendered: ${route}`);
    routes.push({ route, source: byRoute.has(route) ? path.relative(ROOT, byRoute.get(route)).split(path.sep).join("/") : null, compiled, dynamic: !prerender.routes?.[route] });
  }
  function resolveImport(owner, specifier) {
    if (!specifier.startsWith(".") && !specifier.startsWith("@/")) return null;
    const base = specifier.startsWith("@/") ? path.join(app, "src", specifier.slice(2)) : path.resolve(path.dirname(owner), specifier);
    if (!base.startsWith(app + path.sep)) throw new Error(`Import escapes canonical app: ${owner} -> ${specifier}`);
    const candidates = [base, ...[".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx"].map((extension) => base + extension)];
    const resolved = candidates.find((name) => fs.existsSync(name) && fs.statSync(name).isFile());
    if (!resolved) throw new Error(`Unresolved local import: ${path.relative(app, owner)} -> ${specifier}`);
    return resolved;
  }
  const graph = new Map();
  const assetUrls = new Set();
  for (const name of sourceFiles) {
    const source = ts.createSourceFile(name, fs.readFileSync(name, "utf8"), ts.ScriptTarget.Latest, true);
    const imports = [];
    const visit = (node) => {
      const literal = ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node);
      if (literal && /^\/(?:models|assets\/3d)\/[^?#]+\.glb$/.test(node.text)) assetUrls.add(node.text);
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const clause = node.importClause;
        const binding = clause?.namedBindings;
        const onlyTypes = node.isTypeOnly || clause?.isTypeOnly || (!clause?.name && binding && ts.isNamedImports(binding) && binding.elements.length > 0 && binding.elements.every((item) => item.isTypeOnly));
        if (!onlyTypes) {
          const resolved = resolveImport(name, node.moduleSpecifier.text);
          if (resolved) imports.push(resolved);
        }
      }
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
        const resolved = resolveImport(name, node.arguments[0].text);
        if (resolved) imports.push(resolved);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    graph.set(name, imports);
  }
  function reachable(entry) {
    const seen = new Set();
    const visit = (name) => { if (seen.has(name)) return; seen.add(name); for (const child of graph.get(name) || []) visit(child); };
    if (entry) visit(entry);
    return seen;
  }
  const roots = required.map((route) => byRoute.get(route)).filter(Boolean);
  roots.push(path.join(app, "src/app/layout.tsx"));
  const runtimeEntrypoints = [];
  for (const entry of policy.requiredRuntimeEntrypoints || []) {
    const sourcePath = safePath(policy.canonicalApplicationRoot + "/" + entry.source);
    const compiledPath = safePath(policy.canonicalApplicationRoot + "/" + entry.compiled);
    const manifestPath = policy.canonicalApplicationRoot + "/" + entry.manifest;
    const manifest = readJson(manifestPath);
    const actual = manifest.functions?.[entry.manifestKey];
    const compiledPresent = fs.existsSync(compiledPath);
    if (!fs.existsSync(sourcePath) || !compiledPresent || actual?.runtime !== entry.runtime
      || !Array.isArray(actual.matchers) || actual.matchers.length === 0) {
      failures.push(`Required runtime entrypoint lacks compiled evidence: ${entry.source}`);
    } else {
      roots.push(sourcePath);
    }
    runtimeEntrypoints.push({ source: policy.canonicalApplicationRoot + "/" + entry.source,
      compiled: policy.canonicalApplicationRoot + "/" + entry.compiled, manifest: manifestPath,
      manifestKey: entry.manifestKey, runtime: actual?.runtime ?? null,
      compiledPresent, matchers: actual?.matchers ?? [] });
  }
  const productionGraph = new Set(roots.flatMap((entry) => [...reachable(entry)]));
  for (const name of policy.requiredModules) if (!productionGraph.has(path.join(app, name))) failures.push(`Required module is absent from production route import graph: ${name}`);
  for (const entry of productionGraph) {
    if (!fs.existsSync(entry) || !/^\s*["']use client["'];/.test(fs.readFileSync(entry, "utf8"))) continue;
    for (const dependency of reachable(entry)) {
      const text = fs.readFileSync(dependency, "utf8");
      if (dependency.startsWith(path.join(app, "src/server") + path.sep)) failures.push(`Client component imports server-only module: ${path.relative(app, entry)} -> ${path.relative(app, dependency)}`);
      for (const match of text.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) {
        if (match[1] !== "NODE_ENV" && !match[1].startsWith("NEXT_PUBLIC_")) failures.push(`Client import graph references private environment variable: ${match[1]}`);
      }
    }
  }
  const contactGraph = reachable(byRoute.get("/api/contact"));
  const r2 = ["src/server/contact/receive.ts", "src/server/contact/outbox.ts"].map((relative) => {
    const full = path.join(app, relative);
    if (!contactGraph.has(full)) failures.push(`Contact API does not import R2 module: ${relative}`);
    const bytes = fs.readFileSync(full);
    const text = bytes.toString("utf8");
    if (!text.includes(policy.contactAmendment)) failures.push(`R2 amendment identity absent: ${relative}`);
    if (relative.endsWith("outbox.ts")) {
      const claim = text.indexOf("const isClaimed = await claimIdempotencyKey(");
      const quota = text.indexOf("await checkContactQuotas(tx");
      const message = text.indexOf("INSERT INTO public.contact_messages");
      const outbox = text.indexOf("INSERT INTO public.email_outbox");
      if (!(claim >= 0 && quota > claim && message > quota && outbox > message && /ON CONFLICT \(key_hash\) DO UPDATE/.test(text))) failures.push("R2 database claim/quota/message/outbox ordering is absent");
    }
    return { path: policy.canonicalApplicationRoot + "/" + relative, sha256: sha256(normalized(bytes)), hashMode: "lf" };
  });
  const contactPage = byRoute.get("/contact");
  for (const name of reachable(contactPage)) {
    if (/Messaging is not available yet/i.test(fs.readFileSync(name, "utf8"))) failures.push("Contact route imports obsolete unavailable messaging copy");
  }
  const contactUi = [...reachable(contactPage)].some((name) => fs.readFileSync(name, "utf8").includes('"/api/contact"'));
  if (!contactUi) failures.push("Contact page does not import a client consuming /api/contact");
  const assets = assetFiles();
  for (const url of assetUrls) if (!assets.some((asset) => asset.url === url)) failures.push(`Actual production asset import is missing: ${url}`);
  const modules = [...productionGraph].filter((name) => fs.existsSync(name)).map((name) => ({ path: path.relative(ROOT, name).split(path.sep).join("/"), sha256: sha256(normalized(fs.readFileSync(name))), hashMode: "lf" })).sort((a, b) => a.path.localeCompare(b.path, "en"));
  return { checkId: "release-composition", releaseId: policy.releaseId, canonicalApplicationRoot: policy.canonicalApplicationRoot, buildId, overallStatus: failures.length ? "FAIL" : "PASS", routes, runtimeEntrypoints, contactAmendment: policy.contactAmendment, contactModules: r2, actualAssetUrls: [...assetUrls].sort(), assets: assets.map(({ accepted, ...item }) => item), modules, failures };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: { output: { type: "string", default: policy.deliveryRoot + "/release-composition.json" } } });
    const result = inspectComposition();
    writeJson(values.output, result);
    console.log(`${result.overallStatus} release composition: ${result.routes.length} required routes, ${result.modules.length} reachable modules, ${result.assets.length} frozen assets`);
    if (result.failures.length) { console.error(result.failures.join("\n")); process.exitCode = 1; }
  } catch (error) { console.error(`FAIL release composition: ${error.message}`); process.exitCode = 1; }
}
