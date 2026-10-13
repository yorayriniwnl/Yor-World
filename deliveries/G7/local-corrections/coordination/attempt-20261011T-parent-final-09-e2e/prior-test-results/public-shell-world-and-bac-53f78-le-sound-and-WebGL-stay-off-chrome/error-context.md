# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: public-shell.spec.ts >> world and backend requests blocked; entry reports unavailable; sound and WebGL stay off
- Location: tests\e2e\public-shell.spec.ts:140:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('The studio is not yet available.', { exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText('The studio is not yet available.', { exact: true }) with timeout 5000ms
  - waiting for getByText('The studio is not yet available.', { exact: true })

```

```yaml
- link "Skip to content":
  - /url: "#main-content"
- banner:
  - link "Yor World home":
    - /url: /
    - text: YOR WORLD A studio in progress
  - navigation "Primary navigation":
    - list:
      - listitem:
        - link "Projects":
          - /url: /projects
      - listitem:
        - link "About":
          - /url: /about
      - listitem:
        - link "Contact":
          - /url: /contact
      - listitem:
        - link "Résumé":
          - /url: /resume
- main:
  - region "A little world. A closer look.":
    - paragraph: The door is taking shape
    - heading "A little world. A closer look." [level=1]:
      - text: A little world.
      - emphasis: A closer look.
    - paragraph: A personal studio for exploring the work, the thinking, and the person behind it.
    - paragraph: Ayush Roy Verified identity
    - paragraph: Full-Stack & Systems Developer
    - paragraph: Building realtime systems, 3D product interfaces, and applied ML.
    - link "View projects":
      - /url: /projects
    - group:
      - text: Enter studio
      - paragraph: Explore the interactive studio. Sound starts muted, and you can skip the entrance or return to the portfolio at any time.
      - paragraph: Step inside the bright white workstation, meet the resident, and discover the projects through the objects in the room.
      - button "Launch 3D Studio"
    - paragraph: Four verified project case studies. Explore the studio whenever you like.
    - complementary "Studio status":
      - text: YOR / 01 In the making
      - paragraph:
        - text: A space for
        - strong: curiosity.
      - text: Interactive studio Portfolio pages below
  - region "Start anywhere.":
    - paragraph: Take a look around
    - heading "Start anywhere." [level=2]
    - list:
      - listitem:
        - link "01 Projects Verified software case studies":
          - /url: /projects
          - text: "01"
          - strong: Projects
          - text: Verified software case studies
      - listitem:
        - link "02 About Background, education, and technical skills":
          - /url: /about
          - text: "02"
          - strong: About
          - text: Background, education, and technical skills
      - listitem:
        - link "03 Contact Send a message or use direct channels":
          - /url: /contact
          - text: "03"
          - strong: Contact
          - text: Send a message or use direct channels
- contentinfo:
  - paragraph: YOR WORLD Ayush Roy Portfolio
  - paragraph: Sound off Explore at your pace
- alert
```

# Test source

```ts
  81  |   const missing = await page.goto("/projects/test-only");
  82  |   expect(missing?.status()).toBe(404);
  83  |   await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  84  |   expect(errors).toEqual([]);
  85  |   await save(info, "routes.json", { browser: browser.version(), statuses, unknownProjectStatus: missing?.status(), pageErrors: errors });
  86  | });
  87  | 
  88  | test("keyboard skip link and all primary destinations work without pointer input", async ({ page }, info) => {
  89  |   const sequence: string[] = [];
  90  |   await page.goto("/");
  91  |   await page.keyboard.press("Tab");
  92  |   await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  93  |   await expect(page.getByRole("link", { name: "Skip to content" })).toBeInViewport();
  94  |   await screenshot(page, info, "skip-link-focus");
  95  |   await page.keyboard.press("Enter");
  96  |   await expect(page.getByRole("main")).toBeFocused();
  97  |   await page.keyboard.press("Tab");
  98  |   await expect(page.getByRole("link", { name: "View projects" })).toBeFocused();
  99  |   for (const [index, label] of ["Projects", "About", "Contact", "Résumé"].entries()) {
  100 |     await page.goto("/");
  101 |     // Skip link, home brand, then the four persistent native links.
  102 |     for (let step = 0; step < index + 3; step++) await page.keyboard.press("Tab");
  103 |     const link = page.getByRole("navigation").getByRole("link", { name: label, exact: true });
  104 |     await expect(link).toBeFocused();
  105 |     const outline = await link.evaluate((node) => getComputedStyle(node).outlineStyle);
  106 |     expect(outline).not.toBe("none");
  107 |     sequence.push(await link.getAttribute("href") ?? "missing");
  108 |     await page.keyboard.press("Enter");
  109 |     await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toHaveText(label);
  110 |   }
  111 |   await save(info, "keyboard.json", { skipFocus: "main-content", firstContentLink: "View projects", sequence });
  112 | });
  113 | 
  114 | test("useful HTML and native navigation remain with JavaScript disabled", async ({ browser, baseURL }, info) => {
  115 |   if (!baseURL) throw new Error("The production server baseURL must be configured.");
  116 |   const context = await browser.newContext({ javaScriptEnabled: false, baseURL, viewport: { width: 1440, height: 900 } });
  117 |   const page = await context.newPage();
  118 |   const scripts: string[] = [];
  119 |   page.on("request", (request) => { if (request.resourceType() === "script") scripts.push(request.url()); });
  120 |   try {
  121 |     for (const [route, heading] of routes) {
  122 |       expect((await page.goto(route))?.status()).toBe(200);
  123 |       await expect(page.getByRole("heading", { level: 1 })).toContainText(heading);
  124 |       expect((await page.reload())?.status()).toBe(200);
  125 |       await expect(page.getByRole("heading", { level: 1 })).toContainText(heading);
  126 |     }
  127 |     await page.goto("/");
  128 |     await page.keyboard.press("Tab");
  129 |     await page.keyboard.press("Enter");
  130 |     await expect(page.getByRole("main")).toBeFocused();
  131 |     await page.locator("summary").click();
  132 |     await expect(page.getByText("The studio is not yet available.", { exact: true })).toBeVisible();
  133 |     await screenshot(page, info, "javascript-disabled");
  134 |     await page.getByRole("navigation").getByRole("link", { name: "Contact", exact: true }).click();
  135 |     await expect(page.getByRole("heading", { name: "Send a Message" })).toBeVisible();
  136 |     await save(info, "javascript-disabled.json", { scriptsRequested: scripts, routes: routes.map(([route]) => route), navigation: "Contact reached through native link" });
  137 |   } finally { await context.close(); }
  138 | });
  139 | 
  140 | test("world and backend requests blocked; entry reports unavailable; sound and WebGL stay off", async ({ page, baseURL }, info) => {
  141 |   const requested: string[] = [];
  142 |   const blocked: string[] = [];
  143 |   await page.addInitScript(() => {
  144 |     const probe = { webgl: 0, audioContexts: 0, mediaPlay: 0 };
  145 |     Object.assign(window, { __w3Probe: probe });
  146 |     HTMLCanvasElement.prototype.getContext = new Proxy(HTMLCanvasElement.prototype.getContext, {
  147 |       apply(target, thisArg, args) {
  148 |         if (String(args[0]).includes("webgl")) probe.webgl++;
  149 |         return Reflect.apply(target, thisArg, args);
  150 |       },
  151 |     });
  152 |     window.AudioContext = new Proxy(window.AudioContext, {
  153 |       construct(target, args) { probe.audioContexts++; return Reflect.construct(target, args); },
  154 |     });
  155 |     HTMLMediaElement.prototype.play = new Proxy(HTMLMediaElement.prototype.play, {
  156 |       apply(target, thisArg, args) { probe.mediaPlay++; return Reflect.apply(target, thisArg, args); },
  157 |     });
  158 |   });
  159 |   await page.route("**/*", async (route) => {
  160 |     const url = route.request().url();
  161 |     requested.push(url);
  162 |     if (worldPattern.test(url) || new URL(url).origin !== new URL(baseURL!).origin) {
  163 |       blocked.push(url); await route.abort();
  164 |     } else { await route.continue(); }
  165 |   });
  166 |   await page.goto("/");
  167 |   await page.waitForLoadState("networkidle");
  168 |   // Prove the interception guard actually denies both asset and API probes.
  169 |   const guard = await page.evaluate(async () => {
  170 |     const results = [];
  171 |     for (const url of ["/world/__test_probe.glb", "/api/__test_probe"]) {
  172 |       try { await fetch(url); results.push("unexpected response"); } catch { results.push("blocked"); }
  173 |     }
  174 |     return results;
  175 |   });
  176 |   expect(guard).toEqual(["blocked", "blocked"]);
  177 |   await expect(page.getByText("Sound off", { exact: false })).toBeVisible();
  178 |   await page.locator("summary").focus();
  179 |   await page.keyboard.press("Enter");
  180 |   await expect(page.locator("details")).toHaveAttribute("open", "");
> 181 |   await expect(page.getByText("The studio is not yet available.", { exact: true })).toBeVisible();
      |                                                                                     ^ Error: expect(locator).toBeVisible() failed
  182 |   await page.waitForLoadState("networkidle");
  183 |   const probe = await page.evaluate(() => (window as unknown as { __w3Probe: object }).__w3Probe);
  184 |   expect(probe).toEqual({ webgl: 0, audioContexts: 0, mediaPlay: 0 });
  185 |   await expect(page.locator("canvas, audio, video")).toHaveCount(0);
  186 |   await screenshot(page, info, "studio-unavailable");
  187 |   await page.keyboard.press("Space");
  188 |   await expect(page.locator("details")).not.toHaveAttribute("open", "");
  189 |   for (const [route, heading] of routes.slice(1)) {
  190 |     await page.goto(route);
  191 |     await expect(page.getByRole("heading", { level: 1 })).toContainText(heading);
  192 |   }
  193 |   const actualWorldOrBackend = requested.filter((url) => worldPattern.test(url) && !url.includes("__test_probe"));
  194 |   expect(actualWorldOrBackend).toEqual([]);
  195 |   const hostInjectionBlocked = blocked.filter(isHostInjection);
  196 |   expect(blocked.filter((url) => !url.includes("__test_probe") && !isHostInjection(url))).toEqual([]);
  197 |   await save(info, "blocked-network.json", { requested, blocked, hostInjectionBlocked, testInjectedGuard: guard, probe, actualWorldOrBackend,
  198 |     scope: "All off-origin requests denied; observed host antivirus injection recorded separately, never allowed." });
  199 | });
  200 | 
  201 | test("reduced motion has no active animation or smooth travel and keeps all routes", async ({ page }, info) => {
  202 |   await page.emulateMedia({ reducedMotion: "reduce" });
  203 |   const observations = [];
  204 |   for (const [route, heading] of routes) {
  205 |     await page.goto(route);
  206 |     await expect(page.getByRole("heading", { level: 1 })).toContainText(heading);
  207 |     const observation = await page.evaluate(() => ({
  208 |       reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
  209 |       activeAnimations: document.getAnimations().length,
  210 |       smoothElements: [...document.querySelectorAll("*")].filter((node) => getComputedStyle(node).scrollBehavior === "smooth").length,
  211 |     }));
  212 |     expect(observation).toEqual({ reducedMotion: true, activeAnimations: 0, smoothElements: 0 });
  213 |     observations.push({ route, ...observation });
  214 |   }
  215 |   await save(info, "reduced-motion.json", observations);
  216 | });
  217 | 
  218 | test("direct section anchors and browser Back preserve reachable content", async ({ page }, info) => {
  219 |   for (const id of ["research", "skills"]) {
  220 |     await page.goto("/"); // Ensure each anchor check is a fresh document request.
  221 |     expect((await page.goto(`/about#${id}`))?.status()).toBe(200);
  222 |     await expect(page.locator(`#${id}`)).toBeInViewport();
  223 |     await page.reload();
  224 |     await expect(page.locator(`#${id}`)).toBeInViewport();
  225 |   }
  226 |   await page.goto("/projects");
  227 |   await page.getByRole("navigation").getByRole("link", { name: "About", exact: true }).click();
  228 |   await expect(page).toHaveURL(/\/about$/);
  229 |   await page.goBack();
  230 |   await expect(page).toHaveURL(/\/projects$/);
  231 |   await expect(page.getByText(/verified projects published/i)).toBeVisible();
  232 |   await save(info, "history.json", { anchors: ["/about#research", "/about#skills"], back: "/projects" });
  233 | });
  234 | 
  235 | test("automated axe scan of every public route and open studio disclosure", async ({ page }, info) => {
  236 |   const scans = [];
  237 |   for (const [route] of routes) {
  238 |     await page.goto(route);
  239 |     if (route === "/") await page.locator("summary").click();
  240 |     const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  241 |     scans.push({ route, violations: result.violations, incomplete: result.incomplete, passes: result.passes.length });
  242 |     expect(result.violations).toEqual([]);
  243 |   }
  244 |   await save(info, "axe.json", { scope: "Automated only; not WCAG certification or screen-reader testing", scans });
  245 | });
  246 | 
  247 | test("mobile, narrow and landscape reflow preserve controls", async ({ page }, info) => {
  248 |   const observations = [];
  249 |   for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 800 }, { width: 844, height: 390 }]) {
  250 |     await page.setViewportSize(viewport);
  251 |     for (const [route] of routes) {
  252 |       await page.goto(route);
  253 |       const dimensions = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  254 |       expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width);
  255 |       const nav = page.getByRole("navigation").getByRole("link");
  256 |       for (const link of await nav.all()) {
  257 |         await expect(link).toBeVisible();
  258 |         const box = await link.boundingBox();
  259 |         expect(box?.height).toBeGreaterThanOrEqual(44);
  260 |       }
  261 |       observations.push({ viewport, route, ...dimensions });
  262 |     }
  263 |     await page.goto("/");
  264 |     await screenshot(page, info, `home-${viewport.width}x${viewport.height}`);
  265 |   }
  266 |   await save(info, "reflow.json", { scope: "Desktop browser viewport emulation; not a physical mobile device or browser zoom test", observations });
  267 | });
  268 | 
```