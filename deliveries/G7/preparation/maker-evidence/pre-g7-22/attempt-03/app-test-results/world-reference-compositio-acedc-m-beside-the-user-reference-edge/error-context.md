# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: world-reference-composition.spec.ts >> PRE-G7-22 reference composition and compact mobile controls >> captures the opening desktop room beside the user reference
- Location: tests\e2e\world-reference-composition.spec.ts:759:3

# Error details

```
Test timeout of 150000ms exceeded.
```

```
Error: locator.getAttribute: Test timeout of 150000ms exceeded.
Call log:
  - waiting for getByTestId('studio-controls-toggle')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
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
          - generic [ref=e31]:
            - link "View projects" [ref=e32] [cursor=pointer]:
              - /url: /projects
              - text: View projects
              - generic [aria-hidden] [ref=e33]: ↗
            - generic [ref=e34]:
              - group [ref=e35]:
                - generic "Enter studio" [ref=e36] [cursor=pointer]:
                  - text: Enter studio
                  - generic [aria-hidden] [ref=e37]: +
                - generic [ref=e38]:
                  - paragraph [ref=e39]: The studio is not yet available.
                  - paragraph [ref=e40]:
                    - text: Launch the
                    - strong [ref=e41]: G1 Interactive 3D Studio Feasibility Proof
                    - text: "to experience the integrated bright white workstation, blue moving chair, resident, and ambient lighting:"
                  - button "Launch 3D Studio" [ref=e43] [cursor=pointer]
              - dialog "YOR WORLD interactive studio" [ref=e44]:
                - generic [ref=e45]:
                  - region [ref=e47]:
                    - generic [ref=e48]:
                      - generic [ref=e49]:
                        - generic "Static Portfolio Tier Active" [ref=e50]: Accessible Static Presentation
                        - heading "Full Portfolio Mode" [level=2] [ref=e51]
                        - paragraph [ref=e52]: Accessible Static Presentation active. Interactive 3D graphics are bypassed.
                      - generic [ref=e53]:
                        - button "Retry 3D Studio" [ref=e54] [cursor=pointer]
                        - button "Continue with Portfolio" [ref=e55] [cursor=pointer]
                      - generic [ref=e56]:
                        - heading "Published Projects" [level=3] [ref=e57]
                        - list [ref=e58]:
                          - listitem [ref=e59]:
                            - link [ref=e60] [cursor=pointer]:
                              - /url: /projects/ai-vs-real
                              - strong [ref=e61]: AI vs. Real Image Detector
                              - text: "? A probability-aware image classifier built from handcrafted texture features and a calibrated support vector machine."
                          - listitem [ref=e62]:
                            - link [ref=e63] [cursor=pointer]:
                              - /url: /projects/zenith
                              - strong [ref=e64]: Yor Zenith
                              - text: "? A full-stack solar feasibility platform combining 3D roof planning, energy-output simulation, and financial analysis."
                          - listitem [ref=e65]:
                            - link [ref=e66] [cursor=pointer]:
                              - /url: /projects/helios
                              - strong [ref=e67]: Yor Helios
                              - text: "? An energy-monitoring platform streaming anomaly and threshold events into channel-specific operator dashboards."
                          - listitem [ref=e68]:
                            - link [ref=e69] [cursor=pointer]:
                              - /url: /projects/talks
                              - strong [ref=e70]: Yor Talks V2
                              - text: "? A full-stack communication platform with realtime messaging, typed interface components, and a documented public-beta path."
                      - generic [ref=e71]:
                        - link "About Yor" [ref=e72] [cursor=pointer]:
                          - /url: /about
                        - generic [aria-hidden] [ref=e73]: "|"
                        - link "Résumé" [ref=e74] [cursor=pointer]:
                          - /url: /resume
                        - generic [aria-hidden] [ref=e75]: "|"
                        - link "Contact" [ref=e76] [cursor=pointer]:
                          - /url: /contact
                  - navigation "Portfolio destinations and studio exit" [ref=e77]:
                    - link "Projects" [ref=e78] [cursor=pointer]:
                      - /url: /projects
                    - link "About" [ref=e79] [cursor=pointer]:
                      - /url: /about
                    - link "Contact" [ref=e80] [cursor=pointer]:
                      - /url: /contact
                    - link "Résumé" [ref=e81] [cursor=pointer]:
                      - /url: /resume
                    - button "Exit Studio" [ref=e82] [cursor=pointer]
          - paragraph [ref=e83]: Four verified project case studies. Explore the studio whenever you like.
        - complementary "Studio status" [ref=e84]:
          - generic [ref=e85]:
            - generic [ref=e86]: YOR / 01
            - generic [ref=e87]: In the making
          - generic [ref=e90]: "Y"
          - generic [ref=e94]:
            - paragraph [ref=e95]:
              - text: A space for
              - strong [ref=e96]: curiosity.
            - generic [ref=e97]: Interactive studioPortfolio pages below
      - region [ref=e98]:
        - generic [ref=e99]:
          - paragraph [ref=e100]: Take a look around
          - heading "Start anywhere." [level=2] [ref=e101]
        - list [ref=e102]:
          - listitem [ref=e103]:
            - link "01 Projects Verified software case studies" [ref=e104] [cursor=pointer]:
              - /url: /projects
              - generic [ref=e105]: "01"
              - generic [ref=e106]:
                - strong [ref=e107]: Projects
                - text: Verified software case studies
              - generic [aria-hidden] [ref=e108]: ↗
          - listitem [ref=e109]:
            - link "02 About Background, education, and technical skills" [ref=e110] [cursor=pointer]:
              - /url: /about
              - generic [ref=e111]: "02"
              - generic [ref=e112]:
                - strong [ref=e113]: About
                - text: Background, education, and technical skills
              - generic [aria-hidden] [ref=e114]: ↗
          - listitem [ref=e115]:
            - link "03 Contact Send a message or use direct channels" [ref=e116] [cursor=pointer]:
              - /url: /contact
              - generic [ref=e117]: "03"
              - generic [ref=e118]:
                - strong [ref=e119]: Contact
                - text: Send a message or use direct channels
              - generic [aria-hidden] [ref=e120]: ↗
    - contentinfo [ref=e121]:
      - paragraph [ref=e122]: YOR WORLD / Ayush Roy Portfolio
      - paragraph [ref=e123]: Sound off · Explore at your pace
  - alert [ref=e125]
```

# Test source

```ts
  605 |       for (let x = region.left; x < Math.min(viewport.width, region.left + region.width); x += 1) {
  606 |         const offset = (y * image.info.width + x) * image.info.channels;
  607 |         const r = image.data[offset] ?? 0;
  608 |         const g = image.data[offset + 1] ?? 0;
  609 |         const b = image.data[offset + 2] ?? 0;
  610 |         red += r;
  611 |         green += g;
  612 |         blue += b;
  613 |         sampled += 1;
  614 |         if (r >= 190 && g >= 190 && b >= 190) pale += 1;
  615 |       }
  616 |     }
  617 |     return {
  618 |       name: region.name,
  619 |       bounds: region,
  620 |       sampled,
  621 |       meanRGB: sampled ? [red / sampled, green / sampled, blue / sampled].map((value) => Number(value.toFixed(2))) : null,
  622 |       brightNeutralPixels: pale,
  623 |       brightNeutralRatio: sampled ? Number((pale / sampled).toFixed(5)) : 0,
  624 |       classifier: "R, G, B >= 190",
  625 |     };
  626 |   });
  627 |   const cyanFillLight = measured.lights.find((light) => light.name === "Light_CyanFill");
  628 |   expect(cyanFillLight?.found, `${label} records the existing cyan point light`).toBe(true);
  629 |   expect(cyanFillLight?.type, `${label} preserves the source point-light type`).toBe("PointLight");
  630 |   expect(cyanFillLight?.intensity, `${label} records the bounded runtime cyan-light intensity`).toBe(1.6);
  631 |   expect(cyanFillLight?.position, `${label} records the calibrated world position of the cyan light`).toEqual([0, 0.15, -0.65]);
  632 |   const lilacMaterials = Array.from({ length: 7 }, (_, index) => byName.get(`hex_panel_${index + 1}`)?.materials ?? []).flat();
  633 |   const barMaterials = byName.get("lightbar_emissive")?.materials ?? [];
  634 |   expect(lilacMaterials.some((material) => material.name === "Hex_LilacEmissive" && (material.emissiveIntensity ?? 0) >= 1)).toBe(true);
  635 |   expect(lilacPixels.colored, `${label} rendered lilac/pink pixels are present in the seven panel bounds`).toBeGreaterThanOrEqual(viewport.width === 1440 ? 24 : 8);
  636 |   for (const panel of lilacPanelEvidence) {
  637 |     expect(panel.runtimeGeometry?.sides, `${label} ${panel.name} retains its named live six-sided replacement geometry`).toBe(6);
  638 |     expect(panel.runtimeGeometry?.width, `${label} ${panel.name} geometry stays within the authorized width`).toBeLessThanOrEqual(0.22);
  639 |     expect(panel.runtimeGeometry?.height, `${label} ${panel.name} geometry stays within the authorized height`).toBeLessThanOrEqual(0.2);
  640 |     expect(panel.runtimeGeometry?.depth, `${label} ${panel.name} geometry stays within the authorized depth`).toBeLessThanOrEqual(0.015);
  641 |     expect(panel.coloredPixels, `${label} ${panel.name} contributes actual pink/lilac pixels`).toBeGreaterThan(0);
  642 |   }
  643 |   expect(barMaterials.some((material) => material.name === "Lightbar_WarmTask" && material.color?.toLowerCase().startsWith("ff"))).toBe(true);
  644 |   expect(warmPixels.colored, `${label} rendered warm pixels are present in the monitor bar bounds`).toBeGreaterThanOrEqual(viewport.width === 1440 ? 8 : 2);
  645 | 
  646 |   const evidence = {
  647 |     label,
  648 |     screenshot: path.relative(evidenceRoot, screenshotPath),
  649 |     viewport,
  650 |     camera: measured.camera,
  651 |     supports: { headsetStandOnPc: { surfaceNode: "helios-pc", contactDeltaY: headsetSupportDelta } },
  652 |     speakerAssembly: {
  653 |       frozenGlbSha256: "3a02647d24e474c8a2579b0d277cf02a7841212e961c1554f67b6e032e40a307",
  654 |       roots: [leftSpeaker, rightSpeaker].map((speaker) => ({
  655 |         name: speaker.name,
  656 |         worldPosition: speaker.worldPosition,
  657 |         worldBounds: speaker.worldBounds,
  658 |         pixelBounds: speaker.pixelBounds,
  659 |         materials: speaker.materials,
  660 |       })),
  661 |       existingRoundDriverNodes: {
  662 |         left: ["speaker_left_woofer", "speaker_left_tweeter"],
  663 |         right: ["speaker_right_woofer", "speaker_right_tweeter"],
  664 |       },
  665 |       newDriverGeometry: 0,
  666 |       newDriverMaterials: 0,
  667 |       additionalDrawCalls: 0,
  668 |       additionalTriangles: 0,
  669 |       interpretation: "The frozen GLB already contains the round driver meshes. Runtime composition reparents those existing meshes under their matching interaction roots and adds no speaker geometry or materials.",
  670 |     },
  671 |     testPanelScale: measured.testPanelScale,
  672 |     anchors: measured.anchors,
  673 |     occlusionEvidence,
  674 |     occlusionCoverage: {
  675 |       requiredNamedAnchors: required.length,
  676 |       raySampled: occlusionEvidence.filter((item) => item.status === "MEASURED").length,
  677 |       notMeasured: occlusionEvidence.filter((item) => item.status === "NOT_MEASURED").map((item) => item.name),
  678 |       notApplicableSelfOccluders: occlusionEvidence.filter((item) => item.status === "NOT_APPLICABLE").map((item) => item.name),
  679 |     },
  680 |     lights: measured.lights,
  681 |     colorPixels: {
  682 |       lilac: lilacPixels,
  683 |       lilacPanels: lilacPanelEvidence,
  684 |       warmBar: warmPixels,
  685 |       floorFill: floorFillPixels,
  686 |       floorFillThreshold: {
  687 |         minimumCyanRatio: minimumFloorCyanRatio,
  688 |         status: floorClassifierApplies ? "APPLICABLE" : "NOT APPLICABLE; landscape raw frame retained for human review",
  689 |         region: viewport.width === 1440
  690 |           ? "10% by 10% underdesk scene tile at x=45%, y=79%"
  691 |           : viewport.width === 844
  692 |             ? "10% by 10% clear floor sample at x=85%, y=62%; current landscape HUD can hide or color-shift saturated floor pixels, so no automated cyan threshold is applied"
  693 |             : "10% by 10% underdesk scene tile at x=45%, y=64%",
  694 |       },
  695 |       paleWorkstation: paleSurfacePixels,
  696 |     },
  697 |     interpretation: "Projected bounds and the frozen ray sampler provide framing and partial chair/resident occlusion measurements. Uninstrumented anchors remain explicitly NOT_MEASURED; the source packet does not authorize changing SceneIntegrator.ts. This does not replace human recognition review.",
  698 |   };
  699 |   fs.writeFileSync(path.join(measurementDir, `${label}-anchor-visibility.json`), `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  700 |   return evidence;
  701 | }
  702 | 
  703 | async function recordRuntimeSceneState(page: Page, label: string) {
  704 |   const toggle = page.getByTestId("studio-controls-toggle");
> 705 |   const wasOpen = await toggle.getAttribute("aria-expanded") === "true";
      |                                ^ Error: locator.getAttribute: Test timeout of 150000ms exceeded.
  706 |   if (!wasOpen) await toggle.click();
  707 |   const diagnosticsToggle = page.getByTestId("diagnostics-toggle-btn");
  708 |   await diagnosticsToggle.click();
  709 |   const diagnostics = page.getByTestId("world-diagnostics");
  710 |   await expect(diagnostics).toBeVisible();
  711 |   const runtime = JSON.parse((await diagnostics.textContent()) || "{}");
  712 |   const canvas = await page.evaluate(() => {
  713 |     const element = document.querySelector<HTMLCanvasElement>("[data-testid='world-canvas']");
  714 |     if (!element) return null;
  715 |     const rect = element.getBoundingClientRect();
  716 |     const gl = element.getContext("webgl2") ?? element.getContext("webgl");
  717 |     return {
  718 |       width: element.width,
  719 |       height: element.height,
  720 |       rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
  721 |       computed: { display: getComputedStyle(element).display, visibility: getComputedStyle(element).visibility },
  722 |       gl: gl ? { version: gl.getParameter(gl.VERSION), contextLost: gl.isContextLost() } : null,
  723 |       runtimeCamera: element.dataset.preG713RuntimeCamera ? JSON.parse(element.dataset.preG713RuntimeCamera) : null,
  724 |     };
  725 |   });
  726 |   if (evidenceMode) expect(canvas?.runtimeCamera, `${label} records the CameraDirector position and target`).not.toBeNull();
  727 |   const viewport = page.viewportSize();
  728 |   const mobileBudget = (viewport?.width ?? 0) < 900;
  729 |   const budget = mobileBudget ? runtimeBudgets.mobile : runtimeBudgets.desktop;
  730 |   const actual = {
  731 |     renderedTriangles: typeof runtime.renderedTriangles === "number" ? runtime.renderedTriangles : null,
  732 |     renderCalls: typeof runtime.renderCalls === "number" ? runtime.renderCalls : null,
  733 |     renderPixelRatio: typeof runtime.renderPixelRatio === "number" ? runtime.renderPixelRatio : null,
  734 |     qualityTier: typeof runtime.qualityTier === "string" ? runtime.qualityTier : null,
  735 |   };
  736 |   const withinBudget = {
  737 |     renderedTriangles: actual.renderedTriangles !== null && actual.renderedTriangles <= budget.renderedTriangles,
  738 |     renderCalls: actual.renderCalls !== null && actual.renderCalls <= budget.renderCalls,
  739 |   };
  740 |   const record = {
  741 |     label,
  742 |     viewport,
  743 |     canvas,
  744 |     runtime: actual,
  745 |     runtimeSnapshot: runtime,
  746 |     budget: { deviceClass: mobileBudget ? "mobile-emulated" : "desktop-browser", ...budget },
  747 |     budgetAssessment: {
  748 |       status: Object.values(withinBudget).every(Boolean) ? "PASS" : "FAIL",
  749 |       withinBudget,
  750 |       limitation: "Playwright viewport emulation records renderer diagnostics; it does not establish physical-device performance or thermal behavior.",
  751 |     },
  752 |   };
  753 |   fs.writeFileSync(path.join(measurementDir, `${label}-runtime-scene.json`), `${JSON.stringify(record, null, 2)}\n`, "utf8");
  754 |   await diagnosticsToggle.click();
  755 |   if (!wasOpen) await toggle.click();
  756 | }
  757 | 
  758 | test.describe("PRE-G7-22 reference composition and compact mobile controls", () => {
  759 |   test("captures the opening desktop room beside the user reference", async ({ page }) => {
  760 |     test.setTimeout(150_000);
  761 |     recordErrors(page, "desktop-composition");
  762 |     const viewport = { width: 1440, height: 900 };
  763 |     const { camera } = await enterHome(page, viewport);
  764 |     expect(camera).toBe("home-desktop");
  765 |     const browser = await browserArtifactLabel(page);
  766 |     const browserEnvironment = await recordBrowserEnvironment(page, browser);
  767 |     const cameraProbePixel = browserEnvironment.cameraProbePixel as [number, number] | null;
  768 |     await recordRuntimeSceneState(page, `desktop-1440x900-${browser}`);
  769 | 
  770 |     const existingControlCount = await page.locator(
  771 |       '[data-testid="fullscreen-studio-dialog"] button, [data-testid="fullscreen-studio-dialog"] a[href], [data-testid="fullscreen-studio-dialog"] select',
  772 |     ).count();
  773 |     expect(existingControlCount - 1).toBe(25);
  774 |     const screenshotName = `studio-reference-desktop-1440x900-${browser}.png`;
  775 |     const renderMeasurement = await captureAndCompose(page, screenshotName, viewport);
  776 |     if (evidenceMode) {
  777 |       await recordVisualAnchorEvidence(
  778 |         page,
  779 |         path.join(screenshotDir, screenshotName),
  780 |         viewport,
  781 |         `desktop-1440x900-${browser}`,
  782 |         cameraProbePixel,
  783 |       );
  784 |     }
  785 |     expect(renderMeasurement.distinctPixelColors, "desktop GLB frame is visibly rendered").toBeGreaterThan(16);
  786 |     const chrome = await measureFixedChrome(page, viewport, `desktop-1440x900-${browser}`);
  787 |     expect(chrome.coveredRatio, "closed desktop chrome leaves the room unobscured").toBeLessThanOrEqual(0.2);
  788 | 
  789 |     const toggle = page.getByTestId("studio-controls-toggle");
  790 |     const diagnostics = page.getByTestId("diagnostics-toggle-btn");
  791 |     await toggle.click();
  792 |     await diagnostics.click();
  793 |     await expect(page.getByTestId("world-diagnostics")).toBeVisible();
  794 |     await page.keyboard.press("Escape");
  795 |     await expect(page.getByTestId("world-diagnostics")).toBeHidden();
  796 |     await expect(diagnostics).toBeFocused();
  797 |     await page.keyboard.press("Escape");
  798 |     await expect(toggle).toHaveAttribute("aria-expanded", "false");
  799 |     await expect(toggle).toBeFocused();
  800 | 
  801 |     // Click the center of the visible camera mesh using the build-gated
  802 |     // source-bound projection; a fixed screen coordinate becomes stale when
  803 |     // the permitted home-camera framing changes.
  804 |     const cameraClick = await page.evaluate(() => {
  805 |       const diagnosticWindow = window as Window & {
```