import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const evidenceDir = process.env.A2_EVIDENCE_DIR || process.env.G1_EVIDENCE_DIR || process.env.W3_EVIDENCE_DIR || "";
const screenshotDir = evidenceDir
  ? path.join(evidenceDir, "screenshots")
  : "";

async function captureScreenshot(page: Page, filename: string) {
  if (screenshotDir) {
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    try {
      await page.screenshot({
        path: path.join(screenshotDir, `${filename}.png`),
        fullPage: true,
      });
    } catch {
      await new Promise((r) => setTimeout(r, 200));
      try {
        await page.screenshot({
          path: path.join(screenshotDir, `${filename}.png`),
          fullPage: true,
        });
      } catch {
        // Transient screenshot lock on Windows does not fail functional assertion
      }
    }
  }
}

test.describe("A2 Verified Portfolio Content & Project Routes", () => {
  const verifiedSlugs = ["ai-vs-real", "zenith", "helios", "talks"] as const;

  test("verified projects render substantive case studies with evidence audit box and valid links", async ({ page }) => {
    // 1. Projects index
    const indexRes = await page.goto("/projects");
    expect(indexRes?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Projects", level: 1 })).toBeVisible();
    await expect(page.getByText("4 verified projects published.")).toBeVisible();
    await captureScreenshot(page, "a2-projects-index");

    // 2. Each verified project route
    for (const slug of verifiedSlugs) {
      const res = await page.goto(`/projects/${slug}`);
      expect(res?.status()).toBe(200);

      // Verify breadcrumb
      await expect(page.locator('nav[aria-label="Breadcrumb"]')).toBeVisible();
      await expect(page.locator('nav[aria-label="Breadcrumb"] a[href="/projects"]')).toBeVisible();

      // Verify H1 heading exists
      const h1 = page.locator("article h1");
      await expect(h1).toBeVisible();

      // Verify Contribution card
      await expect(page.getByRole("heading", { name: "Verified Role & Contribution" })).toBeVisible();

      // Verify Evidence Audit box
      await expect(page.getByRole("heading", { name: "Evidence Audit & Verification State" })).toBeVisible();
      await expect(page.locator("span:has-text('verified')").first()).toBeVisible();

      await captureScreenshot(page, `a2-project-${slug}`);
    }

    // Deep check on ai-vs-real
    await page.goto("/projects/ai-vs-real");
    await expect(page.getByRole("heading", { name: "AI vs. Real Image Detector" })).toBeVisible();
    await expect(page.getByText("78.5% held-out test accuracy").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Source Repository/i }).first()).toHaveAttribute("href", "https://github.com/yorayriniwnl/Yor-Ai-vs-real-image");
    await expect(page.getByRole("link", { name: /Live Demo/i }).first()).toHaveAttribute("href", "https://yor-ai-vs-real-image.vercel.app");
  });

  test("unpublished candidate 'candidatex' returns 404 without leaking unverified data", async ({ page }) => {
    const res = await page.goto("/projects/candidatex");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await expect(page.getByText("This page is not available. Only verified projects will have published case studies.")).toBeVisible();

    // Verify CandidateX internal details or unverified metrics are never leaked
    const bodyText = await page.innerText("body");
    expect(bodyText).not.toContain("CandidateX");
    expect(bodyText).not.toContain("Synthetic");
    await captureScreenshot(page, "a2-404-candidatex");
  });

  test("unknown arbitrary slug returns 404", async ({ page }) => {
    const res = await page.goto("/projects/unknown-slug-xyz");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  });

  test("missing figure renders accessible fallback without broken img elements", async ({ page }) => {
    // Yor Helios has a figure block with empty mediaId awaiting asset review
    const res = await page.goto("/projects/helios");
    expect(res?.status()).toBe(200);

    const figure = page.locator("figure").first();
    await expect(figure).toBeVisible();
    await expect(figure).toHaveAttribute("role", "img");
    await expect(figure.locator("span:has-text('Diagram / figure pending asset review')")).toBeVisible();
    await expect(figure.locator("figcaption")).toBeVisible();

    // Must NOT contain broken <img> tags
    await expect(figure.locator("img")).toHaveCount(0);
    await captureScreenshot(page, "a2-missing-figure-fallback");
  });

  test("long title and typography resilience does not overflow or break viewport layout", async ({ page }) => {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.goto("/projects/ai-vs-real");

      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      // Horizontal scroll width must not exceed client viewport width
      expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
    }
  });

  test("direct refresh preserves 200 OK and rendered state", async ({ page }) => {
    const res1 = await page.goto("/projects/ai-vs-real");
    expect(res1?.status()).toBe(200);
    await expect(page.locator("article h1")).toHaveText("AI vs. Real Image Detector");

    const res2 = await page.reload();
    expect(res2?.status()).toBe(200);
    await expect(page.locator("article h1")).toHaveText("AI vs. Real Image Detector");
  });

  test("back navigation from project case study returns cleanly to projects index", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.getByText("4 verified projects published.")).toBeVisible();

    // Click into Zenith project
    await page.locator('a[href="/projects/zenith"]').first().click();
    await expect(page).toHaveURL(/\/projects\/zenith$/);
    await expect(page.locator("article h1")).toHaveText("Yor Zenith");

    // Click browser back
    await page.goBack();
    await expect(page).toHaveURL(/\/projects$/);
    await expect(page.getByText("4 verified projects published.")).toBeVisible();
    await expect(page.locator('a[href^="/projects/"]')).toHaveCount(4);
  });

  test("JavaScript disabled: all project routes render substantive semantic HTML with zero WebGL/world requests", async ({ browser, baseURL }) => {
    if (!baseURL) throw new Error("The production server baseURL must be configured.");
    const context = await browser.newContext({
      javaScriptEnabled: false,
      baseURL,
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    const worldRequests: string[] = [];
    page.on("request", (req) => {
      const url = req.url().toLowerCase();
      if (url.endsWith(".glb") || url.endsWith(".gltf") || url.includes("/world")) {
        worldRequests.push(url);
      }
    });

    try {
      // Projects index
      const pRes = await page.goto("/projects");
      expect(pRes?.status()).toBe(200);
      await expect(page.locator("h1")).toContainText("Projects");
      await expect(page.locator('a[href="/projects/ai-vs-real"]').first()).toBeVisible();

      // Project case study
      const cRes = await page.goto("/projects/ai-vs-real");
      expect(cRes?.status()).toBe(200);
      await expect(page.locator("article h1")).toContainText("AI vs. Real Image Detector");
      await expect(page.locator("text=Verified Role & Contribution")).toBeVisible();

      // About
      const aRes = await page.goto("/about");
      expect(aRes?.status()).toBe(200);
      await expect(page.locator("h1")).toContainText("About");
      await expect(page.locator("text=Ayush Roy").first()).toBeVisible();

      // Resume
      const rRes = await page.goto("/resume");
      expect(rRes?.status()).toBe(200);
      await expect(page.locator("h1")).toContainText("Résumé");
      await expect(page.locator("h2").first()).toContainText("Ayush Roy");
      await expect(page.locator("text=Curriculum Vitae")).toBeVisible();

      // Zero world/3D asset requests
      expect(worldRequests).toEqual([]);
      // Zero canvas elements
      await expect(page.locator("canvas")).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test("safe external links enforce strict HTTPS and security attributes across all projects", async ({ page }) => {
    for (const slug of verifiedSlugs) {
      await page.goto(`/projects/${slug}`);
      const externalLinks = page.locator('a[target="_blank"]');
      const count = await externalLinks.count();
      expect(count).toBeGreaterThan(0);

      for (let i = 0; i < count; i++) {
        const link = externalLinks.nth(i);
        const rel = await link.getAttribute("rel");
        const href = await link.getAttribute("href");

        expect(rel).toContain("noopener");
        expect(rel).toContain("noreferrer");
        expect(href).toMatch(/^https:\/\//);

        // Screen reader announcement present
        await expect(link.locator(".sr-only")).toHaveText("(opens in a new tab)");
      }
    }
  });

  test("metadata, canonical URLs, and sitemap.xml strictly include verified projects only", async ({ page }) => {
    // Canonical link on project case study
    await page.goto("/projects/ai-vs-real");
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute("href", "https://www.yorayriniwnl.in/projects/ai-vs-real");

    // Sitemap.xml verification
    const sitemapRes = await page.goto("/sitemap.xml");
    expect(sitemapRes?.status()).toBe(200);
    const text = await sitemapRes!.text();

    expect(text).toContain("<loc>https://www.yorayriniwnl.in/projects/ai-vs-real</loc>");
    expect(text).toContain("<loc>https://www.yorayriniwnl.in/projects/zenith</loc>");
    expect(text).toContain("<loc>https://www.yorayriniwnl.in/projects/helios</loc>");
    expect(text).toContain("<loc>https://www.yorayriniwnl.in/projects/talks</loc>");
    expect(text).toContain("<loc>https://www.yorayriniwnl.in/about</loc>");
    expect(text).toContain("<loc>https://www.yorayriniwnl.in/resume</loc>");

    // CandidateX must NOT be in sitemap
    expect(text).not.toContain("candidatex");
  });
});
