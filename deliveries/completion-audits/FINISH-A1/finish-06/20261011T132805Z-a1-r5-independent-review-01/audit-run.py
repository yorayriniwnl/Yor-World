from pathlib import Path
import subprocess,json,os,re,hashlib,sys
sys.stdout.reconfigure(encoding='utf-8',errors='replace')
ROOT=Path(__file__).resolve().parent
APP=ROOT/'.work/replay/app'
repo=Path.cwd()
commands=json.loads((ROOT/'commands.json').read_text())
def run(name,args):
    env=os.environ.copy(); env.update(CI='1',NO_COLOR='1',FORCE_COLOR='0',TMP=str(ROOT/'.work/tmp'),TEMP=str(ROOT/'.work/tmp'))
    (ROOT/'.work/tmp').mkdir(exist_ok=True)
    p=subprocess.run(args,cwd=APP,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
    (ROOT/(name+'.log')).write_bytes(p.stdout)
    (ROOT/(name+'.exit')).write_text(str(p.returncode)+'\n')
    commands.append({'argv':args,'cwd':str(APP),'exitCode':p.returncode,'rawLog':name+'.log','environmentOverrides':{k:env[k] for k in ['CI','NO_COLOR','FORCE_COLOR','TMP','TEMP']}})
    (ROOT/'commands.json').write_text(json.dumps(commands,indent=2)+'\n')
    print(name,p.returncode,p.stdout[-1500:].decode('utf-8','replace'),flush=True)
vitest=['node','C:/yw-r5c/app/node_modules/vitest/vitest.mjs','run','--cache=false','--configLoader','runner','--maxWorkers','1','--no-file-parallelism']
if '--probes' not in sys.argv:
    run('independent-unit',vitest+['tests/unit','--exclude','**/audit-contract-probes.test.ts'])
    run('independent-integration',vitest+['--config','vitest.integration.config.ts'])
run('independent-contract-probes-final',vitest+['tests/unit/platform/audit-contract-probes.test.ts','--reporter','verbose'])
