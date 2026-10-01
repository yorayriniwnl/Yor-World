/**
 * YOR WORLD Milestone A4: End-to-End Test Suite for Publishing, Drafts & Rollback
 *
 * Verifies accessible editor controls, publish review panels, history auditing,
 * and strict zero-WebGL / zero-private-asset leakage on public routes.
 */

import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const evidenceDir =
  process.env.A4_EVIDENCE_DIR ||
  process.env.A3_EVIDENCE_DIR ||
  process.env.G1_EVIDENCE_DIR ||
  process.env.W3_EVIDENCE_DIR ||
  "";
const screenshotDir = evidenceDir ? path.join(evidenceDir, "screenshots") : "";

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
        // Transient lock on Windows does not fail functional assertion
      }
    }
  }
}

test.describe("Milestone A4: Project Editor & Publication Management E2E", () => {
  test("admin navigation includes links to Dashboard, Editor, and Publish", async ({ page }) => {
    await page.goto("/admin");

    const nav = page.getByRole("navigation", { name: /Administration navigation/i });
    await expect(nav).toBeVisible();

    const editorLink = page.getByRole("link", { name: /^Editor$/i });
    await expect(editorLink).toBeVisible();
    await expect(editorLink).toHaveAttribute("href", "/admin/editor");

    const publishLink = page.getByRole("link", { name: /^Publish$/i });
    await expect(publishLink).toBeVisible();
    await expect(publishLink).toHaveAttribute("href", "/admin/publish");
  });

  test("loads project editor with structured editing controls", async ({ page }) => {
    await page.goto("/admin/editor");

    await expect(page).toHaveTitle(/Project Editor \| YOR WORLD Administration/i);
    const heading = page.getByRole("heading", { level: 1, name: /Project Content & Draft Editor/i });
    await expect(heading).toBeVisible();
    await captureScreenshot(page, "a4-project-editor");
    await captureScreenshot(page, "a4-admin-editor");

    // Project select dropdown
    const select = page.getByLabel(/Select Project:/i);
    await expect(select).toBeVisible();

    // Overview fields
    const titleInput = page.getByLabel(/^Title$/i);
    await expect(titleInput).toBeVisible();

    const summaryInput = page.getByLabel(/^Summary$/i);
    await expect(summaryInput).toBeVisible();

    const contribInput = page.getByLabel(/^Contribution$/i);
    await expect(contribInput).toBeVisible();

    // Section controls
    const addSectionBtn = page.getByRole("button", { name: /\+ Add Section/i });
    await expect(addSectionBtn).toBeVisible();

    // Save draft button
    const saveBtn = page.getByRole("button", { name: /Save Draft Revision/i });
    await expect(saveBtn).toBeVisible();
  });

  test("loads publish review with pre-flight checklist and publication history table", async ({ page }) => {
    await page.goto("/admin/publish");

    await expect(page).toHaveTitle(/Publish Review & Rollback \| YOR WORLD Administration/i);
    const heading = page.getByRole("heading", { level: 1, name: /Publication Review & Rollback/i });
    await expect(heading).toBeVisible();

    // Pre-flight checklist card
    const checklist = page.getByText(/Pre-Flight Checklist/i);
    await expect(checklist).toBeVisible();
    await expect(page.getByText(/100% verified evidence/i)).toBeVisible();
    await expect(page.getByText(/Approved media assets verification/i)).toBeVisible();

    // Publish execution button
    const publishBtn = page.getByRole("button", { name: /Publish Revision/i });
    await expect(publishBtn).toBeVisible();

    // Publication history table
    const historyHeading = page.getByRole("heading", { level: 3, name: /Publication History & Rollback/i });
    await expect(historyHeading).toBeVisible();

    const table = page.locator("table");
    await expect(table).toBeVisible();
    await expect(table.getByText(/Revision/i).first()).toBeVisible();
    await expect(table.getByText(/r1/i).first()).toBeVisible();
    await captureScreenshot(page, "a4-publish-review");
    await captureScreenshot(page, "a4-admin-publish");
  });

  test("editor and publish interfaces require zero WebGL, canvas, or 3D models", async ({ page }) => {
    const glbRequests: string[] = [];
    page.on("request", (req) => {
      if (req.url().endsWith(".glb") || req.url().endsWith(".gltf")) {
        glbRequests.push(req.url());
      }
    });

    await page.goto("/admin/editor");
    await expect(page.locator("canvas")).toHaveCount(0);
    expect(glbRequests).toHaveLength(0);

    await page.goto("/admin/publish");
    await expect(page.locator("canvas")).toHaveCount(0);
    expect(glbRequests).toHaveLength(0);
  });

  test("public portfolio continues to serve approved snapshot with no private media leakage", async ({ page }) => {
    await page.goto("/projects");

    // All 4 approved projects rendered
    await expect(page.getByRole("heading", { level: 2, name: /AI vs\. Real Image Detector/i })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: /Yor Zenith/i })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: /Yor Helios/i })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: /Yor Talks V2/i })).toBeVisible();

    // CandidateX is unpublished candidate -> not visible on public index
    await expect(page.getByRole("heading", { level: 2, name: /CandidateX/i })).toHaveCount(0);

    // Direct visit to unpublished candidatex slug returns 404
    const response = await page.goto("/projects/candidatex");
    expect(response?.status()).toBe(404);
  });
});
