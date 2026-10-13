import json,pathlib,subprocess
AUDIT=pathlib.Path(__file__).resolve().parent
ROOT=AUDIT.parents[4]
COMMIT='6de3e05a289e86e759d4602e9ee49f1a19f3b8da'
CHECKOUT=pathlib.Path('C:/yw-r7-delta-6de3e05a-01')
if CHECKOUT.exists():raise RuntimeError('Replay root occupied; do not resume')
CHECKOUT.parent.mkdir(exist_ok=True)
receipts=[]
for args in [['git','-c','core.autocrlf=false','-c','core.longpaths=true','clone','--shared','--no-checkout','--quiet',str(ROOT),str(CHECKOUT)],['git','-C',str(CHECKOUT),'-c','core.autocrlf=false','-c','core.longpaths=true','checkout','--detach','--quiet',COMMIT],['git','-C',str(CHECKOUT),'rev-parse','HEAD']]:
 p=subprocess.run(args,capture_output=True,text=True);receipts.append({'command':args,'exitCode':p.returncode,'stdout':p.stdout,'stderr':p.stderr})
 if p.returncode:break
(AUDIT/'replay-setup-short-path-receipts.json').write_text(json.dumps(receipts,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'lastExit':receipts[-1]['exitCode'],'checkout':str(CHECKOUT),'head':receipts[-1]['stdout'].strip()}))
