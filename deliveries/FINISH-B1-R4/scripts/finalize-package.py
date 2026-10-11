import hashlib,json,pathlib,struct,subprocess
OUT=pathlib.Path(__file__).resolve().parents[1];ROOT=OUT.parents[1]
def load(p):return json.loads((OUT/p).read_text())
def write(p,v):(OUT/p).write_text(json.dumps(v,indent=2)+'\n',encoding='utf-8')
def glb(p):
    b=(OUT/p).read_bytes();n=struct.unpack_from('<I',b,12)[0];return json.loads(b[20:20+n])
old=glb('inputs/r3/assets/room.glb');new=glb('assets/room.glb');i=next(i for i,m in enumerate(old['materials']) if m['name']=='PC_TemperedGlass');assert old['materials'][:i]+old['materials'][i+1:]==new['materials'][:i]+new['materials'][i+1:]
assigned=[]
for ni,n in enumerate(new['nodes']):
    if 'mesh' not in n:continue
    for pi,p in enumerate(new['meshes'][n['mesh']]['primitives']):
        if p.get('material')==i:assigned.append(dict(nodeIndex=ni,nodeName=n['name'],meshIndex=n['mesh'],primitiveIndex=pi,primitiveExactR3=p==old['meshes'][n['mesh']]['primitives'][pi]))
assert len(assigned)==1 and assigned[0]['primitiveExactR3']
write('evidence/final-material-inspection.json',dict(status='PASS',roomSHA256=hashlib.sha256((OUT/'assets/room.glb').read_bytes()).hexdigest(),glassIndex=i,before=old['materials'][i],after=new['materials'][i],changedFields={'alphaMode':['ABSENT','BLEND'],'baseColorFactor[3]':[1,.18],'KHR_materials_transmission':[old['materials'][i]['extensions']['KHR_materials_transmission'],'REMOVED'],'KHR_materials_ior':[old['materials'][i]['extensions']['KHR_materials_ior'],'REMOVED']},assignedGLBPrimitives=assigned,nativeAuthoredComponents=['pc_glass_side_panel','window_glass'],otherMaterialsExact=True,unusedExtensionDeclarationsRemoved=['KHR_materials_transmission','KHR_materials_ior'],nativeIORRetainedButExporterOmitsInactiveIOR=True,noTransmissionMaterialInFinalGLB=not any('KHR_materials_transmission' in m.get('extensions',{}) for m in new['materials'])))
b=load('evidence/browser-results.json');budget=load('evidence/final-budgets.json');lineage=load('evidence/final-lineage.json');versions=load('evidence/tool-versions.json')
issues=[dict(id='DRAWS',status='PASS LOCAL',finding='103 desktop / 75 mobile, both raw and intercepted, no transmission pass.',evidence='evidence/browser-results.json'),dict(id='GEOMETRY-VISIBILITY',status='PASS LOCAL MECHANICAL; REVIEW PENDING',finding='PC depth/backplate and window opening visible in matched views. Glass geometry exact. Aesthetic acceptance belongs to independent reviewer.',evidence='captures/R4/'),dict(id='GLASS-REFLECTIONS',status='NOT PROVEN',finding='Glossy alpha glass has no environment reflection image or refraction. Existing lights produce limited glints; captures do not prove reference-grade reflections.',evidence='captures/R4/pc-glass-outside/'),dict(id='FULL-REFERENCE',status='FAIL / OPEN',finding='Inherited full-room rendering remains substantially darker, simpler and less detailed than main reference. No broader art acceptance claimed.',evidence='captures/R4/desktop-home/'),dict(id='DOOR-CAMERA',status='OPEN / NOT RUN',finding='FINISH-20 positive-Y sweep and production door-transform ownership unresolved; outside packet scope.'),dict(id='PRODUCTION-DEVICES-G7',status='NOT RUN',finding='No canonical runtime, physical mobile/Safari/thermal/network/profile or provider proof.'),dict(id='EXTERNAL-GPT2',status='NOT RUN',finding='Local Codex maker only. No independent external review or Parent acceptance supplied.'),dict(id='SCOPE-LINEAGE',status='PASS',finding='Only glass material + three mesh replacements + one backplate; exact unchanged records, patch and 72 sealed checkpoint files.',evidence='evidence/final-lineage.json')]
write('issue-matrix.json',dict(candidate='FINISH-B1-R4 amended R1',makerAcceptance=False,issues=issues))
table=[]
for variant in ['R3','material-only','R4']:
    for m in b['measurements']:
        if m['variant']==variant and m.get('limit'):table.append(f"| {variant} | {m['key']} | {m['rendererInfo']['calls']} | {m['byPass'].get('main',0)} | {m['byPass'].get('transmission',0)} | {m['rendererInfo']['triangles']} |")
budgetTable=[]
for p in budget['profiles']:
    a=p['actual'];budgetTable.append(f"| {p['profile']} | {a['allDeliveredUniqueTextureAssetGPUBytesEstimate']} | {a['localMedianMs']:.3f} | {a['localP95Ms']:.3f} | PASS LOCAL |")
report=f'''# FINISH-B1-R4 — FINISH-25 plus R1 maker return

**Reviewable bounded candidate; no maker acceptance.** Local structural, lineage, replay, call and asset-budget checks PASS. PC/window occlusion is corrected within the amendment. Full reference fidelity remains **FAIL / OPEN** and glass aesthetic/reflection acceptance is pending independent review. Door/camera, production ownership, devices and external review remain open.

## Exact inputs and scope

- R3 base commit `1753b9278c4537b5377c3893172b2a0f26d13b10`; full tree `9759ac9879bcc9489770b7c5784ead2f022157b0`; R3 subtree `0bc042af5add583314a7e0713c6db8793f5ca18b`.
- FINISH-25 packet `105d79b1d4d3d36064a933fa745e3ca43a35a8cf`; R1 authorization `b33631a9bcbd74cfca9e8f2495140a5eee322a9a`. Read named frozen contract, art §7, reference/index/manifest and FINISH-20 report directly. Raw receipts: `evidence/input-hashes.json` (26 commit/path/hash entries). R1 packet copy: `inputs/finish25-r1/`.
- Only this fresh delivery root was written. R3 and earlier roots, accepted contracts, canonical `app/` and status/hub files were not edited. Canonical app tree read as `42ea29ec235225046a75959eb19eb386ac2f821d`. Shared branch changes were made by other work; maker commits through a separate worktree.
- Local Codex maker execution. No Gemini production or GPT Plus #2 review is claimed.

## Correction and exact geometry limits

`PC_TemperedGlass` uses `alphaMode=BLEND`, alpha .18 and zero transmission. Removed the transmission/IOR export extensions and unused declarations. Original RGB, metallic .05, roughness .08 and double-sided setting remain exact. Native IOR 1.52 remains an inactive shader input; Blender omits its extension here. Native/source fields agree exactly; actual material export agrees with production within 1e-7. Every other material is exact.

The single GLB material primitive remains on `StaticBatch__Room_Root__PC_TemperedGlass` (node 201, mesh 74). Authored components are `pc_glass_side_panel` and `window_glass`, joined into that static batch with their identity proxies retained; their vertices/UV/bindings remain exact. Final inspection: `evidence/final-material-inspection.json`; native/material parity: `evidence/native-source-export-parity.json`.

| Authorized component | Before → after triangles | Delta | Implementation |
| --- | --- | --- | --- |
| `pc_chassis_frame` | 12 → 60 | +48 | Five .012-thick opaque shell boxes, open at min-X; same identity/parent/TRS/material/exact outer bounds. |
| `pc_internal_backplate` | 0 → 12 | +12 | Sole new static node under `helios-pc`, existing charcoal material; center (1.155,1,-1.15), dimensions (.008,.38,.38), inside original case. |
| Left wall component in existing static batch | 12 → 48 | +36 | Four strips around authorized aperture; other original wall faces/vertices/UVs/shading exact. |
| `window_frame` | 12 → 48 | +36 | Four border strips; identity/parent/TRS/material/exact outer bounds retained. |

Total **+132 triangles**, **one added opaque call**. All original node identities/TRS/hierarchy are exact except the one new child reference. Fan/LED hooks, spin axis, glass, blinds, lights, door/cameras, animations, skins, other props remain exact. Native inventories and reopened saved source: `evidence/native-geometry-diff.json`. Production primitive/full-record proof: `evidence/final-lineage.json`.

## Source and export lineage

`source.patch` replays byte-exactly from the pinned R3 environment builder. Final authoring source is `source/blender/scripts/build-environment.py`. The replay recipe opens exact R3 native source, uses the patched authoring geometry recipes, corrects glass, saves/reopens the native inventory and actually exports the room through Blender. `export-final-room.py` then imports only the authorized native-exported mesh deltas into the original R3 GLB records. This preserves every original binary byte as an exact prefix, all original accessors/buffer views, unchanged nodes/meshes/materials and unrelated wall attributes/indices. It avoids changing frozen geometry through a whole-scene exporter reorder.

Room asset: `assets/room.glb`, SHA-256 `{hashlib.sha256((OUT/'assets/room.glb').read_bytes()).hexdigest()}`, {len((OUT/'assets/room.glb').read_bytes())} bytes. Native source: `assets/source/room.blend`. The four other GLBs and two PNGs are raw R3 copies; all six byte-identical. The full eight-file original production universe is checked against Git, not a guessed list.

Fresh repeated native room GLB and merged production room GLB are byte-identical. Native .blend containers are checked through exact saved/reopened semantic inventories; binary save timestamp determinism is not claimed. Final replay proof: `evidence/final-export-reproducibility.json`.

## Raw renderer measurements

| Variant | Profile | Raw calls | Main | Transmission | Rendered triangles |
| --- | --- | --- | --- | --- | --- |
{chr(10).join(table)}

Final limits: desktop ≤120, mobile ≤80. Final raw calls equal intercepted calls, frame delta is one, all final calls are main pass. Receipts retain per-object material flags, raw stack frames and owner attribution. Both final home profiles load all five GLBs, including original on-demand effects; there is no reduced-asset budget profile.

Exact pinned R3 harness HTML with asset URL remap only, Three {versions['three']}, Playwright {versions['playwright']}, Chromium {versions['browser']}. Desktop 1920×1080 / mobile 720×1280, DPR1, ACES exposure .85, sRGB, original cameras/lights. Browser evidence includes exact camera/lights and five response-body SHA hashes per variant. Matched stills explicitly use coding_idle at t=0 in all variants. Browser command `node deliveries/FINISH-B1-R4/scripts/verify-browser.mjs`: exit0; `evidence/browser-run.log`, `evidence/browser-results.json`.

## Capture observations and limits

21 actual canvas PNGs: seven views each for R3, sealed material-only and amended R4. Each view has matched camera, DPR, exposure, lights, renderer and animation state. Desktop/mobile plus PC outside/inside and window inside/outside are included. Hashes/dimensions/settings and loaded response hashes reverified by `evidence/capture-reverification.json`.

- **PC depth:** exterior base view now shows the recessed charcoal backplate, shell depth, unchanged LED, pane edge and tint instead of the original opaque slab. The normal PC outside/inside views retain the original large cyan on-demand network plane; it obscures some interior detail. One clearly labeled supplemental `pc-glass-outside-base` view hides only `Project_Effects_Root` equally in all three variants. It is not a budget or full-scene acceptance view.
- **Window:** both sides now show the authorized opening/frame and unchanged blinds; outside view sees the room/resident through the pane. Interior view has limited light glint. With frozen lighting and no exterior/environment, these views do not prove reference-grade reflections, daylight, exterior art or blind interaction presets.
- **Reference fidelity:** full-room composition/lighting remains visibly darker and simpler than `references/images/main-reference.png`. The existing flat props/resident and underexposed frame do not establish overall art acceptance. No lighting, unrelated geometry, environment/reflection image or camera adjustment was authorized here. Any broader visual correction needs a separate Parent packet specifying reference composition/lighting and detailed art bounds. Independent review must decide whether this bounded alpha glass appearance is sufficient; the maker does not sign it off.

## Relevant budgets

File caps PASS: room {budget['assets'][-1]['bytes']}≤1,500,000; resident 579,596≤800,000; fixture84,816≤524,288. Essential GLBs {budget['essentialGLBBytes']:,} bytes fit mobile3MiB/desktop6MiB. All delivered GLBs+late PNG transfer bytes {budget['allDeliveredTransferBytes']:,} fit mobile7MiB/desktop14MiB. Unique delivered texture bytes {budget['uniqueTextureBytes']:,}≤1,500,000; embedded/standalone duplicate monitor image deduplicated by raw hash.

| Profile | Asset GPU estimate bytes | Local median ms | Local p95 ms | Result |
| --- | --- | --- | --- | --- |
{chr(10).join(budgetTable)}

GPU estimate includes unique loaded attribute/index buffers and all delivered unique textures at RGBA8 with mipmaps; excludes driver/framebuffers. Timing is local animated renderFrame+blocking WebGL finish, 30 warmups/180 RAF samples after matched stills. It is not production or physical-device qualification. Cold/warm network entry, real mobile/Safari thermal/profile, runtime optional overlap/residency and G7 remain **NOT RUN**. Full raw estimates/sample arrays: `evidence/final-budgets.json`, browser receipt.

## Check ledger

Final commands/UTC/exits/log hashes: `evidence/final-check-commands.json`; all nine final commands exit0. Versions including Blender5.2.2 LTS hashd13f752e3b9c, Python/Node/Git and validator: `evidence/tool-versions.json`.

| Check | Result | Final evidence |
| --- | --- | --- |
| Native correction/reopen, all non-authorized mesh/UV/TRS/material/action identities | PASS | native-geometry-diff.json; final-native-replay.log |
| Actual native and production export replay | PASS | final-export-reproducibility.json; final-room-replay.log |
| Raw R3 eight-output universe; exact allowed deltas/bounds; +132 triangles; patch replay | PASS | final-lineage.json / .log |
| Builder/native glass and actual material export parity | PASS | native-source-export-parity.json; final-native-parity.log |
| Five fresh Blender imports, finite matrices | PASS | blender-imports.json; final-blender-imports.log |
| Khronos glTF structural validation, five GLBs | PASS: zero errors/warnings | gltf-validation.json; final-gltf-validation.log |
| 21 capture hashes/dimensions/settings/pose and15 GLB bodies | PASS | capture-reverification.json; final-capture-reverification.log |
| Applicable asset/call/triangle/estimate/local timing budgets | PASS LOCAL | final-budgets.json / .log |
| 26 commit/path/raw input bindings | PASS | input-hashes.json; final-input-binding.log |
| Package file set/raw hashes | PASS upon explicit verifier run | output-hashes.json; package-verification.json |
| Full art/reference, glass aesthetic acceptance | FAIL / PENDING independent review | issue-matrix.json; captures |
| Door/camera sweep and production door owner | OPEN; NOT RUN here | Preserved FINISH-20 findings |
| Physical devices/provider/production/G7/external GPT Plus #2 | NOT RUN | No supplied evidence |

## Preserved failed checkpoint and logs

`checkpoints/material-only/` is the original failed visual stage:102/74 calls, opaque chassis/window blockers. Its manifest SHA `2957fb72ed270f9d6bd75fdce5f6dc0c1fe3e124da490a8a682fb9cf9731724a` and all72 files /10,515,141 bytes are unchanged. Use its embedded report/receipts to read that stage. Root `material-only-stage-report.md` is historical; its relative links describe that stage and must not be treated as final proofs.

Historical root receipts `glb-material-diff.json`, `native-material-diff.json`, `production-lineage.json`, `source-patch-replay.json`, `export-reproducibility.json`, and unprefixed older logs describe the material-only phase. Final evidence is explicitly named above. Failed attempt logs are retained: unavailable package-version lookup, missing native output folder, CRLF replay, inactive IOR parity, initial wall-component selection, and stale dependency-graph backplate matrix before save/reopen. The latter was fixed by updating Blender's view layer before inventories; saved/reopened matrices are exact. A replay attempt detected a previous intermediate output hash; subsequent two fresh replays and final strict lineage/capture hash checks bind the delivered d192… room. No failure is counted as a final PASS.

## Package and replay

`output-hashes.json` lists every returned file's raw bytes/SHA, including checkpoint/inputs/logs/scripts/captures/native source. Only the manifest itself and `evidence/package-verification.json` are excluded to avoid a hash cycle; both are committed as ordinary files. Scratch `.work/`, node_modules, __pycache__, .blend1 backups are excluded from delivery. R4 `.gitattributes` preserves raw bytes in Git.

Recheck: `python deliveries/FINISH-B1-R4/scripts/verify-package.py`. With an isolated exact commit checkout, use `--git-ref HEAD --no-write` for raw Git blob identity. Replay native/export/final checks: `python deliveries/FINISH-B1-R4/scripts/run-final-checks.py`; browser first if recapturing. Requires the recorded Blender binary plus installed pinned Three/Playwright/glTF validator dependencies under canonical app. Do not run historical prepare/material-only scripts against final output; they intentionally construct the old stage.

Parent assigns separate exact-candidate audit and retains acceptance. This package authorizes no integration, publication, C2/C3 progression or full B1 approval.
'''
(OUT/'report.md').write_text(report,encoding='utf-8')
excluded=['output-hashes.json','evidence/package-verification.json'];ignored={'.work','node_modules','__pycache__','.git'};files=[]
for p in sorted(OUT.rglob('*')):
    rel=p.relative_to(OUT)
    if not p.is_file() or any(v in ignored for v in rel.parts) or p.suffix=='.blend1' or rel.as_posix() in excluded:continue
    raw=p.read_bytes();files.append(dict(path=rel.as_posix(),bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest()))
write('output-hashes.json',dict(schemaVersion=1,candidate='FINISH-B1-R4 FINISH-25+R1',selfExcluded=excluded,scratchExcluded=['.work/','node_modules/','__pycache__/','.git/','*.blend1'],files=files,totalBytes=sum(r['bytes'] for r in files)))
print(f'Final report and manifest: {len(files)} files')
