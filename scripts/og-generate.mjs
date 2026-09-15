// Phase 2.7 正式 OG 圖產生器：HTML 樣板 → 本機 Chrome 截圖（1200×630）→ sharp 壓縮 PNG
//
// - 設定：apps/marketing/src/content/ogImages.ts（主標 / 副標 / 示意圖），品牌名稱讀取全站設定預設值
// - 視覺：深藍 / Teal 漸層、山稜線、品牌標誌、右側產品示意圖（使用 1080w WebP 裁切，不放整張設計稿）
// - 自動檢查：文字不可超出畫面、主標最多 2 行、輸出必須 1200×630、≤ 300 KB（超過會列出警告）
// - 不需人工修圖；字型使用 Windows 內建 Microsoft JhengHei（其他系統會用 Noto Sans TC / PingFang TC）
//
// 用法：pnpm og:generate [key ...]
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { BRAND_DIR, BUDGETS, OG_DIR, kb, readManifest, rel, toPublicFile } from './lib/image-pipeline.mjs';
import { MARKETING_DIR, ROOT, findChrome } from './lib/servers.mjs';
import { loadSharp } from './lib/sharp.mjs';

const sharp = loadSharp();
const only = new Set(process.argv.slice(2));
const { ogImages } = await import(pathToFileURL(path.join(MARKETING_DIR, 'src', 'content', 'ogImages.ts')).href);
const { getMockMarketingSiteSettings } = await import(pathToFileURL(path.join(ROOT, 'packages', 'database', 'src', 'site-settings.ts')).href);
const brand = getMockMarketingSiteSettings('default').brand;
const manifest = readManifest();

const escapeHtml = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const dataUri = (file, type) => `data:${type};base64,${readFileSync(file).toString('base64')}`;
const markSvg = readFileSync(path.join(BRAND_DIR, 'favicon.svg'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');

function visualUri(src) {
  if (!src) return null;
  const entry = manifest?.images?.[src];
  const variant = entry?.webp.find((item) => item.width === 1080) ?? entry?.webp.at(-1);
  if (!variant) throw new Error(`og:generate：${src} 沒有 WebP 版本，請先執行 pnpm images:optimize`);
  return dataUri(toPublicFile(variant.src), 'image/webp');
}

function html(config) {
  const visual = visualUri(config.visual);
  const lines = config.headline.map((line) => `<span>${escapeHtml(line)}</span>`).join('');
  const headlineSize = config.headline.length === 1 ? 72 : 56;
  return `<!doctype html><html lang="zh-Hant-TW"><head><meta charset="utf-8"><style>
  * { margin: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; overflow: hidden; }
  body { position: relative; background: #020617; color: #fff; font-family: 'Microsoft JhengHei', 'Noto Sans TC', 'PingFang TC', sans-serif; -webkit-font-smoothing: antialiased; }
  .bg { position: absolute; inset: 0; background:
      radial-gradient(640px 420px at 82% 30%, rgba(20,184,166,.30), transparent 70%),
      radial-gradient(560px 360px at 8% 110%, rgba(30,64,120,.70), transparent 70%),
      linear-gradient(135deg, #020617 0%, #0b1f3b 58%, #0f172a 100%); }
  .grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(148,163,184,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.07) 1px, transparent 1px); background-size: 48px 48px; -webkit-mask-image: linear-gradient(90deg, #000 0%, transparent 62%); }
  .ridge { position: absolute; left: 0; bottom: 0; width: 1200px; height: 190px; }
  .content { position: absolute; left: 72px; top: 60px; bottom: 58px; width: ${visual ? 560 : 760}px; display: flex; flex-direction: column; }
  .brand { display: flex; align-items: center; gap: 16px; }
  .brand svg { width: 58px; height: 58px; flex: none; }
  .zh { font-size: 34px; font-weight: 700; letter-spacing: 3px; line-height: 1; }
  .en { margin-top: 8px; font: 600 14px/1 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; letter-spacing: 6px; color: #cbd5e1; }
  .main { margin-top: auto; }
  .eyebrow { display: inline-block; padding: 7px 18px; border-radius: 999px; border: 1px solid rgba(45,212,191,.55); background: rgba(20,184,166,.16); color: #5eead4; font-size: 22px; font-weight: 700; letter-spacing: 1px; }
  h1 { margin-top: 22px; font-size: ${headlineSize}px; line-height: 1.2; font-weight: 700; letter-spacing: 1px; }
  h1 span { display: block; white-space: nowrap; }
  .sub { margin-top: 18px; font-size: 26px; line-height: 1.35; color: #cbd5e1; white-space: nowrap; }
  .bar { margin-top: 26px; width: 84px; height: 6px; border-radius: 3px; background: #14b8a6; }
  .glow { position: absolute; right: 36px; top: 92px; width: 560px; height: 420px; border-radius: 48px; background: rgba(20,184,166,.20); filter: blur(46px); }
  .frame { position: absolute; right: 60px; top: 110px; width: 520px; height: 380px; padding: 10px; border-radius: 26px; border: 1px solid rgba(255,255,255,.20); background: rgba(255,255,255,.07); box-shadow: 0 34px 80px rgba(0,0,0,.55); }
  .frame img { display: block; width: 100%; height: 100%; object-fit: cover; border-radius: 18px; }
  .big-mark { position: absolute; right: 120px; top: 150px; width: 250px; height: 250px; filter: drop-shadow(0 30px 60px rgba(20,184,166,.35)); }
  .big-mark svg { width: 100%; height: 100%; }
</style></head><body>
  <div class="bg"></div><div class="grid"></div>
  ${visual ? `<div class="glow"></div><div class="frame"><img src="${visual}" alt=""></div>` : `<div class="glow"></div><div class="big-mark">${markSvg}</div>`}
  <svg class="ridge" viewBox="0 0 1440 320" preserveAspectRatio="none" aria-hidden="true">
    <path fill="rgba(30,58,95,.45)" d="M0 190 120 120l90 50 140-110 120 90 110-60 150 120 130-150 140 110 120-70 130 90 90-40v170H0Z"/>
    <path fill="rgba(15,40,70,.70)" d="M0 240 150 170l110 60 160-120 140 110 120-60 170 110 150-90 130 70 150-80 160 90v160H0Z"/>
    <path fill="rgba(2,6,23,.92)" d="M0 290 180 230l140 40 170-60 160 70 190-50 170 50 180-60 250 70v70H0Z"/>
  </svg>
  <div class="content">
    <div class="brand">${markSvg}<div><div class="zh">${escapeHtml(brand.brandNameZh)}</div><div class="en">${escapeHtml(brand.brandNameEn)}</div></div></div>
    <div class="main">
      <div class="eyebrow">${escapeHtml(config.eyebrow)}</div>
      <h1>${lines}</h1>
      <p class="sub">${escapeHtml(config.subline)}</p>
      <div class="bar"></div>
    </div>
  </div>
</body></html>`;
}

async function psnr(a, b) {
  const [left, right] = await Promise.all([sharp(a).removeAlpha().raw().toBuffer(), sharp(b).removeAlpha().raw().toBuffer()]);
  let squared = 0;
  for (let index = 0; index < left.length; index += 1) squared += (left[index] - right[index]) ** 2;
  const mse = squared / left.length;
  return mse === 0 ? 99 : 10 * Math.log10((255 * 255) / mse);
}

mkdirSync(OG_DIR, { recursive: true });
const browser = await chromium.launch({ executablePath: findChrome(), headless: true });
let failed = false;
try {
  const context = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  for (const config of Object.values(ogImages)) {
    if (only.size > 0 && !only.has(config.key)) continue;
    if (config.headline.length < 1 || config.headline.length > 2) throw new Error(`${config.key}: headline 必須 1–2 行`);
    await page.setContent(html(config), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.evaluate(() => {
      const problems = [];
      const content = document.querySelector('.content').getBoundingClientRect();
      const frame = document.querySelector('.frame, .big-mark')?.getBoundingClientRect();
      for (const element of document.querySelectorAll('.zh, .en, .eyebrow, h1 span, .sub')) {
        const rect = element.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(element);
        const text = range.getBoundingClientRect();
        if (text.right > content.right + 1 || rect.bottom > 630 || rect.top < 0) problems.push(`${element.className || element.tagName} 超出內容區`);
        if (frame && text.right > frame.left - 16 && text.bottom > frame.top) problems.push(`${element.className || element.tagName} 壓到右側示意圖`);
      }
      return problems;
    });
    const raw = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1200, height: 630 } });
    const truecolor = await sharp(raw).png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
    const palette = await sharp(raw).png({ palette: true, quality: 95, effort: 10, colours: 256, dither: 1 }).toBuffer();
    const paletteScore = await psnr(raw, palette);
    // 調色盤 PNG 畫質足夠（PSNR ≥ 38 dB）且較小時使用，否則保留全彩 PNG
    const usePalette = paletteScore >= 38 && palette.length < truecolor.length;
    const output = usePalette ? palette : truecolor;
    const target = path.join(OG_DIR, path.basename(config.src));
    writeFileSync(target, output);
    const meta = await sharp(output).metadata();
    const problems = [...overflow];
    if (meta.width !== 1200 || meta.height !== 630) problems.push(`尺寸 ${meta.width}×${meta.height}`);
    const size = statSync(target).size;
    const overBudget = size > BUDGETS.og.png;
    console.log(
      `${problems.length ? '✗' : overBudget ? '!' : '✓'} ${rel(target)}  ${meta.width}×${meta.height}  ${kb(size)}  ${usePalette ? `palette（PSNR ${paletteScore.toFixed(1)} dB）` : 'truecolor'}${overBudget ? '  超過 300 KB 預算' : ''}${problems.length ? `  ${problems.join('; ')}` : ''}`,
    );
    if (problems.length) failed = true;
  }
  await context.close();
} finally {
  await browser.close();
}
if (!existsSync(path.join(OG_DIR, 'default-og-1200x630.png'))) failed = true;
if (failed) {
  console.error('[og:generate] FAILED');
  process.exit(1);
}
console.log('[og:generate] done');
