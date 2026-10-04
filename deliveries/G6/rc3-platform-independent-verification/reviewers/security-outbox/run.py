import subprocess,json,pathlib,time,sys
sys.stdout.reconfigure(encoding='utf8',errors='replace')
own=pathlib.Path(__file__).parent
app=pathlib.Path('C:/Users/yoray/AppData/Local/Temp/yw-iv-2a186/app')
commands=[['node','--version'],['cmd','/c','pnpm','--version'],['node',str(app/'node_modules/vitest/vitest.mjs'),'run','--config',str(own/'vitest.config.mjs'),'--reporter=default','--reporter=json','--outputFile='+str(own/'vitest-results.json')]]
ledger=json.loads((own/'commands.json').read_text()) if (own/'commands.json').exists() else []
for i,cmd in enumerate(commands):
 start=time.time()
 p=subprocess.run(cmd,cwd=app,capture_output=True,text=True,encoding='utf8',errors='replace')
 index=len(ledger)+1
 (own/f'command-{index}.log').write_text(p.stdout+'\nSTDERR\n'+p.stderr,encoding='utf8')
 ledger.append({'command':cmd,'cwd':str(app),'exitCode':p.returncode,'seconds':time.time()-start,'log':f'command-{index}.log'})
 (own/'commands.json').write_text(json.dumps(ledger,indent=2),encoding='utf8')
 print(json.dumps(ledger[-1]),p.stdout[-3500:],p.stderr[-1500:])
