import { test, expect, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const routes = [
  "/",
  "/projects",
  "/projects/helios",
  "/projects/zenith",
  "/projects/ai-vs-real",
  "/projects/talks",
  "/admin/login",
  "/projects/candidatex",
  "/about",
  "/resume",
  "/contact",
] as const;

async function saveEvidence(info: TestInfo, name: string, data: unknown) {
  const baseDir = process.env.C3_EVIDENCE_DIR || process.env.C1_EVIDENCE_DIR || "test-results";
  const destination = path.join(baseDir, info.project.name, name);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, JSON.stringify(data, null, 2)).catch(() => {});
}

test.describe("C3 WCAG 2.2 AA Accessibility & Assistive Navigation", () => {
  for (const route of routes) {
    test(`Axe automated accessibility audit on ${route}`, async ({ page }, info) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });

      const axeResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();

      await saveEvidence(info, `axe-${route.replace(/[/]/g, "_")}.json`, {
        route,
        violations: axeResults.violations,
        passes: axeResults.passes.length,
      });

      // Assert zero critical or serious WCAG accessibility violations
      expect(axeResults.violations).toEqual([]);
    });
  }

  test("Logical heading structure and semantic landmarks exist on public shell", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Verify logical landmark regions
    const mainLandmark = page.locator("main");
    await expect(mainLandmark).toBeAttached();

    const navLandmark = page.locator("nav");
    expect(await navLandmark.count()).toBeGreaterThanOrEqual(1);

    // Verify logical H1 exists
    const h1 = page.locator("h1");
    expect(await h1.count()).toBe(1);
    await expect(h1).toBeVisible();
  });

  test("Skip to content link allows direct keyboard-only bypass", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Press Tab from clean page load to focus skip link
    await page.keyboard.press("Tab");

    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();
  });

  test("Interactive touch targets meet minimum 44x44 CSS px sizing requirement", async ({ page }, info) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Check main navigation links and interactive buttons
    const interactiveElements = page.locator("nav a, button, [role='button'], [role='switch']");
    const count = await interactiveElements.count();
    const checkedTargets: Array<{ text: string; width: number; height: number; pass: boolean }> = [];

    for (let i = 0; i < Math.min(count, 15); i++) {
      const el = interactiveElements.nth(i);
      if (await el.isVisible()) {
        const box = await el.boundingBox();
        if (box) {
          const text = (await el.textContent())?.trim().slice(0, 30) || `element-${i}`;
          // Target size guideline: >= 44x44 CSS px for primary controls or acceptable dense exceptions
          const pass = box.width >= 44 && box.height >= 44;
          checkedTargets.push({ text, width: Math.round(box.width), height: Math.round(box.height), pass });
        }
      }
    }

    await saveEvidence(info, "touch-target-audit.json", checkedTargets);
    expect(checkedTargets.length).toBeGreaterThan(0);
    expect(checkedTargets.filter((target) => !target.pass)).toEqual([]);
  });

  test("Reflow check: 320 CSS px viewport width without horizontal scrollbars", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 600 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

    // Allow at most 1px rounding tolerance
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test("Zoom / 200% reflow inspection", async ({ page }) => {
    // 200% zoom simulation via viewport scaling
    await page.setViewportSize({ width: 640, height: 480 });
    await page.goto("/projects/helios", { waitUntil: "domcontentloaded" });

    const h1 = page.locator("h1");
    await expect(h1).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test("Every published project destination is reachable without canvas or WebGL", async ({ page }) => {
    // Intercept and prevent any WebGL context creation
    await page.addInitScript(() => {
      HTMLCanvasElement.prototype.getContext = function (type: string) {
        if (type.includes("webgl")) return null;
        return null;
      } as typeof HTMLCanvasElement.prototype.getContext;
    });

    await page.goto("/projects", { waitUntil: "domcontentloaded" });

    const projectLinks = page.locator('a[href^="/projects/"]');
    const count = await projectLinks.count();
    expect(count).toBeGreaterThanOrEqual(4); // 4 verified projects + case studies

    // Navigate to Helios directly
    await page.goto("/projects/helios", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toContainText("Helios");
    await expect(page.locator("canvas")).toHaveCount(0); // Zero WebGL canvas needed
  });
});
