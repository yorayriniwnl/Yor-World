// deliveries/W2/playback/serve.js
// Zero-dependency local static file server for YOR WORLD W2 proof harness.
const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.css': 'text/css; charset=utf-8',
  '.wasm': 'application/wasm'
};

const W2_ROOT = path.resolve(__dirname, '..');

function createServer() {
  return http.createServer((req, res) => {
    // Private local harness: no cross-origin access or mutation routes.
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405); res.end(); return;
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    let reqPath;
    try { reqPath = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname); }
    catch { res.writeHead(400); res.end(); return; }
    if (reqPath === '/favicon.ico') {
      res.writeHead(204);
      res.end();
      return;
    }
    if (reqPath === '/' || reqPath === '/playback' || reqPath === '/playback/') {
      reqPath = '/playback/index.html';
    }

    const filePath = path.resolve(W2_ROOT, '.' + reqPath);
    const relative = path.relative(W2_ROOT, filePath);

    // Prevent directory traversal outside W2_ROOT
    if (relative.startsWith('..') || path.isAbsolute(relative) || !(
      relative.startsWith('playback' + path.sep) || ['avatar-proof.glb', 'fixture-proof.glb'].includes(relative))) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('403 Forbidden');
      return;
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`404 Not Found: ${reqPath}`);
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': stats.size,
        'Cache-Control': 'no-cache'
      });

      if (req.method === 'HEAD') res.end();
      else fs.createReadStream(filePath).pipe(res);
    });
  });
}

function startServer(port = 8080) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(port, '127.0.0.1', () => {
      const actualPort = server.address().port;
      resolve({ server, port: actualPort, url: `http://127.0.0.1:${actualPort}/playback/index.html` });
    });
    server.on('error', reject);
  });
}

if (require.main === module) {
  const port = parseInt(process.env.PORT || '8080', 10);
  startServer(port).then(({ url, port }) => {
    console.log(`[W2 Serve] Harness running at ${url} (port ${port})`);
    console.log('[W2 Serve] Press Ctrl+C to terminate.');
  }).catch(err => {
    console.error('[W2 Serve] Error starting server:', err);
    process.exit(1);
  });
}

module.exports = { createServer, startServer };
