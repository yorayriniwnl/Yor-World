import { test, expect, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const routes = [
  ["/", "A little world."], ["/projects", "Projects"], ["/about", "About"],
  ["/contact", "Contact"], ["/resume", "Résumé"],
] as const;
const worldPattern = /\.(?:glb|gltf|ktx2?|basis|wasm|mp3|ogg|wav)(?:\?|$)|\/(?:world|assets-runtime|draco|basis|api)(?:\/|\?|$)/i;
const isHostInjection = (url: string) => /^(gc|me)\.kis\.v2\.scr\.kaspersky-labs\.com$/.test(new URL(url).hostname);

const observations = new WeakMap<Page, Array<{ type: string; message: string }>>();
test.beforeEach(async ({ page }) => {
  const events: Array<{ type: string; message: string }> = [];
  observations.set(page, events);
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) events.push({ type: message.type(), message: message.text() });
  });
  page.on("pageerror", (error) => events.push({ type: "pageerror", message: error.message }));
});
test.afterEach(async ({ page }, info) => {
  await save(info, `console/${info.title.replace(/[^a-z0-9]+/gi, "-").slice(0, 100)}.json`, {
    title: info.title, status: info.status, events: observations.get(page) ?? [],
    note: "Intentional blocked probes, denied host injection, and the tested 404 may produce network console errors.",
  });
});

async function save(info: TestInfo, name: string, data: unknown) {
  const destination = path.join(process.env.W3_EVIDENCE_DIR ?? "test-results", info.project.name, name);
  await mkdir(path.dirname(destination), { recursive: true });
  try {
    await writeFile(destination, JSON.stringify(data, null, 2));
  } catch {
    await new Promise((r) => setTimeout(r, 100));
    await writeFile(destination, JSON.stringify(data, null, 2)).catch(() => {});
  }
}
async function screenshot(page: Page, info: TestInfo, name: string) {
  const destination = path.join(process.env.W3_EVIDENCE_DIR ?? "test-results", info.project.name, "screenshots", `${name}.png`);
  await mkdir(path.dirname(destination), { recursive: true });
  try {
    await page.screenshot({ path: destination, fullPage: true });
  } catch {
    await new Promise((r) => setTimeout(r, 200));
    try {
      await page.screenshot({ path: destination, fullPage: true });
    } catch {
      // Ignore transient screenshot lock
    }
  }
}

test("direct loads, refreshes, route headings, honest empty states and 404", async ({ page, browser }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const statuses = [];
  for (const [route, heading] of routes) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toContainText(heading);
    await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
    expect((await page.reload())?.status()).toBe(200);
    await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toContainText(heading);
    await screenshot(page, info, route === "/" ? "home-desktop" : route.slice(1));
    statuses.push({ route, direct: response?.status(), refresh: 200 });
  }
  await page.goto("/");
  await expect(page.getByText("Verified identity", { exact: true })).toBeVisible();
  await expect(page.getByText("Building realtime systems, 3D product interfaces, and applied ML.")).toBeVisible();
  await page.goto("/projects");
  await expect(page.getByText(/verified projects published/i)).toBeVisible();
  await expect(page.locator('a[href^="/projects/"]')).toHaveCount(4);
  await page.goto("/contact");
  await expect(page.getByRole("heading", { name: "Send a Message" })).toBeVisible();
  await expect(page.locator("#contact-name")).toBeVisible();
  await expect(page.locator("#contact-message")).toBeVisible();
  await page.goto("/resume");
  await expect(page.getByRole("heading", { name: "Ayush Roy", level: 2 })).toBeVisible();
  await expect(page.locator('a[download], a[href$=".pdf"]')).toHaveCount(0);
  const missing = await page.goto("/projects/test-only");
  expect(missing?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  expect(errors).toEqual([]);
  await save(info, "routes.json", { browser: browser.version(), statuses, unknownProjectStatus: missing?.status(), pageErrors: errors });
});

test("keyboard skip link and all primary destinations work without pointer input", async ({ page }, info) => {
  const sequence: string[] = [];
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeInViewport();
  await screenshot(page, info, "skip-link-focus");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "View projects" })).toBeFocused();
  for (const [index, label] of ["Projects", "About", "Contact", "Résumé"].entries()) {
    await page.goto("/");
    // Skip link, home brand, then the four persistent native links.
    for (let step = 0; step < index + 3; step++) await page.keyboard.press("Tab");
    const link = page.getByRole("navigation").getByRole("link", { name: label, exact: true });
    await expect(link).toBeFocused();
    const outline = await link.evaluate((node) => getComputedStyle(node).outlineStyle);
    expect(outline).not.toBe("none");
    sequence.push(await link.getAttribute("href") ?? "missing");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toHaveText(label);
  }
  await save(info, "keyboard.json", { skipFocus: "main-content", firstContentLink: "View projects", sequence });
});

test("useful HTML and native navigation remain with JavaScript disabled", async ({ browser, baseURL }, info) => {
  if (!baseURL) throw new Error("The production server baseURL must be configured.");
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const scripts: string[] = [];
  page.on("request", (request) => { if (request.resourceType() === "script") scripts.push(request.url()); });
  try {
    for (const [route, heading] of routes) {
      expect((await page.goto(route))?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(heading);
      expect((await page.reload())?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(heading);
    }
    await page.goto("/");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("main")).toBeFocused();
    await page.locator("summary").click();
    await expect(page.getByText("The studio is not yet available.", { exact: true })).toBeVisible();
    await screenshot(page, info, "javascript-disabled");
    await page.getByRole("navigation").getByRole("link", { name: "Contact", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Send a Message" })).toBeVisible();
    await save(info, "javascript-disabled.json", { scriptsRequested: scripts, routes: routes.map(([route]) => route), navigation: "Contact reached through native link" });
  } finally { await context.close(); }
});

test("world and backend requests blocked; entry reports unavailable; sound and WebGL stay off", async ({ page, baseURL }, info) => {
  const requested: string[] = [];
  const blocked: string[] = [];
  await page.addInitScript(() => {
    const probe = { webgl: 0, audioContexts: 0, mediaPlay: 0 };
    Object.assign(window, { __w3Probe: probe });
    HTMLCanvasElement.prototype.getContext = new Proxy(HTMLCanvasElement.prototype.getContext, {
      apply(target, thisArg, args) {
        if (String(args[0]).includes("webgl")) probe.webgl++;
        return Reflect.apply(target, thisArg, args);
      },
    });
    window.AudioContext = new Proxy(window.AudioContext, {
      construct(target, args) { probe.audioContexts++; return Reflect.construct(target, args); },
    });
    HTMLMediaElement.prototype.play = new Proxy(HTMLMediaElement.prototype.play, {
      apply(target, thisArg, args) { probe.mediaPlay++; return Reflect.apply(target, thisArg, args); },
    });
  });
  await page.route("**/*", async (route) => {
    const url = route.request().url();
    requested.push(url);
    if (worldPattern.test(url) || new URL(url).origin !== new URL(baseURL!).origin) {
      blocked.push(url); await route.abort();
    } else { await route.continue(); }
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  // Prove the interception guard actually denies both asset and API probes.
  const guard = await page.evaluate(async () => {
    const results = [];
    for (const url of ["/world/__test_probe.glb", "/api/__test_probe"]) {
      try { await fetch(url); results.push("unexpected response"); } catch { results.push("blocked"); }
    }
    return results;
  });
  expect(guard).toEqual(["blocked", "blocked"]);
  await expect(page.getByText("Sound off", { exact: false })).toBeVisible();
  await page.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("details")).toHaveAttribute("open", "");
  await expect(page.getByText("The studio is not yet available.", { exact: true })).toBeVisible();
  await page.waitForLoadState("networkidle");
  const probe = await page.evaluate(() => (window as unknown as { __w3Probe: object }).__w3Probe);
  expect(probe).toEqual({ webgl: 0, audioContexts: 0, mediaPlay: 0 });
  await expect(page.locator("canvas, audio, video")).toHaveCount(0);
  await screenshot(page, info, "studio-unavailable");
  await page.keyboard.press("Space");
  await expect(page.locator("details")).not.toHaveAttribute("open", "");
  for (const [route, heading] of routes.slice(1)) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(heading);
  }
  const actualWorldOrBackend = requested.filter((url) => worldPattern.test(url) && !url.includes("__test_probe"));
  expect(actualWorldOrBackend).toEqual([]);
  const hostInjectionBlocked = blocked.filter(isHostInjection);
  expect(blocked.filter((url) => !url.includes("__test_probe") && !isHostInjection(url))).toEqual([]);
  await save(info, "blocked-network.json", { requested, blocked, hostInjectionBlocked, testInjectedGuard: guard, probe, actualWorldOrBackend,
    scope: "All off-origin requests denied; observed host antivirus injection recorded separately, never allowed." });
});

test("reduced motion has no active animation or smooth travel and keeps all routes", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const observations = [];
  for (const [route, heading] of routes) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(heading);
    const observation = await page.evaluate(() => ({
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
      activeAnimations: document.getAnimations().length,
      smoothElements: [...document.querySelectorAll("*")].filter((node) => getComputedStyle(node).scrollBehavior === "smooth").length,
    }));
    expect(observation).toEqual({ reducedMotion: true, activeAnimations: 0, smoothElements: 0 });
    observations.push({ route, ...observation });
  }
  await save(info, "reduced-motion.json", observations);
});

test("direct section anchors and browser Back preserve reachable content", async ({ page }, info) => {
  for (const id of ["research", "skills"]) {
    await page.goto("/"); // Ensure each anchor check is a fresh document request.
    expect((await page.goto(`/about#${id}`))?.status()).toBe(200);
    await expect(page.locator(`#${id}`)).toBeInViewport();
    await page.reload();
    await expect(page.locator(`#${id}`)).toBeInViewport();
  }
  await page.goto("/projects");
  await page.getByRole("navigation").getByRole("link", { name: "About", exact: true }).click();
  await expect(page).toHaveURL(/\/about$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByText(/verified projects published/i)).toBeVisible();
  await save(info, "history.json", { anchors: ["/about#research", "/about#skills"], back: "/projects" });
});

test("automated axe scan of every public route and open studio disclosure", async ({ page }, info) => {
  const scans = [];
  for (const [route] of routes) {
    await page.goto(route);
    if (route === "/") await page.locator("summary").click();
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    scans.push({ route, violations: result.violations, incomplete: result.incomplete, passes: result.passes.length });
    expect(result.violations).toEqual([]);
  }
  await save(info, "axe.json", { scope: "Automated only; not WCAG certification or screen-reader testing", scans });
});

test("mobile, narrow and landscape reflow preserve controls", async ({ page }, info) => {
  const observations = [];
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 800 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    for (const [route] of routes) {
      await page.goto(route);
      const dimensions = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
      expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width);
      const nav = page.getByRole("navigation").getByRole("link");
      for (const link of await nav.all()) {
        await expect(link).toBeVisible();
        const box = await link.boundingBox();
        expect(box?.height).toBeGreaterThanOrEqual(44);
      }
      observations.push({ viewport, route, ...dimensions });
    }
    await page.goto("/");
    await screenshot(page, info, `home-${viewport.width}x${viewport.height}`);
  }
  await save(info, "reflow.json", { scope: "Desktop browser viewport emulation; not a physical mobile device or browser zoom test", observations });
});
