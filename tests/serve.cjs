// Serveur statique de test : sert le repo, applique les en-têtes de vercel.json, 404.html en fallback.
// Usage : node tests/serve.cjs [port]   (défaut 8099)
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const PORT = +process.argv[2] || 8099;
const types = { '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.woff2': 'font/woff2', '.html': 'text/html; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml' };
function hdrs(url) {
  const out = {};
  try {
    const v = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
    for (const h of v.headers || []) {
      const re = new RegExp('^' + h.source.replace('(.*)', '.*').replace(/:path\*/, '.*') + '$');
      if (re.test(url)) for (const x of h.headers) out[x.key] = x.value;
    }
  } catch (e) { /* ignore */ }
  return out;
}
http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  let f = path.join(ROOT, u === '/' ? '/index.html' : u), code = 200;
  if (!f.startsWith(ROOT) || /\/(\.git|node_modules|tests|scripts|supabase)(\/|$)/.test(u) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { f = path.join(ROOT, '404.html'); code = 404; }
  res.writeHead(code, Object.assign({ 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }, hdrs(u)));
  fs.createReadStream(f).pipe(res);
}).listen(PORT, () => console.log('KOLTZ test server on http://localhost:' + PORT));
