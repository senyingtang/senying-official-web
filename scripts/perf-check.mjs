// Phase 2.7 效能驗收：圖片重量預算（靜態 build output；--browser 另外以本機 Chrome 實測）
//
//   1. build
//   2. 每張 runtime 圖片預算（hero / card / thumbnail / background）
//   3. OG 圖 ≤ 300 KB
//   4. HTML 大小（首頁 ≤ 200 KB、其他主要頁 ≤ 250 KB）
//   5. eager 圖片數量（每頁 ≤ 1、首頁 Hero eager + fetchpriority high）
//   6. 首屏圖片重量（依 sizes / srcset 推算手機 390px@3x、桌機 1440px@1x、@2x 選到的 AVIF）≤ 250 KB
//   7. 全頁圖片總重量（所有 lazy 圖都載入）≤ 1.2 MB
//   8. 現代瀏覽器不會選到 PNG（內容圖片都在 <picture> 內且有 AVIF + WebP）
//   9. 輸出 docs/performance/PHASE_2_7_IMAGE_BUDGET.md
//  10. （--browser）Chrome 實測：首頁與產品頁實際下載的圖片格式與重量、沒有下載 PNG
//
// 用法：pnpm perf:verify [--skip-build] [--browser]
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { BUDGETS, BUDGET_EXCEPTIONS, BUDGET_MD, MIN_PSNR_DB, OG_DIR, evaluateBudget, readManifest, toPublicFile } from './lib/image-pipeline.mjs';
import { ROOT, findChrome, installSignalCleanup, startMarketingServer, stopAll } from './lib/servers.mjs';
import { DIST, MAIN_PAGES, PRODUCT_PAGES, contentImgTags, createReport, htmlPath, kb, parseSrcset, pictures, read, rel, run, tagAttr, walk } from './lib/static-site.mjs';

const args = new Set(process.argv.slice(2));
const report = createReport('Phase 2.7 perf verify（圖片預算）');
const { record } = report;
const BROWSER_SAMPLE = path.join(ROOT, 'docs', 'performance', 'PHASE_2_7_BROWSER_SAMPLE.json');
const KB = 1024;
const PAGE_BUDGET = { homeHtml: 200 * KB, pageHtml: 250 * KB, aboveFold: 250 * KB, pageImages: 1200 * KB };
const SCENARIOS = [
  { key: 'mobile', label: '手機 390px @3x', width: 390, dpr: 3 },
  { key: 'desktop', label: '桌機 1440px @1x', width: 1440, dpr: 1 },
  { key: 'retina', label: '桌機 1440px @2x', width: 1440, dpr: 2 },
];

if (args.has('--skip-build')) record(1, 'build output 存在（--skip-build）', existsSync(path.join(DIST, 'index.html')));
else record(1, 'pnpm build', run('perf', 'pnpm build'));

const manifest = readManifest();
if (!manifest) {
  record(2, 'image-variants manifest', false, '請先執行 pnpm images:optimize');
  report.finish('perf:verify');
}
const variantBytes = new Map(Object.values(manifest.images).flatMap((entry) => [...entry.webp, ...entry.avif].map((variant) => [variant.src, variant.bytes])));
const bytesOf = (src) => variantBytes.get(src) ?? (existsSync(toPublicFile(src)) ? statSync(toPublicFile(src)).size : 0);

// ---------------------------------------------------------------------------
// sizes / srcset 選擇（與瀏覽器相同的原則：挑寬度 ≥ 顯示寬度 × DPR 的最小版本）
// ---------------------------------------------------------------------------
function slotWidth(sizes, viewport) {
  for (const part of (sizes || '100vw').split(',').map((item) => item.trim())) {
    const match = part.match(/^(?:\(min-width:\s*(\d+)px\)\s+)?(\d+(?:\.\d+)?)(vw|px)$/);
    if (!match) continue;
    if (match[1] && viewport < Number(match[1])) continue;
    return match[3] === 'px' ? Number(match[2]) : (Number(match[2]) / 100) * viewport;
  }
  return viewport;
}
const pick = (candidates, needed) => [...candidates].sort((a, b) => a.width - b.width).find((candidate) => candidate.width >= needed) ?? [...candidates].sort((a, b) => a.width - b.width).at(-1);

function analyzePage(route) {
  const html = read(htmlPath(DIST, route));
  const blocks = pictures(html);
  const images = blocks.map((block) => {
    const fallback = tagAttr(block.img, 'src') ?? '';
    const avif = parseSrcset(block.sources.find((source) => source.type === 'image/avif')?.srcset ?? '').map((candidate) => ({ ...candidate, bytes: bytesOf(candidate.src) }));
    const webp = parseSrcset(block.sources.find((source) => source.type === 'image/webp')?.srcset ?? '').map((candidate) => ({ ...candidate, bytes: bytesOf(candidate.src) }));
    const sizes = block.sources[0]?.sizes ?? '';
    const modern = avif.length ? avif : webp;
    const chosen = Object.fromEntries(SCENARIOS.map((scenario) => [scenario.key, modern.length ? pick(modern, slotWidth(sizes, scenario.width) * scenario.dpr) : { src: fallback, bytes: bytesOf(fallback), width: 0 }]));
    return {
      fallback,
      eager: tagAttr(block.img, 'loading') !== 'lazy',
      fetchpriority: tagAttr(block.img, 'fetchpriority'),
      sizes,
      avif,
      webp,
      pngBytes: bytesOf(fallback),
      chosen,
      largest: Math.max(0, ...modern.map((candidate) => candidate.bytes)),
    };
  });
  const outside = contentImgTags(blocks.reduce((text, block) => text.replace(block.tag, ''), html));
  const sum = (items, key) => items.reduce((total, image) => total + image.chosen[key].bytes, 0);
  return {
    route,
    htmlBytes: Buffer.byteLength(html),
    images,
    outside,
    eager: images.filter((image) => image.eager),
    lazy: images.filter((image) => !image.eager),
    pngTotal: images.reduce((total, image) => total + image.pngBytes, 0),
    aboveFold: Object.fromEntries(SCENARIOS.map((scenario) => [scenario.key, sum(images.filter((image) => image.eager), scenario.key)])),
    total: Object.fromEntries(SCENARIOS.map((scenario) => [scenario.key, sum(images, scenario.key)])),
    largest: images.reduce((max, image) => (image.largest > max.bytes ? { bytes: image.largest, src: image.avif.at(-1)?.src ?? image.fallback } : max), { bytes: 0, src: '' }),
  };
}

const pages = MAIN_PAGES.map(analyzePage);
const entries = Object.entries(manifest.images).map(([src, entry]) => ({ src, ...entry, budget: evaluateBudget(entry) }));

// ---------------------------------------------------------------------------
// 2–8
// ---------------------------------------------------------------------------
{
  const over = entries.filter((entry) => entry.budget.some((check) => !check.ok));
  const undocumented = over.filter((entry) => !BUDGET_EXCEPTIONS[entry.src]);
  const lowQuality = entries.filter((entry) => entry.psnr.webp < MIN_PSNR_DB || entry.psnr.avif < MIN_PSNR_DB);
  record(
    2,
    `runtime 圖片預算（hero WebP ≤ 350 KB / AVIF ≤ 250 KB、card 1080w ≤ 200 KB、640w ≤ 120 KB、background ≤ 300 KB；PSNR ≥ ${MIN_PSNR_DB} dB）`,
    undocumented.length === 0 && lowQuality.length === 0,
    [...undocumented.map((entry) => `${entry.src} 超過預算且未說明原因`), ...lowQuality.map((entry) => `${entry.src} PSNR 過低`)].join(' | ') || `${entries.length} images，${over.length} 張超過預算（已說明）`,
  );

  const ogFiles = walk(OG_DIR).filter((file) => file.endsWith('.png'));
  const heavyOg = ogFiles.filter((file) => statSync(file).size > BUDGETS.og.png);
  record(3, `OG 圖 ≤ 300 KB（${ogFiles.length} 張）`, ogFiles.length > 0 && heavyOg.length === 0, heavyOg.map((file) => `${path.basename(file)} ${kb(statSync(file).size)}`).join(', ') || `最大 ${kb(Math.max(...ogFiles.map((file) => statSync(file).size)))}`);

  const heavyHtml = pages.filter((page) => page.htmlBytes > (page.route === '/' ? PAGE_BUDGET.homeHtml : PAGE_BUDGET.pageHtml));
  record(4, 'HTML 大小（首頁 ≤ 200 KB、其他主要頁 ≤ 250 KB）', heavyHtml.length === 0, heavyHtml.map((page) => `${page.route} ${kb(page.htmlBytes)}`).join(', ') || `首頁 ${kb(pages[0].htmlBytes)}，最大 ${kb(Math.max(...pages.map((page) => page.htmlBytes)))}`);

  const eagerProblems = pages.filter((page) => page.eager.length > 1).map((page) => `${page.route}: ${page.eager.length}`);
  const homeHero = pages[0].eager[0];
  if (!homeHero || homeHero.fallback !== '/images/hero/home-hero-platform-ui-final.png' || homeHero.fetchpriority !== 'high') eagerProblems.push('首頁 Hero 不是 eager + fetchpriority high');
  record(5, '每頁 eager 圖片 ≤ 1，首頁 Hero eager + fetchpriority high', eagerProblems.length === 0, eagerProblems.join(', ') || pages.map((page) => `${page.route}=${page.eager.length}/${page.lazy.length}`).join(' '));

  const heavyAbove = pages.flatMap((page) => SCENARIOS.filter((scenario) => page.aboveFold[scenario.key] > PAGE_BUDGET.aboveFold).map((scenario) => `${page.route} ${scenario.key} ${kb(page.aboveFold[scenario.key])}`));
  record(6, '首屏圖片重量 ≤ 250 KB（手機 @3x / 桌機 @1x / @2x）', heavyAbove.length === 0, heavyAbove.join(', ') || `最大 ${kb(Math.max(...pages.flatMap((page) => Object.values(page.aboveFold))))}`);

  const heavyPage = pages.flatMap((page) => SCENARIOS.filter((scenario) => page.total[scenario.key] > PAGE_BUDGET.pageImages).map((scenario) => `${page.route} ${scenario.key} ${kb(page.total[scenario.key])}`));
  record(7, '全頁圖片總重量 ≤ 1.2 MB（所有 lazy 圖片都載入）', heavyPage.length === 0, heavyPage.join(', ') || `最大 ${kb(Math.max(...pages.flatMap((page) => Object.values(page.total))))}`);

  const pngProblems = pages.flatMap((page) => [
    ...page.outside.map((tag) => `${page.route}: <img> 不在 <picture> 內 ${tagAttr(tag, 'src')}`),
    ...page.images.filter((image) => image.avif.length === 0 || image.webp.length === 0).map((image) => `${page.route}: ${image.fallback} 缺 AVIF / WebP`),
  ]);
  record(8, '現代瀏覽器不會選到 PNG（內容圖片都在 <picture> 內，有 AVIF + WebP source）', pngProblems.length === 0, pngProblems.slice(0, 3).join(' | ') || `${pages.reduce((total, page) => total + page.images.length, 0)} images`);
}

// ---------------------------------------------------------------------------
// 10. Chrome 實測（選用）
// ---------------------------------------------------------------------------
let browserSample = existsSync(BROWSER_SAMPLE) ? JSON.parse(readFileSync(BROWSER_SAMPLE, 'utf8')) : null;
if (args.has('--browser')) {
  const servers = [];
  installSignalCleanup(servers);
  let browser;
  const measurements = [];
  try {
    const server = await startMarketingServer();
    servers.push(server);
    browser = await chromium.launch({ executablePath: findChrome(), headless: true });
    for (const scenario of [
      { key: 'mobile', label: '手機 390×844 @3x', viewport: { width: 390, height: 844 }, dpr: 3 },
      { key: 'desktop', label: '桌機 1440×900 @1x', viewport: { width: 1440, height: 900 }, dpr: 1 },
    ]) {
      const context = await browser.newContext({ viewport: scenario.viewport, deviceScaleFactor: scenario.dpr });
      for (const route of ['/', ...PRODUCT_PAGES]) {
        const page = await context.newPage();
        const responses = [];
        page.on('response', (response) => {
          const url = new URL(response.url());
          if (!url.pathname.startsWith('/images/')) return;
          responses.push(response.body().then((body) => ({ path: url.pathname, type: response.headers()['content-type'] ?? '', bytes: body.length })).catch(() => ({ path: url.pathname, type: '', bytes: 0 })));
        });
        await page.goto(`${server.url}${route}`, { waitUntil: 'networkidle' });
        const initial = await Promise.all(responses);
        await page.evaluate(async () => {
          for (let y = 0; y <= document.documentElement.scrollHeight; y += 500) {
            window.scrollTo(0, y);
            await new Promise((resolve) => setTimeout(resolve, 80));
          }
        });
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(300);
        const all = await Promise.all(responses);
        measurements.push({
          scenario: scenario.label,
          route,
          initialBytes: initial.reduce((sum, item) => sum + item.bytes, 0),
          initialCount: initial.length,
          totalBytes: all.reduce((sum, item) => sum + item.bytes, 0),
          totalCount: all.length,
          formats: [...new Set(all.map((item) => item.type))].sort(),
          png: all.filter((item) => /\.png$/.test(item.path)).map((item) => item.path),
        });
        await page.close();
      }
      await context.close();
    }
    browserSample = { measuredAt: new Date().toISOString(), chrome: browser.version(), measurements };
    mkdirSync(path.dirname(BROWSER_SAMPLE), { recursive: true });
    writeFileSync(BROWSER_SAMPLE, `${JSON.stringify(browserSample, null, 2)}\n`);
    const pngHits = measurements.filter((item) => item.png.length > 0);
    const heavy = measurements.filter((item) => item.totalBytes > PAGE_BUDGET.pageImages || item.initialBytes > PAGE_BUDGET.aboveFold);
    record(10, `Chrome 實測：首頁與 5 個產品頁（手機 @3x / 桌機 @1x）不下載 PNG，首屏 ≤ 250 KB、全頁 ≤ 1.2 MB`, pngHits.length === 0 && heavy.length === 0, [...pngHits.map((item) => `${item.scenario} ${item.route} PNG ${item.png.join(',')}`), ...heavy.map((item) => `${item.scenario} ${item.route} ${kb(item.initialBytes)} / ${kb(item.totalBytes)}`)].join(' | ') || `${measurements.length} page loads`);
  } catch (error) {
    record(10, 'Chrome 實測', false, error.message.split('\n')[0]);
  } finally {
    await browser?.close().catch(() => undefined);
    await stopAll(servers);
  }
}

// ---------------------------------------------------------------------------
// 9. 報告
// ---------------------------------------------------------------------------
{
  const totals = entries.reduce((sum, entry) => ({ png: sum.png + entry.bytes, webp: sum.webp + entry.webp.at(-1).bytes, avif: sum.avif + entry.avif.at(-1).bytes }), { png: 0, webp: 0, avif: 0 });
  const saving = (value) => `${((1 - value / totals.png) * 100).toFixed(1)}%`;
  const largestVariant = entries.flatMap((entry) => [...entry.webp, ...entry.avif]).reduce((max, variant) => (variant.bytes > max.bytes ? variant : max), { bytes: 0, src: '' });
  const largestAvif = entries.map((entry) => entry.avif.at(-1)).reduce((max, variant) => (variant.bytes > max.bytes ? variant : max), { bytes: 0, src: '' });
  const ogFiles = walk(OG_DIR).filter((file) => file.endsWith('.png')).sort();
  const over = entries.filter((entry) => entry.budget.some((check) => !check.ok));
  const cell = (value) => String(value).replace(/\|/g, '\\|');
  const lines = [
    '# Phase 2.7 圖片效能預算',
    '',
    '> 由 `pnpm perf:verify` 產生（`scripts/perf-check.mjs`），請勿手動編輯。圖片轉檔：`pnpm images:optimize`；OG：`pnpm og:generate`。',
    '',
    '## 1. 總覽（runtime 圖片，原尺寸）',
    '',
    '| 項目 | PNG 原檔 | WebP | AVIF |',
    '|---|---:|---:|---:|',
    `| ${entries.length} 張 runtime 圖片合計 | ${kb(totals.png)} | ${kb(totals.webp)}（-${saving(totals.webp)}） | ${kb(totals.avif)}（-${saving(totals.avif)}） |`,
    '',
    `- 最大 runtime 變體：\`${largestVariant.src}\`（${kb(largestVariant.bytes)}）`,
    `- 最大原尺寸 AVIF：\`${largestAvif.src}\`（${kb(largestAvif.bytes)}）`,
    `- PNG 原檔保留在 \`apps/marketing/public/images\`，只作為 \`<img>\` fallback；支援 AVIF / WebP 的瀏覽器不會下載 PNG。`,
    '',
    '## 2. 預算規則（理想值，不以犧牲畫質為代價）',
    '',
    '| 類別 | 預算 |',
    '|---|---|',
    `| Hero（role=hero） | 原尺寸 WebP ≤ ${kb(BUDGETS.hero.webp)}、AVIF ≤ ${kb(BUDGETS.hero.avif)} |`,
    `| 一般卡片（role=card） | 1080w WebP ≤ ${kb(BUDGETS.card.webp1080)} |`,
    `| 縮圖（所有圖片 640w） | WebP ≤ ${kb(BUDGETS.thumbnail.webp640)} |`,
    `| 背景（role=background） | 原尺寸 WebP ≤ ${kb(BUDGETS.background.webp)} |`,
    `| OG | PNG ≤ ${kb(BUDGETS.og.png)} |`,
    `| 頁面 | 首頁 HTML ≤ ${kb(PAGE_BUDGET.homeHtml)}、其他 ≤ ${kb(PAGE_BUDGET.pageHtml)}；首屏圖片 ≤ ${kb(PAGE_BUDGET.aboveFold)}；全頁圖片 ≤ ${kb(PAGE_BUDGET.pageImages)} |`,
    `| 畫質 | 原尺寸 WebP / AVIF 對原始 PNG 的 PSNR ≥ ${MIN_PSNR_DB} dB，不足時自動提高編碼品質 |`,
    '',
    '## 3. 每張 runtime 圖片',
    '',
    '| 圖片 | 類別 | 尺寸 | PNG | WebP 原尺寸 | AVIF 原尺寸 | WebP 1080w | WebP 640w | 品質（WebP / AVIF） | PSNR（WebP / AVIF） | 預算 |',
    '|---|---|---|---:|---:|---:|---:|---:|---|---|---|',
    ...entries.map((entry) => {
      const at = (width) => entry.webp.find((variant) => variant.width === width);
      const budget = entry.budget.every((check) => check.ok) ? 'OK' : `超過：${entry.budget.filter((check) => !check.ok).map((check) => check.name).join('、')}`;
      return `| \`${entry.src}\` | ${entry.role} | ${entry.width}×${entry.height} | ${kb(entry.bytes)} | ${kb(entry.webp.at(-1).bytes)} | ${kb(entry.avif.at(-1).bytes)} | ${at(1080) ? kb(at(1080).bytes) : '-'} | ${at(640) ? kb(at(640).bytes) : '-'} | q${entry.quality?.webp ?? '-'} / q${entry.quality?.avif ?? '-'} | ${entry.psnr.webp} / ${entry.psnr.avif} dB | ${budget} |`;
    }),
    '',
    '## 4. 主要頁面圖片載入（依 sizes / srcset 推算瀏覽器選到的 AVIF）',
    '',
    `| 頁面 | HTML | eager / lazy | 首屏：${SCENARIOS.map((scenario) => scenario.label).join(' / ')} | 全頁：${SCENARIOS.map((scenario) => scenario.label).join(' / ')} | 單張最大候選 | 舊版全頁 PNG |`,
    '|---|---:|---|---|---|---|---:|',
    ...pages.map(
      (page) =>
        `| \`${page.route}\` | ${kb(page.htmlBytes)} | ${page.eager.length} / ${page.lazy.length} | ${SCENARIOS.map((scenario) => kb(page.aboveFold[scenario.key])).join(' / ')} | ${SCENARIOS.map((scenario) => kb(page.total[scenario.key])).join(' / ')} | ${kb(page.largest.bytes)} | ${kb(page.pngTotal)} |`,
    ),
    '',
    '首屏圖片（eager）：',
    '',
    ...pages.map((page) => `- \`${page.route}\`：${page.eager.map((image) => `\`${image.fallback}\`（fetchpriority=${image.fetchpriority}，sizes=\`${cell(image.sizes)}\`；手機 @3x 選 \`${image.chosen.mobile.src}\` ${kb(image.chosen.mobile.bytes)}）`).join('、') || '無'}`),
    '',
    '## 5. OG 圖',
    '',
    '| 檔案 | 大小 | 預算 |',
    '|---|---:|---|',
    ...ogFiles.map((file) => `| \`${rel(file)}\` | ${kb(statSync(file).size)} | ${statSync(file).size <= BUDGETS.og.png ? 'OK' : '超過'} |`),
    '',
    '## 6. 超過預算的項目與原因',
    '',
    ...(over.length ? over.map((entry) => `- \`${entry.src}\`（超過預算原因：${BUDGET_EXCEPTIONS[entry.src] ?? '尚未說明'}）`) : ['- 無。所有 runtime 圖片與 OG 圖都在預算內。']),
    '',
    '## 7. Chrome 實測（`pnpm perf:verify --browser`）',
    '',
    ...(browserSample
      ? [
          `量測時間：${browserSample.measuredAt}（Chrome ${browserSample.chrome}，本機靜態服務，捲動到頁尾觸發所有 lazy 圖片）`,
          '',
          '| 情境 | 頁面 | 首屏圖片 | 全頁圖片 | 格式 | 下載 PNG |',
          '|---|---|---:|---:|---|---|',
          ...browserSample.measurements.map((item) => `| ${item.scenario} | \`${item.route}\` | ${kb(item.initialBytes)}（${item.initialCount} 張） | ${kb(item.totalBytes)}（${item.totalCount} 張） | ${item.formats.join(', ')} | ${item.png.length ? item.png.join(', ') : '無'} |`),
        ]
      : ['尚未執行。']),
    '',
    '## 8. 方法說明',
    '',
    '- 靜態分析讀取 `apps/marketing/dist` 的 HTML，解析 `<picture>` 的 `<source srcset sizes>`，以「寬度 ≥ 顯示寬度 × DPR 的最小版本」推算瀏覽器選擇（實際選擇可能因快取與瀏覽器策略略有差異）。',
    '- 「全頁」假設所有 lazy 圖片都被捲動載入，是上限值。',
    '- 未包含字型、CSS、JS；JS / CSS 預算由 `pnpm ui:verify` 檢查。尚未執行 Lighthouse CI。',
    '',
  ];
  mkdirSync(path.dirname(BUDGET_MD), { recursive: true });
  writeFileSync(BUDGET_MD, `${lines.join('\n')}`);
  record(9, 'docs/performance/PHASE_2_7_IMAGE_BUDGET.md 已產生', existsSync(BUDGET_MD), `${rel(BUDGET_MD)}（${pages.length} pages、${entries.length} images）`);
}

report.finish('perf:verify');
