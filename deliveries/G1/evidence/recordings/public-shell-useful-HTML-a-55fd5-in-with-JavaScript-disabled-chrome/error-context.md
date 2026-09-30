# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: public-shell.spec.ts >> useful HTML and native navigation remain with JavaScript disabled
- Location: tests\e2e\public-shell.spec.ts:99:1

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:3147/
Call log:
  - navigating to "http://127.0.0.1:3147/", waiting until "load"

```

# Test source

```ts
  7   |   ["/", "A little world."], ["/projects", "Projects"], ["/about", "About"],
  8   |   ["/contact", "Contact"], ["/resume", "Résumé"],
  9   | ] as const;
  10  | const worldPattern = /\.(?:glb|gltf|ktx2?|basis|wasm|mp3|ogg|wav)(?:\?|$)|\/(?:world|assets-runtime|draco|basis|api)(?:\/|\?|$)/i;
  11  | const isHostInjection = (url: string) => /^(gc|me)\.kis\.v2\.scr\.kaspersky-labs\.com$/.test(new URL(url).hostname);
  12  | 
  13  | const observations = new WeakMap<Page, Array<{ type: string; message: string }>>();
  14  | test.beforeEach(async ({ page }) => {
  15  |   const events: Array<{ type: string; message: string }> = [];
  16  |   observations.set(page, events);
  17  |   page.on("console", (message) => {
  18  |     if (["error", "warning"].includes(message.type())) events.push({ type: message.type(), message: message.text() });
  19  |   });
  20  |   page.on("pageerror", (error) => events.push({ type: "pageerror", message: error.message }));
  21  | });
  22  | test.afterEach(async ({ page }, info) => {
  23  |   await save(info, `console/${info.title.replace(/[^a-z0-9]+/gi, "-").slice(0, 100)}.json`, {
  24  |     title: info.title, status: info.status, events: observations.get(page) ?? [],
  25  |     note: "Intentional blocked probes, denied host injection, and the tested 404 may produce network console errors.",
  26  |   });
  27  | });
  28  | 
  29  | async function save(info: TestInfo, name: string, data: unknown) {
  30  |   const destination = path.join(process.env.W3_EVIDENCE_DIR ?? "test-results", info.project.name, name);
  31  |   await mkdir(path.dirname(destination), { recursive: true });
  32  |   await writeFile(destination, JSON.stringify(data, null, 2));
  33  | }
  34  | async function screenshot(page: Page, info: TestInfo, name: string) {
  35  |   const destination = path.join(process.env.W3_EVIDENCE_DIR ?? "test-results", info.project.name, "screenshots", `${name}.png`);
  36  |   await mkdir(path.dirname(destination), { recursive: true });
  37  |   await page.screenshot({ path: destination, fullPage: true });
  38  | }
  39  | 
  40  | test("direct loads, refreshes, route headings, honest empty states and 404", async ({ page, browser }, info) => {
  41  |   const errors: string[] = [];
  42  |   page.on("pageerror", (error) => errors.push(error.message));
  43  |   const statuses = [];
  44  |   for (const [route, heading] of routes) {
  45  |     const response = await page.goto(route);
  46  |     expect(response?.status()).toBe(200);
  47  |     await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toContainText(heading);
  48  |     await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
  49  |     expect((await page.reload())?.status()).toBe(200);
  50  |     await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toContainText(heading);
  51  |     await screenshot(page, info, route === "/" ? "home-desktop" : route.slice(1));
  52  |     statuses.push({ route, direct: response?.status(), refresh: 200 });
  53  |   }
  54  |   await page.goto("/");
  55  |   await expect(page.getByText("Draft identity", { exact: true })).toBeVisible();
  56  |   await expect(page.getByText("Name and professional title await owner confirmation.")).toBeVisible();
  57  |   await page.goto("/projects");
  58  |   await expect(page.getByText("0 published projects")).toBeVisible();
  59  |   await expect(page.locator('a[href^="/projects/"]')).toHaveCount(0);
  60  |   await page.goto("/contact");
  61  |   await expect(page.getByRole("heading", { name: "Messaging is not available yet." })).toBeVisible();
  62  |   await expect(page.locator("form, input, textarea")).toHaveCount(0);
  63  |   await page.goto("/resume");
  64  |   await expect(page.getByRole("heading", { name: "No approved résumé is available." })).toBeVisible();
  65  |   await expect(page.locator('a[download], a[href$=".pdf"]')).toHaveCount(0);
  66  |   const missing = await page.goto("/projects/test-only");
  67  |   expect(missing?.status()).toBe(404);
  68  |   await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  69  |   expect(errors).toEqual([]);
  70  |   await save(info, "routes.json", { browser: browser.version(), statuses, unknownProjectStatus: missing?.status(), pageErrors: errors });
  71  | });
  72  | 
  73  | test("keyboard skip link and all primary destinations work without pointer input", async ({ page }, info) => {
  74  |   const sequence: string[] = [];
  75  |   await page.goto("/");
  76  |   await page.keyboard.press("Tab");
  77  |   await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  78  |   await expect(page.getByRole("link", { name: "Skip to content" })).toBeInViewport();
  79  |   await screenshot(page, info, "skip-link-focus");
  80  |   await page.keyboard.press("Enter");
  81  |   await expect(page.getByRole("main")).toBeFocused();
  82  |   await page.keyboard.press("Tab");
  83  |   await expect(page.getByRole("link", { name: "View projects" })).toBeFocused();
  84  |   for (const [index, label] of ["Projects", "About", "Contact", "Résumé"].entries()) {
  85  |     await page.goto("/");
  86  |     // Skip link, home brand, then the four persistent native links.
  87  |     for (let step = 0; step < index + 3; step++) await page.keyboard.press("Tab");
  88  |     const link = page.getByRole("navigation").getByRole("link", { name: label, exact: true });
  89  |     await expect(link).toBeFocused();
  90  |     const outline = await link.evaluate((node) => getComputedStyle(node).outlineStyle);
  91  |     expect(outline).not.toBe("none");
  92  |     sequence.push(await link.getAttribute("href") ?? "missing");
  93  |     await page.keyboard.press("Enter");
  94  |     await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toHaveText(label);
  95  |   }
  96  |   await save(info, "keyboard.json", { skipFocus: "main-content", firstContentLink: "View projects", sequence });
  97  | });
  98  | 
  99  | test("useful HTML and native navigation remain with JavaScript disabled", async ({ browser, baseURL }, info) => {
  100 |   if (!baseURL) throw new Error("The production server baseURL must be configured.");
  101 |   const context = await browser.newContext({ javaScriptEnabled: false, baseURL, viewport: { width: 1440, height: 900 } });
  102 |   const page = await context.newPage();
  103 |   const scripts: string[] = [];
  104 |   page.on("request", (request) => { if (request.resourceType() === "script") scripts.push(request.url()); });
  105 |   try {
  106 |     for (const [route, heading] of routes) {
> 107 |       expect((await page.goto(route))?.status()).toBe(200);
      |                          ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:3147/
  108 |       await expect(page.getByRole("heading", { level: 1 })).toContainText(heading);
  109 |       expect((await page.reload())?.status()).toBe(200);
  110 |       await expect(page.getByRole("heading", { level: 1 })).toContainText(heading);
  111 |     }
  112 |     await page.goto("/");
  113 |     await page.keyboard.press("Tab");
  114 |     await page.keyboard.press("Enter");
  115 |     await expect(page.getByRole("main")).toBeFocused();
  116 |     await page.locator("summary").click();
  117 |     await expect(page.getByText("The studio is not yet available.", { exact: true })).toBeVisible();
  118 |     await screenshot(page, info, "javascript-disabled");
  119 |     await page.getByRole("navigation").getByRole("link", { name: "Contact", exact: true }).click();
  120 |     await expect(page.getByRole("heading", { name: "Messaging is not available yet." })).toBeVisible();
  121 |     await save(info, "javascript-disabled.json", { scriptsRequested: scripts, routes: routes.map(([route]) => route), navigation: "Contact reached through native link" });
  122 |   } finally { await context.close(); }
  123 | });
  124 | 
  125 | test("world and backend requests blocked; entry reports unavailable; sound and WebGL stay off", async ({ page, baseURL }, info) => {
  126 |   const requested: string[] = [];
  127 |   const blocked: string[] = [];
  128 |   await page.addInitScript(() => {
  129 |     const probe = { webgl: 0, audioContexts: 0, mediaPlay: 0 };
  130 |     Object.assign(window, { __w3Probe: probe });
  131 |     HTMLCanvasElement.prototype.getContext = new Proxy(HTMLCanvasElement.prototype.getContext, {
  132 |       apply(target, thisArg, args) {
  133 |         if (String(args[0]).includes("webgl")) probe.webgl++;
  134 |         return Reflect.apply(target, thisArg, args);
  135 |       },
  136 |     });
  137 |     window.AudioContext = new Proxy(window.AudioContext, {
  138 |       construct(target, args) { probe.audioContexts++; return Reflect.construct(target, args); },
  139 |     });
  140 |     HTMLMediaElement.prototype.play = new Proxy(HTMLMediaElement.prototype.play, {
  141 |       apply(target, thisArg, args) { probe.mediaPlay++; return Reflect.apply(target, thisArg, args); },
  142 |     });
  143 |   });
  144 |   await page.route("**/*", async (route) => {
  145 |     const url = route.request().url();
  146 |     requested.push(url);
  147 |     if (worldPattern.test(url) || new URL(url).origin !== new URL(baseURL!).origin) {
  148 |       blocked.push(url); await route.abort();
  149 |     } else { await route.continue(); }
  150 |   });
  151 |   await page.goto("/");
  152 |   await page.waitForLoadState("networkidle");
  153 |   // Prove the interception guard actually denies both asset and API probes.
  154 |   const guard = await page.evaluate(async () => {
  155 |     const results = [];
  156 |     for (const url of ["/world/__test_probe.glb", "/api/__test_probe"]) {
  157 |       try { await fetch(url); results.push("unexpected response"); } catch { results.push("blocked"); }
  158 |     }
  159 |     return results;
  160 |   });
  161 |   expect(guard).toEqual(["blocked", "blocked"]);
  162 |   await expect(page.getByText("Sound off", { exact: false })).toBeVisible();
  163 |   await page.locator("summary").focus();
  164 |   await page.keyboard.press("Enter");
  165 |   await expect(page.locator("details")).toHaveAttribute("open", "");
  166 |   await expect(page.getByText("The studio is not yet available.", { exact: true })).toBeVisible();
  167 |   await page.waitForLoadState("networkidle");
  168 |   const probe = await page.evaluate(() => (window as unknown as { __w3Probe: object }).__w3Probe);
  169 |   expect(probe).toEqual({ webgl: 0, audioContexts: 0, mediaPlay: 0 });
  170 |   await expect(page.locator("canvas, audio, video")).toHaveCount(0);
  171 |   await screenshot(page, info, "studio-unavailable");
  172 |   await page.keyboard.press("Space");
  173 |   await expect(page.locator("details")).not.toHaveAttribute("open", "");
  174 |   for (const [route, heading] of routes.slice(1)) {
  175 |     await page.goto(route);
  176 |     await expect(page.getByRole("heading", { level: 1 })).toContainText(heading);
  177 |   }
  178 |   const actualWorldOrBackend = requested.filter((url) => worldPattern.test(url) && !url.includes("__test_probe"));
  179 |   expect(actualWorldOrBackend).toEqual([]);
  180 |   const hostInjectionBlocked = blocked.filter(isHostInjection);
  181 |   expect(blocked.filter((url) => !url.includes("__test_probe") && !isHostInjection(url))).toEqual([]);
  182 |   await save(info, "blocked-network.json", { requested, blocked, hostInjectionBlocked, testInjectedGuard: guard, probe, actualWorldOrBackend,
  183 |     scope: "All off-origin requests denied; observed host antivirus injection recorded separately, never allowed." });
  184 | });
  185 | 
  186 | test("reduced motion has no active animation or smooth travel and keeps all routes", async ({ page }, info) => {
  187 |   await page.emulateMedia({ reducedMotion: "reduce" });
  188 |   const observations = [];
  189 |   for (const [route, heading] of routes) {
  190 |     await page.goto(route);
  191 |     await expect(page.getByRole("heading", { level: 1 })).toContainText(heading);
  192 |     const observation = await page.evaluate(() => ({
  193 |       reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
  194 |       activeAnimations: document.getAnimations().length,
  195 |       smoothElements: [...document.querySelectorAll("*")].filter((node) => getComputedStyle(node).scrollBehavior === "smooth").length,
  196 |     }));
  197 |     expect(observation).toEqual({ reducedMotion: true, activeAnimations: 0, smoothElements: 0 });
  198 |     observations.push({ route, ...observation });
  199 |   }
  200 |   await save(info, "reduced-motion.json", observations);
  201 | });
  202 | 
  203 | test("direct section anchors and browser Back preserve reachable content", async ({ page }, info) => {
  204 |   for (const id of ["research", "skills"]) {
  205 |     await page.goto("/"); // Ensure each anchor check is a fresh document request.
  206 |     expect((await page.goto(`/about#${id}`))?.status()).toBe(200);
  207 |     await expect(page.locator(`#${id}`)).toBeInViewport();
```