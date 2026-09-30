# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: payload.spec.ts >> five cold loads per desktop and mobile profile record actual production payloads
- Location: tests\e2e\payload.spec.ts:7:1

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:3147/
Call log:
  - navigating to "http://127.0.0.1:3147/", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | import { mkdir, writeFile, readdir, readFile } from "node:fs/promises";
  3   | import { gzipSync } from "node:zlib";
  4   | import path from "node:path";
  5   | import os from "node:os";
  6   | 
  7   | test("five cold loads per desktop and mobile profile record actual production payloads", async ({ browser, baseURL }, info) => {
  8   |   if (!baseURL) throw new Error("The production server baseURL must be configured.");
  9   |   test.setTimeout(180_000);
  10  |   const runs = [];
  11  |   const profiles = [
  12  |     { name: "desktop", width: 1440, height: 900, dpr: 1.5, downMbps: 10, upMbps: 2, latencyMs: 80 },
  13  |     { name: "mobile-emulated", width: 390, height: 844, dpr: 1.25, downMbps: 4, upMbps: 1, latencyMs: 150 },
  14  |   ];
  15  |   for (const profile of profiles) {
  16  |     for (let run = 1; run <= 5; run++) {
  17  |       const context = await browser.newContext({ baseURL, viewport: { width: profile.width, height: profile.height }, deviceScaleFactor: profile.dpr });
  18  |       try {
  19  |         const page = await context.newPage();
  20  |         const blockedExternal: string[] = [];
  21  |         const consoleEvents: Array<{ type: string; message: string }> = [];
  22  |         page.on("console", (message) => {
  23  |           if (["error", "warning"].includes(message.type())) consoleEvents.push({ type: message.type(), message: message.text() });
  24  |         });
  25  |         page.on("pageerror", (error) => consoleEvents.push({ type: "pageerror", message: error.message }));
  26  |         await context.route("**/*", async (route) => {
  27  |           if (new URL(route.request().url()).origin !== new URL(baseURL).origin) {
  28  |             blockedExternal.push(route.request().url());
  29  |             await route.abort();
  30  |           } else { await route.continue(); }
  31  |         });
  32  |         const cdp = await context.newCDPSession(page);
  33  |         await cdp.send("Network.enable");
  34  |         await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  35  |         await cdp.send("Network.emulateNetworkConditions", {
  36  |           offline: false, latency: profile.latencyMs,
  37  |           downloadThroughput: profile.downMbps * 1_000_000 / 8,
  38  |           uploadThroughput: profile.upMbps * 1_000_000 / 8,
  39  |         });
  40  |         const network: Array<{ url: string; type: string; status: number; contentEncoding: string | null; contentType: string | null }> = [];
  41  |         const jsUrls = new Set<string>();
  42  |         page.on("response", (response) => {
  43  |           const url = response.url();
  44  |           const contentType = response.headers()["content-type"] ?? null;
  45  |           const resourceType = response.request().resourceType();
  46  |           if (
  47  |             resourceType === "script" ||
  48  |             (contentType && contentType.includes("javascript")) ||
  49  |             new URL(url).pathname.endsWith(".js")
  50  |           ) {
  51  |             if (new URL(url).origin === new URL(baseURL).origin) {
  52  |               jsUrls.add(url);
  53  |             }
  54  |           }
  55  |           network.push({
  56  |             url,
  57  |             type: resourceType,
  58  |             status: response.status(),
  59  |             contentEncoding: response.headers()["content-encoding"] ?? null,
  60  |             contentType,
  61  |           });
  62  |         });
> 63  |         await page.goto("/");
      |                    ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:3147/
  64  |         await page.waitForLoadState("networkidle");
  65  |         await expect(page.getByRole("heading", { level: 1 })).toContainText("A little world.");
  66  |         const timing = await page.evaluate(() => {
  67  |           const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
  68  |           const navigation = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
  69  |           return { userAgent: navigator.userAgent, dpr: devicePixelRatio,
  70  |             navigation: navigation.map((r) => ({ url: r.name, transferSize: r.transferSize, encodedBodySize: r.encodedBodySize, decodedBodySize: r.decodedBodySize, duration: r.duration })),
  71  |             resources: resources.map((r) => ({ url: r.name, initiatorType: r.initiatorType, transferSize: r.transferSize, encodedBodySize: r.encodedBodySize, decodedBodySize: r.decodedBodySize, duration: r.duration })),
  72  |           };
  73  |         });
  74  |         const appResources = timing.resources.filter((r) => new URL(r.url).origin === new URL(baseURL).origin);
  75  |         const uniqueResourcesMap = new Map<string, (typeof appResources)[0]>();
  76  |         for (const r of appResources) {
  77  |           if (!uniqueResourcesMap.has(r.url)) {
  78  |             uniqueResourcesMap.set(r.url, r);
  79  |           }
  80  |         }
  81  |         const uniqueAppResources = [...uniqueResourcesMap.values()];
  82  |         const js = uniqueAppResources.filter((r) =>
  83  |           jsUrls.has(r.url) ||
  84  |           r.initiatorType === "script" ||
  85  |           new URL(r.url).pathname.endsWith(".js")
  86  |         );
  87  |         const encodedJsBytes = js.reduce((sum, r) => sum + r.encodedBodySize, 0);
  88  |         const totalTransferBytes = [...uniqueAppResources, ...timing.navigation].reduce((sum, r) => sum + r.transferSize, 0);
  89  |         expect(encodedJsBytes).toBeGreaterThan(0);
  90  |         expect(encodedJsBytes).toBeLessThanOrEqual(250 * 1024);
  91  |         expect(totalTransferBytes).toBeLessThanOrEqual(650 * 1024);
  92  |         expect(network.filter((r) => new URL(r.url).origin !== new URL(baseURL!).origin)).toEqual([]);
  93  |         expect(blockedExternal.filter((url) => !/^(gc|me)\.kis\.v2\.scr\.kaspersky-labs\.com$/.test(new URL(url).hostname))).toEqual([]);
  94  |         expect(consoleEvents.filter((event) => event.type === "pageerror")).toEqual([]);
  95  |         expect(network.filter((r) => /\.(glb|gltf|wasm|ktx2|mp3|wav|ogg)(\?|$)|\/api\//i.test(r.url))).toEqual([]);
  96  |         runs.push({ profile, run, cache: "cold new context; CDP cache disabled", encodedJsBytes, totalTransferBytes, network, blockedExternal, consoleEvents, ...timing });
  97  |       } finally { await context.close(); }
  98  |     }
  99  |   }
  100 |   const serverHtml = await readFile(".next/server/app/index.html", "utf8");
  101 |   expect(serverHtml).not.toContain("kaspersky-labs.com");
  102 |   const initialChunkMatches = serverHtml.matchAll(/\/static\/chunks\/([a-zA-Z0-9_\-\.]+)\.js/g);
  103 |   const initialChunkNames = new Set(Array.from(initialChunkMatches).map((m) => `${m[1]}.js`));
  104 | 
  105 |   const buildStats = [];
  106 |   // Build inspection complements URL tests, including opaque hashed chunk names.
  107 |   for (const entry of await readdir(".next/static/chunks", { recursive: true, withFileTypes: true })) {
  108 |     if (entry.isFile() && entry.name.endsWith(".js")) {
  109 |       const file = path.join(entry.parentPath, entry.name);
  110 |       const bytes = await readFile(file);
  111 |       const code = bytes.toString("utf8");
  112 |       // Landing page entry chunks must never load Three.js / WebGLRenderer pre-entry
  113 |       if (initialChunkNames.has(entry.name)) {
  114 |         expect(code).not.toMatch(/WebGLRenderer|THREE\.REVISION/);
  115 |       }
  116 |       expect(code).not.toMatch(/react-three\/fiber|createClient\(.+supabase|Synthetic contribution|testOnly = true|kaspersky-labs\.com/);
  117 |       buildStats.push({ file: path.relative(".next", file), bytes: bytes.length, gzipBytes: gzipSync(bytes).length });
  118 |     }
  119 |   }
  120 |   const destination = path.join(process.env.W3_EVIDENCE_DIR ?? "test-results", info.project.name, "payload.json");
  121 |   await mkdir(path.dirname(destination), { recursive: true });
  122 |   await writeFile(destination, JSON.stringify({
  123 |     scope: "Local next start; CDP throttling; all off-origin requests blocked. Application-origin byte totals exclude host antivirus injection. Payload budgets only; no field, GPU, or sustained-device claims.",
  124 |     serverHtmlHasHostInjection: false,
  125 |     browser: browser.version(), os: `${os.type()} ${os.release()}`, cpu: os.cpus()[0]?.model,
  126 |     ramBytes: os.totalmem(), tier: "static A1", assetManifestRevision: null, publicationRevision: null,
  127 |     buildId: (await readFile(".next/BUILD_ID", "utf8")).trim(), runs, buildStats,
  128 |   }, null, 2));
  129 | });
  130 | 
```