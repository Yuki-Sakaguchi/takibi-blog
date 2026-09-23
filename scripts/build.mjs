// posts/*.md を読み込んで dist/ に静的サイトを書き出す
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { marked } from 'marked';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (...p) => path.join(ROOT, ...p);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const fmtDate = d => {
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
};
const fill = (tpl, vars) => tpl.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => (k in vars ? vars[k] : m));

export async function readLock(){
  try { return JSON.parse(await fs.readFile(P('map.lock.json'), 'utf8')); }
  catch { return { order: [] }; }
}
export async function writeLock(lock){
  await fs.writeFile(P('map.lock.json'), JSON.stringify(lock, null, 2) + '\n');
}

async function loadPosts(){
  const files = (await fs.readdir(P('posts'))).filter(f => f.endsWith('.md')).sort();
  const posts = [];
  for (const f of files){
    const { data, content } = matter(await fs.readFile(P('posts', f), 'utf8'));
    if (data.draft) continue;
    const slug = String(data.slug || f.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, ''));
    if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new Error(`${f}: slug "${slug}" は半角英小文字・数字・ハイフンだけにしてください`);
    if (!data.title) throw new Error(`${f}: title がありません`);
    if (!data.date) throw new Error(`${f}: date がありません`);
    if (posts.some(p => p.slug === slug)) throw new Error(`${f}: slug "${slug}" が重複しています`);
    const html = marked.parse(content);
    const text = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    posts.push({ slug, title: String(data.title), date: fmtDate(data.date), cat: String(data.category || '手記'), html,
      description: String(data.description || text.slice(0, 110)) });
  }
  return posts;
}

export async function build({ updateLock = true, log = console.log } = {}){
  const config = JSON.parse(await fs.readFile(P('site.config.json'), 'utf8'));
  const posts = await loadPosts();
  const bySlug = new Map(posts.map(p => [p.slug, p]));

  // 地図に置く順番は map.lock.json が正。ロックにない記事は日付順に末尾へ足す
  const lock = await readLock();
  const missing = posts.filter(p => !lock.order.includes(p.slug)).sort((a, b) => a.date.localeCompare(b.date));
  if (missing.length){
    lock.order.push(...missing.map(p => p.slug));
    if (updateLock){ await writeLock(lock); log(`map.lock.json に追加: ${missing.map(p => p.slug).join(', ')}`); }
    else log(`注意: map.lock.json にない記事があります（${missing.map(p => p.slug).join(', ')}）。npm run build をローカルで実行してコミットしてください`);
  }

  // 消した・下書きに戻した記事は「跡地」として区画だけ残し、以降の配置がずれないようにする
  const list = lock.order.map(slug => {
    const p = bySlug.get(slug);
    return p ? { slug: p.slug, title: p.title, date: p.date, cat: p.cat, html: p.html } : { slug, ghost: true };
  });

  const dist = P('dist');
  await fs.rm(dist, { recursive: true, force: true });
  await fs.mkdir(dist, { recursive: true });
  await fs.writeFile(path.join(dist, 'posts.json'), JSON.stringify(list));
  await fs.writeFile(path.join(dist, '.nojekyll'), '');

  const site = { SITE_TITLE: esc(config.title), SITE_DESCRIPTION: esc(config.description || ''), LANG: esc(config.lang || 'ja') };
  const indexTpl = await fs.readFile(P('src', 'index.html'), 'utf8');
  await fs.writeFile(path.join(dist, 'index.html'), fill(indexTpl, site));

  const postTpl = await fs.readFile(P('src', 'post.html'), 'utf8');
  const base = config.url ? config.url.replace(/\/?$/, '/') : '';
  for (const p of posts){
    const dir = path.join(dist, 'posts', p.slug);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'index.html'), fill(postTpl, {
      ...site, TITLE: esc(p.title), DESCRIPTION: esc(p.description), DATE: esc(p.date.replace(/-/g, '.')),
      CATEGORY: esc(p.cat), SLUG: encodeURIComponent(p.slug), CONTENT: p.html,
      OG_URL: base ? `<meta property="og:url" content="${esc(base + 'posts/' + p.slug + '/')}">` : ''
    }));
  }

  try { await fs.cp(P('public'), dist, { recursive: true }); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  log(`ビルド完了: 手記 ${posts.length} 冊 / 区画 ${list.length}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)){
  build({ updateLock: !process.argv.includes('--ci') }).catch(e => { console.error(e.message); process.exit(1); });
}
