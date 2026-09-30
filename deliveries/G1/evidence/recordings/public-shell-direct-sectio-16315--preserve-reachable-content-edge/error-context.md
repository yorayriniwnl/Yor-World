# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: public-shell.spec.ts >> direct section anchors and browser Back preserve reachable content
- Location: tests\e2e\public-shell.spec.ts:203:1

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:3147/
Call log:
  - navigating to "http://127.0.0.1:3147/", waiting until "load"

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - generic [ref=e6]:
      - heading "Hmmm… can't reach this page" [level=1] [ref=e7]
      - paragraph [ref=e8]:
        - strong [ref=e9]: 127.0.0.1
        - text: refused to connect.
      - generic [ref=e10]:
        - paragraph [ref=e11]: "Try:"
        - list [ref=e12]:
          - listitem [ref=e13]: •Checking the connection
          - listitem [ref=e14]:
            - text: •
            - link "Checking the proxy and the firewall" [ref=e15] [cursor=pointer]:
              - /url: "#buttons"
      - generic [ref=e16]: ERR_CONNECTION_REFUSED
    - button "Refresh" [ref=e19] [cursor=pointer]
  - generic [ref=e20]: Microsoft Edge
```

# Test source

```ts
  105 |   try {
  106 |     for (const [route, heading] of routes) {
  107 |       expect((await page.goto(route))?.status()).toBe(200);
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
> 205 |     await page.goto("/"); // Ensure each anchor check is a fresh document request.
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:3147/
  206 |     expect((await page.goto(`/about#${id}`))?.status()).toBe(200);
  207 |     await expect(page.locator(`#${id}`)).toBeInViewport();
  208 |     await page.reload();
  209 |     await expect(page.locator(`#${id}`)).toBeInViewport();
  210 |   }
  211 |   await page.goto("/projects");
  212 |   await page.getByRole("navigation").getByRole("link", { name: "About", exact: true }).click();
  213 |   await expect(page).toHaveURL(/\/about$/);
  214 |   await page.goBack();
  215 |   await expect(page).toHaveURL(/\/projects$/);
  216 |   await expect(page.getByText("0 published projects")).toBeVisible();
  217 |   await save(info, "history.json", { anchors: ["/about#research", "/about#skills"], back: "/projects" });
  218 | });
  219 | 
  220 | test("automated axe scan of every public route and open studio disclosure", async ({ page }, info) => {
  221 |   const scans = [];
  222 |   for (const [route] of routes) {
  223 |     await page.goto(route);
  224 |     if (route === "/") await page.locator("summary").click();
  225 |     const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  226 |     scans.push({ route, violations: result.violations, incomplete: result.incomplete, passes: result.passes.length });
  227 |     expect(result.violations).toEqual([]);
  228 |   }
  229 |   await save(info, "axe.json", { scope: "Automated only; not WCAG certification or screen-reader testing", scans });
  230 | });
  231 | 
  232 | test("mobile, narrow and landscape reflow preserve controls", async ({ page }, info) => {
  233 |   const observations = [];
  234 |   for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 800 }, { width: 844, height: 390 }]) {
  235 |     await page.setViewportSize(viewport);
  236 |     for (const [route] of routes) {
  237 |       await page.goto(route);
  238 |       const dimensions = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  239 |       expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width);
  240 |       const nav = page.getByRole("navigation").getByRole("link");
  241 |       for (const link of await nav.all()) {
  242 |         await expect(link).toBeVisible();
  243 |         const box = await link.boundingBox();
  244 |         expect(box?.height).toBeGreaterThanOrEqual(44);
  245 |       }
  246 |       observations.push({ viewport, route, ...dimensions });
  247 |     }
  248 |     await page.goto("/");
  249 |     await screenshot(page, info, `home-${viewport.width}x${viewport.height}`);
  250 |   }
  251 |   await save(info, "reflow.json", { scope: "Desktop browser viewport emulation; not a physical mobile device or browser zoom test", observations });
  252 | });
  253 | 
```