// Phase 2.7 圖片轉檔：runtime final PNG → WebP（必要）+ AVIF（建議）+ 多尺寸 srcset
//
// - 來源：apps/marketing/src/content/media.ts（runtime 圖片唯一清單）；原始 PNG 保留不刪除，作為 <img> fallback
// - 輸出：與 PNG 同資料夾、同語意檔名
//     home-hero-platform-ui-final.webp / .avif（原尺寸）
//     home-hero-platform-ui-final-1080w.webp / -640w.webp / .avif …
// - manifest：apps/marketing/src/content/image-variants.generated.json（ResponsiveImage 產生 <picture> 用）
// - 畫質保護：原尺寸 WebP / AVIF 與原始 PNG 計算 PSNR，低於 MIN_PSNR_DB 直接失敗，不為了容量犧牲畫質
// - 已轉檔且來源大小、參數沒變時略過（--force 全部重做）
//
// 用法：pnpm images:optimize [--force]
import { existsSync, statSync, writeFileSync } from 'node:fs';
import { loadSharp } from './lib/sharp.mjs';
import {
  ENCODERS,
  MANIFEST_FILE,
  MIN_PSNR_DB,
  SETTINGS_KEY,
  kb,
  loadMediaAssets,
  readManifest,
  rel,
  toPublicFile,
  variantWebPath,
  variantWidths,
} from './lib/image-pipeline.mjs';

const sharp = loadSharp();
const force = process.argv.includes('--force');
const QUALITY_STEP = 8;
const MAX_QUALITY = 90;
const previous = readManifest();
const assets = await loadMediaAssets();

async function psnr(sourceFile, encoded) {
  const [a, b] = await Promise.all([sharp(sourceFile).removeAlpha().raw().toBuffer(), sharp(encoded).removeAlpha().raw().toBuffer()]);
  if (a.length !== b.length) throw new Error(`PSNR size mismatch for ${sourceFile}`);
  let squared = 0;
  for (let index = 0; index < a.length; index += 1) {
    const diff = a[index] - b[index];
    squared += diff * diff;
  }
  const mse = squared / a.length;
  return mse === 0 ? 99 : Number((10 * Math.log10((255 * 255) / mse)).toFixed(2));
}

const images = {};
const seen = new Set();
let failed = false;

for (const asset of assets) {
  if (seen.has(asset.src)) continue;
  seen.add(asset.src);
  const sourceFile = toPublicFile(asset.src);
  if (!existsSync(sourceFile)) {
    console.error(`✗ ${asset.src} 不存在`);
    failed = true;
    continue;
  }
  const meta = await sharp(sourceFile).metadata();
  if (meta.width !== asset.width || meta.height !== asset.height) {
    console.error(`✗ ${asset.src}: media.ts 標示 ${asset.width}×${asset.height}，實際 ${meta.width}×${meta.height}`);
    failed = true;
    continue;
  }
  const sourceBytes = statSync(sourceFile).size;
  const widths = variantWidths(meta.width);
  const cached = previous?.settingsKey === SETTINGS_KEY ? previous.images?.[asset.src] : undefined;
  const cacheValid =
    !force &&
    cached?.bytes === sourceBytes &&
    ['webp', 'avif'].every(
      (format) => cached[format]?.length === widths.length && cached.psnr?.[format] >= MIN_PSNR_DB && cached[format].every((variant) => existsSync(toPublicFile(variant.src))),
    );

  if (cacheValid) {
    // 舊 manifest 沒有記錄品質時，代表當時以預設品質編碼
    images[asset.src] = { ...cached, label: asset.label, role: asset.role, quality: cached.quality ?? { webp: ENCODERS.webp.quality, avif: ENCODERS.avif.quality } };
    console.log(`= ${asset.src}（已轉檔，略過）`);
    continue;
  }

  const entry = { label: asset.label, role: asset.role, width: meta.width, height: meta.height, bytes: sourceBytes, webp: [], avif: [], quality: {}, psnr: {} };
  for (const format of ['webp', 'avif']) {
    // 先以預設品質編碼原尺寸；PSNR 不足（細節多的海報拼貼）時逐步提高品質，所有尺寸使用同一品質
    let quality = ENCODERS[format].quality;
    let fullBuffer = await sharp(sourceFile)[format]({ ...ENCODERS[format], quality }).toBuffer();
    let score = await psnr(sourceFile, fullBuffer);
    while (score < MIN_PSNR_DB && quality < MAX_QUALITY) {
      quality = Math.min(MAX_QUALITY, quality + QUALITY_STEP);
      fullBuffer = await sharp(sourceFile)[format]({ ...ENCODERS[format], quality }).toBuffer();
      score = await psnr(sourceFile, fullBuffer);
    }
    entry.quality[format] = quality;
    entry.psnr[format] = score;
    for (const width of widths) {
      const src = variantWebPath(asset.src, format, width, meta.width);
      const buffer = width === meta.width ? fullBuffer : await sharp(sourceFile).resize({ width, kernel: 'lanczos3' })[format]({ ...ENCODERS[format], quality }).toBuffer();
      writeFileSync(toPublicFile(src), buffer);
      const info = await sharp(buffer).metadata();
      entry[format].push({ width: info.width, height: info.height, src, bytes: buffer.length });
    }
  }
  const saving = (1 - entry.avif.at(-1).bytes / sourceBytes) * 100;
  console.log(
    `✓ ${asset.src}  PNG ${kb(sourceBytes)} → WebP q${entry.quality.webp} ${kb(entry.webp.at(-1).bytes)} (PSNR ${entry.psnr.webp}) / AVIF q${entry.quality.avif} ${kb(entry.avif.at(-1).bytes)} (PSNR ${entry.psnr.avif})  -${saving.toFixed(1)}%`,
  );
  for (const format of ['webp', 'avif']) {
    if (entry.psnr[format] < MIN_PSNR_DB) {
      console.error(`✗ ${asset.src} ${format} PSNR ${entry.psnr[format]} dB < ${MIN_PSNR_DB} dB，畫質損失過大`);
      failed = true;
    }
  }
  images[asset.src] = entry;
}

const sorted = Object.fromEntries(Object.entries(images).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(
  MANIFEST_FILE,
  `${JSON.stringify({ generatedBy: 'scripts/image-optimize.mjs（pnpm images:optimize）', settingsKey: SETTINGS_KEY, images: sorted }, null, 2)}\n`,
);
console.log(`\n[images:optimize] ${Object.keys(sorted).length} runtime images → ${rel(MANIFEST_FILE)}`);
if (failed) {
  console.error('[images:optimize] FAILED');
  process.exit(1);
}
