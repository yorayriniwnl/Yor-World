# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: platform\admin-publish.spec.ts >> Milestone A4: Project Editor & Publication Management E2E >> edits, saves, reloads, and privately previews CandidateX without adding it to public pages
- Location: tests\e2e\platform\admin-publish.spec.ts:122:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('R4 browser private-preview receipt', { exact: true })
Expected: visible
Error: strict mode violation: getByText('R4 browser private-preview receipt', { exact: true }) resolved to 2 elements:
    1) <li>R4 browser private-preview receipt</li> aka getByText('R4 browser private-preview').first()
    2) <li>R4 browser private-preview receipt</li> aka getByText('R4 browser private-preview').nth(1)

Call log:
  - Expect "toBeVisible" getByText('R4 browser private-preview receipt', { exact: true }) with timeout 5000ms
  - waiting for getByText('R4 browser private-preview receipt', { exact: true })

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
                    - generic [ref=f1e49]: r2
                    - text: (from base r1)
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
              - button "CandidateX (Draft) (candidatex)" [ref=f1e158] [cursor=pointer]
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
                      - generic [ref=f1e169]: Draft preview (Unpublished) · Draft Rev 2
                      - generic [ref=f1e170]: "ID: candidatex"
                    - heading "CandidateX (Draft)" [level=1] [ref=f1e171]
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
                  - region [ref=f1e184]:
                    - heading "Overview" [level=2] [ref=f1e185]
                    - generic [ref=f1e186]:
                      - paragraph [ref=f1e187]: Draft analytics platform documentation.
                      - list [ref=f1e188]:
                        - listitem [ref=f1e189]: R4 browser private-preview receipt
                      - list [ref=f1e190]:
                        - listitem [ref=f1e191]: R4 browser private-preview receipt
                  - region [ref=f1e192]:
                    - heading "Evidence Claims (Pending Publication)" [level=2] [ref=f1e193]
                    - paragraph [ref=f1e194]: "Pre-publication evidence ledger: all claims registered for pre-flight validation."
                    - list [ref=f1e195]:
                      - listitem [ref=f1e196]:
                        - generic [ref=f1e197]: verified
                        - generic [ref=f1e198]:
                          - strong [ref=f1e199]: "REPOSITORY:"
                          - text: Private repository code review.
                          - link "https://github.com/yorayriniwnl/candidatex (opens in a new tab)" [ref=f1e201] [cursor=pointer]:
                            - /url: https://github.com/yorayriniwnl/candidatex
                            - text: https://github.com/yorayriniwnl/candidatex↗ (opens in a new tab)
                  - generic [ref=f1e202]:
                    - link "Back to Projects" [ref=f1e203] [cursor=pointer]:
                      - /url: /projects
                      - generic [aria-hidden] [ref=f1e204]: ←
                      - text: Back to Projects
                    - link "Return to Studio" [ref=f1e205] [cursor=pointer]:
                      - /url: /?studio=return
                      - generic [aria-hidden] [ref=f1e206]: 🏠
                      - text: Return to Studio
    - contentinfo [ref=f1e207]:
      - paragraph [ref=f1e208]: YOR WORLD / Ayush Roy Portfolio
      - paragraph [ref=f1e209]: Sound off · Explore at your pace
  - alert [ref=f1e211]
```

# Test source

```ts
  33  |         await page.screenshot({
  34  |           path: path.join(screenshotDir, `${filename}.png`),
  35  |           fullPage: true,
  36  |         });
  37  |       } catch {
  38  |         // Transient lock on Windows does not fail functional assertion
  39  |       }
  40  |     }
  41  |   }
  42  | }
  43  | 
  44  | test.describe("Milestone A4: Project Editor & Publication Management E2E", () => {
  45  |   test.beforeEach(async ({ context }) => {
  46  |     await context.addCookies([{ name: "yor-admin-token",value: "rc3-fixture-owner-aal2",url: `http://127.0.0.1:${process.env.PORT ?? 3133}` }]);
  47  |   });
  48  |   test("admin navigation includes links to Dashboard, Editor, and Publish", async ({ page }) => {
  49  |     await page.goto("/admin");
  50  | 
  51  |     const nav = page.getByRole("navigation", { name: /Administration navigation/i });
  52  |     await expect(nav).toBeVisible();
  53  | 
  54  |     const editorLink = page.getByRole("link", { name: /^Editor$/i });
  55  |     await expect(editorLink).toBeVisible();
  56  |     await expect(editorLink).toHaveAttribute("href", "/admin/editor");
  57  | 
  58  |     const publishLink = page.getByRole("link", { name: /^Publish$/i });
  59  |     await expect(publishLink).toBeVisible();
  60  |     await expect(publishLink).toHaveAttribute("href", "/admin/publish");
  61  |   });
  62  | 
  63  |   test("loads project editor with structured editing controls", async ({ page }) => {
  64  |     await page.goto("/admin/editor");
  65  | 
  66  |     await expect(page).toHaveTitle(/Project Editor \| YOR WORLD Administration/i);
  67  |     const heading = page.getByRole("heading", { level: 1, name: /Project Content & Draft Editor/i });
  68  |     await expect(heading).toBeVisible();
  69  |     await captureScreenshot(page, "a4-project-editor");
  70  | 
  71  |     // Project select dropdown
  72  |     const select = page.getByLabel(/Select Project:/i);
  73  |     await expect(select).toBeVisible();
  74  | 
  75  |     // Overview fields
  76  |     const titleInput = page.getByLabel(/^Title$/i);
  77  |     await expect(titleInput).toBeVisible();
  78  | 
  79  |     const summaryInput = page.getByLabel(/^Summary$/i);
  80  |     await expect(summaryInput).toBeVisible();
  81  | 
  82  |     const contribInput = page.getByLabel(/^Contribution$/i);
  83  |     await expect(contribInput).toBeVisible();
  84  | 
  85  |     // Section controls
  86  |     const addSectionBtn = page.getByRole("button", { name: /\+ Add Section/i });
  87  |     await expect(addSectionBtn).toBeVisible();
  88  | 
  89  |     // Save draft button
  90  |     const saveBtn = page.getByRole("button", { name: /Save Draft/i });
  91  |     await expect(saveBtn).toBeVisible();
  92  |   });
  93  | 
  94  |   test("loads publish review with pre-flight checklist and publication history table", async ({ page }) => {
  95  |     await page.goto("/admin/publish");
  96  | 
  97  |     await expect(page).toHaveTitle(/Publish Review & Rollback \| YOR WORLD Administration/i);
  98  |     const heading = page.getByRole("heading", { level: 1, name: /Publication Review & Rollback/i });
  99  |     await expect(heading).toBeVisible();
  100 | 
  101 |     // Pre-flight checklist card
  102 |     const checklist = page.getByText(/Pre-Flight Checklist/i);
  103 |     await expect(checklist).toBeVisible();
  104 |     await expect(page.getByText(/project ai-vs-real: schema/i)).toBeVisible();
  105 |     await expect(page.getByText(/project helios: approved-media/i)).toBeVisible();
  106 | 
  107 |     // Publish execution button
  108 |     const publishBtn = page.getByRole("button", { name: /Publish Revision/i });
  109 |     await expect(publishBtn).toBeVisible();
  110 | 
  111 |     // Publication history table
  112 |     const historyHeading = page.getByRole("heading", { level: 3, name: /Publication History & Rollback/i });
  113 |     await expect(historyHeading).toBeVisible();
  114 | 
  115 |     const table = page.locator("table");
  116 |     await expect(table).toBeVisible();
  117 |     await expect(table.getByText(/Revision/i).first()).toBeVisible();
  118 |     await expect(table.getByText(/r1/i).first()).toBeVisible();
  119 |     await captureScreenshot(page, "a4-publish-review");
  120 |   });
  121 | 
  122 |   test("edits, saves, reloads, and privately previews CandidateX without adding it to public pages", async ({ page }) => {
  123 |     await page.goto("/admin/editor");
  124 |     await page.getByLabel(/Select Project:/i).selectOption("candidatex");
  125 |     const existingBlockCount = await page.locator('[data-testid^="section-0-block-"]').count();
  126 |     await page.getByRole("button", { name: /^\+ List$/ }).click();
  127 |     const privateItem = page.getByRole("textbox", { name: `Section 1 Block ${existingBlockCount + 1} Item 1` });
  128 |     await privateItem.fill("R4 browser private-preview receipt");
  129 |     await page.getByRole("button", { name: /Save Draft/i }).click();
  130 |     await expect(page.getByText(/Draft saved successfully/i)).toBeVisible();
  131 | 
  132 |     await page.goto("/admin/preview/candidatex");
> 133 |     await expect(page.getByText("R4 browser private-preview receipt", { exact: true })).toBeVisible();
      |                                                                                         ^ Error: expect(locator).toBeVisible() failed
  134 |     await expect(page.getByText(/Private CandidateX content is preview-only/i)).toBeVisible();
  135 |     await page.goto("/projects");
  136 |     await expect(page.getByRole("heading", { level: 2, name: /CandidateX/i })).toHaveCount(0);
  137 |     expect((await page.goto("/projects/candidatex"))?.status()).toBe(404);
  138 |   });
  139 | 
  140 |   test("editor and publish interfaces require zero WebGL, canvas, or 3D models", async ({ page }) => {
  141 |     const glbRequests: string[] = [];
  142 |     page.on("request", (req) => {
  143 |       if (req.url().endsWith(".glb") || req.url().endsWith(".gltf")) {
  144 |         glbRequests.push(req.url());
  145 |       }
  146 |     });
  147 | 
  148 |     await page.goto("/admin/editor");
  149 |     await expect(page.locator("canvas")).toHaveCount(0);
  150 |     expect(glbRequests).toHaveLength(0);
  151 | 
  152 |     await page.goto("/admin/publish");
  153 |     await expect(page.locator("canvas")).toHaveCount(0);
  154 |     expect(glbRequests).toHaveLength(0);
  155 |   });
  156 | 
  157 |   test("public portfolio continues to serve approved snapshot with no private media leakage", async ({ page }) => {
  158 |     await page.goto("/projects");
  159 | 
  160 |     // All 4 approved projects rendered
  161 |     await expect(page.getByRole("heading", { level: 2, name: /AI vs\. Real Image Detector/i })).toBeVisible();
  162 |     await expect(page.getByRole("heading", { level: 2, name: /Yor Zenith/i })).toBeVisible();
  163 |     await expect(page.getByRole("heading", { level: 2, name: /Yor Helios/i })).toBeVisible();
  164 |     await expect(page.getByRole("heading", { level: 2, name: /Yor Talks V2/i })).toBeVisible();
  165 | 
  166 |     // CandidateX is unpublished candidate -> not visible on public index
  167 |     await expect(page.getByRole("heading", { level: 2, name: /CandidateX/i })).toHaveCount(0);
  168 | 
  169 |     // Direct visit to unpublished candidatex slug returns 404
  170 |     const response = await page.goto("/projects/candidatex");
  171 |     expect(response?.status()).toBe(404);
  172 |   });
  173 | });
  174 | 
```