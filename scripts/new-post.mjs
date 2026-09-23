// 使い方: npm run new -- <slug> "<タイトル>"
import fs from 'node:fs/promises';
import path from 'node:path';
import { ROOT, readLock, writeLock } from './build.mjs';

const [slug, ...rest] = process.argv.slice(2);
const title = rest.join(' ') || '無題の手記';
if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)){
  console.error('使い方: npm run new -- <slug> "<タイトル>"\nslug は半角英小文字・数字・ハイフン（例: my-first-camp）');
  process.exit(1);
}
const d = new Date();
const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const file = path.join(ROOT, 'posts', `${date}-${slug}.md`);
const lock = await readLock();
if (lock.order.includes(slug)){ console.error(`slug "${slug}" はすでに使われています`); process.exit(1); }

await fs.writeFile(file, `---\ntitle: ${JSON.stringify(title)}\ndate: ${date}\ncategory: 手記\n---\n\nここに本文を書きます。\n`, { flag: 'wx' });
lock.order.push(slug);
await writeLock(lock);
console.log(`作成しました: posts/${path.basename(file)}（地図の最前線に置かれます）`);
