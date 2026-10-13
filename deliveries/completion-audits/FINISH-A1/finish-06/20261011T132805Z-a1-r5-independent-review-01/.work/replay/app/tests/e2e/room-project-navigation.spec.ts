import { test, expect } from "@playwright/test";

test.describe("Milestone C2: Studio Monitor, Project Navigation, Transitions & History E2E", () => {
  test.beforeEach(async ({ page }) => {
    // Intercept WebGL calls to verify that public and project routes NEVER require WebGL
    await page.addInitScript(() => {
      const probe = {
        webglContexts: 0,
        threeInstances: 0,
      };
      Object.assign(window, { __c2Probe: probe });

      const origGetContext = HTMLCanvasElement.prototype.getContext;
      (HTMLCanvasElement.prototype as unknown as Record<string, unknown>).getContext = function (
        this: HTMLCanvasElement,
        type: string,
        ...args: unknown[]
      ) {
        if (type === "webgl" || type === "webgl2" || type === "experimental-webgl") {
          probe.webglContexts++;
        }
        return origGetContext.apply(this, [type, ...args] as Parameters<typeof origGetContext>);
      };
    });
  });

  test("1. Direct route loading of verified case studies requires zero WebGL", async ({ page }) => {
    // Navigate directly to a verified case study URL
    const response = await page.goto("/projects/zenith");
    expect(response?.status()).toBe(200);

    // Verify substantive case study content is rendered
    await expect(page.getByRole("heading", { name: "Yor Zenith", level: 1 })).toBeVisible();
    await expect(page.getByText("Verified Role & Contribution")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Evidence Audit & Verification State" })).toBeVisible();

    // Verify zero WebGL contexts were requested on this public route
    const probe = await page.evaluate(() => (window as unknown as { __c2Probe: { webglContexts: number } }).__c2Probe);
    expect(probe.webglContexts).toBe(0);
  });

  test("2. Direct browser refresh preserves 200 OK and rendered case study state", async ({ page }) => {
    await page.goto("/projects/ai-vs-real");
    await expect(page.getByRole("heading", { name: "AI vs. Real Image Detector", level: 1 })).toBeVisible();

    // Perform direct page reload/refresh
    const reloadResponse = await page.reload();
    expect(reloadResponse?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "AI vs. Real Image Detector", level: 1 })).toBeVisible();
  });

  test("3. Unknown project slug returns 404 Not Found without leaking unverified data", async ({ page }) => {
    const response = await page.goto("/projects/non-existent-project");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  });

  test("4. Unpublished candidate 'candidatex' returns 404 Not Found", async ({ page }) => {
    const response = await page.goto("/projects/candidatex");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  });

  test("5. Navigation history: Back, Forward, and Return to Studio work smoothly", async ({ page }) => {
    // Start at projects index
    await page.goto("/projects");
    await expect(page.getByRole("heading", { name: "Projects", level: 1 })).toBeVisible();

    // Click into a project case study
    await page.getByRole("link", { name: "Yor Zenith" }).first().click();
    await expect(page.getByRole("heading", { name: "Yor Zenith", level: 1 })).toBeVisible();
    expect(page.url()).toContain("/projects/zenith");

    // Click browser Back button
    await page.goBack();
    await expect(page.getByRole("heading", { name: "Projects", level: 1 })).toBeVisible();
    expect(page.url()).toContain("/projects");

    // Click browser Forward button
    await page.goForward();
    await expect(page.getByRole("heading", { name: "Yor Zenith", level: 1 })).toBeVisible();
    expect(page.url()).toContain("/projects/zenith");

    // Use explicit 'Return to Studio' footer link
    const returnLink = page.getByTestId("return-to-studio-link");
    await expect(returnLink).toBeVisible();
    await returnLink.click();

    // Verify arrival at home studio route
    await expect(page.getByRole("heading", { name: "A little world." })).toBeVisible();
    expect(page.url()).toContain("studio=return");
  });

  test("6. Projects index lists all 4 verified projects with accessible direct links", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.getByText("4 verified projects published.")).toBeVisible();

    // Verify verified project slugs are present
    const projectLinks = page.locator('a[href^="/projects/"]');
    await expect(projectLinks).toHaveCount(4);

    // Verify candidatex is NOT published in the project list
    await expect(page.locator('a[href="/projects/candidatex"]')).toHaveCount(0);
  });
});
