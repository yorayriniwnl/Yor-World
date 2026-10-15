# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: world-reference-composition.spec.ts >> PRE-G7-22 reference composition and compact mobile controls >> captures the opening desktop room beside the user reference
- Location: tests\e2e\world-reference-composition.spec.ts:758:3

# Error details

```
Error: desktop-1440x900-edge speaker_right_cabinet has visible surface samples

expect(received).toBeGreaterThan(expected)

Expected: > 0
Received:   0
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
  380 |     expect(Math.abs(foot.contactDeltaY), `${label} ${foot.name} contacts shelf within 1mm`).toBeLessThanOrEqual(0.001);
  381 |     expect(foot.insideFootprintWithMargin, `${label} ${foot.name} footprint has at least 5mm shelf edge margin`).toBe(true);
  382 |   }
  383 |   const pc = byName.get("helios-pc");
  384 |   const headsetStand = byName.get("headset-stand-code-native");
  385 |   expect(pc?.worldBounds && headsetStand?.worldBounds, `${label} headset stand and PC support bounds are recorded`).toBeTruthy();
  386 |   const headsetSupportDelta = headsetStand!.worldBounds!.min[1]! - pc!.worldBounds!.max[1]!;
  387 |   expect(Math.abs(headsetSupportDelta), `${label} headset stand base rests on the existing PC within 1mm`).toBeLessThanOrEqual(0.001);
  388 |   for (const name of required) {
  389 |     const anchor = byName.get(name);
  390 |     expect(anchor?.found, `${label} GLB/code-native anchor ${name} exists`).toBe(true);
  391 |     expect(anchor?.pixelBounds, `${label} ${name} has projected bounds`).not.toBeNull();
  392 |     const bounds = anchor!.pixelBounds!;
  393 |     expect(bounds.left, `${label} ${name} is inside the left edge`).toBeGreaterThanOrEqual(0);
  394 |     expect(bounds.top, `${label} ${name} is inside the top edge`).toBeGreaterThanOrEqual(0);
  395 |     expect(bounds.right, `${label} ${name} is inside the right edge`).toBeLessThanOrEqual(viewport.width);
  396 |     expect(bounds.bottom, `${label} ${name} is inside the bottom edge`).toBeLessThanOrEqual(viewport.height);
  397 |     expect(bounds.visibleAreaRatio, `${label} ${name} is not clipped`).toBeGreaterThanOrEqual(0.98);
  398 |   }
  399 |   for (const name of ["chair-root", "chair-base", "resident"]) {
  400 |     const actor = byName.get(name);
  401 |     expect(actor?.found, `${label} named ${name} is present for occlusion measurements`).toBe(true);
  402 |     expect(actor?.pixelBounds, `${label} ${name} has measurable bounds`).not.toBeNull();
  403 |     expect(actor!.pixelBounds!.left, `${label} ${name} stays inside the left edge`).toBeGreaterThanOrEqual(0);
  404 |     expect(actor!.pixelBounds!.top, `${label} ${name} stays inside the top edge`).toBeGreaterThanOrEqual(0);
  405 |     expect(actor!.pixelBounds!.right, `${label} ${name} stays inside the right edge`).toBeLessThanOrEqual(viewport.width);
  406 |     expect(actor!.pixelBounds!.bottom, `${label} ${name} stays inside the bottom edge`).toBeLessThanOrEqual(viewport.height);
  407 |     expect(actor!.pixelBounds!.visibleAreaRatio, `${label} ${name} remains fully within the projected viewport`).toBeGreaterThanOrEqual(0.98);
  408 |   }
  409 | 
  410 |   const panelBounds = Array.from({ length: 7 }, (_, index) => byName.get(`hex_panel_${index + 1}`)!.pixelBounds!);
  411 |   const hexCluster = panelBounds.reduce((bounds, panel) => ({
  412 |     left: Math.min(bounds.left, panel.left),
  413 |     right: Math.max(bounds.right, panel.right),
  414 |     top: Math.min(bounds.top, panel.top),
  415 |     bottom: Math.max(bounds.bottom, panel.bottom),
  416 |   }), { left: Number.POSITIVE_INFINITY, right: Number.NEGATIVE_INFINITY, top: Number.POSITIVE_INFINITY, bottom: Number.NEGATIVE_INFINITY });
  417 |   for (let first = 0; first < panelBounds.length; first += 1) {
  418 |     for (let second = first + 1; second < panelBounds.length; second += 1) {
  419 |       const a = panelBounds[first]!;
  420 |       const b = panelBounds[second]!;
  421 |       const overlapWidth = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  422 |       const overlapHeight = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  423 |       expect(overlapWidth * overlapHeight, `${label} hex panels ${first + 1} and ${second + 1} have separate projected panels`).toBeLessThanOrEqual(1);
  424 |     }
  425 |   }
  426 |   const leftSpeaker = byName.get("speaker_left_cabinet")!;
  427 |   const rightSpeaker = byName.get("speaker_right_cabinet")!;
  428 |   const minimumSpeakerPixels = viewport.width >= 1200 ? 24 : viewport.width === 390 ? 16 : 12;
  429 |   expect(leftSpeaker.worldPosition?.[1], `${label} left round speaker shares the matched desk height`).toBeCloseTo(rightSpeaker.worldPosition?.[1] ?? Number.NaN, 4);
  430 |   expect(leftSpeaker.pixelBounds!.width, `${label} left speaker has a rendered desktop-scale silhouette`).toBeGreaterThanOrEqual(minimumSpeakerPixels);
  431 |   expect(rightSpeaker.pixelBounds!.width, `${label} right speaker has a rendered desktop-scale silhouette`).toBeGreaterThanOrEqual(minimumSpeakerPixels);
  432 |   expect(leftSpeaker.pixelBounds!.height, `${label} left speaker shows its paired round-driver assembly`).toBeGreaterThanOrEqual(minimumSpeakerPixels);
  433 |   expect(rightSpeaker.pixelBounds!.height, `${label} right speaker shows its paired round-driver assembly`).toBeGreaterThanOrEqual(minimumSpeakerPixels);
  434 | 
  435 |   if (viewport.width === 1440 && viewport.height === 900) {
  436 |     expect(byName.get("monitor")!.pixelBounds!.width, `${label} monitor is at least 28% of desktop width`).toBeGreaterThanOrEqual(403);
  437 |     expect(hexCluster.right - hexCluster.left, `${label} distinct hex cluster is at least 25% of desktop width`).toBeGreaterThanOrEqual(360);
  438 |     expect(byName.get("desk")!.pixelBounds!.width, `${label} desk remains at least 55% of desktop width`).toBeGreaterThanOrEqual(792);
  439 |   }
  440 |   if (viewport.width === 390 && viewport.height === 844) {
  441 |     expect(byName.get("monitor")!.pixelBounds!.width, `${label} monitor is at least 40% of phone width`).toBeGreaterThanOrEqual(156);
  442 |     expect(hexCluster.right - hexCluster.left, `${label} seven-panel cluster is recognizable across the phone viewport`).toBeGreaterThanOrEqual(115);
  443 |     expect(byName.get("ai-real-camera")!.pixelBounds!.width, `${label} shelf camera silhouette is large enough to inspect`).toBeGreaterThanOrEqual(28);
  444 |     expect(byName.get("peg_controller_body")!.pixelBounds!.width, `${label} controller silhouette is large enough to inspect`).toBeGreaterThanOrEqual(24);
  445 |   }
  446 | 
  447 |   if (measured.testPanelScale !== null) {
  448 |     for (let index = 1; index <= 7; index += 1) {
  449 |       expect(byName.get(`hex_panel_${index}`)?.worldScale?.[0]).toBeCloseTo(measured.testPanelScale, 4);
  450 |     }
  451 |     const proof = {
  452 |       label,
  453 |       screenshot: path.relative(evidenceRoot, screenshotPath),
  454 |       viewport,
  455 |       camera: measured.camera,
  456 |       testPanelScale: measured.testPanelScale,
  457 |       anchors: measured.anchors,
  458 |       lights: measured.lights,
  459 |       interpretation: "The temporary panel scale is a test-only source-liveness probe. This view is not final visual-quality evidence.",
  460 |     };
  461 |     fs.writeFileSync(path.join(measurementDir, `${label}-live-source-probe.json`), `${JSON.stringify(proof, null, 2)}\n`, "utf8");
  462 |     return proof;
  463 |   }
  464 | 
  465 |   if (viewport.width === 390 && viewport.height === 844) {
  466 |     expect(byName.get("ai-real-camera")!.pixelBounds!.width, "phone camera silhouette is large enough to inspect").toBeGreaterThanOrEqual(28);
  467 |     expect(byName.get("ai-real-camera")!.pixelBounds!.height, "phone camera silhouette is large enough to inspect").toBeGreaterThanOrEqual(20);
  468 |     expect(byName.get("peg_controller_body")!.pixelBounds!.width, "phone controller silhouette is large enough to inspect").toBeGreaterThanOrEqual(24);
  469 |     expect(byName.get("peg_controller_body")!.pixelBounds!.height, "phone controller silhouette is large enough to inspect").toBeGreaterThanOrEqual(18);
  470 |   }
  471 | 
  472 |   const occlusionNames = [
  473 |     "ai-real-camera", "plants", "monitor", "speaker_left_cabinet", "speaker_right_cabinet",
  474 |     "talks-microphone", "console-code-native", "helios-pc", "peg_controller_body",
  475 |     "headset-stand-code-native", "headset-code-native",
  476 |   ];
  477 |   for (const name of occlusionNames) {
  478 |     const samples = byName.get(name)?.sampledRegionHits;
  479 |     expect(samples && samples.samples > 0, `${label} ${name} has screen-region occlusion samples`).toBe(true);
> 480 |     expect(samples!.target, `${label} ${name} has visible surface samples`).toBeGreaterThan(0);
      |                                                                             ^ Error: desktop-1440x900-edge speaker_right_cabinet has visible surface samples
  481 |     expect(samples!.occluderRatio, `${label} ${name} has measurable chair/resident coverage`).not.toBeNull();
  482 |     expect(samples!.occluderRatio!, `${label} ${name} is not hidden by chair/resident`).toBeLessThanOrEqual(0.1);
  483 |   }
  484 |   const occlusionEvidence = [...required, "chair-root", "chair-base", "resident"].map((name) => {
  485 |     const anchor = byName.get(name);
  486 |     const samples = anchor?.sampledRegionHits;
  487 |     if (["chair-root", "chair-base", "resident"].includes(name)) {
  488 |       return { name, status: "NOT_APPLICABLE", reason: "This named anchor is itself part of the chair/resident occluder set.", pixelBounds: anchor?.pixelBounds ?? null };
  489 |     }
  490 |     return samples
  491 |       ? { name, status: "MEASURED", method: "13x13 projected-anchor ray grid", chairHits: samples.chair, residentHits: samples.resident, targetSamples: samples.targetSamples, occluderRatio: samples.occluderRatio, pixelBounds: anchor?.pixelBounds ?? null }
  492 |       : { name, status: "NOT_MEASURED", reason: "The frozen SceneIntegrator evidence sampler does not ray-sample this anchor; preserve null rather than infer occlusion from its AABB.", pixelBounds: anchor?.pixelBounds ?? null };
  493 |   });
  494 | 
  495 |   const image = await sharp(screenshotPath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  496 |   const countColor = (anchorNames: string[], predicate: (r: number, g: number, b: number) => boolean) => {
  497 |     let colored = 0;
  498 |     let sampled = 0;
  499 |     for (const name of anchorNames) {
  500 |       const bounds = byName.get(name)?.pixelBounds;
  501 |       if (!bounds) continue;
  502 |       const left = Math.max(0, Math.floor(bounds.left));
  503 |       const top = Math.max(0, Math.floor(bounds.top));
  504 |       const right = Math.min(viewport.width, Math.ceil(bounds.right));
  505 |       const bottom = Math.min(viewport.height, Math.ceil(bounds.bottom));
  506 |       for (let y = top; y < bottom; y += 1) {
  507 |         for (let x = left; x < right; x += 1) {
  508 |           const offset = (y * image.info.width + x) * image.info.channels;
  509 |           const r = image.data[offset] ?? 0;
  510 |           const g = image.data[offset + 1] ?? 0;
  511 |           const b = image.data[offset + 2] ?? 0;
  512 |           sampled += 1;
  513 |           if (predicate(r, g, b)) colored += 1;
  514 |         }
  515 |       }
  516 |     }
  517 |     return { colored, sampled, ratio: sampled ? colored / sampled : 0 };
  518 |   };
  519 |   const lilacPixels = countColor(
  520 |     Array.from({ length: 7 }, (_, index) => `hex_panel_${index + 1}`),
  521 |     (r, g, b) => r > 65 && b > 65 && r > g * 1.12 && b > g * 1.08,
  522 |   );
  523 |   const lilacPanelEvidence = Array.from({ length: 7 }, (_, index) => {
  524 |     const name = `hex_panel_${index + 1}`;
  525 |     const anchor = byName.get(name)!;
  526 |     const bounds = anchor.pixelBounds!;
  527 |     return {
  528 |       name,
  529 |       bounds,
  530 |       runtimeGeometry: anchor.runtimeGeometry,
  531 |       coloredPixels: countColor([name], (r, g, b) => r > 65 && b > 65 && r > g * 1.12 && b > g * 1.08).colored,
  532 |     };
  533 |   });
  534 |   const warmPixels = countColor(["lightbar_emissive"], (r, g, b) => r > 100 && g > 35 && r > g * 1.18 && g > b * 1.15);
  535 |   const floorRegion = viewport.width === 1440
  536 |     ? { name: "desktop-underdesk-cyan-floor", left: Math.round(viewport.width * 0.45), top: Math.round(viewport.height * 0.79), width: Math.round(viewport.width * 0.1), height: Math.round(viewport.height * 0.1) }
  537 |     : viewport.width === 844
  538 |       ? { name: "landscape-floor-classifier-sample", left: Math.round(viewport.width * 0.85), top: Math.round(viewport.height * 0.62), width: Math.round(viewport.width * 0.1), height: Math.round(viewport.height * 0.1) }
  539 |       : { name: "portrait-underdesk-cyan-floor", left: Math.round(viewport.width * 0.45), top: Math.round(viewport.height * 0.64), width: Math.round(viewport.width * 0.1), height: Math.round(viewport.height * 0.1) };
  540 |   const floorRegions = [floorRegion];
  541 |   const floorFillPixels = floorRegions.map((region) => {
  542 |     const left = Math.max(0, region.left);
  543 |     const top = Math.max(0, region.top);
  544 |     const right = Math.min(viewport.width, region.left + region.width);
  545 |     const bottom = Math.min(viewport.height, region.top + region.height);
  546 |     let red = 0;
  547 |     let green = 0;
  548 |     let blue = 0;
  549 |     let cyan = 0;
  550 |     let sampled = 0;
  551 |     for (let y = top; y < bottom; y += 1) {
  552 |       for (let x = left; x < right; x += 1) {
  553 |         const offset = (y * image.info.width + x) * image.info.channels;
  554 |         const r = image.data[offset] ?? 0;
  555 |         const g = image.data[offset + 1] ?? 0;
  556 |         const b = image.data[offset + 2] ?? 0;
  557 |         red += r;
  558 |         green += g;
  559 |         blue += b;
  560 |         sampled += 1;
  561 |         if (g - r >= 8 && b - r >= 14 && g >= 40 && b >= 45) cyan += 1;
  562 |       }
  563 |     }
  564 |     return {
  565 |       name: region.name,
  566 |       bounds: { left, top, right, bottom },
  567 |       sampled,
  568 |       meanRGB: sampled ? [red / sampled, green / sampled, blue / sampled].map((value) => Number(value.toFixed(2))) : null,
  569 |       cyanPixels: cyan,
  570 |       cyanRatio: sampled ? Number((cyan / sampled).toFixed(5)) : 0,
  571 |       classifier: "G-R >= 8, B-R >= 14, G >= 40, B >= 45",
  572 |     };
  573 |   });
  574 |   const minimumFloorCyanRatio = 0.1;
  575 |   const overlapsBounds = (
  576 |     a: { left: number; top: number; right: number; bottom: number },
  577 |     b: { left: number; top: number; right: number; bottom: number },
  578 |   ) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  579 |   const actorBounds = ["chair-root", "resident"].map((name) => ({
  580 |     name,
```