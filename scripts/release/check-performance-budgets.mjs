#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { parseArgs } from "node:util";
import { inspectComposition } from "./check-release-composition.mjs";
import { assetFiles, policy, ROOT, safePath, writeJson } from "./release-lib.mjs";

try {
  const { values } = parseArgs({ options: { "benchmark-dir": { type: "string", default: policy.deliveryRoot + "/evidence/performance" }, output: { type: "string", default: policy.deliveryRoot + "/budget-validation-receipt.json" } } });
  const app = safePath(policy.canonicalApplicationRoot);
  const buildId = fs.readFileSync(path.join(app, ".next/BUILD_ID"), "utf8").trim();
  const benchmarkDir = path.resolve(ROOT, values["benchmark-dir"]);
  function report(name) {
    const data = JSON.parse(fs.readFileSync(path.join(benchmarkDir, name), "utf8"));
    if (data.canonicalApplicationRoot !== policy.canonicalApplicationRoot || data.buildId !== buildId) throw new Error(`Benchmark is not bound to current canonical build: ${name}`);
    return data;
  }
  const composition = inspectComposition();
  if (composition.overallStatus !== "PASS") throw new Error(`Composition failed: ${composition.failures.join("; ")}`);
  const metrics = [];
  const failures = [];
  function metric(name, measured, ceiling, unit) {
    const pass = Number.isFinite(measured) && measured > 0 && measured <= ceiling;
    metrics.push({ name, measured, ceiling, unit, status: pass ? "PASS" : "FAIL" });
    if (!pass) failures.push(`${name}: ${measured} ${unit}, ceiling ${ceiling}`);
    console.log(`${pass ? "PASS" : "FAIL"} ${name}: ${measured} / ${ceiling} ${unit}`);
  }
  const payloads = report("public-payloads.json");
  const payloadMeasurements = [];
  if (!Array.isArray(payloads.routes) || new Set(payloads.routes.map((item) => item.route)).size !== payloads.routes.length) throw new Error("Public payload report has missing/duplicate route observations");
  for (const route of ["/", "/about", "/contact", "/resume", "/projects"]) {
    const observed = payloads.routes.find((item) => item.route === route);
    if (observed?.status !== 200 || typeof observed.html !== "string" || !/<html[\s>]/i.test(observed.html)) throw new Error(`Fresh production HTML response missing/invalid: ${route}`);
    const html = observed.html;
    const htmlBytes = Buffer.from(html, "utf8");
    const urls = new Set([...html.matchAll(/(?:src|href)="([^"?#]+)(?:[^"\s]*)"/g)].map((match) => match[1]).filter((url) => url.startsWith("/_next/static/") || (/^\/(?:models|textures|images|fonts|assets)\//.test(url) && /\.(?:png|jpe?g|webp|avif|svg|woff2?)$/.test(url))));
    let js = 0;
    let critical = zlib.gzipSync(htmlBytes).length;
    if (!urls.size) throw new Error(`No build resource references found for ${route}`);
    for (const url of urls) {
      const filename = url.startsWith("/_next/") ? path.join(app, ".next", url.slice("/_next/".length)) : path.join(app, "public", url.slice(1));
      if (!filename.startsWith(app + path.sep) || url.includes("..")) throw new Error(`Invalid public resource URL: ${url}`);
      const bytes = fs.readFileSync(filename);
      const transfer = /\.(?:js|css)$/.test(filename) ? zlib.gzipSync(bytes).length : bytes.length;
      critical += transfer;
      if (filename.endsWith(".js")) js += transfer;
    }
    metric(`${route} pre-world JS`, js, 250 * 1024, "bytes gzip");
    metric(`${route} critical transfer`, critical, 650 * 1024, "bytes");
    payloadMeasurements.push({ route, status: observed.status, htmlBytes: htmlBytes.length, scope: "Fresh Next production HTTP response, backend unavailable, no browser hydration", resources: [...urls].sort(), javascriptGzipBytes: js, criticalTransferBytes: critical });
  }
  const assets = assetFiles();
  const actual = composition.actualAssetUrls.map((url) => assets.find((item) => item.url === url));
  if (actual.some((item) => !item)) throw new Error("Actual world URL cannot resolve a frozen asset");
  for (const tier of ["desktop", "mobile"]) {
    const selected = actual.filter((item) => !(tier === "desktop" ? /mobile/.test(item.url) : /interaction-assets\.glb$/.test(item.url)));
    if (!selected.length) throw new Error(`No ${tier} active world asset imports`);
    const unique = [...new Map(selected.map((item) => [item.sha256, item])).values()];
    metric(`${tier} essential assets`, selected.reduce((sum, item) => sum + item.bytes, 0), (tier === "desktop" ? 6 : 3) * 1024 * 1024, "bytes");
    metric(`${tier} active geometry upper bound`, unique.reduce((sum, item) => sum + item.accepted.triangles, 0), tier === "desktop" ? 300000 : 140000, "triangles");
    metric(`${tier} asset-derived GPU upper bound`, unique.reduce((sum, item) => sum + item.accepted.estimatedGpuBytes, 0), (tier === "desktop" ? 160 : 80) * 1024 * 1024, "bytes estimate");
  }
  const production = assets.filter((item) => policy.requiredProductionModels.some((name) => item.url === "/models/" + name));
  metric("full optional production world", production.reduce((sum, item) => sum + item.bytes, 0), 14 * 1024 * 1024, "bytes");
  function stats(samples) {
    if (!Array.isArray(samples) || samples.length === 0 || samples.some((n) => typeof n !== "number" || !Number.isFinite(n) || n <= 0)) throw new Error("Performance report contains invalid or missing raw samples");
    const sorted = [...samples].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return { median: sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2, p95: sorted[Math.min(Math.floor(sorted.length * 0.95), sorted.length - 1)] };
  }
  for (const profile of ["desktop-1440x900", "mobile-390x844", "narrow-320x600"]) {
    const data = report(`cold-loads-${profile}.json`);
    if (data.runs !== 5 || data.samples?.length !== 5) throw new Error(`Expected five real cold loads: ${profile}`);
    metric(`${profile} cold DOMContentLoaded median`, stats(data.samples).median, 3000, "ms localhost lab");
  }
  const pacing = report("active-route-frame-pacing.json");
  const frameSamples = pacing.rawSamples || pacing.frameTimes;
  if (!(pacing.routeDurationMs >= 60000) || !(pacing.totalFramesSampled >= 100) || frameSamples?.length !== pacing.totalFramesSampled || !(pacing.interactionsCompleted > 0)) throw new Error("Frame pacing requires a measured 60-second active route and complete raw samples");
  const frameStats = stats(frameSamples);
  metric("active route frame median", frameStats.median, 33.3, "ms software-rendered lab");
  metric("active route frame p95", frameStats.p95, 45, "ms software-rendered lab");
  writeJson(values.output, { checkId: "budget-regression", canonicalApplicationRoot: policy.canonicalApplicationRoot, buildId, overallStatus: failures.length ? "FAIL" : "PASS", metrics, publicPayloads: payloadMeasurements, failures, benchmarkDirectory: path.relative(ROOT, benchmarkDir).split(path.sep).join("/"), limitations: ["Cold timings are localhost lab measurements, not throttled production readiness or field Web Vitals.", "Software browser frame pacing is a local regression check; physical iOS/Android and sustained thermal testing remain unverified.", "Asset-derived GPU figures are accepted inventory estimates, not measured total GPU allocation."] });
  if (failures.length) process.exitCode = 1;
} catch (error) { console.error(`FAIL canonical performance budgets: ${error.message}`); process.exitCode = 1; }
