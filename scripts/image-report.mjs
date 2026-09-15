// Phase 2.7 圖片盤點報告（需要 build output 與 image-variants manifest）
//
//   docs/design/IMAGE_OPTIMIZATION_REPORT.csv：public/images 全部原始圖片 + OG 圖（尺寸、格式、大小、使用頁面、首屏、WebP / AVIF、節省比例、預算狀態）
//   docs/design/UNUSED_IMAGE_ASSETS.csv：runtime 沒有使用的圖片（只列出，不刪除）
//
// 用法：pnpm build && pnpm images:report
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  BUDGETS,
  DIST_DIR,
  OG_DIR,
  PUBLIC_DIR,
  REPORT_CSV,
  UNUSED_CSV,
  csvCell,
  evaluateBudget,
  kb,
  readManifest,
  rel,
  walkFiles,
} from './lib/image-pipeline.mjs';
import { MARKETING_DIR } from './lib/servers.mjs';
import { loadSharp } from './lib/sharp.mjs';

const sharp = loadSharp();
const manifest = readManifest();
if (!manifest) throw new Error('找不到 image-variants.generated.json，請先執行 pnpm images:optimize');
if (!existsSync(path.join(DIST_DIR, 'index.html'))) throw new Error('找不到 apps/marketing/dist，請先執行 pnpm build');

const tagAttr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1] ?? null;
const routeOf = (file) => {
  const relative = path.relative(DIST_DIR, file).split(path.sep).join('/');
  if (relative === 'index.html') return '/';
  return `/${relative.replace(/\/index\.html$/, '').replace(/\.html$/, '')}`;
};

// ---- 各頁使用情形（<img src> 的 PNG fallback、<source srcset> 的 WebP / AVIF、og:image）----
const usage = new Map();
const touch = (src) => {
  if (!usage.has(src)) usage.set(src, { routes: new Set(), eager: new Set() });
  return usage.get(src);
};
for (const file of walkFiles(DIST_DIR).filter((item) => item.endsWith('.html'))) {
  const route = routeOf(file);
  if (route === '/404') continue;
  const html = readFileSync(file, 'utf8');
  for (const tag of html.match(/<img\b[^>]*>/g) ?? []) {
    const src = tagAttr(tag, 'src');
    if (!src?.startsWith('/images/')) continue;
    const entry = touch(src);
    entry.routes.add(route);
    if (tagAttr(tag, 'loading') !== 'lazy') entry.eager.add(route);
  }
  for (const tag of html.match(/<meta\b[^>]*property="og:image"[^>]*>/g) ?? []) {
    const src = (tagAttr(tag, 'content') ?? '').replace(/^https?:\/\/[^/]+/, '');
    if (src) touch(src).routes.add(route);
  }
}

const hashOf = (file) => createHash('sha1').update(readFileSync(file)).digest('hex');
const runtimeHashes = new Map(Object.keys(manifest.images).map((src) => [hashOf(path.join(PUBLIC_DIR, ...src.split('/').filter(Boolean))), src]));
const sourceFiles = walkFiles(path.join(MARKETING_DIR, 'src')).filter((file) => /\.(astro|ts|tsx|css|json)$/.test(file));
const sourceText = sourceFiles.map((file) => readFileSync(file, 'utf8')).join('\n');

const header = [
  'source', 'width', 'height', 'format', 'sizeBytes', 'usedBy', 'aboveFold', 'webpPath', 'webpSize', 'avifPath', 'avifSize', 'savingPercent',
  'status', 'role', 'webpVariants', 'avifVariants', 'webpQuality', 'avifQuality', 'psnrWebp', 'psnrAvif', 'budget', 'note',
];
const rows = [];
const unused = [];
const totals = { png: 0, webp: 0, avif: 0 };
let largest = { src: '', bytes: 0, format: '' };

const originals = walkFiles(path.join(PUBLIC_DIR, 'images')).filter((file) => /\.(png|jpe?g)$/i.test(file) && !file.startsWith(OG_DIR));
for (const file of originals.sort()) {
  const src = `/${path.relative(PUBLIC_DIR, file).split(path.sep).join('/')}`;
  const meta = await sharp(file).metadata();
  const bytes = statSync(file).size;
  const entry = manifest.images[src];
  const used = usage.get(src);
  if (entry) {
    const webp = entry.webp.at(-1);
    const avif = entry.avif.at(-1);
    const budget = evaluateBudget(entry);
    const over = budget.filter((check) => !check.ok);
    totals.png += bytes;
    totals.webp += webp.bytes;
    totals.avif += avif.bytes;
    for (const variant of [...entry.webp, ...entry.avif]) if (variant.bytes > largest.bytes) largest = { src: variant.src, bytes: variant.bytes };
    rows.push([
      rel(file), meta.width, meta.height, meta.format, bytes, [...(used?.routes ?? [])].sort().join(' '), used?.eager.size ? `yes (${[...used.eager].sort().join(' ')})` : 'no',
      webp.src, webp.bytes, avif.src, avif.bytes, ((1 - avif.bytes / bytes) * 100).toFixed(1),
      over.length ? 'optimized-over-budget' : 'optimized', entry.role,
      entry.webp.map((variant) => `${variant.width}w:${variant.bytes}`).join(' '), entry.avif.map((variant) => `${variant.width}w:${variant.bytes}`).join(' '),
      entry.quality?.webp ?? '', entry.quality?.avif ?? '', entry.psnr.webp, entry.psnr.avif,
      budget.map((check) => `${check.ok ? 'OK' : 'OVER'} ${check.name} ${kb(check.bytes)}/${kb(check.limit)}`).join('; '),
      'PNG 原檔保留（<img> fallback，現代瀏覽器載入 AVIF / WebP）',
    ]);
  } else {
    const duplicateOf = runtimeHashes.get(hashOf(file)) ?? '';
    const referenced = sourceText.includes(path.basename(file));
    const note = duplicateOf ? `與 runtime 圖 ${duplicateOf} 內容相同（byte-identical）` : '未被 runtime 使用';
    rows.push([rel(file), meta.width, meta.height, meta.format, bytes, [...(used?.routes ?? [])].sort().join(' '), 'no', '', '', '', '', '', 'unused', '', '', '', '', '', '', '', '', note]);
    unused.push([rel(file), meta.width, meta.height, bytes, duplicateOf, referenced ? 'yes' : 'no', note, '保留不刪除；確認不需要後可移到 docs/design/source-images 或刪除（不會發布 WebP / AVIF）']);
  }
}

for (const file of walkFiles(OG_DIR).filter((item) => item.endsWith('.png')).sort()) {
  const src = `/${path.relative(PUBLIC_DIR, file).split(path.sep).join('/')}`;
  const meta = await sharp(file).metadata();
  const bytes = statSync(file).size;
  const ok = bytes <= BUDGETS.og.png && meta.width === 1200 && meta.height === 630;
  rows.push([
    rel(file), meta.width, meta.height, meta.format, bytes, [...(usage.get(src)?.routes ?? [])].sort().join(' '), 'no (og:image)', '', '', '', '', '',
    ok ? 'og-image' : 'og-image-over-budget', 'og', '', '', '', '', '', '', `${ok ? 'OK' : 'OVER'} og PNG ${kb(bytes)}/${kb(BUDGETS.og.png)}`,
    '社群分享圖維持 PNG（社群平台對 WebP / AVIF 支援不一致）',
  ]);
}

mkdirSync(path.dirname(REPORT_CSV), { recursive: true });
writeFileSync(REPORT_CSV, `﻿${[header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')}\n`);
writeFileSync(
  UNUSED_CSV,
  `﻿${[['source', 'width', 'height', 'sizeBytes', 'duplicateOf', 'referencedInSource', 'note', 'recommendation'], ...unused].map((row) => row.map(csvCell).join(',')).join('\n')}\n`,
);

const saving = (value) => ((1 - value / totals.png) * 100).toFixed(1);
console.log(`[images:report] ${rel(REPORT_CSV)}：${rows.length} rows（runtime ${Object.keys(manifest.images).length}、unused ${unused.length}）`);
console.log(`[images:report] ${rel(UNUSED_CSV)}：${unused.length} rows`);
console.log(`[images:report] runtime 原尺寸合計：PNG ${kb(totals.png)} → WebP ${kb(totals.webp)}（-${saving(totals.webp)}%）/ AVIF ${kb(totals.avif)}（-${saving(totals.avif)}%）`);
console.log(`[images:report] 最大 runtime 變體：${largest.src} ${kb(largest.bytes)}`);
