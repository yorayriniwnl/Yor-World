const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const repo = path.resolve(__dirname, '../../../../../..');
const revision = path.resolve(__dirname, '../..');
const ts = require(path.join(repo, 'app/node_modules/typescript'));
const port = Number(process.argv[2] || 3151);
function within(root, file) { return file === root || file.startsWith(root + path.sep); }
const server = http.createServer((req,res)=>{
  try {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    let base, relative;
    if (url.pathname === '/') { base=__dirname; relative='art-harness.html'; }
    else if (url.pathname === '/asset-manifest.json') {base=path.join(repo,'app/public');relative='asset-manifest.json';}
    else if (url.pathname.startsWith('/src/')) { base=path.join(repo,'app/src'); relative=url.pathname.slice(5)+(url.pathname.endsWith('.ts')?'':'.ts'); }
    else if (url.pathname.startsWith('/three/')) { base=path.join(repo,'app/node_modules/three'); relative=url.pathname.slice(7); }
    else if (url.pathname.startsWith('/candidate/')) { base=path.join(revision,'evidence'); relative=url.pathname.slice(11); }
    else if (url.pathname.startsWith('/models/')) { base=path.join(repo,'app/public/models'); relative=url.pathname.slice(8); }
    else { res.writeHead(404); res.end(); return; }
    const file=path.resolve(base,relative);
    if (!within(base,file)) {res.writeHead(403);res.end();return;}
    const bytes=fs.readFileSync(file);
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Source-SHA256',crypto.createHash('sha256').update(bytes).digest('hex'));
    res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.json')?'application/json':file.endsWith('.js')||file.endsWith('.ts')?'text/javascript':'application/octet-stream');
    res.end(file.endsWith('.ts')?ts.transpileModule(bytes.toString('utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText:bytes);
  } catch(error) {res.writeHead(500);res.end(error.stack);}
});
server.listen(port,'127.0.0.1',()=>console.log(`Owned art inspection harness http://127.0.0.1:${port}; actual source read only; no Next output mutation`));
