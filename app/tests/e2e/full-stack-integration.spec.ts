import { test, expect, type Page } from "@playwright/test";
import { spawn } from "node:child_process";
import path from "node:path";
import { createServer } from "node:net";
import type { Publication, PublishedProject } from "@/contracts/content";

async function openLauncher(page: Page) {
  await expect(page.getByTestId("world-stage-container")).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("skip-motion-btn").click();
  await expect(page.getByTestId("lifecycle-badge")).toHaveText("HOME", { timeout: 15_000 });
  await page.getByTestId("toggle-room-controls-btn").click();
  await page.getByTestId("control-open-launcher").click();
  await expect(page.getByRole("dialog", { name: "Studio Monitor Launcher" })).toBeVisible();
}

async function submitRealContact(page: Page, suffix: string) {
  await page.locator("#contact-name").fill("RC3 Integration Visitor");
  await page.locator("#contact-email").fill(`rc3-${suffix}@example.org`);
  await page.locator("#contact-message").fill("Synthetic RC3 integration inquiry verifies a durable receipt across the public world and contact form.");
  const responsePromise = page.waitForResponse((response) => response.url().endsWith("/api/contact") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Send Message", exact: true }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(202);
  const body = await response.json();
  expect(body.status).toBe("received");
  expect(body.id).toMatch(/^rcpt_/);
  await expect(page.getByRole("status")).toContainText(body.id);
  return response;
}

test.describe("RC3 cross-lane full stack", () => {
  test.beforeEach(async ({ page }, info) => {
    // Synthetic proxy network fixtures keep independent successes from sharing the 3/10min quota.
    const network = info.title.split("").reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 0);
    await page.setExtraHTTPHeaders({ "x-forwarded-for": `198.51.${network % 200}.${(network >>> 8) % 200 + 1}` });
  });

  test("world monitor contact command reaches the real durable contact API", async ({ page }) => {
    const models: string[] = [];
    page.on("request", (request) => { if (request.url().endsWith(".glb")) models.push(new URL(request.url()).pathname); });
    await page.goto("/?studio=1");
    await openLauncher(page);
    expect(models).toEqual(expect.arrayContaining(["/models/production-room-full.glb", "/models/resident-production.glb", "/models/fixture-production.glb", "/models/interaction-assets.glb"]));
    expect(models.some((url) => /proof|blockout/.test(url))).toBe(false);
    await page.getByRole("textbox", { name: "Terminal command input" }).fill("contact");
    await page.getByRole("textbox", { name: "Terminal command input" }).press("Enter");
    await expect(page).toHaveURL(/\/contact$/);
    await submitRealContact(page, "world");
    await expect(page.locator("canvas")).toHaveCount(0);
  });

  test("renderer failure leaves the real contact form functional", async ({ page }) => {
    await page.goto("/?studio=1&simulateRendererError=1");
    await expect(page.getByTestId("world-failure-container")).toBeVisible({ timeout: 15_000 });
    // Background links are intentionally inert inside the fullscreen modal.
    // Use the always-available accessible studio shortcut.
    await page.getByTestId("studio-contact-link").click();
    await submitRealContact(page, "renderer");
  });

  test("direct contact needs no world and canonical API replays R2 receipts and rejects conflicts", async ({ page, request }) => {
    await page.goto("/contact");
    await expect(page.locator("canvas")).toHaveCount(0);
    const response = await submitRealContact(page, "direct");
    const originalPayload = response.request().postDataJSON();
    const receipt = await response.json();
    const [replayA, replayB] = await Promise.all([
      request.post("/api/contact", { data: originalPayload }),
      request.post("/api/contact", { data: originalPayload }),
    ]);
    expect(replayA.status()).toBe(202);
    expect(replayB.status()).toBe(202);
    expect((await replayA.json()).id).toBe(receipt.id);
    expect((await replayB.json()).id).toBe(receipt.id);
    expect((await request.post("/api/contact", { data: { ...originalPayload, message: "A changed valid synthetic message conflicts with the original idempotency claim." } })).status()).toBe(409);
  });

  test("public world availability does not grant admin or private API access", async ({ page, request }) => {
    await page.goto("/?studio=1");
    await openLauncher(page);
    const terminal = page.getByRole("textbox", { name: "Terminal command input" });
    await terminal.fill("open /admin");
    await terminal.press("Enter");
    await expect(page.getByRole("dialog", { name: "Studio Monitor Launcher" })).toContainText("Unknown project");
    expect(new URL(page.url()).pathname).toBe("/");
    for (const endpoint of ["/api/admin/projects", "/api/admin/publish", "/api/admin/media"]) {
      expect((await request.get(endpoint)).status()).toBe(401);
    }
    await page.goto("/admin/editor");
    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.locator("canvas")).toHaveCount(0);
  });

  test("a real approved publication update reaches project HTML and world navigation across requests", async ({ page, request }) => {
    const headers = { Authorization: "Bearer rc3-fixture-owner-aal2" };
    const stateResponse = await request.get("/api/admin/publish", { headers });
    expect(stateResponse.status()).toBe(200);
    const state: { activePublication: Publication } = await stateResponse.json();
    const draftResponse = await request.get("/api/admin/projects", { headers });
    expect(draftResponse.status()).toBe(200);
    const drafts: { drafts: Array<{ projectId: string; draftRevision: number; project: PublishedProject }> } = await draftResponse.json();
    const draft = drafts.drafts.find((item) => item.projectId === "zenith")!;
    const title = "Yor Zenith — RC3 approved snapshot test";
    let savedRevision: number | undefined;
    try {
      const saved = await request.post("/api/admin/projects", {
        headers, data: { projectId: "zenith", expectedRevision: draft.draftRevision, project: { ...draft.project, title } },
      });
      expect(saved.status()).toBe(201);
      savedRevision = (await saved.json()).draftRevision;
      const published = await request.post("/api/admin/publish", { headers, data: { expectedRevision: state.activePublication.revision } });
      expect(published.status()).toBe(200);
      const publication: Publication = (await published.json()).publication;
      await page.goto("/projects/zenith");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
      await page.reload();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
      await page.goto("/?studio=1");
      await openLauncher(page);
      const launcher = page.getByRole("dialog", { name: "Studio Monitor Launcher" });
      await expect(launcher.getByRole("heading", { name: title })).toBeVisible();
      await expect(launcher).toContainText(`Publication r${publication.revision}`);
      await launcher.getByRole("textbox", { name: "Terminal command input" }).fill("open zenith");
      await launcher.getByRole("textbox", { name: "Terminal command input" }).press("Enter");
      await expect(page).toHaveURL(/\/projects\/zenith$/);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    } finally {
      if (savedRevision !== undefined) {
        const restoredDraft = await request.post("/api/admin/projects", {
          headers, data: { projectId: "zenith", expectedRevision: savedRevision, project: draft.project },
        });
        expect(restoredDraft.status()).toBe(201);
        const rollback = await request.post("/api/admin/rollback", { headers, data: { targetRevision: state.activePublication.revision } });
        expect(rollback.status()).toBe(200);
      }
    }
  });

  test("reduced motion preserves keyboard contact and protected admin DOM flows", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/contact");
    await page.locator("#contact-name").focus();
    await expect(page.locator("#contact-name")).toBeFocused();
    await submitRealContact(page, "motion");
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
    await page.getByLabel("Owner Email", { exact: true }).focus();
    await expect(page.getByLabel("Owner Email", { exact: true })).toBeFocused();
    await expect(page.locator("canvas")).toHaveCount(0);
  });

  test("static fallback uses approved projects and exposes no draft/private data", async ({ page, request }) => {
    await page.goto("/?studio=1");
    await expect(page.getByTestId("world-stage-container")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("combobox", { name: "Visual Quality Tier" }).selectOption("static");
    const fallback = page.getByTestId("static-fallback-section");
    await expect(fallback).toBeVisible();
    await expect(fallback.locator('a[href^="/projects/"]')).toHaveCount(4);
    await expect(fallback.locator('a[href="/projects/candidatex"]')).toHaveCount(0);
    await expect(fallback).not.toContainText("Draft analytics platform documentation");
    await expect(fallback).not.toContainText("Private repository code review");
    expect((await request.get("/projects/candidatex")).status()).toBe(404);
    expect((await request.get("/api/admin/media/private-draft-canary")).status()).toBe(401);
  });

  test("production project routes survive an actual backend connection outage", async ({ browser }) => {
    test.setTimeout(60_000);
    const port = await new Promise<number>((resolve, reject) => {
      const server = createServer();
      server.on("error", reject);
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        if (!address || typeof address === "string") return reject(new Error("No free TCP port."));
        const selectedPort = address.port;
        server.close(() => resolve(selectedPort));
      });
    });
    const child = spawn(process.execPath, [path.join(process.cwd(), "node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(port)], {
      cwd: process.cwd(), windowsHide: true, stdio: "pipe",
      env: { ...process.env, YOR_E2E_FIXTURE: "0", YOR_TEST_DATABASE_PATH: "", DATABASE_URL: "postgres://invalid:invalid@127.0.0.1:1/unavailable", NEXT_TELEMETRY_DISABLED: "1" },
    });
    const context = await browser.newContext({ baseURL: `http://127.0.0.1:${port}` });
    try {
      await expect.poll(async () => {
        try { return (await fetch(`http://127.0.0.1:${port}/projects/helios`)).status; } catch { return 0; }
      }, { timeout: 25_000 }).toBe(200);
      const page = await context.newPage();
      expect((await page.goto("/projects/helios"))?.status()).toBe(200);
      await expect(page.getByRole("heading", { name: "Yor Helios", level: 1 })).toBeVisible();
      expect((await page.reload())?.status()).toBe(200);
      await expect(page.locator("canvas")).toHaveCount(0);
      expect((await page.goto("/projects/candidatex"))?.status()).toBe(404);
      await expect(page.locator("body")).not.toContainText("Private repository code review");
    } finally {
      await context.close();
      child.kill();
      await new Promise<void>((resolve) => child.exitCode !== null ? resolve() : child.once("exit", () => resolve()));
    }
  });
});
