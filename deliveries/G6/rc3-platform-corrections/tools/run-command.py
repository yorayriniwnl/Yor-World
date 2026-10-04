"""Run an argv command and retain canonical UTF-8 LF output and actual exit metadata."""
import argparse, datetime, json, os, pathlib, subprocess, sys, time
parser=argparse.ArgumentParser()
parser.add_argument('--cwd',required=True)
parser.add_argument('--output',required=True)
parser.add_argument('command',nargs=argparse.REMAINDER)
args=parser.parse_args()
command=args.command
if command and command[0]=='--': command=command[1:]
if not command: parser.error('missing command')
output=pathlib.Path(args.output);output.parent.mkdir(parents=True,exist_ok=True)
repository=pathlib.Path(args.cwd).resolve().parent
def app_tree():
    import hashlib
    snapshot=json.loads((pathlib.Path(__file__).resolve().parent.parent/'evidence/final-source-snapshot.json').read_text())
    listing=subprocess.check_output(['git','ls-files','--stage','--','app'],cwd=repository)
    if hashlib.sha256(listing).hexdigest()!=snapshot['indexListingSha256']:
        raise RuntimeError('Source index differs from parent snapshot')
    return snapshot['appTree']
def working_delta():
    return subprocess.check_output(['git','diff','--name-only','--','app'],cwd=repository).decode().splitlines()
before_tree=app_tree()
before_delta=working_delta()
started=datetime.datetime.now(datetime.timezone.utc).isoformat(); tick=time.monotonic()
process=subprocess.run(command,cwd=args.cwd,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
text=process.stdout.decode('utf-8',errors='replace').replace('\r\n','\n')
output.with_suffix('.log').write_text(text,encoding='utf-8',newline='\n')
receipt={'command':command,'cwd':str(pathlib.Path(args.cwd).resolve()),'startedAtUtc':started,'endedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'exitCode':process.returncode,'seconds':round(time.monotonic()-tick,3),'log':output.with_suffix('.log').name,'logEncoding':'UTF-8 canonical LF','workingSourceDeltaBefore':before_delta,'workingSourceDeltaAfter':working_delta(),'indexedAppTreeBefore':before_tree,'indexedAppTreeAfter':app_tree(),'fixtureFlags':{name:os.environ.get(name) for name in ['YOR_E2E_FIXTURE','YOR_TEST_DATABASE_PATH']}}
output.with_suffix('.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(receipt),flush=True)
sys.exit(process.returncode)
