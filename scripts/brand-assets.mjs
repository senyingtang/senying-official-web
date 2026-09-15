// Phase 2.7 品牌點陣素材：由 public/brand/favicon.svg（純圖形、無文字，輸出穩定）產生 PNG
//
//   favicon-32.png          32×32     瀏覽器分頁
//   favicon-192.png         192×192   Android / PWA
//   apple-touch-icon.png    180×180   iOS 主畫面（滿版 teal 底，iOS 會自行裁圓角）
//   sen-ying-logo-512.png   512×512   JSON-LD Organization logo（點陣圖）
//
// TEMPORARY BRAND ASSET：正式 Logo 交付後替換 public/brand/*.svg 再重新執行本腳本。
// 用法：pnpm brand:generate
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { BRAND_DIR, kb, rel } from './lib/image-pipeline.mjs';
import { loadSharp } from './lib/sharp.mjs';

const sharp = loadSharp();
const markSvg = readFileSync(path.join(BRAND_DIR, 'favicon.svg'));
// apple-touch-icon：iOS 會把透明圓角補黑，改用滿版方形底色
const squareSvg = Buffer.from(markSvg.toString('utf8').replace('rx="9"', 'rx="0"'));

const outputs = [
  { file: 'favicon-32.png', size: 32, svg: markSvg },
  { file: 'favicon-192.png', size: 192, svg: markSvg },
  { file: 'apple-touch-icon.png', size: 180, svg: squareSvg, flatten: '#14B8A6' },
  { file: 'sen-ying-logo-512.png', size: 512, svg: markSvg },
];

for (const output of outputs) {
  let pipeline = sharp(output.svg, { density: Math.ceil((72 * output.size) / 32) }).resize(output.size, output.size);
  if (output.flatten) pipeline = pipeline.flatten({ background: output.flatten });
  const buffer = await pipeline.png({ compressionLevel: 9, adaptiveFiltering: true, palette: output.size <= 32 }).toBuffer();
  const target = path.join(BRAND_DIR, output.file);
  writeFileSync(target, buffer);
  const meta = await sharp(buffer).metadata();
  console.log(`✓ ${rel(target)}  ${meta.width}×${meta.height}  ${kb(statSync(target).size)}`);
}
