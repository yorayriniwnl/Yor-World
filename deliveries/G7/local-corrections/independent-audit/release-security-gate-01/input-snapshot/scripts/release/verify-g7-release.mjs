#!/usr/bin/env node
/** Read-only HTTP probes for a future authorized G7 packet; never gate acceptance. */
import { parseArgs } from "node:util";
import { policy, readJson, writeJson } from "./release-lib.mjs";

try {
  const { values } = parseArgs({ options: { url: { type: "string", short: "u" }, manifest: { type: "string", default: policy.deliveryRoot + "/release-manifest.json" }, output: { type: "string" }, help: { type: "boolean", short: "h" } } });
  if (values.help) {
    console.log("Usage: node scripts/release/verify-g7-release.mjs --url https://<authorized-domain> [--manifest <canonical manifest>] [--output <repository path>]\nPartial HTTP observations only. Browser entry/fallback, real backend/CDN verification, monitoring and rehearsed rollback require the ten-item G7 protocol. No live requests occur while G7 is LOCKED or G6 is an unaccepted candidate.");
  } else {
    const manifest = readJson(values.manifest);
    if (manifest.canonicalApplicationRoot !== "app") throw new Error("Future G7 target must bind the canonical app/ release");
    if (!["AUTHORIZED", "ACTIVE"].includes(manifest.governance?.g7Status) || manifest.governance?.status?.toUpperCase() !== "ACCEPTED") throw new Error("G7 LOCKED / NOT RUN: explicit authorized/active G7 status and independent G6 acceptance are required before live verification");
    const target = new URL(values.url);
    if (target.protocol !== "https:" || target.username || target.password || ["localhost", "127.0.0.1", "::1"].includes(target.hostname)) throw new Error("Live probe target must be an authorized public HTTPS origin");
    const observations = [];
    for (const route of ["/", "/about", "/resume", "/contact", "/projects", "/projects/helios", "/projects/zenith", "/projects/ai-vs-real", "/projects/talks", "/projects/candidatex", "/api/health"]) {
      const start = performance.now();
      const response = await fetch(new URL(route, target.origin), { redirect: "manual", signal: AbortSignal.timeout(15000) });
      const bytes = new Uint8Array(await response.arrayBuffer()).length;
      const expected = route.endsWith("candidatex") ? 404 : 200;
      observations.push({ route, expected, status: response.status, statusMatch: response.status === expected, bytes, durationMs: Math.round(performance.now() - start), securityHeaders: Object.fromEntries(["content-security-policy", "x-content-type-options", "strict-transport-security"].map((name) => [name, response.headers.get(name)])) });
      console.log(`${response.status === expected ? "PASS" : "FAIL"} HTTP-only ${route}: ${response.status}`);
    }
    const requirements = [
      { id: 1, name: "live domain", status: "PARTIAL", remaining: "HTTPS response observed; DNS, redirects, certificate and canonical policy still require complete evidence." },
      { id: 2, name: "fresh smoke", status: "PARTIAL", remaining: "HTTP observations are fresh, but deployment identity and complete post-deployment smoke are unverified." },
      { id: 3, name: "public routes", status: "PARTIAL", remaining: "Direct GET status observed; browser refresh and deep-link journeys still require live browser evidence." },
      { id: 4, name: "world entry", status: "NOT RUN", remaining: "Real world readiness, entrance, skip, HOME and avatar timing require browser execution." },
      { id: 5, name: "fallback", status: "NOT RUN", remaining: "JS-disabled, WebGL-disabled, context-loss and mobile recovery require browser execution." },
      { id: 6, name: "contact behavior", status: "NOT RUN", remaining: "Real persistence, R2 replay/conflict/concurrency, outbox, quotas and PII isolation require backend verification." },
      { id: 7, name: "production configuration", status: "PARTIAL", remaining: "Header values observed; secrets, AAL2/RLS and production service configuration are unverified." },
      { id: 8, name: "asset loading", status: "NOT RUN", remaining: "Every live CDN asset must match manifest SHA-256, caching, compression and transfer budgets." },
      { id: 9, name: "monitoring", status: "PARTIAL", remaining: "Health HTTP response observed; logging, uptime and PII retention controls are unverified." },
      { id: 10, name: "rollback readiness", status: "NOT RUN", remaining: "A deployment header is not a rehearsal. Demonstrate rollback with RTO <=5m and RPO=0." }
    ];
    const report = { releaseId: manifest.releaseId, canonicalApplicationRoot: "app", sourceCommit: manifest.sourceCommit, probedAt: new Date().toISOString(), targetOrigin: target.origin, overallStatus: "INCOMPLETE", observations, requirements, protocol: "docs/planning/releases/2026-10-02-g7-production-release-protocol.md", acceptanceClaim: false };
    if (values.output) writeJson(values.output, report);
    console.log("G7 INCOMPLETE: partial HTTP probes cannot accept any complete G7 requirement or unlock production.");
    process.exitCode = 1;
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
