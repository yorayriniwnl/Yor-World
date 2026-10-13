# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: full-stack-integration.spec.ts >> RC3 cross-lane full stack >> static fallback uses approved projects and exposes no draft/private data
- Location: tests\e2e\full-stack-integration.spec.ts:176:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.selectOption: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('combobox', { name: 'Visual Quality Tier' })

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - generic [ref=e3]:
    - banner [ref=e4]:
      - link "Yor World home" [ref=e5] [cursor=pointer]:
        - /url: /
        - generic [aria-hidden] [ref=e6]: "Y"
        - generic [ref=e7]:
          - text: YOR WORLD
          - generic [ref=e8]: A studio in progress
      - navigation "Primary navigation" [ref=e9]:
        - list [ref=e10]:
          - listitem [ref=e11]:
            - link "Projects" [ref=e12] [cursor=pointer]:
              - /url: /projects
          - listitem [ref=e13]:
            - link "About" [ref=e14] [cursor=pointer]:
              - /url: /about
          - listitem [ref=e15]:
            - link "Contact" [ref=e16] [cursor=pointer]:
              - /url: /contact
          - listitem [ref=e17]:
            - link "Résumé" [ref=e18] [cursor=pointer]:
              - /url: /resume
    - main [ref=e19]:
      - region [ref=e20]:
        - generic [ref=e21]:
          - paragraph [ref=e22]: The door is taking shape
          - heading [level=1] [ref=e23]:
            - text: A little world.
            - emphasis [ref=e24]: A closer look.
          - paragraph [ref=e25]: A personal studio for exploring the work, the thinking, and the person behind it.
          - generic [ref=e26]:
            - paragraph [ref=e27]:
              - text: Ayush Roy
              - generic [ref=e28]: Verified identity
            - paragraph [ref=e29]: Full-Stack & Systems Developer
            - paragraph [ref=e30]: Building realtime systems, 3D product interfaces, and applied ML.
          - link "View projects" [ref=e32] [cursor=pointer]:
            - /url: /projects
            - text: View projects
            - generic [aria-hidden] [ref=e33]: ↗
          - paragraph [ref=e34]: Four verified project case studies. Explore the studio whenever you like.
        - complementary "Studio status" [ref=e35]:
          - generic [ref=e36]:
            - generic [ref=e37]: YOR / 01
            - generic [ref=e38]: In the making
          - generic [ref=e41]: "Y"
          - generic [ref=e45]:
            - paragraph [ref=e46]:
              - text: A space for
              - strong [ref=e47]: curiosity.
            - generic [ref=e48]: Interactive studioPortfolio pages below
      - region "Explore the interactive studio" [ref=e49]:
        - region "Interactive 3D Studio" [active] [ref=e50]:
          - generic "3D Room view showing resident, workstation, and moving chair" [ref=e52]
          - generic [ref=e53]:
            - generic [ref=e54]:
              - button "Acknowledge and greet resident" [ref=e55] [cursor=pointer]: Greet
              - button "Instant skip to coding pose (Escape)" [ref=e56] [cursor=pointer]: Skip (Esc)
              - button "Open accessible studio room controls" [ref=e57] [cursor=pointer]: Room
              - button "Open studio project launcher" [ref=e58] [cursor=pointer]: Projects
              - button "Sound Off" [ref=e59] [cursor=pointer]: "Sound: Off"
              - button "Exit 3D Studio and return to portfolio" [ref=e60] [cursor=pointer]: Exit
              - group [ref=e61]:
                - generic "Options" [ref=e62] [cursor=pointer]
                - option "Auto (Adaptive)" [selected]
                - option "High (Full Shadows & Bloom)"
                - option "Medium (Balanced)"
                - option "Low (Optimized)"
                - option "Static (HTML Portfolio Fallback)"
              - button "Diagnostics" [ref=e63] [cursor=pointer]
            - generic: coding_idle / coding
      - region [ref=e64]:
        - generic [ref=e65]:
          - paragraph [ref=e66]: Take a look around
          - heading "Start anywhere." [level=2] [ref=e67]
        - list [ref=e68]:
          - listitem [ref=e69]:
            - link "01 Projects Verified software case studies" [ref=e70] [cursor=pointer]:
              - /url: /projects
              - generic [ref=e71]: "01"
              - generic [ref=e72]:
                - strong [ref=e73]: Projects
                - text: Verified software case studies
              - generic [aria-hidden] [ref=e74]: ↗
          - listitem [ref=e75]:
            - link "02 About Background, education, and technical skills" [ref=e76] [cursor=pointer]:
              - /url: /about
              - generic [ref=e77]: "02"
              - generic [ref=e78]:
                - strong [ref=e79]: About
                - text: Background, education, and technical skills
              - generic [aria-hidden] [ref=e80]: ↗
          - listitem [ref=e81]:
            - link "03 Contact Send a message or use direct channels" [ref=e82] [cursor=pointer]:
              - /url: /contact
              - generic [ref=e83]: "03"
              - generic [ref=e84]:
                - strong [ref=e85]: Contact
                - text: Send a message or use direct channels
              - generic [aria-hidden] [ref=e86]: ↗
    - contentinfo [ref=e87]:
      - paragraph [ref=e88]: YOR WORLD / Ayush Roy Portfolio
      - paragraph [ref=e89]: Sound off · Explore at your pace
  - alert [ref=e91]
```

# Test source

```ts
  79  |     await page.goto("/?studio=1&simulateRendererError=1");
  80  |     await expect(page.getByTestId("world-failure-container")).toBeVisible({ timeout: 15_000 });
  81  |     await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Contact", exact: true }).click();
  82  |     await submitRealContact(page, "renderer");
  83  |   });
  84  | 
  85  |   test("direct contact needs no world and canonical API replays R2 receipts and rejects conflicts", async ({ page, request }) => {
  86  |     await page.goto("/contact");
  87  |     await expect(page.locator("canvas")).toHaveCount(0);
  88  |     const response = await submitRealContact(page, "direct");
  89  |     const originalPayload = response.request().postDataJSON();
  90  |     const receipt = await response.json();
  91  |     const [replayA, replayB] = await Promise.all([
  92  |       request.post("/api/contact", { data: originalPayload }),
  93  |       request.post("/api/contact", { data: originalPayload }),
  94  |     ]);
  95  |     expect(replayA.status()).toBe(202);
  96  |     expect(replayB.status()).toBe(202);
  97  |     expect((await replayA.json()).id).toBe(receipt.id);
  98  |     expect((await replayB.json()).id).toBe(receipt.id);
  99  |     expect((await request.post("/api/contact", { data: { ...originalPayload, message: "A changed valid synthetic message conflicts with the original idempotency claim." } })).status()).toBe(409);
  100 |   });
  101 | 
  102 |   test("public world availability does not grant admin or private API access", async ({ page, request }) => {
  103 |     await page.goto("/?studio=1");
  104 |     await openLauncher(page);
  105 |     const terminal = page.getByRole("textbox", { name: "Terminal command input" });
  106 |     await terminal.fill("open /admin");
  107 |     await terminal.press("Enter");
  108 |     await expect(page.getByRole("dialog")).toContainText("Unknown project");
  109 |     expect(new URL(page.url()).pathname).toBe("/");
  110 |     for (const endpoint of ["/api/admin/projects", "/api/admin/publish", "/api/admin/media"]) {
  111 |       expect((await request.get(endpoint)).status()).toBe(401);
  112 |     }
  113 |     await page.goto("/admin/editor");
  114 |     await expect(page).toHaveURL(/\/admin\/login$/);
  115 |     await expect(page.locator("canvas")).toHaveCount(0);
  116 |   });
  117 | 
  118 |   test("a real approved publication update reaches project HTML and world navigation across requests", async ({ page, request }) => {
  119 |     const headers = { Authorization: "Bearer rc3-fixture-owner-aal2" };
  120 |     const stateResponse = await request.get("/api/admin/publish", { headers });
  121 |     expect(stateResponse.status()).toBe(200);
  122 |     const state: { activePublication: Publication } = await stateResponse.json();
  123 |     const draftResponse = await request.get("/api/admin/projects", { headers });
  124 |     expect(draftResponse.status()).toBe(200);
  125 |     const drafts: { drafts: Array<{ projectId: string; draftRevision: number; project: PublishedProject }> } = await draftResponse.json();
  126 |     const draft = drafts.drafts.find((item) => item.projectId === "zenith")!;
  127 |     const title = "Yor Zenith — RC3 approved snapshot test";
  128 |     let savedRevision: number | undefined;
  129 |     try {
  130 |       const saved = await request.post("/api/admin/projects", {
  131 |         headers, data: { projectId: "zenith", expectedRevision: draft.draftRevision, project: { ...draft.project, title } },
  132 |       });
  133 |       expect(saved.status()).toBe(201);
  134 |       savedRevision = (await saved.json()).draftRevision;
  135 |       const published = await request.post("/api/admin/publish", { headers, data: { expectedRevision: state.activePublication.revision } });
  136 |       expect(published.status()).toBe(200);
  137 |       const publication: Publication = (await published.json()).publication;
  138 |       await page.goto("/projects/zenith");
  139 |       await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  140 |       await page.reload();
  141 |       await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  142 |       await page.goto("/?studio=1");
  143 |       await openLauncher(page);
  144 |       const launcher = page.getByRole("dialog", { name: "Studio Monitor Launcher" });
  145 |       await expect(launcher.getByRole("heading", { name: title })).toBeVisible();
  146 |       await expect(launcher).toContainText(`Publication r${publication.revision}`);
  147 |       await launcher.getByRole("textbox", { name: "Terminal command input" }).fill("open zenith");
  148 |       await launcher.getByRole("textbox", { name: "Terminal command input" }).press("Enter");
  149 |       await expect(page).toHaveURL(/\/projects\/zenith$/);
  150 |       await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  151 |     } finally {
  152 |       if (savedRevision !== undefined) {
  153 |         const restoredDraft = await request.post("/api/admin/projects", {
  154 |           headers, data: { projectId: "zenith", expectedRevision: savedRevision, project: draft.project },
  155 |         });
  156 |         expect(restoredDraft.status()).toBe(201);
  157 |         const rollback = await request.post("/api/admin/rollback", { headers, data: { targetRevision: state.activePublication.revision } });
  158 |         expect(rollback.status()).toBe(200);
  159 |       }
  160 |     }
  161 |   });
  162 | 
  163 |   test("reduced motion preserves keyboard contact and protected admin DOM flows", async ({ page }) => {
  164 |     await page.emulateMedia({ reducedMotion: "reduce" });
  165 |     await page.goto("/contact");
  166 |     await page.locator("#contact-name").focus();
  167 |     await expect(page.locator("#contact-name")).toBeFocused();
  168 |     await submitRealContact(page, "motion");
  169 |     await page.goto("/admin");
  170 |     await expect(page).toHaveURL(/\/admin\/login$/);
  171 |     await page.getByLabel("Owner Email", { exact: true }).focus();
  172 |     await expect(page.getByLabel("Owner Email", { exact: true })).toBeFocused();
  173 |     await expect(page.locator("canvas")).toHaveCount(0);
  174 |   });
  175 | 
  176 |   test("static fallback uses approved projects and exposes no draft/private data", async ({ page, request }) => {
  177 |     await page.goto("/?studio=1");
  178 |     await expect(page.getByTestId("world-stage-container")).toBeVisible({ timeout: 15_000 });
> 179 |     await page.getByTestId("studio-options-toggle").click();
      |                                                                       ^ Error: locator.selectOption: Test timeout of 30000ms exceeded.
  180 |     await expect(page.getByTestId("studio-options-panel")).toBeVisible();
  181 |     await page.getByRole("combobox", { name: "Visual Quality Tier" }).selectOption("static");
  182 |     const fallback = page.getByTestId("static-fallback-section");
  183 |     await expect(fallback).toBeVisible();
  184 |     await expect(fallback.locator('a[href^="/projects/"]')).toHaveCount(4);
  185 |     await expect(fallback.locator('a[href="/projects/candidatex"]')).toHaveCount(0);
  186 |     await expect(fallback).not.toContainText("Draft analytics platform documentation");
  187 |     await expect(fallback).not.toContainText("Private repository code review");
  188 |     expect((await request.get("/projects/candidatex")).status()).toBe(404);
  189 |     expect((await request.get("/api/admin/media/private-draft-canary")).status()).toBe(401);
  190 |   });
  191 | 
  192 |   test("production project routes survive an actual backend connection outage", async ({ browser }) => {
  193 |     test.setTimeout(60_000);
  194 |     const port = await new Promise<number>((resolve, reject) => {
  195 |       const server = createServer();
  196 |       server.on("error", reject);
  197 |       server.listen(0, "127.0.0.1", () => {
  198 |         const address = server.address();
  199 |         if (!address || typeof address === "string") return reject(new Error("No free TCP port."));
  200 |         const selectedPort = address.port;
  201 |         server.close(() => resolve(selectedPort));
  202 |       });
  203 |     });
  204 |     const child = spawn(process.execPath, [path.join(process.cwd(), "node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(port)], {
  205 |       cwd: process.cwd(), windowsHide: true, stdio: "pipe",
  206 |       env: { ...process.env, YOR_E2E_FIXTURE: "0", YOR_TEST_DATABASE_PATH: "", DATABASE_URL: "postgres://invalid:invalid@127.0.0.1:1/unavailable", NEXT_TELEMETRY_DISABLED: "1" },
  207 |     });
  208 |     const context = await browser.newContext({ baseURL: `http://127.0.0.1:${port}` });
  209 |     try {
  210 |       await expect.poll(async () => {
  211 |         try { return (await fetch(`http://127.0.0.1:${port}/projects/helios`)).status; } catch { return 0; }
  212 |       }, { timeout: 25_000 }).toBe(200);
  213 |       const page = await context.newPage();
  214 |       expect((await page.goto("/projects/helios"))?.status()).toBe(200);
  215 |       await expect(page.getByRole("heading", { name: "Yor Helios", level: 1 })).toBeVisible();
  216 |       expect((await page.reload())?.status()).toBe(200);
  217 |       await expect(page.locator("canvas")).toHaveCount(0);
  218 |       expect((await page.goto("/projects/candidatex"))?.status()).toBe(404);
  219 |       await expect(page.locator("body")).not.toContainText("Private repository code review");
  220 |     } finally {
  221 |       await context.close();
  222 |       child.kill();
  223 |       await new Promise<void>((resolve) => child.exitCode !== null ? resolve() : child.once("exit", () => resolve()));
  224 |     }
  225 |   });
  226 | });
  227 | 
```