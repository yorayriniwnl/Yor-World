# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: platform\completion-authoring-workflow.spec.ts >> A1 completion authoring and publication workflow >> edits all block variants, ordering, picker, save/reopen/cancel, and preserves a failed buffer
- Location: tests\e2e\platform\completion-authoring-workflow.spec.ts:19:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('const marker = "✓";')
Expected: visible
Error: strict mode violation: getByText('const marker = "✓";') resolved to 2 elements:
    1) <code class="language-typescript">const marker = "✓";↵console.log(marker);</code> aka getByRole('region', { name: 'R4 authoring workflow chrome' }).getByRole('code')
    2) <code class="language-typescript">const marker = "✓";↵console.log(marker);</code> aka getByRole('region', { name: 'R4 authoring workflow edge' }).getByRole('code')

Call log:
  - Expect "toBeVisible" getByText('const marker = "✓";') with timeout 5000ms
  - waiting for getByText('const marker = "✓";')

```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
  - link "Skip to content" [ref=f1e2] [cursor=pointer]:
    - /url: "#main-content"
  - generic [ref=f1e3]:
    - banner [ref=f1e4]:
      - link "Yor World home" [ref=f1e5] [cursor=pointer]:
        - /url: /
        - generic [aria-hidden] [ref=f1e6]: "Y"
        - generic [ref=f1e7]:
          - text: YOR WORLD
          - generic [ref=f1e8]: A studio in progress
      - navigation "Primary navigation" [ref=f1e9]:
        - list [ref=f1e10]:
          - listitem [ref=f1e11]:
            - link "Projects" [ref=f1e12] [cursor=pointer]:
              - /url: /projects
          - listitem [ref=f1e13]:
            - link "About" [ref=f1e14] [cursor=pointer]:
              - /url: /about
          - listitem [ref=f1e15]:
            - link "Contact" [ref=f1e16] [cursor=pointer]:
              - /url: /contact
          - listitem [ref=f1e17]:
            - link "Résumé" [ref=f1e18] [cursor=pointer]:
              - /url: /resume
    - main [ref=f1e19]:
      - generic [ref=f1e20]:
        - banner [ref=f1e21]:
          - generic [ref=f1e22]:
            - link "YOR WORLD Admin" [ref=f1e23] [cursor=pointer]:
              - /url: /admin
            - generic [ref=f1e24]: MFA AAL2 Required
            - generic [ref=f1e25]: Owner Authorization
          - navigation "Administration navigation" [ref=f1e26]:
            - list [ref=f1e27]:
              - listitem [ref=f1e28]:
                - link "Dashboard" [ref=f1e29] [cursor=pointer]:
                  - /url: /admin
              - listitem [ref=f1e30]:
                - link "Editor" [ref=f1e31] [cursor=pointer]:
                  - /url: /admin/editor
              - listitem [ref=f1e32]:
                - link "Publish" [ref=f1e33] [cursor=pointer]:
                  - /url: /admin/publish
              - listitem [ref=f1e34]:
                - button "Sign Out" [ref=f1e35]
              - listitem [ref=f1e36]:
                - link "Public Portfolio" [ref=f1e37] [cursor=pointer]:
                  - /url: /
        - main [ref=f1e38]:
          - generic [ref=f1e39]:
            - generic [ref=f1e40]:
              - 'heading "Private Draft Preview: candidatex" [level=1] [ref=f1e41]'
              - paragraph [ref=f1e42]: Owner-only preview showing draft case studies, truthful indicators, and cryptographic candidate review identity.
            - generic [ref=f1e43]:
              - generic [ref=f1e45]:
                - generic [ref=f1e46]:
                  - heading "Private CandidateX Draft Identity" [level=3] [ref=f1e47]
                  - paragraph [ref=f1e48]:
                    - text: "Target Revision:"
                    - generic [ref=f1e49]: r4
                    - text: (from base r3)
                  - paragraph [ref=f1e50]:
                    - text: "Review Candidate SHA-256:"
                    - code [ref=f1e51]: a585d24d9fafc8157174daca66c8cdf7082626c90654ce8f2c464e8da943866a
                - link "Review Publication →" [ref=f1e53] [cursor=pointer]:
                  - /url: /admin/publish
              - generic [ref=f1e54]:
                - heading "Pre-Flight Verification Checks" [level=3] [ref=f1e55]
                - generic [ref=f1e56]:
                  - generic [ref=f1e57]:
                    - generic [ref=f1e58]:
                      - strong [ref=f1e59]: "project: ai-vs-real · schema"
                      - generic [ref=f1e60]: PASSED
                    - paragraph [ref=f1e61]: All checks for this category passed.
                  - generic [ref=f1e62]:
                    - generic [ref=f1e63]:
                      - strong [ref=f1e64]: "project: ai-vs-real · evidence-records"
                      - generic [ref=f1e65]: PASSED
                    - paragraph [ref=f1e66]: All checks for this category passed.
                  - generic [ref=f1e67]:
                    - generic [ref=f1e68]:
                      - strong [ref=f1e69]: "project: ai-vs-real · https-links"
                      - generic [ref=f1e70]: PASSED
                    - paragraph [ref=f1e71]: All checks for this category passed.
                  - generic [ref=f1e72]:
                    - generic [ref=f1e73]:
                      - strong [ref=f1e74]: "project: ai-vs-real · approved-media"
                      - generic [ref=f1e75]: PASSED
                    - paragraph [ref=f1e76]: All checks for this category passed.
                  - generic [ref=f1e77]:
                    - generic [ref=f1e78]:
                      - strong [ref=f1e79]: "project: ai-vs-real · publication-rules"
                      - generic [ref=f1e80]: PASSED
                    - paragraph [ref=f1e81]: All checks for this category passed.
                  - generic [ref=f1e82]:
                    - generic [ref=f1e83]:
                      - strong [ref=f1e84]: "project: helios · schema"
                      - generic [ref=f1e85]: PASSED
                    - paragraph [ref=f1e86]: All checks for this category passed.
                  - generic [ref=f1e87]:
                    - generic [ref=f1e88]:
                      - strong [ref=f1e89]: "project: helios · evidence-records"
                      - generic [ref=f1e90]: PASSED
                    - paragraph [ref=f1e91]: All checks for this category passed.
                  - generic [ref=f1e92]:
                    - generic [ref=f1e93]:
                      - strong [ref=f1e94]: "project: helios · https-links"
                      - generic [ref=f1e95]: PASSED
                    - paragraph [ref=f1e96]: All checks for this category passed.
                  - generic [ref=f1e97]:
                    - generic [ref=f1e98]:
                      - strong [ref=f1e99]: "project: helios · approved-media"
                      - generic [ref=f1e100]: PASSED
                    - paragraph [ref=f1e101]: All checks for this category passed.
                  - generic [ref=f1e102]:
                    - generic [ref=f1e103]:
                      - strong [ref=f1e104]: "project: helios · publication-rules"
                      - generic [ref=f1e105]: PASSED
                    - paragraph [ref=f1e106]: All checks for this category passed.
                  - generic [ref=f1e107]:
                    - generic [ref=f1e108]:
                      - strong [ref=f1e109]: "project: talks · schema"
                      - generic [ref=f1e110]: PASSED
                    - paragraph [ref=f1e111]: All checks for this category passed.
                  - generic [ref=f1e112]:
                    - generic [ref=f1e113]:
                      - strong [ref=f1e114]: "project: talks · evidence-records"
                      - generic [ref=f1e115]: PASSED
                    - paragraph [ref=f1e116]: All checks for this category passed.
                  - generic [ref=f1e117]:
                    - generic [ref=f1e118]:
                      - strong [ref=f1e119]: "project: talks · https-links"
                      - generic [ref=f1e120]: PASSED
                    - paragraph [ref=f1e121]: All checks for this category passed.
                  - generic [ref=f1e122]:
                    - generic [ref=f1e123]:
                      - strong [ref=f1e124]: "project: talks · approved-media"
                      - generic [ref=f1e125]: PASSED
                    - paragraph [ref=f1e126]: All checks for this category passed.
                  - generic [ref=f1e127]:
                    - generic [ref=f1e128]:
                      - strong [ref=f1e129]: "project: talks · publication-rules"
                      - generic [ref=f1e130]: PASSED
                    - paragraph [ref=f1e131]: All checks for this category passed.
                  - generic [ref=f1e132]:
                    - generic [ref=f1e133]:
                      - strong [ref=f1e134]: "project: zenith · schema"
                      - generic [ref=f1e135]: PASSED
                    - paragraph [ref=f1e136]: All checks for this category passed.
                  - generic [ref=f1e137]:
                    - generic [ref=f1e138]:
                      - strong [ref=f1e139]: "project: zenith · evidence-records"
                      - generic [ref=f1e140]: PASSED
                    - paragraph [ref=f1e141]: All checks for this category passed.
                  - generic [ref=f1e142]:
                    - generic [ref=f1e143]:
                      - strong [ref=f1e144]: "project: zenith · https-links"
                      - generic [ref=f1e145]: PASSED
                    - paragraph [ref=f1e146]: All checks for this category passed.
                  - generic [ref=f1e147]:
                    - generic [ref=f1e148]:
                      - strong [ref=f1e149]: "project: zenith · approved-media"
                      - generic [ref=f1e150]: PASSED
                    - paragraph [ref=f1e151]: All checks for this category passed.
                  - generic [ref=f1e152]:
                    - generic [ref=f1e153]:
                      - strong [ref=f1e154]: "project: zenith · publication-rules"
                      - generic [ref=f1e155]: PASSED
                    - paragraph [ref=f1e156]: All checks for this category passed.
              - button "R4 winner chrome (candidatex)" [ref=f1e158] [cursor=pointer]
              - generic [ref=f1e159]:
                - generic [ref=f1e160]:
                  - strong [ref=f1e161]: "Authentic Private Preview Mode:"
                  - text: This view renders the draft using the truthful draft presentation layer. Unapproved media displays fallback indicators, links are checked, and verified claim badges are neutral until published.
                - status [ref=f1e162]: Private CandidateX content is preview-only and excluded from the public publication.
                - article [ref=f1e163]:
                  - navigation "Breadcrumb" [ref=f1e164]:
                    - link "Back to Projects" [ref=f1e165] [cursor=pointer]:
                      - /url: /projects
                      - generic [aria-hidden] [ref=f1e166]: ←
                      - text: Back to Projects
                  - generic [ref=f1e167]:
                    - generic [ref=f1e168]:
                      - generic [ref=f1e169]: Draft preview (Unpublished) · Draft Rev 5
                      - generic [ref=f1e170]: "ID: candidatex"
                    - heading "R4 winner chrome" [level=1] [ref=f1e171]
                    - paragraph [ref=f1e172]: Draft recruitment analytics platform.
                    - region "Proposed Role & Contribution" [ref=f1e173]:
                      - heading "Proposed Role & Contribution" [level=3] [ref=f1e174]
                      - paragraph [ref=f1e175]: Sole architect and full-stack engineer.
                    - generic [ref=f1e176]:
                      - heading "Project Links:" [level=3] [ref=f1e177]
                      - list [ref=f1e178]:
                        - listitem [ref=f1e179]:
                          - link "Repository (opens in a new tab)" [ref=f1e180] [cursor=pointer]:
                            - /url: https://github.com/yorayriniwnl/candidatex
                            - text: Repository
                            - generic [aria-hidden] [ref=f1e181]: ↗
                            - generic [ref=f1e182]: (opens in a new tab)
                  - generic [ref=f1e183]:
                    - region [ref=f1e184]:
                      - heading "R4 authoring workflow chrome" [level=2] [ref=f1e185]
                      - generic [ref=f1e186]:
                        - paragraph [ref=f1e187]: R4_PRIVATE_WORKFLOW_SENTINEL_CHROME line two — こんにちは
                        - list [ref=f1e188]:
                          - listitem [ref=f1e189]: second
                          - listitem [ref=f1e190]: first
                        - 'region "Code block: typescript" [ref=f1e191]':
                          - code [ref=f1e192]: const marker = "✓"; console.log(marker);
                        - list [ref=f1e193]:
                          - listitem [ref=f1e194]: R4 browser private-preview receipt edge
                    - region [ref=f1e195]:
                      - heading "R4 authoring workflow edge" [level=2] [ref=f1e196]
                      - generic [ref=f1e197]:
                        - paragraph [ref=f1e198]: R4_PRIVATE_WORKFLOW_SENTINEL_EDGE line two — こんにちは
                        - list [ref=f1e199]:
                          - listitem [ref=f1e200]: second
                          - listitem [ref=f1e201]: first
                        - 'region "Code block: typescript" [ref=f1e202]':
                          - code [ref=f1e203]: const marker = "✓"; console.log(marker);
                    - region [ref=f1e204]:
                      - heading "Overview" [level=2] [ref=f1e205]
                      - generic [ref=f1e206]:
                        - paragraph [ref=f1e207]: Draft analytics platform documentation.
                        - list [ref=f1e208]:
                          - listitem [ref=f1e209]: R4 browser private-preview receipt chrome
                  - region [ref=f1e210]:
                    - heading "Evidence Claims (Pending Publication)" [level=2] [ref=f1e211]
                    - paragraph [ref=f1e212]: "Pre-publication evidence ledger: all claims registered for pre-flight validation."
                    - list [ref=f1e213]:
                      - listitem [ref=f1e214]:
                        - generic [ref=f1e215]: verified
                        - generic [ref=f1e216]:
                          - strong [ref=f1e217]: "REPOSITORY:"
                          - text: Private repository code review.
                          - link "https://github.com/yorayriniwnl/candidatex (opens in a new tab)" [ref=f1e219] [cursor=pointer]:
                            - /url: https://github.com/yorayriniwnl/candidatex
                            - text: https://github.com/yorayriniwnl/candidatex↗ (opens in a new tab)
                  - generic [ref=f1e220]:
                    - link "Back to Projects" [ref=f1e221] [cursor=pointer]:
                      - /url: /projects
                      - generic [aria-hidden] [ref=f1e222]: ←
                      - text: Back to Projects
                    - link "Return to Studio" [ref=f1e223] [cursor=pointer]:
                      - /url: /?studio=return
                      - generic [aria-hidden] [ref=f1e224]: 🏠
                      - text: Return to Studio
    - contentinfo [ref=f1e225]:
      - paragraph [ref=f1e226]: YOR WORLD / Ayush Roy Portfolio
      - paragraph [ref=f1e227]: Sound off · Explore at your pace
  - alert [ref=f1e229]
```

# Test source

```ts
  1   | import { test, expect, type Page } from "@playwright/test";
  2   | import fs from "node:fs";
  3   | import path from "node:path";
  4   | 
  5   | const evidenceDir = process.env.A4_EVIDENCE_DIR || "";
  6   | 
  7   | async function capture(page: Page, name: string) {
  8   |   if (!evidenceDir) return;
  9   |   const directory = path.join(evidenceDir, "screenshots");
  10  |   fs.mkdirSync(directory, { recursive: true });
  11  |   await page.screenshot({ path: path.join(directory, `${name}.png`), fullPage: true });
  12  | }
  13  | 
  14  | test.describe("A1 completion authoring and publication workflow", () => {
  15  |   test.beforeEach(async ({ context }) => {
  16  |     await context.addCookies([{ name: "yor-admin-token", value: "rc3-fixture-owner-aal2", url: `http://127.0.0.1:${process.env.PORT ?? 3133}` }]);
  17  |   });
  18  | 
  19  |   test("edits all block variants, ordering, picker, save/reopen/cancel, and preserves a failed buffer", async ({ page }, testInfo) => {
  20  |     const sentinel = `R4_PRIVATE_WORKFLOW_SENTINEL_${testInfo.project.name.toUpperCase()}`;
  21  |     const headingText = `R4 authoring workflow ${testInfo.project.name}`;
  22  |     const fakeApprovedId = "11111111-1111-4111-8111-111111111111";
  23  |     await page.route("**/api/admin/media", async (route) => {
  24  |       if (route.request().method() !== "GET") return route.continue();
  25  |       await route.fulfill({ status: 200, contentType: "application/json", headers: { "Cache-Control": "private, no-store", Vary: "Authorization, Cookie" }, body: JSON.stringify({
  26  |         assets: [{ id: fakeApprovedId, objectKey: `approved/e2e/${testInfo.project.name}.png`, hash: "a".repeat(64), mime: "image/png", bytes: 68, dimensions: { width: 1, height: 1 }, approvalStatus: "approved", createdAt: "2026-10-11T00:00:00.000Z" }],
  27  |       }) });
  28  |     });
  29  | 
  30  |     await page.goto("/admin/editor");
  31  |     await page.getByLabel(/Select Project:/i).selectOption("candidatex");
  32  |     const priorSectionCount = await page.locator("[data-section-index]").count();
  33  |     await page.getByRole("button", { name: /\+ Add Section/i }).click();
  34  |     const createdSection = page.locator(`[data-section-index="${priorSectionCount}"]`);
  35  |     const createdHeading = createdSection.getByLabel(`Section ${priorSectionCount + 1} Heading`);
  36  |     await expect(createdHeading).toBeFocused();
  37  |     await createdHeading.fill(headingText);
  38  |     await createdSection.locator('[data-block-index="0"] textarea').fill(`${sentinel}\nline two — こんにちは`);
  39  | 
  40  |     await createdSection.getByRole("button", { name: /^\+ Code$/ }).click();
  41  |     const codeBlock = createdSection.locator('[data-block-index="1"]');
  42  |     await codeBlock.getByLabel("Language").fill("typescript");
  43  |     await codeBlock.getByLabel("Code Snippet").fill('const marker = "✓";\nconsole.log(marker);');
  44  | 
  45  |     await createdSection.getByRole("button", { name: /^\+ List$/ }).click();
  46  |     const listBlock = createdSection.locator('[data-block-index="2"]');
  47  |     await listBlock.getByRole("textbox", { name: `Section ${priorSectionCount + 1} Block 3 Item 1` }).fill("first");
  48  |     await listBlock.getByRole("button", { name: /\+ Add List Item/i }).click();
  49  |     await listBlock.getByRole("textbox", { name: `Section ${priorSectionCount + 1} Block 3 Item 2` }).fill("second");
  50  |     await listBlock.getByRole("button", { name: "Move Item 2 Up" }).click();
  51  |     await expect(listBlock.locator('[data-list-item-index="0"]')).toHaveValue("second");
  52  |     await expect(listBlock.locator('[data-list-item-index="0"]')).toBeFocused();
  53  | 
  54  |     await createdSection.getByRole("button", { name: /^\+ Image$/ }).click();
  55  |     const imageBlock = createdSection.locator('[data-block-index="3"]');
  56  |     const picker = imageBlock.getByLabel("Approved Media Asset ID");
  57  |     await expect(picker.locator("option", { hasText: fakeApprovedId })).toHaveCount(1);
  58  |     await picker.selectOption(fakeApprovedId);
  59  |     await imageBlock.getByLabel("Alt Text (Accessible Description)").fill("A mocked approved picker option");
  60  |     await imageBlock.getByLabel("Caption").fill("Picker UI fixture only");
  61  | 
  62  |     await createdSection.getByRole("button", { name: "Move Block 2 Down" }).click();
  63  |     await expect(createdSection.locator('[data-block-index="2"] input').first()).toBeFocused();
  64  |     await page.getByRole("button", { name: `Move Section ${priorSectionCount + 1} Up` }).click();
  65  |     const movedSectionIndex = priorSectionCount - 1;
  66  |     const movedSection = page.locator(`[data-section-index="${movedSectionIndex}"]`);
  67  |     await expect(movedSection.getByLabel(`Section ${movedSectionIndex + 1} Heading`)).toBeFocused();
  68  | 
  69  |     await page.getByRole("button", { name: /Save Draft/i }).click();
  70  |     await expect(page.getByText(/Validation Error \(422\)/i).first()).toBeVisible();
  71  |     const imageAfterMove = movedSection.locator('[data-block-index="3"]');
  72  |     await expect(imageAfterMove.getByLabel("Approved Media Asset ID")).toHaveValue(fakeApprovedId);
  73  |     await expect(imageAfterMove.getByLabel("Alt Text (Accessible Description)")).toHaveValue("A mocked approved picker option");
  74  |     await expect(movedSection.locator('[data-block-index="0"] textarea')).toHaveValue(`${sentinel}\nline two — こんにちは`);
  75  | 
  76  |     await imageAfterMove.getByRole("button", { name: "Delete Block 4" }).click();
  77  |     await page.getByRole("button", { name: /Save Draft/i }).click();
  78  |     await expect(page.getByText(/Draft saved successfully/i).first()).toBeVisible();
  79  |     await page.goto("/admin/preview/candidatex");
  80  |     await expect(page.getByText(sentinel, { exact: false })).toBeVisible();
> 81  |     await expect(page.getByText("const marker = \"✓\";", { exact: false })).toBeVisible();
      |                                                                             ^ Error: expect(locator).toBeVisible() failed
  82  |     await expect(page.getByText("second", { exact: true })).toBeVisible();
  83  |     await capture(page, `r4-private-preview-${testInfo.project.name}`);
  84  | 
  85  |     await page.goto("/admin/editor");
  86  |     await page.getByLabel(/Select Project:/i).selectOption("candidatex");
  87  |     const reloadedHeading = page.getByLabel(`Section ${movedSectionIndex + 1} Heading`);
  88  |     await expect(reloadedHeading).toHaveValue(headingText);
  89  |     await reloadedHeading.fill("Unsaved value to cancel");
  90  |     await page.getByRole("button", { name: /Cancel Edits/i }).click();
  91  |     await expect(reloadedHeading).toHaveValue(headingText);
  92  |   });
  93  | 
  94  |   test("two open editor sessions reject the stale save and retain its unsaved value", async ({ page, context }, testInfo) => {
  95  |     const second = await context.newPage();
  96  |     await Promise.all([page.goto("/admin/editor"), second.goto("/admin/editor")]);
  97  |     await Promise.all([
  98  |       page.getByLabel(/Select Project:/i).selectOption("candidatex"),
  99  |       second.getByLabel(/Select Project:/i).selectOption("candidatex"),
  100 |     ]);
  101 |     await page.getByLabel(/^Title$/i).fill(`R4 winner ${testInfo.project.name}`);
  102 |     await page.getByRole("button", { name: /Save Draft/i }).click();
  103 |     await expect(page.getByText(/Draft saved successfully/i).first()).toBeVisible();
  104 | 
  105 |     const staleSummary = second.getByLabel(/^Summary$/i);
  106 |     const unsaved = `R4 stale buffer retained ${testInfo.project.name}`;
  107 |     await staleSummary.fill(unsaved);
  108 |     await second.getByRole("button", { name: /Save Draft/i }).click();
  109 |     await expect(second.getByText(/Revision Conflict \(409\)/i).first()).toBeVisible();
  110 |     await expect(staleSummary).toHaveValue(unsaved);
  111 |     await capture(second, `r4-stale-buffer-${testInfo.project.name}`);
  112 |     await second.close();
  113 |   });
  114 | 
  115 |   test("publishes from a fresh review, reports an unknown cache result honestly, then rolls back with a reason", async ({ page }, testInfo) => {
  116 |     await page.goto("/admin/publish");
  117 |     const body = await page.locator("body").innerText();
  118 |     const priorRevision = Number(body.match(/Current Revision:\s*r(\d+)/)?.[1]);
  119 |     expect(Number.isInteger(priorRevision)).toBeTruthy();
  120 |     const publishButton = page.getByRole("button", { name: /Publish Revision/i });
  121 |     await expect(publishButton).toBeEnabled();
  122 | 
  123 |     await page.route("**/api/admin/publish", async (route) => {
  124 |       if (route.request().method() !== "POST") return route.continue();
  125 |       const response = await route.fetch();
  126 |       if (!response.ok()) return route.fulfill({ response });
  127 |       const payload = await response.json() as { publication: Record<string, unknown>; [key: string]: unknown };
  128 |       await route.fulfill({ response, json: { ...payload, publication: { ...payload.publication,
  129 |         visibility: "unknown", observedRevision: null, cacheRefreshWarning: "Synthetic browser response: cache refresh not confirmed." } } });
  130 |     });
  131 |     await publishButton.click();
  132 |     await expect(page.getByText(/visibility is unknown/i).first()).toBeVisible();
  133 |     await expect(page.getByText(/Synthetic browser response: cache refresh not confirmed/i).first()).toBeVisible();
  134 | 
  135 |     const reason = `R4 browser rollback reason ${testInfo.project.name}`;
  136 |     await page.getByLabel("Rollback reason").fill(reason);
  137 |     page.once("dialog", (dialog) => dialog.accept());
  138 |     await page.getByRole("button", { name: `Rollback to r${priorRevision}` }).click();
  139 |     await expect(page.getByText(/Rollback committed as new revision/i).first()).toBeVisible();
  140 |     await expect(page.getByText(reason, { exact: true })).toBeVisible();
  141 |     await capture(page, `r4-publication-rollback-${testInfo.project.name}`);
  142 |   });
  143 | 
  144 |   test("keeps private APIs isolated for anonymous callers and never publishes the CandidateX sentinel", async ({ page, browser }, testInfo) => {
  145 |     await page.goto("/projects");
  146 |     const publicHtml = await page.locator("html").innerText();
  147 |     expect(publicHtml).not.toContain("R4_PRIVATE_WORKFLOW_SENTINEL_");
  148 |     await expect(page.getByRole("heading", { level: 2, name: /CandidateX/i })).toHaveCount(0);
  149 |     const candidate = await page.goto("/projects/candidatex");
  150 |     expect(candidate?.status()).toBe(404);
  151 |     expect(await page.locator("html").innerText()).not.toContain("R4_PRIVATE_WORKFLOW_SENTINEL_");
  152 | 
  153 |     const anonymous = await browser.newContext();
  154 |     const origin = `http://127.0.0.1:${process.env.PORT ?? 3133}`;
  155 |     const cases: Array<{ method: "get" | "post"; path: string }> = [
  156 |       { method: "get", path: "/api/admin/projects" },
  157 |       { method: "post", path: "/api/admin/projects" },
  158 |       { method: "get", path: "/api/admin/media" },
  159 |       { method: "get", path: "/api/admin/preview?projectId=candidatex" },
  160 |       { method: "get", path: "/api/admin/preview/media/11111111-1111-4111-8111-111111111111" },
  161 |       { method: "get", path: "/api/admin/publish" },
  162 |       { method: "post", path: "/api/admin/publish" },
  163 |       { method: "post", path: "/api/admin/rollback" },
  164 |     ];
  165 |     for (const item of cases) {
  166 |       const response = item.method === "get"
  167 |         ? await anonymous.request.get(`${origin}${item.path}`)
  168 |         : await anonymous.request.post(`${origin}${item.path}`, { data: {} });
  169 |       expect(response.status(), `${item.method.toUpperCase()} ${item.path}`).toBe(401);
  170 |       const headers = response.headers();
  171 |       expect(headers["cache-control"]).toContain("private");
  172 |       expect(headers["cache-control"]).toContain("no-store");
  173 |       const vary = (headers.vary ?? "").toLowerCase();
  174 |       expect(vary).toContain("authorization");
  175 |       expect(vary).toContain("cookie");
  176 |     }
  177 |     await anonymous.close();
  178 |   });
  179 | });
  180 | 
```