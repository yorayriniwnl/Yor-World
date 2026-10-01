from pathlib import Path
import json,subprocess,hashlib,datetime
out=Path(__file__).resolve().parent;root=out.parents[3]
d=json.loads((out/'execution.json').read_text(encoding='utf-8'));app=Path(d['app'])
for relative in ['tests/reviewer/real-animation.test.ts','reviewer.vitest.config.ts']:
    target=(app/relative).resolve();assert target.is_relative_to(app.resolve());target.unlink(missing_ok=True)
checks=[]
for label,args in [('lint',['lint']),('typecheck',['typecheck'])]:
    argv=[d['node'],d['pnpmJs'],*args]
    with (out/(label+'.log')).open('w',encoding='utf-8') as log:p=subprocess.run(argv,cwd=app,stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
    checks.append({'label':label,'argv':argv,'exitCode':p.returncode,'recordedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()});print(label,p.returncode)
differences=[]
for name,expected in d['sourceFiles'].items():
    actual=hashlib.sha256((app/name).read_bytes()).hexdigest()
    if actual!=expected:differences.append({'path':name,'before':expected,'after':actual})
(out/'final-checks.json').write_text(json.dumps({'evidenceClass':'REVIEWER EXECUTED','sourceRevision':d['sourceRevision'],'checks':checks,'copiedCandidateDifferencesAfterBuild':differences},indent=2),encoding='utf-8')
