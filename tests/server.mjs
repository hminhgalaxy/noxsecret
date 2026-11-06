/* Server tĩnh mô phỏng vercel.json: có file thì trả file, không thì rewrite về /index.html (SPA). */
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".txt": "text/plain", ".xml": "application/xml", ".webmanifest": "application/manifest+json" };
export function startServer(port = 0) {
  const hits = [];
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, "http://x"); let p = decodeURIComponent(u.pathname); hits.push(p);
    let f = path.join(ROOT, p);
    const blocked = /^\/(tests|er\.original\.html|database\.rules\.json|firebase\.json|vercel\.json)/.test(p);
    if (!blocked && f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile()) { res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); return fs.createReadStream(f).pipe(res); }
    if (/^\/api\//.test(p)) { const h = (globalThis.__api || {})[p]; if (h) return h(req, res); res.writeHead(404); return res.end("not found"); }
    if (/^\/assets\//.test(p)) { res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, { "content-type": MIME[".html"] }); fs.createReadStream(path.join(ROOT, "index.html")).pipe(res);
  });
  return new Promise(r => srv.listen(port, "127.0.0.1", () => r({ srv, port: srv.address().port, hits })));
}
