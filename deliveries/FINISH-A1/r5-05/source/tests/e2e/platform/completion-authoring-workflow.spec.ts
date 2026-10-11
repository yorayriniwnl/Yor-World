import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const fixtureOwnerCookie = { name: "yor-admin-token", value: "rc3-fixture-owner-aal2", url: `http://127.0.0.1:${process.env.PORT ?? 3133}` };
const evidenceDir = process.env.A1_R5_EVIDENCE_DIR;

test.describe("A1 R5 saved private authoring preview", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([fixtureOwnerCookie]);
  });

  test("selects a synthetic approved PNG, saves and reopens the draft, then previews through the owner route", async ({ page }) => {
    const marker = `R5 local draft ${new Date().toISOString()}`;
    const png = fs.readFileSync(path.join(process.cwd(), "tests/fixtures/scp-media/valid-rgba-16x12.png"));
    const upload = await page.request.post("/api/admin/media", {
      headers: { "x-yor-e2e-fixture": "synthetic-approved-png" },
      multipart: { file: { name: "synthetic-local-preview.png", mimeType: "image/png", buffer: png } },
    });
    expect(upload.status()).toBe(201);
    const uploaded = await upload.json() as { asset: { id: string; mime: string; approvalStatus: string }; synthetic: boolean; providerApproved: boolean };
    expect(uploaded.synthetic).toBe(true);
    expect(uploaded.providerApproved).toBe(false);
    expect(uploaded.asset.mime).toBe("image/png");
    expect(uploaded.asset.approvalStatus).toBe("approved");

    await page.goto("/admin/editor");
    const summary = page.getByLabel("Project summary");
    const firstSection = page.getByRole("group", { name: "Section 1" });
    const editedSummary = `${await summary.inputValue()}\n${marker}`;
    await summary.fill(editedSummary);
    const paragraphEdit = "Updated paragraph with Unicode: \u2713 caf\u00e9\nSecond line.";
    await firstSection.getByLabel("Section challenge, block 1 paragraph text").fill(paragraphEdit);

    const initialSectionCount = await page.locator('input[aria-label$=" heading"]').count();
    await page.getByRole("button", { name: "Add section" }).click();
    await page.locator('input[aria-label$=" heading"]').last().fill("Temporary section for focus restoration");
    const removeTemporarySection = page.getByRole("button", { name: "Remove section" }).last();
    await removeTemporarySection.focus();
    await removeTemporarySection.press("Enter");
    await expect(page.locator('[id^="section-heading-"]').last()).toBeFocused();
    await expect(page.locator('input[aria-label$=" heading"]')).toHaveCount(initialSectionCount);
    await firstSection.getByRole("button", { name: "Add content block" }).click();
    const blockType = firstSection.locator('select[aria-label$="type"]').last();
    await blockType.selectOption("image");
    const moveImageUp = firstSection.getByRole("button", { name: "Move Section challenge, block 3 up" });
    await moveImageUp.focus();
    await moveImageUp.press("Enter");
    await expect(page.locator("#block-heading-challenge-1")).toBeFocused();
    const imagePicker = firstSection.locator('select[aria-label="Section challenge, block 2 approved image"]');
    await expect(imagePicker.locator(`option[value="${uploaded.asset.id}"]`)).toHaveCount(1);
    await imagePicker.selectOption(uploaded.asset.id);
    await firstSection.locator('input[aria-label="Section challenge, block 2 image alternative text"]').fill("E2E synthetic approved image");
    await firstSection.locator('input[aria-label="Section challenge, block 2 image caption"]').fill("Local browser fixture; not provider approved.");

    await firstSection.getByRole("button", { name: "Add content block" }).click();
    await firstSection.locator('select[aria-label$="type"]').last().selectOption("list");
    await firstSection.getByLabel("Section challenge, block 4 list item 1").fill("First synthetic list item");
    await firstSection.getByRole("button", { name: "Add list item" }).click();
    await firstSection.getByLabel("Section challenge, block 4 list item 2").fill("Second synthetic list item");
    const moveListItemUp = firstSection.getByRole("button", { name: "Move item up" }).last();
    await moveListItemUp.focus();
    await moveListItemUp.press("Enter");
    await expect(firstSection.getByLabel("Section challenge, block 4 list item 1")).toBeFocused();
    const removeSecondItem = firstSection.getByRole("button", { name: "Remove item 2" });
    await removeSecondItem.focus();
    await removeSecondItem.press("Enter");
    await expect(firstSection.getByLabel("Section challenge, block 4 list item 1")).toHaveValue("Second synthetic list item");
    await expect(firstSection.getByLabel("Section challenge, block 4 list item 1")).toBeFocused();

    await firstSection.getByRole("button", { name: "Add content block" }).click();
    await firstSection.locator('select[aria-label$="type"]').last().selectOption("code");
    await firstSection.getByLabel("Section challenge, block 5 code language").fill("text");
    await firstSection.getByLabel("Section challenge, block 5 code text").fill("synthetic code fixture");
    await firstSection.getByRole("button", { name: "Add content block" }).click();
    await firstSection.getByLabel("Section challenge, block 6 paragraph text").fill("Temporary block for focus restoration");
    const removeTemporaryBlock = firstSection.getByRole("button", { name: "Remove Section challenge, block 6" });
    await removeTemporaryBlock.focus();
    await removeTemporaryBlock.press("Enter");
    await expect(firstSection.locator('legend[id^="block-heading-"]').last()).toBeFocused();
    const saveResponsePromise = page.waitForResponse((response) => response.url().endsWith("/api/admin/projects") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Save draft" }).click();
    const saveResponse = await saveResponsePromise;
    if (saveResponse.status() !== 201) throw new Error(`Draft save returned ${saveResponse.status()}: ${JSON.stringify(saveResponse.request().postDataJSON())} :: ${await saveResponse.text()}`);
    await expect(page.getByRole("status")).toContainText(/Draft revision \d+ saved\./);

    await page.goto("/admin/editor");
    await expect(page.getByLabel("Project summary")).toHaveValue(editedSummary);
    await expect(page.getByLabel("Section challenge, block 1 paragraph text")).toHaveValue(paragraphEdit);
    const reopenedFirstSection = page.getByRole("group", { name: "Section 1" });
    await expect(reopenedFirstSection.locator('select[aria-label="Section challenge, block 2 approved image"]')).toHaveValue(uploaded.asset.id);
    await expect(reopenedFirstSection.locator('select[aria-label="Section challenge, block 4 type"]')).toHaveValue("list");
    await expect(reopenedFirstSection.getByLabel("Section challenge, block 4 list item 1")).toHaveValue("Second synthetic list item");
    await expect(reopenedFirstSection.locator('select[aria-label="Section challenge, block 5 type"]')).toHaveValue("code");
    await expect(reopenedFirstSection.getByLabel("Section challenge, block 5 code text")).toHaveValue("synthetic code fixture");

    const title = page.getByLabel("Project title");
    const unsavedTitle = "Unsaved title that must be discarded";
    await title.fill(unsavedTitle);
    await page.route("**/api/admin/projects", async (route) => {
      if (route.request().method() === "POST") await route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ error: "Synthetic concurrent revision conflict." }) });
      else await route.continue();
    });
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByRole("status")).toContainText(/Draft changed in another session/);
    await expect(title).toHaveValue(unsavedTitle);
    await page.unroute("**/api/admin/projects");
    await page.getByRole("button", { name: "Discard unsaved changes" }).click();
    await expect(title).toHaveValue("AI vs. Real Image Detector");
    await expect(page.getByRole("status")).toContainText("Unsaved changes were discarded.");

    await page.goto("/projects/ai-vs-real");
    await expect(page.locator("body")).not.toContainText(marker);
    await expect(page.locator("body")).not.toContainText(uploaded.asset.id);

    const imageResponse = page.waitForResponse((response) => response.url().includes(`/api/admin/preview/media/${uploaded.asset.id}`));
    await page.goto("/admin/preview/ai-vs-real");
    await expect(page.getByRole("status")).toContainText("Unpublished");
    await expect(page.getByRole("heading", { name: "Contribution" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Verified Role & Contribution" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Verified Links:" })).toHaveCount(0);
    const previewImage = page.getByRole("img", { name: "E2E synthetic approved image" });
    await expect(previewImage).toBeVisible();
    const response = await imageResponse;
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
    await expect(previewImage).toHaveAttribute("src", `/api/admin/preview/media/${uploaded.asset.id}`);
    if (evidenceDir) {
      const screenshots = path.join(evidenceDir, "screenshots");
      fs.mkdirSync(screenshots, { recursive: true });
      await page.screenshot({ path: path.join(screenshots, "completion-authoring-private-preview.png"), fullPage: true });
    }

    await page.goto("/admin/publish");
    const publishButton = page.getByRole("button", { name: "Publish reviewed candidate" });
    await expect(publishButton).toBeEnabled();
    const publishResponsePromise = page.waitForResponse((response) => response.url().endsWith("/api/admin/publish") && response.request().method() === "POST");
    await publishButton.click();
    const publishResponse = await publishResponsePromise;
    expect(publishResponse.status()).toBe(200);
    expect(publishResponse.headers()["cache-control"]).toContain("no-store");
    await expect(page.getByRole("status")).toContainText(/Publication revision 2 was recorded/);
    await page.goto("/projects/ai-vs-real");
    await expect(page.locator("body")).toContainText(marker);
  });
});
