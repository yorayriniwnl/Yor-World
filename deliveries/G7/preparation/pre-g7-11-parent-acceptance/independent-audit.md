# PRE-G7-11 independent audit

**Final audited delivery commit:** `aeebec04e2097d017e0b531a19cdddc377264604`  
**Source commit:** `cfdc744f69cd257c8ac0cbaad78b8805c48f20d5`  
**App source tree:** `915c26f4b9a1fa075614ea64959750f9e486187c`

## Result

**PASS for the assigned fullscreen mechanics, fallback contrast correction, source-to-domain mirror binding, and committed evidence package.** The final delta contains only six files under `deliveries/G7/preparation/maker-evidence/pre-g7-11/`: the report, checksum list, generator, verifier, and two correction-r1 evidence files.

- All 153 checksum entries match exact blobs in the audited commit, with no duplicate entries.
- The report gives the compact viewport result as 9 scroll-owned controls plus 16 already-visible controls, for 25 total, and discloses the mobile room-visibility and reference-fidelity limits.
- The generator's default inventory covers the complete 153-entry package; unstaged blobs are read from the resolved target commit. The verifier's explicit revision mode reads the checksum list and all payloads from that exact commit.
- The canonical app and local domain mirror did not change in the correction delta. The app tree remains `915c26f4b9a1fa075614ea64959750f9e486187c`.

The initial source/domain audit found the assigned four-file app scope, fullscreen/focus behavior, responsive stage geometry and control reachability, fallback contrast, domain mirror hashes, README, manifest, and CandidateX boundary consistent with the packet. The domain folder contains 115 mirrored source files and two tests; the URL override is the recorded `https://yorayriniwnl.in` value. The delivery remains local and is not a deployment.

## Open limits

- Default unit suite: **FAIL, 315/316**, with an unchanged boundary test exceeding its 5-second timeout. The diagnostic 15-second run passed 316/316; that does not change the default-command failure.
- Default integration suite: **FAIL, 285/286**, with an unchanged canonical-fixture test exceeding its 60-second timeout. An isolated diagnostic run passed 1/1 with a 180-second limit; that does not change the default-command failure.
- Mobile controls are geometrically reachable, but the HUD covers much of the room. Useful room discovery and full reference fidelity remain unestablished.
- Full keyboard traversal, overlapping hit targets, and expanded Room Controls/monitor dialog coverage remain unestablished.
- Physical-device and assistive-technology matrices, deployment, provider state, monitoring, rollback, and G7 acceptance were not performed.

**Auditor did not run tests, builds, browser/device checks, or deployment.** No independent acceptance was issued by the auditor.
