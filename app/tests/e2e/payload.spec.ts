import { test, expect } from "@playwright/test";
import { mkdir, writeFile, readdir, readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import path from "node:path";
import os from "node:os";

test("five cold loads per desktop and mobile profile record actual production payloads", async ({ browser, baseURL, request }, info) => {
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
        await expect(page.getByRole("heading", { level: 1 })).toContainText("Full-stack");
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
  const serverResponse = await request.get("/");
  expect(serverResponse.status()).toBe(200);
  expect(serverResponse.headers()["content-type"]).toContain("text/html");
  const serverHtml = await serverResponse.text();
  expect(serverHtml).toMatch(/<html[\s>]/i);
  expect(serverHtml).not.toContain("kaspersky-labs.com");
  const resourceUrls = [...new Set([...serverHtml.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => new URL(match[1]!.replace(/&amp;/g, "&"), baseURL).href)
    .filter((url) => {
      const resource = new URL(url);
      return resource.origin === new URL(baseURL).origin && (
        resource.pathname.startsWith("/_next/static/") ||
        (/^\/(?:images|fonts|textures|assets)\//.test(resource.pathname) && /\.(?:png|jpe?g|webp|avif|svg|woff2?)$/.test(resource.pathname))
      );
    }))];
  expect(resourceUrls.length).toBeGreaterThan(0);
  const initialChunkPaths = new Set(resourceUrls
    .map((url) => new URL(url).pathname)
    .filter((name) => name.startsWith("/_next/static/chunks/") && name.endsWith(".js"))
    .map((name) => name.slice("/_next/".length)));
  expect(initialChunkPaths.size).toBeGreaterThan(0);
  const serverPayloadResources = [];
  let serverJavascriptGzipBytes = 0;
  let serverCriticalTransferBytes = gzipSync(Buffer.from(serverHtml, "utf8")).length;
  for (const url of resourceUrls) {
    const response = await request.get(url);
    expect(response.status(), `Production HTML resource ${url}`).toBe(200);
    const bytes = await response.body();
    expect(bytes.length, `Production HTML resource ${url}`).toBeGreaterThan(0);
    const resourcePath = new URL(url).pathname;
    const transferBytes = /\.(?:js|css)$/.test(resourcePath) ? gzipSync(bytes).length : bytes.length;
    serverCriticalTransferBytes += transferBytes;
    if (resourcePath.endsWith(".js")) serverJavascriptGzipBytes += transferBytes;
    serverPayloadResources.push({ url, status: response.status(), bytes: bytes.length, budgetTransferBytes: transferBytes });
  }
  expect(serverJavascriptGzipBytes).toBeGreaterThan(0);
  expect(serverJavascriptGzipBytes).toBeLessThanOrEqual(250 * 1024);
  expect(serverCriticalTransferBytes).toBeLessThanOrEqual(650 * 1024);

  const buildStats = [];
  // Build inspection complements URL tests, including opaque hashed chunk names.
  for (const entry of await readdir(".next/static/chunks", { recursive: true, withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".js")) {
      const file = path.join(entry.parentPath, entry.name);
      const bytes = await readFile(file);
      const code = bytes.toString("utf8");
      // Landing page entry chunks must never load Three.js / WebGLRenderer pre-entry
      if (initialChunkPaths.has(path.relative(".next", file).split(path.sep).join("/"))) {
        expect(/WebGLRenderer|THREE\.REVISION|@supabase\/supabase-js|createBrowserClient/.test(code), `Pre-entry world/backend client in ${file}`).toBe(false);
      }
      // Owner login legitimately includes the client-safe Supabase SDK in its own route chunks.
      expect(/react-three\/fiber|Synthetic contribution|testOnly = true|kaspersky-labs\.com/.test(code), `Forbidden proof dependency/marker in ${file}`).toBe(false);
      for (const name of ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_KEY", "DATABASE_URL", "CONTACT_HASH_SECRET", "QUOTA_HASH_SECRET", "RESEND_API_KEY", "CRON_SECRET", "INTERNAL_JOB_KEY"]) {
        expect(code.includes(name), `Server-only credential reference ${name} in ${file}`).toBe(false);
      }
      buildStats.push({ file: path.relative(".next", file), bytes: bytes.length, gzipBytes: gzipSync(bytes).length });
    }
  }
  const destination = path.join(process.env.W3_EVIDENCE_DIR ?? process.env.C3_EVIDENCE_DIR ?? "test-results", info.project.name, "payload.json");
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, JSON.stringify({
    scope: "Local next start; fresh production HTTP HTML and referenced resource bodies, plus five CDP-throttled cold contexts/profile. All browser off-origin requests blocked. Application-origin byte totals exclude host antivirus injection. HTTP budget transfer uses gzip HTML/JS/CSS and raw binary bytes; actual browser transfer is recorded separately. No field, GPU, or sustained-device claims.",
    canonicalApplicationRoot: "app",
    serverHtmlHasHostInjection: false,
    serverPayload: { route: "/", status: serverResponse.status(), html: serverHtml, htmlBytes: Buffer.byteLength(serverHtml, "utf8"), javascriptGzipBytes: serverJavascriptGzipBytes, criticalTransferBytes: serverCriticalTransferBytes, resources: serverPayloadResources },
    browser: browser.version(), os: `${os.type()} ${os.release()}`, cpu: os.cpus()[0]?.model,
    ramBytes: os.totalmem(), tier: "static A1", assetManifestRevision: null, publicationRevision: null,
    buildId: (await readFile(".next/BUILD_ID", "utf8")).trim(), runs, buildStats,
  }, null, 2));
});
