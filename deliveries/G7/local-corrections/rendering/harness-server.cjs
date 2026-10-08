const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const ts=require('../../../../app/node_modules/typescript');
const root=path.resolve(__dirname,'../../../..');
http.createServer((req,res)=>{
 try {
  const url=new URL(req.url,'http://127.0.0.1:3141');
  if(url.pathname==='/'){res.setHeader('Content-Type','text/html');res.end(fs.readFileSync(path.join(__dirname,'harness.html')));return;}
  let file;
  if(url.pathname.startsWith('/src/'))file=path.join(root,'app',url.pathname.endsWith('.ts')?url.pathname:url.pathname+'.ts');
  else if(url.pathname.startsWith('/three/'))file=path.join(root,'app/node_modules/three',url.pathname.slice(7));
  else if(url.pathname.startsWith('/models/'))file=path.join(root,'app/public',url.pathname);
  else {res.statusCode=404;res.end();return;}
  if(file.endsWith('.ts')){res.setHeader('Content-Type','text/javascript');res.end(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);}
  else{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':'application/octet-stream');res.end(fs.readFileSync(file));}
 }catch(error){res.statusCode=500;res.end(error.stack);}
}).listen(3141,'127.0.0.1',()=>console.log('Separate rendering diagnosis harness on3141; no Next output mutation'));
