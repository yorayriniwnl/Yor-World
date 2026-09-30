"""Bind executed W2 evidence to exact assets and package the bounded delivery."""
import datetime, hashlib, json, zipfile
from pathlib import Path

root=Path(__file__).resolve().parent
workspace=root.parent.parent
evidence=root/'evidence/r2'
def read(path): return json.loads(path.read_text(encoding='utf-8-sig'))
def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def write(path,value): path.write_text(json.dumps(value,indent=2,ensure_ascii=False),encoding='utf-8')
inputs=read(root/'input-revisions.json')
handoff_inputs=read(root/'handoff-input-revisions.json')
for name,record in inputs['inputs'].items():
    assert digest(workspace/name)==handoff_inputs['inputs'][name]['sha256'],f'Input changed again after handoff inspection: {name}'
export=read(evidence/'export-inspection.json')
native=read(evidence/'blender-checks.json')
reopen=read(evidence/'native-reopen.json')
browsers={name:read(evidence/f'{name}-browser.json') for name in ('chrome','msedge')}
meta=read(root/'asset-metadata.json')
assert meta['sourceSha256']==digest(root/'build-avatar-proof.py')
for name,record in meta['files'].items():
    assert digest(root/name)==record['sha256']==reopen['hashes'][name]
for name,record in export['outputs'].items():
    assert record['sha256']==digest(root/name)
for name,report in browsers.items():
    for file,h in report['assetHashes'].items(): assert digest(root/file)==h,(name,file)
    assert all(c['status']=='PASS' for c in report['checks']),name
assert all(c['status']=='PASS' for c in native+reopen['checks']+export['checks'])

meta['inputs']='input-revisions.json'
meta['currentHandoffInputs']='handoff-input-revisions.json'
meta['inputRevisionCaveat']='Shared file hashes changed during execution. Original build inputs retained; current W2/F1 sections inspected as compatible. Parent reconciliation pending.'
meta['exportStatistics']={name:{key:record[key] for key in ('bytes','sha256','triangles','materials','decodedBufferBytes','textures')} for name,record in export['outputs'].items()}
meta['lods']='Single unoptimized proof LOD; B2 optimization not performed.'
meta['nativeChecks']='evidence/r2/blender-checks.json'
meta['browserChecks']=['evidence/r2/chrome-browser.json','evidence/r2/msedge-browser.json']
write(root/'asset-metadata.json',meta)

commands=[]
for path in sorted(evidence.glob('*.command.json')):
    c=read(path); c['record']=str(path.relative_to(root)).replace('\\','/'); commands.append(c)
write(evidence/'commands.json',commands)
chrome=browsers['chrome']; samples=chrome['samples']
turning=[d for d in samples if abs(d['chairYawDeg'])>.1]
summary={
    'sourceRevision':'W2-F1-r2','makerEvidenceOnly':True,
    'sampleCountPerBrowser':len(samples),'samplingHz':60,
    'rootMaximumErrorM':max(d['rootErrorM'] for d in samples),
    'bodyChairMaximumYawDifferenceDeg':max(abs(d['chairYawDeg']-d['bodyYawDeg']) for d in samples),
    'minimumHandDeskGapDuringYawM':min(d['handFrontGapM'] for d in turning),
    'maximumSeatGapAbsM':max(abs(d['seatGapM']) for d in samples),
    'soleHeightRangeM':[min(d['feet'][s]['sole'] for d in samples for s in ('footL','footR')),max(d['feet'][s]['sole'] for d in samples for s in ('footL','footR'))],
    'cyclesPerBrowser':len(chrome['repeated']),'cancellationsPerBrowser':len(chrome['interruptions']),
    'instantSkipsPerBrowser':len(chrome['skips']),
    'maximumMeasuredCancelSeconds':max(d['elapsed'] for d in chrome['interruptions']),
    'finalChecks':{'native':len(native),'nativeReopen':len(reopen['checks']),'gltf':len(export['checks']),'chrome':len(chrome['checks']),'edge':len(browsers['msedge']['checks'])},
    'independentReview':'NOT RUN; parent assignment required',
    'physicalDeviceAndPerformanceAcceptance':'NOT RUN',
    'buildAndRuntimeAssetHashes':meta['files']
}
write(evidence/'summary.json',summary)

expected=['build-avatar-proof.py','avatar-proof.blend','avatar-proof.glb','fixture-proof.glb','asset-metadata.json','input-revisions.json','integration-handoff.md',
          'render-native.py','prepare-proof.ps1','capture-command.py','playback/index.html','playback/proof.js','playback/serve.js','playback/run-browser-tests.js',
          'playback/validate-gltf.js','playback/package.json','playback/package-lock.json','playback/vendor/THREE-LICENSE.txt',
          'evidence/r2/blender-coding.png','evidence/r2/blender-hands-clear.png','evidence/r2/blender-greeting.png',
          'evidence/r2/chrome-playback.webm','evidence/r2/msedge-playback.webm','evidence/r2/chrome-greeting.png','evidence/r2/chrome-side-contact.png',
          'evidence/r2/export-inspection.json','evidence/r2/export-hierarchy.txt','evidence/r2/blender-measurements.json',
          'evidence/r2/chrome-browser.json','evidence/r2/msedge-browser.json','evidence/r2/commands.json','evidence/r2/capabilities.json']
inventory=[{'path':p,'status':'RETURNED' if (root/p).is_file() else 'MISSING'} for p in expected]
assert all(r['status']=='RETURNED' for r in inventory)
write(evidence/'expected-files.json',inventory)

checks=[
('Required local inputs and preserved interrupted delivery','PASS','input-revisions.json; history/interrupted-r1-inventory.json','Files opened directly; original build input SHA-256 values retained. Main image visually inspected.'),
('Shared input hashes unchanged during run','FAIL','evidence/r2/input-changes-at-handoff.json; handoff-input-revisions.json','Eight shared files changed outside this lane. Current W2/F1 requirements inspected as compatible; original hashes not overwritten. Parent must reconcile exact revisions before acceptance.'),
('Native Blender generation and 30 FPS common bind pose','PASS','evidence/r2/blender-arm-clearance.command.json; evidence/r2/native-reopen.json','Native build/export exit 0; delivered .blend reopened and its saved coding pose/ranges verified.'),
('F1 scale, axes and root placement','PASS','evidence/r2/chrome-browser.json; evidence/r2/export-hierarchy.txt','Desk 2.6 x .8 m, top .75; resident/chair/base (.30,0,-.36). Scenes loaded at identity.'),
('Five named clips and exact zero-based timings','PASS','evidence/r2/export-inspection.json','6.0/.6/1.2/.9/1.3 s; same clips and timeline in resident and fixture.'),
('Separate avatar and fixture / G1 node mapping','PASS','integration-handoff.md; evidence/r2/export-hierarchy.txt','Avatar excludes furniture; retain chair-root + chair-base, discard fixture-static. W1 integration NOT RUN.'),
('Khronos glTF validation','PASS','evidence/r2/avatar-proof.glb.validator.json; evidence/r2/fixture-proof.glb.validator.json','Both exports: 0 errors, 0 warnings, 0 infos, 0 hints.'),
('Native furniture and forearm/hand-torso clearance','PASS','evidence/r2/blender-checks.json; evidence/r2/blender-measurements.json','605 evaluated poses at 60 Hz. Only numerically tangent pelvis/seat pairs permitted. No other sampled furniture or forearm/hand-torso intersections.'),
('Exported browser desk/pedestal clearance','PASS','evidence/r2/chrome-browser.json; evidence/r2/msedge-browser.json','Skin triangles tested against desk/pedestal boxes inset by 0.5 mm, not static bone labels; zero hits.'),
('Withdrawal before rotation and return to keys','PASS','evidence/r2/chrome-browser.json; evidence/r2/chrome-hands-clear.png; evidence/r2/chrome-side-contact.png',f'Minimum hand/front-edge gap during yaw {summary["minimumHandDeskGapDuringYawM"]:.6f} m. Typing proximity 1.000-2.894 mm above actual key tops; endpoint mesh matches coding.'),
('Coordinated turn and acknowledgment','PASS','evidence/r2/chrome-browser.json; evidence/r2/chrome-playback.webm','125 degree chair/body yaw; maximum sampled nod 8.970 degrees; neutral endpoints.'),
('Feet, seat and planted-foot stability','PASS','evidence/r2/chrome-browser.json; evidence/r2/msedge-browser.json',f'Sole range {summary["soleHeightRangeM"]}; maximum seat-gap magnitude {summary["maximumSeatGapAbsM"]:.3g} m. Independent baked foot roots fix between-key sliding.'),
('Repeated turn/return and root drift','PASS','evidence/r2/chrome-browser.json; evidence/r2/msedge-browser.json',f'Five cycles in each browser; maximum absolute root error {summary["rootMaximumErrorM"]:.9g} m, no accumulated translation.'),
('Interruption, repeated input and instant safe coding pose','PASS','evidence/r2/chrome-browser.json; evidence/r2/msedge-browser.json','25 sampled cancellations and 25 skips per browser; coalesced double sequence; no stale queue. Max measured reverse-path cancel 2.667 s; Skip/Escape instant.'),
('Real exported browser playback and recordings','PASS','evidence/r2/chrome-playback.webm; evidence/r2/msedge-playback.webm','Actual requestAnimationFrame playback and canvas MediaRecorder; final asset hashes recorded; no console errors/failing requests.'),
('Source/Blender/browser color parity approval','NOT RUN','evidence/r2/blender-greeting.png; evidence/r2/chrome-greeting.png','Matching camera position/target/vertical FOV; Cycles/AgX and WebGL/ACES lighting differ. Independent color/art approval not supplied.'),
('Frozen dependency provenance','PASS','playback/package-lock.json; evidence/r2/prepare-dependencies.log; evidence/r2/vendor-verification.json','Exact pins installed only in unique external scratch; generated lockfile; vendored Three.js bytes equal installed package; MIT notice included.'),
('Git commit and push','NOT RUN','evidence/r2/git-repository-check.command.json','git rev-parse exited 128: no repository. No remote was invented and no repository was created.'),
('Database execution','NOT RUN','evidence/r2/capabilities.json','No configured project database used or tested; not required by W2.'),
('Physical mobile, Safari, Firefox and performance budgets','NOT RUN','evidence/r2/capabilities.json','Chrome/Edge desktop feasibility only. No physical-device, cold-load network, sustained thermal, field-vitals or release-budget claim.'),
('Independent motion/interface/provenance review and parent acceptance','NOT RUN','integration-handoff.md','Maker evidence only. Reviewer aliases not dispatched; no external-provider execution or self-approval claimed.')]
table='\n'.join('| '+' | '.join(row)+' |' for row in checks)
asset_table='\n'.join(f'| `{name}` | {r["bytes"]:,} | {r["triangles"]:,} | {r["materials"]} | `{r["sha256"]}` |' for name,r in export['outputs'].items())
command_labels=['prepare-dependencies','environment','blender-arm-clearance','blender-render-delivery','gltf-delivery','chrome-delivery','edge-delivery','git-repository-check']
command_rows=[]
for label in command_labels:
    c=read(evidence/f'{label}.command.json')
    command_rows.append(f'| `{label}` | {c["exitCode"]} | `{c["log"]}` |')
file_rows='\n'.join(f'| `{i["path"]}` | {i["status"]} |' for i in inventory)
report=fr'''# W2 seated-avatar/export feasibility — W2-F1-r2

Returned for **Gemini-3 motion, Claude-01 interface, Claude-13 export/provenance and parent review**. Not accepted; no later lane started. This is OpenAI Codex/GPT-6 executing the functional GPT-2/W2 lane, not proof of another account/provider. Exact serving build is not exposed.

The delivery contains an actual editable Blender source, resident GLB, separate F1 fixture GLB, five authored 30 FPS actions, a private playback harness, and independently executable maker checks. Native generation/reopen, glTF validation and real exported Chrome/Edge playback passed for the hashes below. No final likeness, final character quality, production CharacterDirector, completed B4, G1 acceptance or publication is claimed.

Inputs: product specification revision 2 and F1; exact SHA-256 values in [input-revisions.json](input-revisions.json). Read directly: START_HERE, AGENTS, account-prompts Shared/W2, work-order W2, art §§3/5/6/9, engineering §§4/5, product §§1/3/4/10, validation §§1/2/5/7, reference README/manifest and main image. The reference image was visually opened. The source discussion and prior-session transcript were not needed and were not treated as instructions.

**Input revision caveat:** packaging detected eight shared file hashes changed by work outside this lane, including the product spec (still labeled revision 2). The first packaging attempt exited 1 and is recorded in [packaging-input-change.log](evidence/r2/packaging-input-change.log). Original build hashes remain intact. Current hashes are separately captured in [handoff-input-revisions.json](handoff-input-revisions.json), with current Markdown snapshots under input-snapshots/handoff. Rereading the assigned sections found the same W2/F1 geometry, clips, timing and export requirements; updated text explicitly routes Claude reviews through browser packets. This is maker source inspection, not a whole-file diff or parent acceptance. Parent reconciliation is required before acceptance. No shared file was edited by this maker.

The main image supplied the white/ivory desk, blue/white chair, cyan fill and pink/lilac accents. The generic human and all fixture geometry are authored additions. The room's prominent hex lights, plants, gaming props and pegboard remain the environment maker's work; this independent furniture proof neither replaces nor edits that room. No image pixels, external models, textures, sound, biography, project claims or contact data were added to production.

Capabilities actually demonstrated: local filesystem read/write, native PowerShell 5.1.26100.9444, Python 3.12.10, Node 24.19.0, npm 11.17.0, Blender 5.2.2 LTS (`d13f752e3b9c`), Khronos validator 2.0.0-dev.3.10, Playwright 1.58.2 and Three.js 0.180.0. Browser runs used Chrome 154.0.8037.58 and Edge 154.0.4258.37 on Windows 11 Pro 10.0.26200, Ryzen 5 3600XT, RTX 2060, NVIDIA driver 32.0.15.9186. Both WebGL reports identify ANGLE/D3D11/RTX 2060, not SwiftShader. No Blender/browser MCP was assumed: CLI and Playwright performed the work. Database access was not configured or tested. See [capabilities](evidence/r2/capabilities.json).

All edits are inside deliveries/W2; only authorized exact-pinned dependencies were installed in the unique external temporary directory logged in [prepare-dependencies.log](evidence/r2/prepare-dependencies.log). No global install, purchase, provisioning, repository creation, deployment, account dispatch or agent spawning occurred. Background subprocesses ran with hidden windows. The folder is not a Git repository; this was reported during work, and commit/push remain NOT RUN.

The previous 36 files were inspected and archived before edits in [history/interrupted-r1.zip](history/interrupted-r1.zip), with [original hashes](history/interrupted-r1-inventory.json). The old report overstated collision and browser measurements. Corrections include real skinned-vertex metrics, quaternion heading instead of ambiguous Euler yaw, zero-based clip timing, root-level skin export, stable foot tracks, safe interruption paths, narrower seat fit, raised/widened hand withdrawal and forearm clearance. Failed intermediate checks were retained, including [pre-foot-fix archive](history/r2-before-foot-fix.zip) and named trial logs. They are not final evidence. [changed-files.json](changed-files.json) identifies each modified/new current output; unrelated work was excluded.

| Artifact | Bytes | Triangles (proof LOD0) | Materials | SHA-256 |
| --- | ---: | ---: | ---: | --- |
{asset_table}

`avatar-proof.blend`: {meta['files']['avatar-proof.blend']['bytes']:,} bytes; SHA-256 `{meta['files']['avatar-proof.blend']['sha256']}`. Source SHA-256 `{meta['sourceSha256']}`. Both GLBs total {sum(r['bytes'] for r in export['outputs'].values()):,} bytes, with no textures. Decoded glTF buffer byte lengths total {sum(r['decodedBufferBytes'] for r in export['outputs'].values()):,}; this is a buffer count, not a total GPU-residency measurement. Browser main-pass observation: 10,532 triangles / 65 draw calls; shadow passes, environment assets and later optimization are not a performance acceptance result.

Asset origin: procedural W2 source, including the preserved inherited attempt and this correction. Reference rights remain unknown; no runtime reference-image use. No geometry publication license or user likeness approval has been assigned. Vendored Three.js retains its [MIT notice](playback/vendor/THREE-LICENSE.txt). Full source/export metadata is in [asset-metadata.json](asset-metadata.json); hashes for returned current files are in [output-hashes.json](output-hashes.json). This metadata is a local proof record, not a replacement for the shared AssetManifest contract.

The exact exported hierarchy, raw local TRS and channel targets are in [export-hierarchy.txt](evidence/r2/export-hierarchy.txt) and [export-inspection.json](evidence/r2/export-inspection.json). [integration-handoff.md](integration-handoff.md) specifies placement, bone parents, clip ranges, chair yaw ownership and fixture selection. Both imports load at identity. Avatar `body-turn` and fixture `chair-root` own synchronized absolute yaw; `chair-base` stays stationary. The integrator keeps W1's accepted desk/environment, removes its proxy and entire static chair, keeps W2 `chair-root` + `chair-base`, and discards W2 `fixture-static`. No doubled root offset, scene rotation or yaw is required. Exact W1 names/hashes require a later G1 assignment.

Measurements use 605 poses per browser at 60 Hz, including half-frames between 30 FPS authored keys, plus five complete cycles, 25 cancellations and 25 instant skips in each browser. Native BVH surface checks cover the fixture meshes and forearm/hand versus torso; browser skin-triangle checks cover desk/pedestal conservative boxes. Contact permits 0.2 mm numeric tolerance; browser boxes are inset 0.5 mm to exclude boundary tangency. These are sampled checks, not continuous collision proofs or independent review.

Minimum hand/front-edge gap while yaw is nonzero: {summary['minimumHandDeskGapDuringYawM']*1000:.2f} mm. Maximum root error: {summary['rootMaximumErrorM']:.9g} m. Maximum chair/body yaw difference: {summary['bodyChairMaximumYawDifferenceDeg']:.9g} degrees. Maximum absolute seat gap: {summary['maximumSeatGapAbsM']:.9g} m. Feet lift at most {summary['soleHeightRangeM'][1]*1000:.3f} mm. Every repeated cycle settles into coding. Coding hand surfaces remain 1.000–2.894 mm above key tops; individual finger articulation is later work.

The proof uses pose-matched clip boundaries and a shared sampler. Proposed 150–250 ms production blend windows are not implemented; [the handoff](integration-handoff.md) explicitly proposes this proof approach for review. Safe cancellation reverses checked poses and took at most {summary['maximumMeasuredCancelSeconds']:.3f} s in the sampled cases (2.7 s theoretical maximum). Skip/Escape instantly restores coding. A later navigation controller must use instant settlement rather than delaying a route by this cancellation time. No shared schema or F1 dimensions were changed.

| Name | PASS/FAIL/NOT RUN | Evidence path | Reason |
| --- | --- | --- | --- |
{table}

The fixed browser recordings are [Chrome WebM](evidence/r2/chrome-playback.webm) and [Edge WebM](evidence/r2/msedge-playback.webm). Still evidence includes [coding](evidence/r2/chrome-coding.png), [hands withdrawn](evidence/r2/chrome-hands-clear.png), [greeting](evidence/r2/chrome-greeting.png), [return](evidence/r2/chrome-returned.png) and [side contact](evidence/r2/chrome-side-contact.png). The paired [Blender greeting](evidence/r2/blender-greeting.png) is a Cycles render of the reopened native source, not browser evidence. Both use camera (-2.15,1.72,2.10), target (0,.72,-.64), vertical FOV 44°, image/canvas 1140×800; browser full screenshots are 1440×900, DPR 1. Lighting and tone mapping differ and require art review.

| Canonical execution | Exit code | Log |
| --- | ---: | --- |
{chr(10).join(command_rows)}

[commands.json](evidence/r2/commands.json) retains exact argv arrays, working directories, timestamps, exit codes and log paths for all captured commands, including failures. Failed native/interpolation and initial browser runs were corrected; the successful rows above bind to the delivered assets. `git-repository-check` exit 128 is the actual no-repository result. Environment version queries and vendor byte comparisons are captured separately. The implementation consulted the primary [Three.js AnimationAction](https://threejs.org/docs/pages/AnimationAction.html), [SkinnedMesh](https://threejs.org/docs/pages/SkinnedMesh.html) and [Khronos validator](https://github.com/KhronosGroup/glTF-Validator) documentation; execution used the pinned installed code and native Blender exporter.

Reproduce from the project root in PowerShell (no workspace node_modules):

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\deliveries\W2\prepare-proof.ps1
python .\deliveries\W2\capture-command.py rebuild -- 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python-exit-code 1 --python 'C:/Users/yoray/Projects/Yor World/deliveries/W2/build-avatar-proof.py' -- --no-render
python .\deliveries\W2\capture-command.py render -- 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python-exit-code 1 --python 'C:/Users/yoray/Projects/Yor World/deliveries/W2/render-native.py'
python .\deliveries\W2\capture-command.py validate -- node playback/validate-gltf.js
python .\deliveries\W2\capture-command.py chrome -- node playback/run-browser-tests.js chrome
python .\deliveries\W2\capture-command.py edge -- node playback/run-browser-tests.js msedge
node .\deliveries\W2\playback\serve.js
```

The preparation script creates a new unique external scratch directory and runs `npm ci --ignore-scripts --no-fund --no-audit` using the returned lockfile. Existing system Chrome/Edge are required; no browser/global installation is performed. Then open `http://127.0.0.1:8080/playback/index.html`. It is a loopback-only private diagnostic harness. Close with Ctrl+C. The standalone script may generate different binary hashes on another native run; re-run validation and record the new revision instead of reusing these screenshots or approvals. `render-native.py` can reopen/render a saved delivery without re-exporting. Packaging after successful checks is `python deliveries/W2/assemble-handoff.py`.

| Expected file | Returned / missing |
| --- | --- |
{file_rows}
| `report.md`, `changed-files.json`, `output-hashes.json`, `w2-avatar-proof-r2.zip`, `artifact-receipt.json` | RETURNED by this packaging run |

No required W2 source/export/harness/evidence file is missing. The ZIP contains the current proof and r2 evidence; preserved historical ZIP payloads remain local under history and are not nested in the current handoff ZIP. Its SHA-256 is in [artifact-receipt.json](artifact-receipt.json). Read files directly or serve them locally; opening the HTML through file:// cannot load modules/GLBs reliably.

Defects and limits: shared input hashes changed during the run and require parent reconciliation; current compatibility is a maker inspection only. Generic primitive/rigid-weight anatomy, mitten hands and coarse chair silhouette remain proof art; no likeness/final face/hair approval. Sampling does not establish continuous collision freedom or complete self-collision coverage. Reverse-path cancellation changes velocity abruptly at interruption and the proposed production blend windows remain unreviewed. Source/browser materials differ. Physical mobile/Safari/Firefox, performance budgets, G1 integration, final B2/B4 work and all independent reviews remain NOT RUN. Native Blender emits a Material.use_nodes deprecation warning for a future version; it does not fail the installed 5.2.2 run. Public asset rights/approval remain unassigned.

Next bounded step: the parent reconciles the original and handoff input revisions, then assigns Gemini-3 the exact motion/export hashes and supplies Claude-01/Claude-13 browser review packets with the interface/hierarchy and provenance/export records. Those reviewers distinguish supplied maker evidence from tests they actually execute; the parent accepts or returns corrections. Stop here. No later packet or integration has been started.
'''
(root/'report.md').write_text(report,encoding='utf-8')

def current_files():
    paths=[]
    for p in root.rglob('*'):
        if not p.is_file(): continue
        rel=p.relative_to(root); s=rel.as_posix()
        if rel.parts[0]=='history' or p.suffix in ('.zip','.blend1') or s in ('output-hashes.json','artifact-receipt.json'): continue
        if rel.parts[0]=='evidence' and len(rel.parts)>1 and rel.parts[1]!='r2' and s!='evidence/README.md': continue
        paths.append(p)
    return sorted(paths)
original=read(root/'history/interrupted-r1-inventory.json')
changed=[]
for p in current_files():
    rel=p.relative_to(root).as_posix()
    if rel=='changed-files.json': continue
    old=original.get(rel)
    if not old or old['sha256']!=digest(p): changed.append({'path':rel,'change':'modified' if old else 'new','sha256':digest(p)})
write(root/'changed-files.json',{'ownedRoot':'deliveries/W2','comparison':'history/interrupted-r1-inventory.json','files':changed,'unrelatedFilesModified':False})
manifest={'revision':'W2-F1-r2','hashAlgorithm':'SHA-256','exclusions':['this manifest','archive and its separate receipt','preserved historical payloads'],
          'files':{p.relative_to(root).as_posix():{'bytes':p.stat().st_size,'sha256':digest(p)} for p in current_files()}}
write(root/'output-hashes.json',manifest)
archive=root/'w2-avatar-proof-r2.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
    for p in current_files()+[root/'output-hashes.json']: z.write(p,p.relative_to(root))
receipt={'archive':archive.name,'bytes':archive.stat().st_size,'sha256':digest(archive),'manifestSha256':digest(root/'output-hashes.json'),'packagedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'returned; not accepted'}
write(root/'artifact-receipt.json',receipt)
# Verify returned members against the hash manifest after writing the archive.
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    for name,record in manifest['files'].items(): assert hashlib.sha256(z.read(name)).hexdigest()==record['sha256'],name
receipt['packagingCommand']='python deliveries/W2/assemble-handoff.py'
receipt['archiveVerification']={'crc':'PASS','manifestMembers':'PASS','verifiedFiles':len(manifest['files'])}
write(root/'artifact-receipt.json',receipt)
print(json.dumps({'package':receipt,'verifiedFiles':len(manifest['files']),'summary':summary},indent=2))
