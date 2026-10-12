#!/usr/bin/env python3
"""Verify FINISH-A1-R10 package bytes, ancestry, source inputs, and browser receipts from raw Git."""
from __future__ import annotations
import argparse, hashlib, json, subprocess, sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
REPO=ROOT.parents[1]
PREFIX='deliveries/FINISH-A1-R10/'
R8='e377e06c514819ee6dbd82da2216c95813bedd2f'
R9='a2f0e218f8153ceec311616f49b7b654c9892bb2'
R8B='f5978b91ea981d740ab0ba42b46368175f045cf8'
BASE='f62a43c5e71c00dcb89e28275ea81d842167db80'

def git(*args: str, check: bool=True) -> bytes:
    p=subprocess.run(['git',*args],cwd=REPO,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    if check and p.returncode: raise RuntimeError(f"git {' '.join(args)} exited {p.returncode}: {p.stderr.decode(errors='replace')}")
    return p.stdout

def show(commit: str,path: str) -> bytes: return git('show',f'{commit}:{path}')
def sha(data: bytes) -> str: return hashlib.sha256(data).hexdigest()
def oid(data: bytes) -> str: return hashlib.sha1(f'blob {len(data)}\0'.encode()+data).hexdigest()
def parse(data: bytes): return json.loads(data.decode('utf-8-sig'))
def check_raw(item: dict, errors: list[str], label: str) -> None:
    try:
        commit=item['commit']; path=item['path']; data=show(commit,path)
        ok=len(data)==item['bytes'] and sha(data)==item['sha256'] and oid(data)==item['gitBlob']
        print(f"RAW_INPUT {label}: {commit}:{path} bytes={len(data)} sha256={sha(data)} gitBlob={oid(data)} status={'PASS' if ok else 'FAIL'}")
        if not ok: errors.append(f'raw input mismatch: {label}')
    except Exception as e:
        errors.append(f'raw input error {label}: {e}'); print(f'RAW_INPUT {label}: FAIL {e}')

def main() -> int:
    ap=argparse.ArgumentParser(); ap.add_argument('--commit',help='verify exact committed candidate; defaults to package worktree bytes'); args=ap.parse_args()
    errors=[]
    print(f'FINISH-49 R10 verifier | mode={args.commit or "worktree"} | R8={R8} | R8B={R8B}')
    def package(rel: str) -> bytes:
        return show(args.commit,PREFIX+rel) if args.commit else (ROOT/Path(rel)).read_bytes()
    def package_names() -> set[str]:
        if args.commit:
            out=git('ls-tree','-r','--name-only',f'{args.commit}:{PREFIX[:-1]}').decode().splitlines()
            return set(out)
        return {p.relative_to(ROOT).as_posix() for p in ROOT.rglob('*') if p.is_file()}
    if args.commit:
        actual=git('rev-parse','--verify',f'{args.commit}^{{commit}}').decode().strip()
        parent=git('rev-parse',f'{actual}^').decode().strip()
        r8b_parent=git('rev-parse',f'{R8B}^').decode().strip()
        tree=git('rev-parse',f'{actual}^{{tree}}').decode().strip()
        print(f'CANDIDATE commit={actual} tree={tree} parent={parent}')
        print(f'R8B commit={R8B} parent={r8b_parent}')
        if parent!=R8B: errors.append('R10 parent is not exact R8B')
        if r8b_parent!=R8: errors.append('R8B parent is not exact R8')
        for pinned in (R8,R9,R8B,BASE):
            probe=subprocess.run(['git','cat-file','-e',f'{pinned}^{{commit}}'],cwd=REPO,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
            if probe.returncode: errors.append(f'missing pinned object {pinned}')
        changed=git('diff-tree','--no-commit-id','--name-only','-r',actual).decode().splitlines()
        bad=[p for p in changed if not p.startswith(PREFIX)]
        print(f'COMMIT_SCOPE changedPaths={len(changed)} outsideDelivery={len(bad)}')
        if bad: errors.append('candidate commit changes outside FINISH-A1-R10')
        if git('rev-parse',f'{actual}:app').decode().strip()!=git('rev-parse',f'{R8}:app').decode().strip(): errors.append('canonical app tree differs from R8')
    manifest=parse(package('output-hashes.json'))
    listed={x['path'] for x in manifest['files']}
    actual_names=package_names()-{'output-hashes.json'}
    if listed!=actual_names:
        errors.append(f'output manifest path set mismatch (missing={sorted(actual_names-listed)}, extra={sorted(listed-actual_names)})')
    total=0
    for item in manifest['files']:
        try:
            data=package(item['path'])
            ok=len(data)==item['bytes'] and sha(data)==item['sha256'] and oid(data)==item['gitBlob']
            total+=len(data)
            if not ok: errors.append('output mismatch '+item['path'])
        except Exception as e: errors.append(f'output read error {item["path"]}: {e}')
    print(f'OUTPUT_MANIFEST files={len(listed)} declared={manifest.get("fileCount")} bytes={total} declaredBytes={manifest.get("totalBytes")} status={"PASS" if not errors else "FAIL"}')
    if len(listed)!=manifest.get('fileCount') or total!=manifest.get('totalBytes'): errors.append('output manifest totals mismatch')
    input_hashes=parse(package('input-hashes.json'))
    if input_hashes['r8CandidateCommit']!=R8 or input_hashes['r8bSourceSupplementCommit']!=R8B: errors.append('input candidate identities mismatch')
    r8_manifest=show(R8,'deliveries/FINISH-A1-R8/input-hashes.json')
    rm=input_hashes['r8InputManifest']
    if len(r8_manifest)!=rm['bytes'] or sha(r8_manifest)!=rm['sha256'] or oid(r8_manifest)!=rm['gitBlob']: errors.append('R8 15-input manifest raw binding mismatch')
    if len(input_hashes['originalR8Inputs'])!=13 or len(input_hashes['recoveredInputs'])!=2: errors.append('input provenance cardinality mismatch')
    for i,x in enumerate(input_hashes['originalR8Inputs']):
        b=git('cat-file','blob',x['rawGit']['gitBlob']); ok=len(b)==x['bytes'] and sha(b)==x['sha256'] and oid(b)==x['rawGit']['gitBlob']
        if not ok: errors.append(f'original input mismatch {x["originalPath"]}')
    for x in input_hashes['recoveredInputs']:
        b=show(R8B,x['packagePath']); ok=len(b)==x['bytes'] and sha(b)==x['sha256'] and oid(b)==x['rawGitAfterR8B']['gitBlob']
        if not ok or x['historicalOrigin']!='PARENT-LOCAL-COPY' or x['r8RawGitStatus']!='NOT_AVAILABLE_IN_PINNED_R8': errors.append(f'recovered input mismatch {x["originalRepoPath"]}')
        absent=subprocess.run(['git','cat-file','-e',f'{R8}:{x["originalRepoPath"]}'],cwd=REPO,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
        if absent.returncode==0: errors.append(f'original recovered path unexpectedly exists in R8: {x["originalRepoPath"]}')
    for group in ('sourceAndBuildInputs','executionInputs'):
        for x in input_hashes[group]: check_raw(x,errors,group+':'+x['path'])
    browser=parse(package('evidence/browser-binding.json'))
    build=parse(package('evidence/build-binding.json'))
    candidate_binding=parse(package('candidate-binding.json'))
    r8_manifest=parse(show(R8,'deliveries/FINISH-A1-R8/input-hashes.json'))
    if candidate_binding['sourceBaseAppTree']!=r8_manifest['sourceBaseAppTree']: errors.append('source base app tree mismatch')
    r8binding=parse(show(R8,'deliveries/FINISH-A1-R8/evidence/r8/browser-binding.json'))
    r9binding=parse(show(R9,'deliveries/FINISH-A1-R9/evidence/browser-binding.json'))
    if browser['candidateAppTree']!=r8binding.get('candidateAppTree'): errors.append('candidate app tree differs from pinned R8 binding')
    if browser['candidateAppTree']!=r9binding.get('candidateAppTree',r9binding.get('replayedCandidateTree')): errors.append('candidate app tree differs from pinned R9 binding')
    patch=show(R8,'deliveries/FINISH-A1-R8/source.patch')
    patch_sha=sha(patch)
    if browser['sourcePatchSha256']!=patch_sha or build['sourcePatchSha256']!=patch_sha: errors.append('source patch hash mismatch')
    if any(x['sourcePatchSha256']!=patch_sha for x in browser['testSources']): errors.append('test-source patch binding mismatch')
    if browser['candidateAppTree']!=build['candidateAppTree']: errors.append('build/browser app-tree mismatch')
    if browser['replayedCandidateTree']!=build['replayedCandidateTree']: errors.append('replay tree mismatch')
    if browser['buildId']!=build['buildId']: errors.append('build ID mismatch')
    if sha(package('evidence/build-output-manifest.json'))!=build['buildOutputManifestSha256']: errors.append('build manifest hash mismatch')
    runs=[parse(package('evidence/browser-absent-draft.json')),parse(package('evidence/browser-normal-fixture.json'))]
    paths=[x['database']['YOR_TEST_DATABASE_PATH'] for x in runs]
    if paths[0]==paths[1] or not all(x['database']['fresh'] and not x['database']['existedBeforeRun'] for x in runs): errors.append('browser PGlite paths are not distinct fresh paths')
    for run in runs:
        if run['status']!='PASS' or run['exitCode']!=0: errors.append(f"browser run not PASS: {run['label']}")
        result=parse(package(run['resultPath']))
        if sha(package(run['resultPath']))!=run['resultSha256']: errors.append(f"result hash mismatch: {run['label']}")
        stats=run['resultStats']
        if stats['unexpected']!=0 or stats['skipped']!=0: errors.append(f"result stats fail: {run['label']}")
        if len(run['captures'])==0: errors.append(f"no captures for {run['label']}")
        for c in run['captures']:
            d=package(c['path'])
            if len(d)!=c['bytes'] or sha(d)!=c['sha256']: errors.append(f"capture mismatch: {c['path']}")
        receipt=parse(package(run['commandReceipt']))
        if receipt['exitCode']!=0 or receipt['startedUtc']!=run['startedUtc'] or receipt['endedUtc']!=run['endedUtc']: errors.append(f"command receipt mismatch: {run['label']}")
        for logkey in ('stdout','stderr'):
            p=run[logkey]; d=package(p)
            if sha(d)!=run[logkey+'Sha256']: errors.append(f"log hash mismatch: {run['label']} {logkey}")
        print(f"BROWSER {run['label']}: expected={stats['expected']} unexpected={stats['unexpected']} db={paths[0] if run['label']=='browser-absent-draft' else paths[1]} status={'PASS' if run['status']=='PASS' else 'FAIL'}")
    if args.commit:
        verifier=subprocess.run([sys.executable,str(ROOT.parent/'FINISH-A1-R8B'/'verify_recovered_bytes.py'),'--commit',R8B],cwd=REPO,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
        sys.stdout.write(verifier.stdout.decode(errors='replace'))
        if verifier.returncode: errors.append('R8B raw Git verifier failed')
    print('RESULT='+('FAIL' if errors else 'PASS'))
    for e in errors: print('ERROR '+e)
    return 1 if errors else 0

if __name__=='__main__': sys.exit(main())