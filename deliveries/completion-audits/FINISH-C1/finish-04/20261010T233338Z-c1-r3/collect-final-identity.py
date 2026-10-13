import pathlib, json, hashlib, subprocess, datetime, platform, os

ROOT = pathlib.Path(__file__).resolve().parent
WORK = ROOT.parents[4]
MAKER = WORK / 'deliveries/FINISH-C1-R3'
BEFORE = json.loads((ROOT / 'candidate-binding-before.json').read_text())

def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def ident(p): return {'path': p.relative_to(WORK).as_posix(), 'bytes': p.stat().st_size, 'sha256': sha(p)}
def write(n, data): (ROOT / n).write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8')

checks = []
for item in BEFORE['files']:
    p = MAKER / 'source' / item['path'][4:] if item['path'].startswith('app/') else MAKER / item['path']
    now = ident(p)
    now['boundPath'] = item['path']
    now['matches'] = now['bytes'] == item['bytes'] and now['sha256'] == item['sha256']
    checks.append(now)
assert all(c['matches'] for c in checks), 'Candidate changed: stop and rebind'
assert sha(MAKER / 'output-hashes.json') == BEFORE['makerManifestSha256']
write('candidate-binding-after.json', {'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(), 'candidateUnchanged':True, 'makerManifestSha256':sha(MAKER/'output-hashes.json'), 'sourcePatchSha256':sha(MAKER/'source.patch'), 'files':checks})

build_checks = []
for item in BEFORE['files']:
    if not item['path'].startswith('app/'): continue
    p = MAKER / 'candidate-build' / item['path']
    c = {'path':item['path'], 'exists':p.exists()}
    if p.exists():
        c.update({'sha256':sha(p), 'bytes':p.stat().st_size, 'sameRawBytesAsReturned':sha(p)==item['sha256']})
        returned = MAKER / 'source' / item['path'][4:]
        c['sameBytesAfterCRLFtoLFOnly'] = p.read_bytes().replace(b'\r\n',b'\n') == returned.read_bytes().replace(b'\r\n',b'\n')
    build_checks.append(c)

extras = [WORK/'app/pnpm-lock.yaml',WORK/'app/package.json',WORK/'app/src/features/room/quality-policy.ts', WORK/'app/playwright.config.ts', WORK/'app/next.config.ts', WORK/'app/node_modules/three/src/textures/Texture.js', WORK/'app/node_modules/three/examples/jsm/loaders/GLTFLoader.js']
models = [WORK/'app/public/models'/name for name in ['production-room-full.glb','resident-production.glb','fixture-production.glb']]
build_files=[]
for relative in ['BUILD_ID','build-manifest.json','app-build-manifest.json','routes-manifest.json','server/app-paths-manifest.json']:
    p=MAKER/'candidate-build/app/.next'/relative
    if p.exists(): build_files.append(ident(p))
write('maker-build-evidence-check.json', {'scope':'Read-only present artifacts; no independently observed maker build-time source snapshot. CRLF-only equality is semantic lineage, not raw-byte build-time binding.', 'candidateBuildSource':build_checks,'buildArtifacts':build_files, 'inputs':[ident(p) for p in extras+models if p.exists()], 'missingDeclaredMakerTypecheckLog':not (MAKER/'evidence/typecheck.log').exists()})

commands=[(['git','--version'],WORK),(['node','--version'],WORK),(['pnpm.cmd','--version'],WORK),(['pnpm.cmd','exec','vitest','--version'],ROOT/'assembly/app'),(['pnpm.cmd','exec','tsc','--version'],ROOT/'assembly/app'),(['pnpm.cmd','exec','playwright','--version'],ROOT/'assembly/app'),(['git','rev-parse','HEAD'],WORK),(['git','rev-parse','HEAD:app'],WORK)]
tools=[]
for args,cwd in commands:
    start=datetime.datetime.now(datetime.timezone.utc).isoformat()
    result=subprocess.run(args,cwd=cwd,capture_output=True)
    tools.append({'args':args,'cwd':str(cwd),'utc':start,'exitCode':result.returncode,'stdout':result.stdout.decode('utf-8',errors='replace'),'stderr':result.stderr.decode('utf-8',errors='replace')})
write('tool-versions.json', {'os':platform.platform(), 'python':platform.python_version(), 'dependencyArrangement':'Read-only junction to canonical app/node_modules; no install or production source mutation.', 'commands':tools})
print(json.dumps({'candidateUnchanged':True,'outputs':len(checks),'buildSourceRawMatches':sum(x.get('sameRawBytesAsReturned',False) for x in build_checks),'buildSourceCount':len(build_checks),'buildSourceCRLFOnlyMatches':sum(x.get('sameBytesAfterCRLFtoLFOnly',False) for x in build_checks)}))
