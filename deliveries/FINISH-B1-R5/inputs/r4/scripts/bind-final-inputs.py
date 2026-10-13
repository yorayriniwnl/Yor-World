import hashlib,json,pathlib,subprocess
OUT=pathlib.Path(__file__).resolve().parents[1];ROOT=OUT.parents[1]
rows=json.loads((OUT/'evidence/input-hashes.json').read_text())
amendment='b33631a9bcbd74cfca9e8f2495140a5eee322a9a'
for p in ['docs/planning/reconciliation-packets/2026-10-11-finish-25-r1-b1-glass-visibility-amendment.md','docs/planning/production-prompts/repairs-2026-10-11/15-CODEX-B1-R4.md','START_HERE.md']:
    raw=subprocess.check_output(['git','show',amendment+':'+p],cwd=ROOT);dest=OUT/'inputs/finish25-r1'/p;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(raw)
    if not any(r['path']==p and r['commit']==amendment for r in rows):rows.append(dict(commit=amendment,path=p,bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest()))
for r in rows:
    raw=subprocess.check_output(['git','show',r['commit']+':'+r['path']],cwd=ROOT);assert len(raw)==r['bytes'] and hashlib.sha256(raw).hexdigest()==r['sha256']
allocation=subprocess.check_output(['git','rev-parse','c2478400'],cwd=ROOT).decode().strip()
for p in ['docs/planning/reconciliation-packets/2026-10-11-finish-30-b1-r4-root-collision.md','docs/planning/production-prompts/repairs-2026-10-11/19-CODEX-B1-R4-R2.md']:
    raw=subprocess.check_output(['git','show',allocation+':'+p],cwd=ROOT)
    if not any(r['path']==p and r['commit']==allocation for r in rows):rows.append(dict(commit=allocation,path=p,bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest()))
(OUT/'evidence/input-hashes.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8')
versions={}
for name,cmd in [('git',['git','--version']),('python',['python','--version']),('node',['node','--version']),('blender',['C:/Program Files/Blender Foundation/Blender 5.2/blender.exe','--version'])]:
    r=subprocess.run(cmd,capture_output=True);assert r.returncode==0;versions[name]=dict(command=cmd,exit=r.returncode,output=(r.stdout+r.stderr).decode().strip())
browser=json.loads((OUT/'evidence/browser-results.json').read_text());validation=json.loads((OUT/'evidence/gltf-validation.json').read_text());versions.update({k:browser[k] for k in ['browser','playwright','three']});versions['gltf-validator']=validation['version']
(OUT/'evidence/tool-versions.json').write_text(json.dumps(versions,indent=2)+'\n',encoding='utf-8')
print(f'PASS: {len(rows)} pinned commit/path/raw-byte input receipts verified; versions recorded')
