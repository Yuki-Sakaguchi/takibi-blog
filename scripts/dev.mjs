// ビルドして http://localhost:5173 で配信。posts/ などを保存すると自動で再ビルド
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { build, ROOT } from './build.mjs';

const PORT = Number(process.env.PORT || 5173);
const TYPES = { '.html':'text/html; charset=utf-8', '.json':'application/json', '.js':'text/javascript', '.css':'text/css',
  '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.gif':'image/gif', '.webp':'image/webp', '.svg':'image/svg+xml' };

const run = () => build().catch(e => console.error('ビルド失敗:', e.message));
await run();

let timer = null;
for (const target of ['posts', 'src', 'public', 'site.config.json']){
  const p = path.join(ROOT, target);
  if (!fs.existsSync(p)) continue;
  fs.watch(p, { recursive: true }, () => { clearTimeout(timer); timer = setTimeout(run, 150); });
}

http.createServer((req, res) => {
  let file = path.join(ROOT, 'dist', decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(path.join(ROOT, 'dist'))) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (err, buf) => {
    if (err){ res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(buf);
  });
}).listen(PORT, () => console.log(`http://localhost:${PORT}/`));
