# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: world-reference-composition.spec.ts >> PRE-G7-22 reference composition and compact mobile controls >> starts compact on a fresh phone-sized view and preserves every action with Diagnostics-first Escape
- Location: tests\e2e\world-reference-composition.spec.ts:829:3

# Error details

```
Error: mobile-390x844-edge has cyan fill in the measured underdesk floor ROI outside chair/resident bounds

expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 0.1
Received:    0
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
                  - region "Interactive 3D Studio" [ref=e46]:
                    - button "Open studio controls" [active] [ref=e47] [cursor=pointer]: Studio controls
                    - generic "3D Room view showing resident, workstation, and moving chair" [ref=e48]
                  - navigation "Portfolio destinations and studio exit" [ref=e49]:
                    - link "Projects" [ref=e50] [cursor=pointer]:
                      - /url: /projects
                    - link "About" [ref=e51] [cursor=pointer]:
                      - /url: /about
                    - link "Contact" [ref=e52] [cursor=pointer]:
                      - /url: /contact
                    - link "Résumé" [ref=e53] [cursor=pointer]:
                      - /url: /resume
                    - button "Exit Studio" [ref=e54] [cursor=pointer]
          - paragraph [ref=e55]: Four verified project case studies. Explore the studio whenever you like.
        - complementary "Studio status" [ref=e56]:
          - generic [ref=e57]:
            - generic [ref=e58]: YOR / 01
            - generic [ref=e59]: In the making
          - generic [ref=e62]: "Y"
          - generic [ref=e66]:
            - paragraph [ref=e67]:
              - text: A space for
              - strong [ref=e68]: curiosity.
            - generic [ref=e69]: Interactive studioPortfolio pages below
      - region [ref=e70]:
        - generic [ref=e71]:
          - paragraph [ref=e72]: Take a look around
          - heading "Start anywhere." [level=2] [ref=e73]
        - list [ref=e74]:
          - listitem [ref=e75]:
            - link "01 Projects Verified software case studies" [ref=e76] [cursor=pointer]:
              - /url: /projects
              - generic [ref=e77]: "01"
              - generic [ref=e78]:
                - strong [ref=e79]: Projects
                - text: Verified software case studies
              - generic [aria-hidden] [ref=e80]: ↗
          - listitem [ref=e81]:
            - link "02 About Background, education, and technical skills" [ref=e82] [cursor=pointer]:
              - /url: /about
              - generic [ref=e83]: "02"
              - generic [ref=e84]:
                - strong [ref=e85]: About
                - text: Background, education, and technical skills
              - generic [aria-hidden] [ref=e86]: ↗
          - listitem [ref=e87]:
            - link "03 Contact Send a message or use direct channels" [ref=e88] [cursor=pointer]:
              - /url: /contact
              - generic [ref=e89]: "03"
              - generic [ref=e90]:
                - strong [ref=e91]: Contact
                - text: Send a message or use direct channels
              - generic [aria-hidden] [ref=e92]: ↗
    - contentinfo [ref=e93]:
      - paragraph [ref=e94]: YOR WORLD / Ayush Roy Portfolio
      - paragraph [ref=e95]: Sound off · Explore at your pace
  - alert [ref=e97]
```

# Test source

```ts
  493 |       : { name, status: "NOT_MEASURED", reason: "The frozen SceneIntegrator evidence sampler does not ray-sample this anchor; preserve null rather than infer occlusion from its AABB.", pixelBounds: anchor?.pixelBounds ?? null };
  494 |   });
  495 | 
  496 |   const image = await sharp(screenshotPath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  497 |   const countColor = (anchorNames: string[], predicate: (r: number, g: number, b: number) => boolean) => {
  498 |     let colored = 0;
  499 |     let sampled = 0;
  500 |     for (const name of anchorNames) {
  501 |       const bounds = byName.get(name)?.pixelBounds;
  502 |       if (!bounds) continue;
  503 |       const left = Math.max(0, Math.floor(bounds.left));
  504 |       const top = Math.max(0, Math.floor(bounds.top));
  505 |       const right = Math.min(viewport.width, Math.ceil(bounds.right));
  506 |       const bottom = Math.min(viewport.height, Math.ceil(bounds.bottom));
  507 |       for (let y = top; y < bottom; y += 1) {
  508 |         for (let x = left; x < right; x += 1) {
  509 |           const offset = (y * image.info.width + x) * image.info.channels;
  510 |           const r = image.data[offset] ?? 0;
  511 |           const g = image.data[offset + 1] ?? 0;
  512 |           const b = image.data[offset + 2] ?? 0;
  513 |           sampled += 1;
  514 |           if (predicate(r, g, b)) colored += 1;
  515 |         }
  516 |       }
  517 |     }
  518 |     return { colored, sampled, ratio: sampled ? colored / sampled : 0 };
  519 |   };
  520 |   const lilacPixels = countColor(
  521 |     Array.from({ length: 7 }, (_, index) => `hex_panel_${index + 1}`),
  522 |     (r, g, b) => r > 65 && b > 65 && r > g * 1.12 && b > g * 1.08,
  523 |   );
  524 |   const lilacPanelEvidence = Array.from({ length: 7 }, (_, index) => {
  525 |     const name = `hex_panel_${index + 1}`;
  526 |     const anchor = byName.get(name)!;
  527 |     const bounds = anchor.pixelBounds!;
  528 |     return {
  529 |       name,
  530 |       bounds,
  531 |       runtimeGeometry: anchor.runtimeGeometry,
  532 |       coloredPixels: countColor([name], (r, g, b) => r > 65 && b > 65 && r > g * 1.12 && b > g * 1.08).colored,
  533 |     };
  534 |   });
  535 |   const warmPixels = countColor(["lightbar_emissive"], (r, g, b) => r > 100 && g > 35 && r > g * 1.18 && g > b * 1.15);
  536 |   const floorRegion = viewport.width === 1440
  537 |     ? { name: "desktop-underdesk-cyan-floor", left: Math.round(viewport.width * 0.45), top: Math.round(viewport.height * 0.79), width: Math.round(viewport.width * 0.1), height: Math.round(viewport.height * 0.1) }
  538 |     : viewport.width === 844
  539 |       ? { name: "landscape-floor-classifier-sample", left: Math.round(viewport.width * 0.85), top: Math.round(viewport.height * 0.62), width: Math.round(viewport.width * 0.1), height: Math.round(viewport.height * 0.1) }
  540 |       : { name: "portrait-underdesk-cyan-floor", left: Math.round(viewport.width * 0.45), top: Math.round(viewport.height * 0.64), width: Math.round(viewport.width * 0.1), height: Math.round(viewport.height * 0.1) };
  541 |   const floorRegions = [floorRegion];
  542 |   const floorFillPixels = floorRegions.map((region) => {
  543 |     const left = Math.max(0, region.left);
  544 |     const top = Math.max(0, region.top);
  545 |     const right = Math.min(viewport.width, region.left + region.width);
  546 |     const bottom = Math.min(viewport.height, region.top + region.height);
  547 |     let red = 0;
  548 |     let green = 0;
  549 |     let blue = 0;
  550 |     let cyan = 0;
  551 |     let sampled = 0;
  552 |     for (let y = top; y < bottom; y += 1) {
  553 |       for (let x = left; x < right; x += 1) {
  554 |         const offset = (y * image.info.width + x) * image.info.channels;
  555 |         const r = image.data[offset] ?? 0;
  556 |         const g = image.data[offset + 1] ?? 0;
  557 |         const b = image.data[offset + 2] ?? 0;
  558 |         red += r;
  559 |         green += g;
  560 |         blue += b;
  561 |         sampled += 1;
  562 |         if (g - r >= 8 && b - r >= 14 && g >= 40 && b >= 45) cyan += 1;
  563 |       }
  564 |     }
  565 |     return {
  566 |       name: region.name,
  567 |       bounds: { left, top, right, bottom },
  568 |       sampled,
  569 |       meanRGB: sampled ? [red / sampled, green / sampled, blue / sampled].map((value) => Number(value.toFixed(2))) : null,
  570 |       cyanPixels: cyan,
  571 |       cyanRatio: sampled ? Number((cyan / sampled).toFixed(5)) : 0,
  572 |       classifier: "G-R >= 8, B-R >= 14, G >= 40, B >= 45",
  573 |     };
  574 |   });
  575 |   const minimumFloorCyanRatio = 0.1;
  576 |   const overlapsBounds = (
  577 |     a: { left: number; top: number; right: number; bottom: number },
  578 |     b: { left: number; top: number; right: number; bottom: number },
  579 |   ) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  580 |   const actorBounds = ["chair-root", "resident"].map((name) => ({
  581 |     name,
  582 |     bounds: byName.get(name)?.pixelBounds,
  583 |   }));
  584 |   for (const actor of actorBounds) {
  585 |     expect(actor.bounds, `${label} ${actor.name} bounds are available to exclude actor pixels from floor evidence`).not.toBeNull();
  586 |   }
  587 |   const exposedFloorRegions = floorFillPixels.filter((region) => actorBounds.every((actor) =>
  588 |     !overlapsBounds(region.bounds, actor.bounds!),
  589 |   ));
  590 |   expect(exposedFloorRegions.length, `${label} floor-color ROI is outside chair/resident projected bounds`).toBeGreaterThan(0);
  591 |   const floorClassifierApplies = !(viewport.width === 844 && viewport.height === 390);
  592 |   if (floorClassifierApplies) {
> 593 |     expect(exposedFloorRegions[0]!.cyanRatio, `${label} has cyan fill in the measured underdesk floor ROI outside chair/resident bounds`).toBeGreaterThanOrEqual(minimumFloorCyanRatio);
      |                                                                                                                                           ^ Error: mobile-390x844-edge has cyan fill in the measured underdesk floor ROI outside chair/resident bounds
  594 |   }
  595 |   const paleSurfaceRegions = viewport.height > viewport.width
  596 |     ? [{ name: "portrait-workstation-left-tabletop", left: Math.round(viewport.width * 0.12), top: Math.round(viewport.height * 0.51), width: Math.round(viewport.width * 0.18), height: Math.max(1, Math.round(viewport.height * 0.04)) }]
  597 |     : [{ name: "landscape-workstation-left-tabletop", left: Math.round(viewport.width * 0.35), top: Math.round(viewport.height * 0.5), width: Math.round(viewport.width * 0.14), height: Math.max(1, Math.round(viewport.height * 0.08)) }];
  598 |   const paleSurfacePixels = paleSurfaceRegions.map((region) => {
  599 |     let red = 0;
  600 |     let green = 0;
  601 |     let blue = 0;
  602 |     let pale = 0;
  603 |     let sampled = 0;
  604 |     for (let y = region.top; y < Math.min(viewport.height, region.top + region.height); y += 1) {
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
```