import { test, expect } from "@playwright/test";
import { mkdir, writeFile, readdir, readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import path from "node:path";
import os from "node:os";

test("five cold loads per desktop and mobile profile record actual production payloads", async ({ browser, baseURL }, info) => {
  if (!baseURL) throw new Error("The production server baseURL must be configured.");
  test.setTimeout(180_000);
  const runs = [];
  const profiles = [
    { name: "desktop", width: 1440, height: 900, dpr: 1.5, downMbps: 10, upMbps: 2, latencyMs: 80 },
    { name: "mobile-emulated", width: 390, height: 844, dpr: 1.25, downMbps: 4, upMbps: 1, latencyMs: 150 },
  ];
  for (const profile of profiles) {
    for (let run = 1; run <= 5; run++) {
      const context = await browser.newContext({ baseURL, viewport: { width: profile.width, height: profile.height }, deviceScaleFactor: profile.dpr });
      try {
        const page = await context.newPage();
        const blockedExternal: string[] = [];
        const consoleEvents: Array<{ type: string; message: string }> = [];
        page.on("console", (message) => {
          if (["error", "warning"].includes(message.type())) consoleEvents.push({ type: message.type(), message: message.text() });
        });
        page.on("pageerror", (error) => consoleEvents.push({ type: "pageerror", message: error.message }));
        await context.route("**/*", async (route) => {
          if (new URL(route.request().url()).origin !== new URL(baseURL).origin) {
            blockedExternal.push(route.request().url());
            await route.abort();
          } else { await route.continue(); }
        });
        const cdp = await context.newCDPSession(page);
        await cdp.send("Network.enable");
        await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
        await cdp.send("Network.emulateNetworkConditions", {
          offline: false, latency: profile.latencyMs,
          downloadThroughput: profile.downMbps * 1_000_000 / 8,
          uploadThroughput: profile.upMbps * 1_000_000 / 8,
        });
        const network: Array<{ url: string; type: string; status: number; contentEncoding: string | null; contentType: string | null }> = [];
        const jsUrls = new Set<string>();
        page.on("response", (response) => {
          const url = response.url();
          const contentType = response.headers()["content-type"] ?? null;
          const resourceType = response.request().resourceType();
          if (
            resourceType === "script" ||
            (contentType && contentType.includes("javascript")) ||
            new URL(url).pathname.endsWith(".js")
          ) {
            if (new URL(url).origin === new URL(baseURL).origin) {
              jsUrls.add(url);
            }
          }
          network.push({
            url,
            type: resourceType,
            status: response.status(),
            contentEncoding: response.headers()["content-encoding"] ?? null,
            contentType,
          });
        });
        await page.goto("/");
        await page.waitForLoadState("networkidle");
        await expect(page.getByRole("heading", { level: 1 })).toContainText("A little world.");
        const timing = await page.evaluate(() => {
          const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
          const navigation = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
          return { userAgent: navigator.userAgent, dpr: devicePixelRatio,
            navigation: navigation.map((r) => ({ url: r.name, transferSize: r.transferSize, encodedBodySize: r.encodedBodySize, decodedBodySize: r.decodedBodySize, duration: r.duration })),
            resources: resources.map((r) => ({ url: r.name, initiatorType: r.initiatorType, transferSize: r.transferSize, encodedBodySize: r.encodedBodySize, decodedBodySize: r.decodedBodySize, duration: r.duration })),
          };
        });
        const appResources = timing.resources.filter((r) => new URL(r.url).origin === new URL(baseURL).origin);
        const uniqueResourcesMap = new Map<string, (typeof appResources)[0]>();
        for (const r of appResources) {
          if (!uniqueResourcesMap.has(r.url)) {
            uniqueResourcesMap.set(r.url, r);
          }
        }
        const uniqueAppResources = [...uniqueResourcesMap.values()];
        const js = uniqueAppResources.filter((r) =>
          jsUrls.has(r.url) ||
          r.initiatorType === "script" ||
          new URL(r.url).pathname.endsWith(".js")
        );
        const encodedJsBytes = js.reduce((sum, r) => sum + r.encodedBodySize, 0);
        const totalTransferBytes = [...uniqueAppResources, ...timing.navigation].reduce((sum, r) => sum + r.transferSize, 0);
        expect(encodedJsBytes).toBeGreaterThan(0);
        expect(encodedJsBytes).toBeLessThanOrEqual(250 * 1024);
        expect(totalTransferBytes).toBeLessThanOrEqual(650 * 1024);
        expect(network.filter((r) => new URL(r.url).origin !== new URL(baseURL!).origin)).toEqual([]);
        expect(blockedExternal.filter((url) => !/^(gc|me)\.kis\.v2\.scr\.kaspersky-labs\.com$/.test(new URL(url).hostname))).toEqual([]);
        expect(consoleEvents.filter((event) => event.type === "pageerror")).toEqual([]);
        expect(network.filter((r) => /\.(glb|gltf|wasm|ktx2|mp3|wav|ogg)(\?|$)|\/api\//i.test(r.url))).toEqual([]);
        runs.push({ profile, run, cache: "cold new context; CDP cache disabled", encodedJsBytes, totalTransferBytes, network, blockedExternal, consoleEvents, ...timing });
      } finally { await context.close(); }
    }
  }
  const buildStats = [];
  // Build inspection complements URL tests, including opaque hashed chunk names.
  for (const entry of await readdir(".next/static/chunks", { recursive: true, withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".js")) {
      const file = path.join(entry.parentPath, entry.name);
      const bytes = await readFile(file);
      const code = bytes.toString("utf8");
      expect(code).not.toMatch(/WebGLRenderer|THREE\.REVISION|react-three\/fiber|createClient\(.+supabase|Synthetic contribution|testOnly = true|kaspersky-labs\.com/);
      buildStats.push({ file: path.relative(".next", file), bytes: bytes.length, gzipBytes: gzipSync(bytes).length });
    }
  }
  const serverHtml = await readFile(".next/server/app/index.html", "utf8");
  expect(serverHtml).not.toContain("kaspersky-labs.com");
  const destination = path.join(process.env.W3_EVIDENCE_DIR ?? "test-results", info.project.name, "payload.json");
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, JSON.stringify({
    scope: "Local next start; CDP throttling; all off-origin requests blocked. Application-origin byte totals exclude host antivirus injection. Payload budgets only; no field, GPU, or sustained-device claims.",
    serverHtmlHasHostInjection: false,
    browser: browser.version(), os: `${os.type()} ${os.release()}`, cpu: os.cpus()[0]?.model,
    ramBytes: os.totalmem(), tier: "static A1", assetManifestRevision: null, publicationRevision: null,
    buildId: (await readFile(".next/BUILD_ID", "utf8")).trim(), runs, buildStats,
  }, null, 2));
});
