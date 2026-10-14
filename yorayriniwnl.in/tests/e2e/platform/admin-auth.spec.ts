/**
 * YOR WORLD Milestone A3: End-to-End Test Suite for Owner Administration & Login Shell
 *
 * Verifies accessible login, MFA field requirements, security indicators,
 * and no-WebGL / zero-asset-leakage guarantees.
 */

import { test, expect } from "@playwright/test";

test.describe("Milestone A3: Protected Admin Shell & Login E2E", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([{ name: "yor-admin-token",value: "rc3-fixture-owner-aal2",url: `http://127.0.0.1:${process.env.PORT ?? 3133}` }]);
  });
  test("loads accessible login page with email, password, and TOTP MFA controls", async ({ page }) => {
    await page.goto("/admin/login");

    await expect(page).toHaveTitle(/Owner Administration Login/i);
    const heading = page.getByRole("heading", { level: 1, name: /Owner Administration/i });
    await expect(heading).toBeVisible();

    const emailInput = page.getByLabel(/Owner Email/i);
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute("type", "email");

    const passwordInput = page.getByLabel(/^Password/i);
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute("type", "password");

    const totpInput = page.getByLabel(/TOTP Security Code/i);
    await expect(totpInput).toBeVisible();
    await expect(totpInput).toHaveAttribute("inputmode", "numeric");
    await expect(totpInput).toHaveAttribute("maxlength", "6");

    const submitBtn = page.getByRole("button", { name: /Authenticate with MFA \(AAL2\)/i });
    await expect(submitBtn).toBeVisible();

    const returnLink = page.getByRole("link", { name: /Return to public portfolio/i });
    await expect(returnLink).toBeVisible();
    await expect(returnLink).toHaveAttribute("href", "/");
  });

  test("admin dashboard displays security overview and boundary disclosure", async ({ page }) => {
    await page.goto("/admin");

    const heading = page.getByRole("heading", { level: 1, name: /Administration & Security Overview/i });
    await expect(heading).toBeVisible();

    // Verify badges
    const mfaBadge = page.getByText(/MFA AAL2 Required/i);
    await expect(mfaBadge).toBeVisible();

    const ownerBadge = page.getByText(/Owner Authorization/i);
    await expect(ownerBadge).toBeVisible();

    // Verify boundary section
    const boundaryNotice = page.getByText(/Milestone A3 Boundary Declaration/i);
    await expect(boundaryNotice).toBeVisible();

    const nav = page.getByRole("navigation", { name: /Administration navigation/i });
    await expect(nav).toBeVisible();
  });

  test("admin pages require zero WebGL, canvas, or 3D models", async ({ page }) => {
    const glbRequests: string[] = [];
    page.on("request", (req) => {
      if (req.url().endsWith(".glb") || req.url().endsWith(".gltf")) {
        glbRequests.push(req.url());
      }
    });

    await page.goto("/admin/login");
    await expect(page.locator("canvas")).toHaveCount(0);
    expect(glbRequests).toHaveLength(0);

    await page.goto("/admin");
    await expect(page.locator("canvas")).toHaveCount(0);
    expect(glbRequests).toHaveLength(0);
  });
  test("anonymous administration access redirects to login and private APIs deny access",async ({ page,context }) => {
    await context.clearCookies();
    for (const route of ["/admin","/admin/editor","/admin/publish"]) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/admin\/login$/);
      await expect(page.getByRole("heading",{ name: "Owner Administration",exact: true })).toBeVisible();
      await expect(page.locator("#proj-title")).toHaveCount(0);
    }
    const response=await context.request.get("/api/admin/projects");
    expect(response.status()).toBe(401);
  });

});
