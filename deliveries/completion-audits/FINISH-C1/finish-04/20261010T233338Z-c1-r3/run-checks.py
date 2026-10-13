import datetime,json,pathlib,subprocess,sys,os,hashlib,time
ROOT=pathlib.Path(__file__).resolve().parent
APP=ROOT/'assembly/app'
WORK=ROOT.parents[4]
MAKER=WORK/'deliveries/FINISH-C1-R3'
IDENTITY=json.loads((ROOT/'candidate-binding-before.json').read_text())
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def unchanged():
 for f in IDENTITY['files']:
  p=MAKER/'source'/f['path'][4:] if f['path'].startswith('app/') else MAKER/f['path']
  if sha(p)!=f['sha256'] or p.stat().st_size!=f['bytes']:raise RuntimeError('Maker changed during audit: '+f['path'])
 if sha(MAKER/'output-hashes.json')!=IDENTITY['makerManifestSha256']:raise RuntimeError('Output manifest changed during audit')
COMMANDS={
 'unit':['pnpm.cmd','test:unit'],
 'integration':['pnpm.cmd','exec','vitest','run','--config','vitest.integration.config.ts','--maxWorkers=1','--no-file-parallelism'],
 'lint':['pnpm.cmd','lint'],
 'typecheck':['pnpm.cmd','exec','tsc','--noEmit'],
 'build':['pnpm.cmd','build'],
 'browser':['pnpm.cmd','test:e2e','--','tests/e2e/world/completion-loading-pause.spec.ts'],
 'diagnostic':['pnpm.cmd','exec','vitest','run','--config',str(ROOT/'audit-vitest.config.ts'),'--reporter=json','--outputFile='+str(ROOT/'diagnostic-results.json')]
}
mode=sys.argv[1];unchanged(); env=os.environ.copy();env['NEXT_TELEMETRY_DISABLED']='1';env['CI']='1';env['PORT']='3157';env['G1_EVIDENCE_DIR']=str(ROOT/'browser-evidence')
start=datetime.datetime.now(datetime.timezone.utc).isoformat(); t=time.monotonic()
result=subprocess.run(COMMANDS[mode],cwd=APP,env=env,capture_output=True)
(ROOT/(mode+'.stdout.log')).write_bytes(result.stdout)
(ROOT/(mode+'.stderr.log')).write_bytes(result.stderr)
receipt={'mode':mode,'args':COMMANDS[mode],'cwd':str(APP),'startUtc':start,'stopUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'durationSec':time.monotonic()-t,'exitCode':result.returncode,'stdout':mode+'.stdout.log','stderr':mode+'.stderr.log','boundManifestSha256':IDENTITY['makerManifestSha256'],'boundPatchSha256':IDENTITY['patchSha256'],'sourceUnchangedAfter':False}
try:unchanged();receipt['sourceUnchangedAfter']=True
finally:(ROOT/(mode+'-receipt.json')).write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
print(json.dumps(receipt))
sys.exit(result.returncode)

