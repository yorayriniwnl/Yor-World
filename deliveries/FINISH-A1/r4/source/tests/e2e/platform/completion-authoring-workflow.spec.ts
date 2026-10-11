import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const evidenceDir = process.env.A4_EVIDENCE_DIR || "";

async function capture(page: Page, name: string) {
  if (!evidenceDir) return;
  const directory = path.join(evidenceDir, "screenshots");
  fs.mkdirSync(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, `${name}.png`), fullPage: true });
}

test.describe("A1 completion authoring and publication workflow", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([{ name: "yor-admin-token", value: "rc3-fixture-owner-aal2", url: `http://127.0.0.1:${process.env.PORT ?? 3133}` }]);
  });

  test("edits all block variants, ordering, picker empty state, save/reopen/cancel, and preserves a failed buffer", async ({ page }, testInfo) => {
    const sentinel = `R4_PRIVATE_WORKFLOW_SENTINEL_${testInfo.project.name.toUpperCase()}`;
    const headingText = `R4 authoring workflow ${testInfo.project.name}`;

    await page.goto("/admin/editor");
    await page.getByLabel(/Select Project:/i).selectOption("candidatex");
    const priorSectionCount = await page.locator("[data-section-index]").count();
    await page.getByRole("button", { name: /\+ Add Section/i }).click();
    const createdSection = page.locator(`[data-section-index="${priorSectionCount}"]`);
    const createdHeading = createdSection.getByLabel(`Section ${priorSectionCount + 1} Heading`);
    await expect(createdHeading).toBeFocused();
    await createdHeading.fill(headingText);
    const unicodeText = `${sentinel}\nline two \u2014 \u3053\u3093\u306b\u3061\u306f`;
    await createdSection.locator('[data-block-index="0"] textarea').fill(unicodeText);

    await createdSection.getByRole("button", { name: /^\+ Code$/ }).click();
    const codeBlock = createdSection.locator('[data-block-index="1"]');
    await codeBlock.getByLabel("Language").fill("typescript");
    const codeText = `const marker = "\\u2713-${testInfo.project.name}";\nconsole.log(marker);`;
    await codeBlock.getByLabel("Code Snippet").fill(codeText);

    await createdSection.getByRole("button", { name: /^\+ List$/ }).click();
    const listBlock = createdSection.locator('[data-block-index="2"]');
    const firstItem = `first-${testInfo.project.name}`;
    const secondItem = `second-${testInfo.project.name}`;
    await listBlock.getByRole("textbox", { name: `Section ${priorSectionCount + 1} Block 3 Item 1` }).fill(firstItem);
    await listBlock.getByRole("button", { name: /\+ Add List Item/i }).click();
    await listBlock.getByRole("textbox", { name: `Section ${priorSectionCount + 1} Block 3 Item 2` }).fill(secondItem);
    await listBlock.getByRole("button", { name: "Move Item 2 Up" }).click();
    await expect(listBlock.locator('[data-list-item-index="0"]')).toHaveValue(secondItem);
    await expect(listBlock.locator('[data-list-item-index="0"]')).toBeFocused();

    await createdSection.getByRole("button", { name: /^\+ Image$/ }).click();
    const imageBlock = createdSection.locator('[data-block-index="3"]');
    const picker = imageBlock.getByLabel("Approved Media Asset ID");
    await expect(picker).toHaveJSProperty("tagName", "SELECT");
    await expect(picker.locator("option")).toHaveCount(1);
    await expect(picker.locator("option").first()).toContainText("No approved images available");
    await imageBlock.getByLabel("Alt Text (Accessible Description)").fill("A private draft image awaiting an approved asset");
    await imageBlock.getByLabel("Caption").fill("No media has been approved for this test fixture.");

    await createdSection.getByRole("button", { name: "Move Block 2 Down" }).click();
    await expect(createdSection.locator('[data-block-index="2"] input').first()).toBeFocused();
    await page.getByRole("button", { name: `Move Section ${priorSectionCount + 1} Up` }).click();
    const movedSectionIndex = priorSectionCount - 1;
    const movedSection = page.locator(`[data-section-index="${movedSectionIndex}"]`);
    await expect(movedSection.getByLabel(`Section ${movedSectionIndex + 1} Heading`)).toBeFocused();

    await page.getByRole("button", { name: /Save Draft/i }).click();
    await expect(page.getByText(/Validation Error \(422\)/i).first()).toBeVisible();
    const imageAfterMove = movedSection.locator('[data-block-index="3"]');
    await expect(imageAfterMove.getByLabel("Approved Media Asset ID")).toHaveValue("");
    await expect(imageAfterMove.getByLabel("Alt Text (Accessible Description)")).toHaveValue("A private draft image awaiting an approved asset");
    await expect(movedSection.locator('[data-block-index="0"] textarea')).toHaveValue(unicodeText);

    await imageAfterMove.getByRole("button", { name: "Delete Block 4" }).click();
    await page.getByRole("button", { name: /Save Draft/i }).click();
    await expect(page.getByText(/Draft saved successfully/i).first()).toBeVisible();
    await page.goto("/admin/preview/candidatex");
    await expect(page.getByText(sentinel, { exact: false })).toBeVisible();
    await expect(page.getByText(codeText, { exact: false })).toBeVisible();
    await expect(page.getByText(secondItem, { exact: true })).toBeVisible();
    await capture(page, `r4-private-preview-${testInfo.project.name}`);

    await page.goto("/admin/editor");
    await page.getByLabel(/Select Project:/i).selectOption("candidatex");
    const reloadedHeading = page.getByLabel(`Section ${movedSectionIndex + 1} Heading`);
    await expect(reloadedHeading).toHaveValue(headingText);
    await reloadedHeading.fill("Unsaved value to cancel");
    await page.getByRole("button", { name: /Cancel Edits/i }).click();
    await expect(reloadedHeading).toHaveValue(headingText);
  });

  test("two open editor sessions reject the stale save and retain its unsaved value", async ({ page, context }, testInfo) => {
    const second = await context.newPage();
    await Promise.all([page.goto("/admin/editor"), second.goto("/admin/editor")]);
    const projectSelect = page.locator("#project-select");
    const secondProjectSelect = second.locator("#project-select");
    await expect(projectSelect).toBeVisible();
    await expect(secondProjectSelect).toBeVisible();
    await projectSelect.selectOption("candidatex");
    await secondProjectSelect.selectOption("candidatex");
    await page.getByLabel(/^Title$/i).fill(`R4 winner ${testInfo.project.name}`);
    await page.getByRole("button", { name: /Save Draft/i }).click();
    await expect(page.getByText(/Draft saved successfully/i).first()).toBeVisible();

    const staleSummary = second.getByLabel(/^Summary$/i);
    const unsaved = `R4 stale buffer retained ${testInfo.project.name}`;
    await staleSummary.fill(unsaved);
    await second.getByRole("button", { name: /Save Draft/i }).click();
    await expect(second.getByText(/Revision Conflict \(409\)/i).first()).toBeVisible();
    await expect(staleSummary).toHaveValue(unsaved);
    await capture(second, `r4-stale-buffer-${testInfo.project.name}`);
    await second.close();
  });

  test("publishes from a fresh review, states edge visibility limits, then rolls back with a reason", async ({ page }, testInfo) => {
    await page.goto("/admin/publish");
    const body = await page.locator("body").innerText();
    const priorRevision = Number(body.match(/Current Revision:\s*r(\d+)/)?.[1]);
    expect(Number.isInteger(priorRevision)).toBeTruthy();
    const publishButton = page.getByRole("button", { name: /Publish Revision/i });
    await expect(publishButton).toBeEnabled();

    const publishResponsePromise = page.waitForResponse((response) =>
      response.url().endsWith("/api/admin/publish") && response.request().method() === "POST");
    await publishButton.click();
    const publishResponse = await publishResponsePromise;
    const publishBody = await publishResponse.text();
    expect(publishResponse.status(), `publish response: ${publishBody}`).toBe(200);
    await expect(page.getByText(/CDN\/edge cache visibility was not observed/i).first()).toBeVisible();
    await expect(page.getByText(/Origin read observed r\d+/i).first()).toBeVisible();

    const reason = `R4 browser rollback reason ${testInfo.project.name}`;
    await page.getByLabel("Rollback reason").fill(reason);
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: `Rollback to r${priorRevision}` }).click();
    await expect(page.getByText(/Rollback committed as r\d+/i).first()).toBeVisible();
    await expect(page.getByText(reason, { exact: true })).toBeVisible();
    await capture(page, `r4-publication-rollback-${testInfo.project.name}`);
  });

  test("keeps private APIs isolated for anonymous callers and never publishes the CandidateX sentinel", async ({ page, browser }) => {
    await page.goto("/projects");
    const publicHtml = await page.locator("html").innerText();
    expect(publicHtml).not.toContain("R4_PRIVATE_WORKFLOW_SENTINEL_");
    await expect(page.getByRole("heading", { level: 2, name: /CandidateX/i })).toHaveCount(0);
    const candidate = await page.goto("/projects/candidatex");
    expect(candidate?.status()).toBe(404);
    expect(await page.locator("html").innerText()).not.toContain("R4_PRIVATE_WORKFLOW_SENTINEL_");

    const anonymous = await browser.newContext();
    const origin = `http://127.0.0.1:${process.env.PORT ?? 3133}`;
    const cases: Array<{ method: "get" | "post"; path: string }> = [
      { method: "get", path: "/api/admin/projects" },
      { method: "post", path: "/api/admin/projects" },
      { method: "get", path: "/api/admin/media" },
      { method: "get", path: "/api/admin/preview?projectId=candidatex" },
      { method: "get", path: "/api/admin/preview/media/11111111-1111-4111-8111-111111111111" },
      { method: "get", path: "/api/admin/publish" },
      { method: "post", path: "/api/admin/publish" },
      { method: "post", path: "/api/admin/rollback" },
    ];
    for (const item of cases) {
      const response = item.method === "get"
        ? await anonymous.request.get(`${origin}${item.path}`)
        : await anonymous.request.post(`${origin}${item.path}`, { data: {} });
      expect(response.status(), `${item.method.toUpperCase()} ${item.path}`).toBe(401);
      const headers = response.headers();
      expect(headers["cache-control"]).toContain("private");
      expect(headers["cache-control"]).toContain("no-store");
      const vary = (headers.vary ?? "").toLowerCase();
      expect(vary).toContain("authorization");
      expect(vary).toContain("cookie");
    }
    await anonymous.close();
  });
});
