const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const repo = process.cwd();
const attemptRoot = __dirname;
const revision = path.join(repo, 'deliveries/production-environment/revisions/local-corrections-r1');
const port = Number(process.argv[2] || 3157);
const environmentAttempt = process.argv[3] || 'build-attempt-19';
const fixtureAttempt = process.argv[4] || 'fixture-attempt-12';
const ts = require(path.join(repo, 'app/node_modules/typescript'));

function within(root, file) {
  return file === root || file.startsWith(root + path.sep);
}

const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1:' + port);
    let base;
    let relative;

    if (url.pathname === '/') {
      base = attemptRoot;
      relative = 'art-harness.html';
    } else if (url.pathname.startsWith('/src/')) {
      base = path.join(repo, 'app/src');
      relative = url.pathname.slice(5) + (url.pathname.endsWith('.ts') ? '' : '.ts');
    } else if (url.pathname.startsWith('/three/')) {
      base = path.join(repo, 'app/node_modules/three');
      relative = url.pathname.slice(7);
    } else if (url.pathname.startsWith('/candidate/')) {
      base = path.join(revision, 'evidence');
      relative = url.pathname.slice(11);
    } else if (url.pathname.startsWith('/models/')) {
      base = path.join(repo, 'app/public/models');
      relative = url.pathname.slice(8);
    } else {
      res.writeHead(404);
      res.end('not found');
      return;
    }

    const file = path.resolve(base, relative);
    if (!within(base, file)) {
      res.writeHead(403);
      res.end('outside allowed root');
      return;
    }
    const bytes = fs.readFileSync(file);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Source-SHA256', crypto.createHash('sha256').update(bytes).digest('hex'));
    res.setHeader('Content-Type',
      file.endsWith('.html') ? 'text/html' :
      file.endsWith('.js') || file.endsWith('.ts') ? 'text/javascript' :
      file.endsWith('.json') ? 'application/json' :
      file.endsWith('.glb') ? 'model/gltf-binary' : 'application/octet-stream');
    res.end(file.endsWith('.ts')
      ? ts.transpileModule(bytes.toString('utf8'), {
          compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
        }).outputText
      : bytes);
  } catch (error) {
    res.writeHead(500);
    res.end(error.stack || String(error));
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(JSON.stringify({
    server: 'parent-owned read-only integrated art review harness',
    url: 'http://127.0.0.1:' + port,
    environmentAttempt,
    fixtureAttempt
  }));
});


