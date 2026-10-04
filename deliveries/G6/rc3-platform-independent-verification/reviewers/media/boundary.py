from pathlib import Path
import re,json,hashlib
base=Path('C:/Users/yoray/AppData/Local/Temp/yw-iv-2a186/app'); src=base/'src'
files=list(src.rglob('*.ts'))+list(src.rglob('*.tsx'))
clients=[p for p in files if re.match(r'\s*[\"\']use client[\"\']',p.read_text(encoding='utf-8-sig'))]
bad=[]; visited=set(); edges=[]
for client in clients:
 pending=[client]; seen=set()
 while pending:
  p=pending.pop()
  if p in seen:continue
  seen.add(p);visited.add(p)
  text=p.read_text(encoding='utf-8-sig')
  if '/server/' in p.as_posix() or re.search('SUPABASE_SERVICE_ROLE_KEY|DATABASE_URL|RESEND_API_KEY',text):bad.append(str(p))
  specs=re.findall(r'(?:from\s*|import\s*\(\s*|import\s*)[\"\']([^\"\']+)[\"\']',text)
  for spec in specs:
   edges.append([str(p.relative_to(src)),spec])
   if spec=='sharp' or spec.startswith('sharp/'):bad.append(str(p)+':'+spec)
   target=src/spec[2:] if spec.startswith('@/') else p.parent/spec if spec.startswith('.') else None
   if target:
    options=[target,target.with_suffix('.ts'),target.with_suffix('.tsx'),target/'index.ts',target/'index.tsx']
    match=next((q.resolve() for q in options if q.is_file()),None)
    if match:pending.append(match)
out={'clientRoots':len(clients),'reachableFiles':len(visited),'imports':edges,'violations':bad,'method':'Independent conservative textual import/export/dynamic-import graph, supplemented by actual Next browser artifact scan when build exists','sourceHashes':{str(p.relative_to(src)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(visited)}}
build=base/'.next/static'
if build.exists():
 js=list(build.rglob('*.js'));out['builtChunks']=len(js);out['nativeLeakMatches']=[str(p.relative_to(base)) for p in js if re.search(r'sharp/lib|sharp-win32|libvips|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SERVICE_KEY',p.read_text(encoding='utf-8',errors='replace'))]
else:out['builtArtifactScan']='NOT RUN: parent production build not yet available'
dest=Path(__file__).parent/'boundary-results.json';dest.write_text(json.dumps(out,indent=2));print(json.dumps({k:v for k,v in out.items() if k not in ['imports','sourceHashes']},indent=2))
