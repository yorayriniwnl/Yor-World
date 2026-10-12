import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const syntheticMediaId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const ownerCookie = { name: "yor-admin-token", value: "rc3-fixture-owner-aal2", url: `http://127.0.0.1:${process.env.PORT ?? 3133}` };
const evidenceDir = process.env.A1_EVIDENCE_DIR;

async function capture(page: import("@playwright/test").Page, filename: string) {
  if (!evidenceDir) return;
  fs.mkdirSync(evidenceDir, { recursive: true });
  await page.screenshot({ path: path.join(evidenceDir, filename), fullPage: true });
}

test.describe("FINISH A1 editor, private preview, and publication workflow", () => {
  test.beforeEach(async ({ context }) => { await context.addCookies([ownerCookie]); });

  test("edits, cancels, preserves a rich buffer on 409, previews private media, and publishes then rolls back", async ({ page, context }) => {
    await page.goto("/admin/editor");
    await page.getByLabel(/Select project/i).selectOption("candidatex");
    const savedCandidateTitle = await page.getByLabel(/^Title$/i).inputValue();
    await page.getByLabel(/^Title$/i).fill("Discard this unsaved title");
    await page.getByRole("button", { name: /Discard unsaved changes/i }).click();
    await expect(page.getByLabel(/^Title$/i)).toHaveValue(savedCandidateTitle);

    await expect(page.getByText(/Loading approved media/)).toHaveCount(0);
    await expect(page.getByText(/approved media asset available/i)).toBeVisible();
    const safeEscapingSentinel = '<img src=x onerror="window.__draftPreviewXss=true"> Draft content';
    await page.getByLabel(/^Title$/i).fill("CandidateX authoring regression");
    await page.getByLabel(/^Summary$/i).fill(safeEscapingSentinel);

    const mediaPickers = page.getByLabel("Approved media");
    if (await mediaPickers.count() === 0) await page.getByRole("button", { name: "Add approved image" }).click();
    const mediaPicker = page.getByLabel("Approved media").first();
    await expect(mediaPicker).toBeVisible();
    await mediaPicker.selectOption(syntheticMediaId);
    await expect(mediaPicker.locator("option:checked")).toContainText(/synthetic local browser fixture; not provider approval/i);
    await page.getByLabel(/Image alt text block/i).first().fill("Synthetic local preview illustration");
    await page.getByLabel(/Image caption block/i).first().fill("Local browser fixture; not provider approved");

    const section = page.getByRole("region", { name: /Section 1 content/i });
    const paragraphIndex = await section.locator("article[id*='-block-']").count();
    await page.getByRole("button", { name: "Add paragraph" }).click();
    await expect(page.getByLabel(`Paragraph block ${paragraphIndex + 1}`)).toHaveValue("");
    await page.getByLabel(`Paragraph block ${paragraphIndex + 1}`).fill("Edited paragraph with Unicode: café — 東京");
    await page.getByRole("button", { name: `Move block ${paragraphIndex + 1} up` }).click();
    await expect(section.locator(`article[id$='-block-${paragraphIndex - 1}']`)).toBeFocused();
    const temporaryBlockIndex = await section.locator("article[id*='-block-']").count();
    await page.getByRole("button", { name: "Add paragraph" }).click();
    await page.getByLabel(`Paragraph block ${temporaryBlockIndex + 1}`).fill("Temporary block to delete");
    await page.getByRole("button", { name: `Remove block ${temporaryBlockIndex + 1}` }).click();
    await expect(section.locator(`article[id$='-block-${temporaryBlockIndex - 1}']`)).toBeFocused();

    const listIndex = await section.locator("article[id*='-block-']").count();
    await page.getByRole("button", { name: "Add list" }).click();
    await expect(page.getByLabel(`List block ${listIndex + 1} item 1`)).toHaveCount(0);
    await page.getByRole("button", { name: `Add list item to block ${listIndex + 1}` }).click();
    await expect(page.getByLabel(`List block ${listIndex + 1} item 1`)).toHaveValue("");
    await page.getByLabel(`List block ${listIndex + 1} item 1`).fill("first item");
    await page.getByRole("button", { name: `Add list item to block ${listIndex + 1}` }).click();
    await page.getByLabel(`List block ${listIndex + 1} item 2`).fill("second item");
    await page.getByRole("button", { name: "Move list item 2 up" }).click();
    await expect(page.getByLabel(`List block ${listIndex + 1} item 1`)).toHaveValue("second item");
    await page.getByRole("button", { name: `Add list item to block ${listIndex + 1}` }).click();
    await page.getByLabel(`List block ${listIndex + 1} item 3`).fill("temporary list item");
    await page.getByRole("button", { name: "Remove list item 3" }).click();
    await expect(page.getByLabel(`List block ${listIndex + 1} item 2`)).toBeFocused();

    const codeIndex = await section.locator("article[id*='-block-']").count();
    await page.getByRole("button", { name: "Add code" }).click();
    await expect(page.getByLabel(`Code language block ${codeIndex + 1}`)).toHaveValue("");
    await expect(page.getByLabel(`Code text block ${codeIndex + 1}`)).toHaveValue("");
    await page.getByLabel(`Code language block ${codeIndex + 1}`).fill("typescript");
    await page.getByLabel(`Code text block ${codeIndex + 1}`).fill("const reviewed = true;\nconsole.log(reviewed);");

    const firstSectionHeading = page.getByLabel("Section 1 heading");
    await page.getByRole("button", { name: "Add section" }).click();
    await expect(page.getByLabel("Section 2 heading")).toHaveValue("");
    const addedSection = page.getByRole("region", { name: /Section 2 content/i });
    await expect(addedSection.getByLabel("Paragraph block 1")).toHaveValue("");
    await page.getByLabel("Section 2 heading").fill("Temporary ordered section");
    await page.getByRole("button", { name: "Move section 2 up" }).click();
    await expect(page.getByLabel("Section 1 heading")).toBeFocused();
    await page.getByRole("button", { name: "Delete section" }).first().click();
    await expect(page.getByLabel("Section 1 heading")).toBeFocused();
    await expect(firstSectionHeading).toHaveValue("Overview");

    await page.getByRole("button", { name: "Add link" }).click();
    await expect(page.getByLabel("Link 1 label")).toHaveValue("");
    await expect(page.getByLabel("Link 1 URL")).toHaveValue("");
    await expect(page.getByLabel("Link 1 checked at")).toHaveValue("");
    await page.getByRole("button", { name: "Remove link 1" }).click();

    await page.getByRole("button", { name: "Add evidence" }).click();
    await expect(page.getByLabel(/Evidence \d+ status/i).last()).toHaveValue("unknown");
    await expect(page.getByLabel(/Evidence \d+ URL/i).last()).toHaveValue("");
    await page.getByRole("button", { name: /Save draft revision/i }).click();
    await expect(page.getByRole("status").filter({ hasText: /Draft saved as revision/ })).toBeVisible();

    const secondPage = await context.newPage();
    await secondPage.goto("/admin/editor");
    await secondPage.getByLabel(/Select project/i).selectOption("candidatex");
    await secondPage.getByLabel(/^Title$/i).fill("Second editor winning revision");
    await secondPage.getByRole("button", { name: /Save draft revision/i }).click();
    await expect(secondPage.getByRole("status").filter({ hasText: /Draft saved as revision/ })).toBeVisible();
    const losingBuffer = "First editor rich buffer after 409";
    await page.getByLabel(/^Title$/i).fill(losingBuffer);
    await page.getByLabel(/Image caption block/i).first().fill("Unsaved image caption survives 409");
    await page.getByRole("button", { name: /Save draft revision/i }).click();
    await expect(page.getByRole("status").filter({ hasText: /Save failed \(409\)/ })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: /Current saved draft revision/ })).toBeVisible();
    await expect(page.getByLabel(/^Title$/i)).toHaveValue(losingBuffer);
    await expect(page.getByLabel(/Image caption block/i).first()).toHaveValue("Unsaved image caption survives 409");
    await expect(page.getByLabel(/Code text block/i).last()).toHaveValue("const reviewed = true;\nconsole.log(reviewed);");
    await expect(page.getByLabel(/List block \d+ item 1/i).last()).toHaveValue("second item");
    await secondPage.close();

    await page.reload();
    await page.getByLabel(/Select project/i).selectOption("candidatex");
    await expect(page.getByLabel(/^Title$/i)).toHaveValue("Second editor winning revision");
    await expect(page.getByLabel("Approved media").first()).toHaveValue(syntheticMediaId);
    await page.getByRole("link", { name: /Preview saved draft/i }).click();
    await expect(page).toHaveURL(/\/admin\/preview\/candidatex$/);
    await expect(page.getByText(/Draft preview \/ Unpublished · Rev/)).toBeVisible();
    const savedSummary = safeEscapingSentinel;
    await expect(page.getByText(savedSummary, { exact: true })).toBeVisible();
    await expect(page.locator("img[src='x']")).toHaveCount(0);
    expect(await page.evaluate(() => (window as Window & { __draftPreviewXss?: boolean }).__draftPreviewXss)).toBeUndefined();
    const image = page.getByRole("img", { name: "Synthetic local preview illustration" });
    await expect(image).toHaveAttribute("src", `/api/admin/preview/media/${syntheticMediaId}`);
    await expect(image).toHaveJSProperty("naturalWidth", 16);
    await capture(page, "candidatex-private-preview.png");

    await context.clearCookies();
    const anonymousPreview = await context.request.get("/api/admin/preview?projectId=candidatex");
    expect(anonymousPreview.status()).toBe(401);
    expect(anonymousPreview.headers()["cache-control"]).toContain("no-store");
    expect(anonymousPreview.headers()["vary"]).toContain("Cookie");
    expect(await anonymousPreview.text()).not.toContain("CandidateX");
    const anonymousMedia = await context.request.get(`/api/admin/preview/media/${syntheticMediaId}`);
    expect(anonymousMedia.status()).toBe(401);
    expect(anonymousMedia.headers()["cache-control"]).toContain("no-store");
    const anonymousProjects = await context.request.get("/api/admin/projects");
    expect(anonymousProjects.status()).toBe(401);
    expect(await anonymousProjects.text()).not.toContain("CandidateX");
    await page.goto("/admin/preview/candidatex");
    await expect(page).toHaveURL(/\/admin\/login$/);
    expect(await page.locator("body").innerText()).not.toContain(savedSummary);
    expect((await page.goto("/projects/candidatex"))?.status()).toBe(404);

    await context.addCookies([ownerCookie]);
    await page.goto("/admin/editor");
    await page.getByLabel(/Select project/i).selectOption("helios");
    const originalHeliosTitle = await page.getByLabel(/^Title$/i).inputValue();
    const reviewedHeliosTitle = "FINISH A1 reviewed candidate value";
    await page.getByLabel(/^Title$/i).fill(reviewedHeliosTitle);
    await page.getByRole("button", { name: /Save draft revision/i }).click();
    await expect(page.getByRole("status").filter({ hasText: /Draft saved as revision/ })).toBeVisible();

    await page.goto("/admin/publish");
    const currentResponse = await context.request.get("/api/admin/publish");
    const current = await currentResponse.json() as { currentRevision: number };
    const publishButton = page.getByRole("button", { name: /Publish candidate/ });
    await expect(publishButton).toBeEnabled();
    await publishButton.click();
    await expect(page.getByRole("status").filter({ hasText: /Publication revision .* committed\. Review refreshed/i })).toBeVisible();

    const publishedResponse = await context.request.get("/api/admin/publish");
    const published = await publishedResponse.json() as { currentRevision: number; activePublication: { projects: Array<{ id: string; title: string }> } };
    expect(published.currentRevision).toBe(current.currentRevision + 1);
    expect(published.activePublication.projects.find((project) => project.id === "helios")?.title).toBe(reviewedHeliosTitle);
    await expect(page.getByText(`Revision r${published.currentRevision} ·`, { exact: false })).toBeVisible();
    await expect(page.getByText(`Expected publication revision: r${published.currentRevision}`)).toBeVisible();
    await expect(page.getByRole("button", { name: `Publish candidate r${published.currentRevision}` })).toBeEnabled();
    const rollbackButton = page.getByRole("button", { name: `Rollback to r${current.currentRevision}` });
    await expect(rollbackButton).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept("Synthetic E2E rollback reason"));
    await rollbackButton.click();
    await expect(page.getByRole("status").filter({ hasText: /Rollback to revision .* committed as revision .*\. Review refreshed/i })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Synthetic E2E rollback reason" })).toBeVisible();
    await expect(page.getByText(/CDN\/edge not observed/i)).toBeVisible();
    await capture(page, "publish-rollback-review.png");
    const rolledBackResponse = await context.request.get("/api/admin/publish");
    const rolledBack = await rolledBackResponse.json() as { activePublication: { projects: Array<{ id: string; title: string }> } };
    expect(rolledBack.activePublication.projects.find((project) => project.id === "helios")?.title).toBe(originalHeliosTitle);
    await expect(page.getByText(`Expected publication revision: r${current.currentRevision + 2}`)).toBeVisible();
    await expect(page.getByRole("button", { name: `Publish candidate r${current.currentRevision + 2}` })).toBeEnabled();
  });
});
