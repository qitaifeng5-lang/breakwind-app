import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const assets = new Map(Object.entries({
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/knowledge.js': ['knowledge.js', 'text/javascript; charset=utf-8'],
  '/engine.js': ['engine.js', 'text/javascript; charset=utf-8'],
  '/running.js': ['running.js', 'text/javascript; charset=utf-8'],
  '/fuel.js': ['fuel.js', 'text/javascript; charset=utf-8'],
  '/model.js': ['model.js', 'text/javascript; charset=utf-8'],
  '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
  '/hero.jpg': ['hero.jpg', 'image/jpeg'],
  '/icon.svg': ['icon.svg', 'image/svg+xml'],
  '/icon-192.png': ['icon-192.png', 'image/png'],
  '/icon-512.png': ['icon-512.png', 'image/png'],
  '/manifest.webmanifest': ['manifest.webmanifest', 'application/manifest+json'],
  '/sw.js': ['sw.js', 'text/javascript; charset=utf-8']
}));

const port = Number(process.env.PORT || 4188);
createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  const asset = assets.get(path);
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  if (!asset) {
    response.writeHead(404).end('Not found');
    return;
  }
  const [name, contentType] = asset;
  try {
    const body = await readFile(new URL('public/' + name, import.meta.url));
    response.writeHead(200, {
      'Content-Type': contentType,
      'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-cache'
    }).end(request.method === 'HEAD' ? undefined : body);
  } catch (error) {
    response.writeHead(error.code === 'ENOENT' ? 404 : 500).end();
  }
}).listen(port, '127.0.0.1', () => console.log('http://127.0.0.1:' + port));
