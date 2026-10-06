#!/usr/bin/env node
/** Root-invoked read-only live HTTP/TLS/CDN observations. No service mutations or acceptance. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import dns from "node:dns/promises";
import tls from "node:tls";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const read = (filename) => JSON.parse(fs.readFileSync(filename, "utf8"));
function workspacePath(filename) {
  const resolved = path.resolve(root, filename);
  if (!resolved.startsWith(root + path.sep)) throw new Error("Path must stay inside workspace");
  return resolved;
}
function check(condition, message) { if (!condition) throw new Error(message); }
function relative(filename) { return path.relative(root, filename).split(path.sep).join("/"); }

async function main() {
  const { values } = parseArgs({ options: { authorization: { type: "string" }, manifest: { type: "string" }, output: { type: "string" }, assets: { type: "string" }, composition: { type: "string" }, help: { type: "boolean" } } });
  if (values.help) {
    console.log("Root only, after accepted successor and actual deployment: node deliveries/G7/preparation/tools/g7-live-probes.mjs --authorization <operational-binding.json> --manifest <release-manifest.json> --output deliveries/G7/evidence/http-cdn.json [--assets app/public/asset-manifest.json] [--composition <release-composition.json>]. Separate binding requires status AUTHORIZED, ownerAuthorizationReference, acceptedSuccessorReference, origin, deploymentId, deployedAt, releaseId, sourceCommit, sourceAppTree, manifestSha256. No network requests occur for --help. Results are HTTP-only subcriteria; full G7 remains NOT RUN.");
    return;
  }
  check(values.authorization && values.manifest && values.output, "Explicit authorization/manifest/output inputs are required");
  const manifestPath = workspacePath(values.manifest);
  const manifest = read(manifestPath);
  const binding = read(workspacePath(values.authorization));
  check(binding.status === "AUTHORIZED" && binding.ownerAuthorizationReference && binding.acceptedSuccessorReference,
    "Root must supply actual owner authorization and accepted-successor references");
  for (const key of ["releaseId", "sourceCommit", "sourceAppTree"]) check(binding[key] === manifest[key], `Operational source binding differs: ${key}`);
  check(binding.manifestSha256 === sha(Buffer.from(fs.readFileSync(manifestPath, "utf8").replace(/\r\n/g, "\n"))), "Operational manifest hash is stale");
  check(binding.deploymentId && Number.isFinite(Date.parse(binding.deployedAt)) && Date.parse(binding.deployedAt) <= Date.now(), "Actual deployment identity and timestamp are required");
  const origin = new URL(binding.targetOrigin);
  check(origin.protocol === "https:" && !origin.username && !origin.password && origin.pathname === "/" && !origin.search && !origin.hash
    && !["localhost", "127.0.0.1", "::1"].includes(origin.hostname), "Target must be the root-authorized public HTTPS origin");
  const output = workspacePath(values.output);
  check(output.startsWith(path.join(root, "deliveries/G7/evidence") + path.sep), "Live output must stay inside deliveries/G7/evidence");
  check(!fs.existsSync(output), "Existing live receipt must be preserved; choose a new observation path");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const artifactDir = output.slice(0, -path.extname(output).length) + "-raw";
  fs.mkdirSync(artifactDir, { recursive: true });
  const executedAt = new Date().toISOString();
  const observations = [];
  const failures = [];
  const artifacts = [];
  function artifact(name, bytes) {
    const target = path.join(artifactDir, name);
    fs.writeFileSync(target, bytes);
    const receipt = { path: relative(target), sha256: sha(bytes), hashMode: "raw", bytes: bytes.length };
    artifacts.push(receipt);
    return receipt;
  }
  async function request(route, headers = {}) {
    const requestedAt = new Date().toISOString();
    const t0 = performance.now();
    const url = new URL(route, origin);
    check(url.origin === origin.origin, "Only the explicit authorized origin may be fetched");
    const response = await fetch(url, { headers, redirect: "manual", signal: AbortSignal.timeout(20000) });
    const body = Buffer.from(await response.arrayBuffer());
    const result = { route, url: url.href, requestedAt, completedAt: new Date().toISOString(), status: response.status,
      durationMs: performance.now() - t0, decodedBodyBytes: body.length, bodySha256: sha(body), headers: Object.fromEntries(response.headers),
      requestHeaders: headers, encodedContentLength: /^\d+$/.test(response.headers.get("content-length") ?? "") ? Number(response.headers.get("content-length")) : null };
    return { result, body };
  }
  try {
    const addresses = await dns.lookup(origin.hostname, { all: true });
    observations.push({ criterion: "DNS resolution", status: addresses.length ? "PASS" : "FAIL", addresses });
  } catch (error) { failures.push("DNS resolution"); observations.push({ criterion: "DNS resolution", status: "FAIL", error: error.code ?? error.message }); }
  try {
    const certificate = await new Promise((resolve, reject) => {
      const socket = tls.connect({ host: origin.hostname, port: Number(origin.port || 443), servername: origin.hostname, rejectUnauthorized: true });
      socket.setTimeout(20000, () => socket.destroy(new Error("TLS timeout")));
      socket.once("error", reject);
      socket.once("secureConnect", () => {
        const peer = socket.getPeerCertificate();
        resolve({ authorized: socket.authorized, protocol: socket.getProtocol(), subject: peer.subject, issuer: peer.issuer,
          validFrom: peer.valid_from, validTo: peer.valid_to, fingerprint256: peer.fingerprint256 });
        socket.end();
      });
    });
    observations.push({ criterion: "Valid TLS certificate", status: "PASS", certificate });
  } catch (error) { failures.push("TLS certificate"); observations.push({ criterion: "Valid TLS certificate", status: "FAIL", error: error.code ?? error.message }); }
  try {
    const httpUrl = new URL(origin); httpUrl.protocol = "http:";
    const response = await fetch(httpUrl, { redirect: "manual", signal: AbortSignal.timeout(20000) });
    const location = response.headers.get("location");
    const pass = [301, 308].includes(response.status) && location && new URL(location, httpUrl).origin === origin.origin;
    observations.push({ criterion: "HTTP to HTTPS redirect", status: pass ? "PASS" : "FAIL", statusCode: response.status, location });
    if (!pass) failures.push("HTTPS redirect");
  } catch (error) { failures.push("HTTPS redirect"); observations.push({ criterion: "HTTP to HTTPS redirect", status: "FAIL", error: error.code ?? error.message }); }
  const routeResults = [];
  for (const route of ["/", "/about", "/resume", "/contact", "/projects", "/projects/helios", "/projects/zenith", "/projects/ai-vs-real", "/projects/talks", "/projects/candidatex", "/api/health"]) {
    try {
      const { result, body } = await request(route);
      result.expectedStatus = route.endsWith("candidatex") ? 404 : 200;
      result.statusMatch = result.status === result.expectedStatus;
      result.hasSemanticHtml = route.startsWith("/api/") ? null : /<html[\s>]/i.test(body.toString("utf8"));
      result.rawArtifact = artifact("route-" + (route === "/" ? "root" : route.slice(1).replaceAll("/", "_")) + ".body", body);
      result.securityHeaderObservations = Object.fromEntries(["content-security-policy", "strict-transport-security", "x-frame-options", "x-content-type-options", "referrer-policy"].map((name) => [name, result.headers[name] ?? null]));
      if (route === "/api/health") {
        try { result.actualHealthResponse = JSON.parse(body.toString("utf8")); } catch { result.actualHealthResponse = null; }
        result.healthEvidenceBoundary = "Actual response only; liveness 200 alone does not establish backend readiness, RLS/MFA, mail or monitoring.";
      }
      if (!result.statusMatch || result.hasSemanticHtml === false) failures.push(`HTTP ${route}`);
      routeResults.push(result);
    } catch (error) { failures.push(`HTTP ${route}`); routeResults.push({ route, status: "FAIL", error: error.code ?? error.message }); }
  }
  const assetResults = [];
  if (values.assets) {
    const local = read(workspacePath(values.assets));
    check(local.revision === manifest.assetRevision && Array.isArray(local.groups), "Local asset manifest does not bind frozen candidate assets");
    const remoteManifest = await request("/asset-manifest.json", { "Accept-Encoding": "br, gzip" });
    const remoteData = JSON.parse(remoteManifest.body.toString("utf8"));
    const manifestMatches = JSON.stringify(remoteData) === JSON.stringify(local);
    observations.push({ criterion: "Live asset manifest matches frozen local manifest", status: manifestMatches ? "PASS" : "FAIL", ...remoteManifest.result });
    artifact("asset-manifest.json", remoteManifest.body);
    if (!manifestMatches) failures.push("Asset manifest mismatch");
    for (const group of local.groups) {
      try {
        check(group.approved === true && /^[a-f0-9]{64}$/.test(group.sha256) && typeof group.url === "string", "Frozen approved asset identity is invalid");
        const { result, body } = await request(group.url);
        const cache = result.headers["cache-control"] ?? "";
        result.expectedSha256 = group.sha256;
        result.sha256Match = result.bodySha256 === group.sha256;
        result.bytesMatch = body.length === group.bytes;
        result.immutableCache = /\bpublic\b/i.test(cache) && /\bimmutable\b/i.test(cache) && /\bmax-age=31536000\b/i.test(cache);
        const ranged = await request(group.url, { Range: "bytes=0-15" });
        result.rangeObservation = { ...ranged.result, valid: ranged.result.status === 206 && ranged.body.length === 16 && /^bytes 0-15\//.test(ranged.result.headers["content-range"] ?? "") };
        result.httpStatus = result.status;
        result.status = result.status === 200 && result.sha256Match && result.bytesMatch && result.immutableCache && result.rangeObservation.valid ? "PASS" : "FAIL";
        if (result.status !== "PASS") failures.push(`Asset ${group.url}`);
        artifact(group.id.replace(/[^a-zA-Z0-9_-]/g, "_") + ".asset", body);
        assetResults.push(result);
      } catch (error) { failures.push(`Asset ${group.url}`); assetResults.push({ route: group.url, status: "FAIL", error: error.code ?? error.message }); }
    }
  }
  let transferObservations = null;
  if (values.composition && assetResults.length) {
    const composition = read(workspacePath(values.composition));
    check(composition.releaseId === manifest.releaseId, "Composition is from another release");
    transferObservations = ["desktop", "mobile"].map((tier) => {
      const urls = composition.actualAssetUrls.filter((url) => !(tier === "desktop" ? /mobile/.test(url) : /interaction-assets\.glb$/.test(url)));
      const responses = urls.map((url) => assetResults.find((item) => item.route === url));
      const complete = responses.length > 0 && responses.every((item) => Number.isFinite(item?.encodedContentLength));
      const encodedAssetBytes = complete ? responses.reduce((sum, item) => sum + item.encodedContentLength, 0) : null;
      const ceiling = (tier === "desktop" ? 6 : 3) * 1024 * 1024;
      return { tier, requestedUrls: urls, encodedAssetBytes, ceiling, status: complete ? encodedAssetBytes <= ceiling ? "PASS" : "FAIL" : "NOT RUN",
        boundary: "Recorded Content-Length sum for exact essential asset GETs; complete browser entry transfer and physical network profiles need separate live browser evidence." };
    });
  }
  artifact("http-observations.json", Buffer.from(JSON.stringify({ observations, routes: routeResults, assets: assetResults, transferObservations }, null, 2) + "\n"));
  const receipt = { releaseId: manifest.releaseId, sourceCommit: manifest.sourceCommit, sourceAppTree: manifest.sourceAppTree,
    manifestSha256: binding.manifestSha256, deploymentId: binding.deploymentId, deployedAt: binding.deployedAt,
    targetOrigin: origin.origin, executedAt, completedAt: new Date().toISOString(), runtime: { node: process.version, platform: process.platform },
    evidenceCategory: "HTTP ONLY", observationStatus: failures.length ? "FAIL" : "PASS", failures, artifactHashes: artifacts,
    observations, routes: routeResults, assets: assetResults, transferObservations,
    requirements: [{ id: 1, name: "live-domain", status: "NOT RUN", observations, remaining: "Root must reconcile canonical-origin policy and complete deployment identity; HTTP receipt is partial maker proof." },
      { id: 3, name: "public-routes", status: "NOT RUN", observations: routeResults, remaining: "Hard refresh, client transitions, history and UI protection need actual live browser proof." },
      { id: 7, name: "production-configuration", status: "NOT RUN", observations: [], remaining: "Headers only are observed; actual env/secret isolation, native grants/RLS/AAL2/Storage/jobs proof is required." },
      { id: 8, name: "asset-loading", status: "NOT RUN", observations: assetResults, remaining: "Actual browser transfer/compression/cache and complete media/service proof remain separately required." },
      { id: 9, name: "monitoring", status: "NOT RUN", observations: [], remaining: "Health response does not prove readiness semantics, logging, uptime monitoring or PII retention." }],
    overallStatus: "NOT RUN", acceptanceClaim: false, independentReview: "NOT RUN",
    limitations: ["No browser/manual/service mutation/rollback rehearsal was executed.", "No physical device or screen reader was exercised.", "Raw public response artifacts are retained; these are actual observations rather than complete G7 conformance."] };
  fs.writeFileSync(output, JSON.stringify(receipt, null, 2) + "\n");
  console.log(`HTTP-only observations ${receipt.observationStatus}; complete G7 requirements remain NOT RUN. Receipt ${relative(output)}`);
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => { console.error(`FAIL live observation tooling: ${error.message}`); process.exitCode = 1; });
