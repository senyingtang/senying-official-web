// Phase 2.7 圖片管線共用設定：轉檔參數、尺寸、預算、manifest 讀取
// images:optimize / images:report / asset:verify / perf:verify 共用，避免各自寫一套規則。
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { MARKETING_DIR, ROOT } from './servers.mjs';

export const PUBLIC_DIR = path.join(MARKETING_DIR, 'public');
export const DIST_DIR = path.join(MARKETING_DIR, 'dist');
export const MEDIA_FILE = path.join(MARKETING_DIR, 'src', 'content', 'media.ts');
export const MANIFEST_FILE = path.join(MARKETING_DIR, 'src', 'content', 'image-variants.generated.json');
export const OG_DIR = path.join(PUBLIC_DIR, 'images', 'og');
export const BRAND_DIR = path.join(PUBLIC_DIR, 'brand');
export const REPORT_CSV = path.join(ROOT, 'docs', 'design', 'IMAGE_OPTIMIZATION_REPORT.csv');
export const UNUSED_CSV = path.join(ROOT, 'docs', 'design', 'UNUSED_IMAGE_ASSETS.csv');
export const BUDGET_MD = path.join(ROOT, 'docs', 'performance', 'PHASE_2_7_IMAGE_BUDGET.md');

/** srcset 中間尺寸；另外一律輸出原尺寸 */
export const VARIANT_WIDTHS = [640, 1080];

/**
 * 編碼參數（視覺品質優先）：
 * - WebP q80：插畫 / UI 示意圖肉眼幾乎無差異
 * - AVIF q55：約等於 WebP q80 的畫質，檔案更小；不支援 AVIF 的瀏覽器會改用 WebP，再退回 PNG
 */
export const ENCODERS = {
  webp: { quality: 80, effort: 6, smartSubsample: true },
  avif: { quality: 55, effort: 5, chromaSubsampling: '4:2:0' },
};
export const SETTINGS_KEY = JSON.stringify({ widths: VARIANT_WIDTHS, ENCODERS });

/** 低於此 PSNR（原尺寸，相對原始 PNG）視為畫質損失過大，轉檔會失敗 */
export const MIN_PSNR_DB = 34;

const KB = 1024;
/**
 * 圖片預算（理想值，不是破壞畫質的硬性規則）。超過時在 PHASE_2_7_IMAGE_BUDGET.md 說明原因。
 * - hero：原尺寸 WebP ≤ 350 KB、AVIF ≤ 250 KB
 * - card：卡片最大實際會用到的 1080w WebP ≤ 200 KB
 * - thumbnail：640w WebP ≤ 120 KB（所有圖片）
 * - background：原尺寸 WebP ≤ 300 KB
 * - og：≤ 300 KB
 */
export const BUDGETS = {
  hero: { webp: 350 * KB, avif: 250 * KB },
  card: { webp1080: 200 * KB },
  thumbnail: { webp640: 120 * KB },
  background: { webp: 300 * KB },
  og: { png: 300 * KB },
};

/**
 * 超過預算但保留的圖片與原因（key：media.ts src）。perf:verify 會把原因寫進 PHASE_2_7_IMAGE_BUDGET.md。
 * 目前所有 runtime 圖片都在預算內，沒有例外。
 */
export const BUDGET_EXCEPTIONS = {};

export const toPublicFile =(webPath) => path.join(PUBLIC_DIR, ...webPath.split('/').filter(Boolean));
export const rel = (file) => path.relative(ROOT, file).split(path.sep).join('/');
export const kb = (bytes) => `${(bytes / KB).toFixed(1)} KB`;

/** /images/a/b-final.png + webp + 640 → /images/a/b-final-640w.webp（原尺寸不加寬度後綴） */
export function variantWebPath(src, format, width, originalWidth) {
  const base = src.replace(/\.(png|jpe?g)$/i, '');
  return width === originalWidth ? `${base}.${format}` : `${base}-${width}w.${format}`;
}

export function variantWidths(originalWidth) {
  return [...new Set([...VARIANT_WIDTHS.filter((width) => width < originalWidth), originalWidth])].sort((a, b) => a - b);
}

/** 讀取 media.ts（沒有 import 的 TS 檔，Node 型別剝除可直接載入）：runtime 圖片唯一清單 */
export async function loadMediaAssets() {
  const url = `${pathToFileURL(MEDIA_FILE).href}?t=${statSync(MEDIA_FILE).mtimeMs}`;
  const module = await import(url);
  return Object.entries(module.mediaAssets).map(([key, asset]) => ({ key, ...asset }));
}

export function readManifest() {
  if (!existsSync(MANIFEST_FILE)) return null;
  return JSON.parse(readFileSync(MANIFEST_FILE, 'utf8'));
}

export function walkFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walkFiles(full) : [full];
  });
}

/** 每張 runtime 圖片的預算檢查結果 */
export function evaluateBudget(entry) {
  const pick = (format, width) => entry[format].find((variant) => variant.width === width);
  const full = (format) => entry[format].at(-1);
  const checks = [];
  const add = (name, bytes, limit) => checks.push({ name, bytes, limit, ok: bytes <= limit });
  const thumb = pick('webp', 640);
  if (thumb) add('thumbnail 640w WebP', thumb.bytes, BUDGETS.thumbnail.webp640);
  if (entry.role === 'hero') {
    add('hero 原尺寸 WebP', full('webp').bytes, BUDGETS.hero.webp);
    add('hero 原尺寸 AVIF', full('avif').bytes, BUDGETS.hero.avif);
  } else if (entry.role === 'background') {
    add('background 原尺寸 WebP', full('webp').bytes, BUDGETS.background.webp);
  } else {
    const card = pick('webp', 1080) ?? full('webp');
    add('card 1080w WebP', card.bytes, BUDGETS.card.webp1080);
  }
  return checks;
}

export function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
