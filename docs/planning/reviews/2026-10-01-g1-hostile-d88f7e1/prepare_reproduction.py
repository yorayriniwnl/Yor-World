"""Prepare the exact G1 candidate outside the repository; never repair delivery files."""
from pathlib import Path
import datetime, hashlib, json, os, shutil, subprocess, tempfile, zipfile

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent
source = ROOT / 'deliveries/G1/source'
scratch = Path(tempfile.mkdtemp(prefix='yor-g1-hostile-run-')).resolve()
app = scratch / 'app'
shutil.copytree(source, app)
(scratch / 'empty.npmrc').write_bytes(b'')
node = shutil.which('node')
pnpm = Path(shutil.which('pnpm.cmd') or shutil.which('pnpm')).parent / 'node_modules/pnpm/bin/pnpm.cjs'
env = {k:v for k,v in os.environ.items() if k.upper() in {'PATH','SYSTEMROOT','WINDIR','COMSPEC','PATHEXT','TEMP','TMP','LOCALAPPDATA','APPDATA','USERPROFILE','NUMBER_OF_PROCESSORS','PROCESSOR_ARCHITECTURE','PROGRAMFILES','PROGRAMFILES(X86)','COMMONPROGRAMFILES'}}
env.update({'NEXT_TELEMETRY_DISABLED':'1','CI':'1','NO_COLOR':'1','NPM_CONFIG_USERCONFIG':str(scratch/'empty.npmrc'),'NPM_CONFIG_GLOBALCONFIG':str(scratch/'empty.npmrc')})
result={'evidenceClass':'REVIEWER EXECUTED','sourceRevision':'d88f7e1600087bfc51ee3a04dbb1c8c7978a1f80','scratch':str(scratch),'app':str(app),'node':node,'pnpmJs':str(pnpm),'commands':[], 'sourceFiles':{p.relative_to(source).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in source.rglob('*') if p.is_file()}}
def save():
    (OUT/'execution.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
def run(label,args):
    rec={'label':label,'argv':[node,str(pnpm),*args],'cwd':str(app),'startedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat()}
    with (OUT/(label+'.log')).open('w',encoding='utf-8') as log:
        p=subprocess.run(rec['argv'],cwd=app,env=env,stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
    rec.update(exitCode=p.returncode,endedAtUtc=datetime.datetime.now(datetime.timezone.utc).isoformat(),log=label+'.log')
    result['commands'].append(rec);save();print(label,p.returncode,flush=True)
    if p.returncode:raise SystemExit(p.returncode)
save()
run('frozen-install',['install','--frozen-lockfile','--store-dir',str(scratch/'store'),'--config.cache-dir='+str(scratch/'cache')])
run('unit-baseline',['test:unit'])
run('production-build',['build'])
result['lockUnchanged']=hashlib.sha256((app/'pnpm-lock.yaml').read_bytes()).hexdigest()==result['sourceFiles']['pnpm-lock.yaml']
save()
