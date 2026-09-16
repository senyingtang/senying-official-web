// Phase 2.9 全站搜尋驗收（對應任務說明第二十三節）
//
//   1. /search 頁面存在（noindex、不進 sitemap）
//   2. /search-index.json 存在且格式正確（type / title / excerpt / url / keywords）
//   3. 索引收錄已發布 Blog（與 /blog 輸出一致）
//   4. 索引收錄已發布 Cases（與 /cases 輸出一致）
//   5. 索引收錄 5 個產品頁與 4 個一頁式範例頁
//   6. 索引收錄主要行銷頁面
//   7. 索引不含 draft / admin / portal / checkout / api
//   8. 索引中每個 url 都有對應的 build 輸出
//   9. Header 搜尋入口指向 /search（桌機 + 手機，全部頁面）
//  10. /search 沒有 JS 也能看到完整清單；有 JS 時輸入 2 字元以上才篩選、沒有結果顯示「找不到符合的內容」
//  11. 搜尋不會把每次鍵盤輸入送到伺服器（表單為 GET /search，輸入事件只在瀏覽器端處理）
//  12. 類型篩選（全部 / 文章 / 案例 / 產品 / 頁面）
//
// 前置：pnpm build 已產生 apps/marketing/dist。
// 用法：pnpm search:verify [--skip-runtime]
import { existsSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { findChrome, installSignalCleanup, MARKETING_DIR, ROOT, startMarketingServer, stopAll } from './lib/servers.mjs';
import { createReport, DIST, htmlPath, metaContent, read, walk } from './lib/static-site.mjs';

const args = new Set(process.argv.slice(2));
const report = createReport('Phase 2.9 search verify');
const { record } = report;

const searchHtml = read(htmlPath(DIST, '/search'));
const sitemap = read(path.join(DIST, 'sitemap.xml'));
const raw = read(path.join(DIST, 'search-index.json'));
let index = null;
try {
  index = JSON.parse(raw);
} catch {
  index = null;
}
const entries = Array.isArray(index?.entries) ? index.entries : [];
const urlsOf = (type) => entries.filter((entry) => entry.type === type).map((entry) => entry.url);

record(
  1,
  '/search 頁面存在，為 noindex 且不收錄於 sitemap',
  searchHtml !== '' && (metaContent(searchHtml, 'name', 'robots') ?? '').includes('noindex') && !sitemap.includes('/search</loc>'),
  `robots=${metaContent(searchHtml, 'name', 'robots')}`,
);

const shapeProblems = entries
  .filter((entry) => !['blog', 'case', 'product', 'page'].includes(entry.type) || typeof entry.title !== 'string' || !entry.title || typeof entry.excerpt !== 'string' || !entry.url?.startsWith('/') || !Array.isArray(entry.keywords))
  .map((entry) => entry.url ?? JSON.stringify(entry).slice(0, 40));
record(
  2,
  '/search-index.json 存在，每筆都有 type / title / excerpt / url / keywords',
  index !== null && entries.length > 0 && shapeProblems.length === 0,
  `entries=${entries.length} ${shapeProblems.slice(0, 3).join(', ')}`,
);

// 3–4. Blog / Cases 與 build 輸出一致
const builtRoutes = (prefix) =>
  walk(path.join(DIST, prefix))
    .filter((file) => file.endsWith('index.html'))
    .map((file) => `/${path.relative(DIST, path.dirname(file)).split(path.sep).join('/')}`)
    .filter((route) => route !== `/${prefix}`);
const builtBlog = builtRoutes('blog').sort();
const builtCases = builtRoutes('cases').sort();
record(3, '索引收錄全部已發布文章（與 /blog/[slug] build 輸出一致）', builtBlog.length > 0 && JSON.stringify(urlsOf('blog').sort()) === JSON.stringify(builtBlog), `index=${urlsOf('blog').length} built=${builtBlog.length}`);
record(4, '索引收錄全部已發布案例（與 /cases/[slug] build 輸出一致）', builtCases.length > 0 && JSON.stringify(urlsOf('case').sort()) === JSON.stringify(builtCases), `index=${urlsOf('case').length} built=${builtCases.length}`);

const PRODUCT_ROUTES = [
  '/products/seo-website',
  '/products/landing-page',
  '/products/ecommerce-website',
  '/products/promo-page-design',
  '/products/seo-article-generator',
  '/products/landing-page/group-buy-promo',
  '/products/landing-page/event-registration',
  '/products/landing-page/course-enrollment',
  '/products/landing-page/booking-form',
];
const PAGE_ROUTES = ['/', '/products', '/solutions', '/cases', '/blog', '/about', '/contact', '/legal/terms', '/legal/privacy'];
record(5, `索引收錄 ${PRODUCT_ROUTES.length} 個產品頁`, PRODUCT_ROUTES.every((route) => urlsOf('product').includes(route)), `product=${urlsOf('product').length}`);
record(6, `索引收錄 ${PAGE_ROUTES.length} 個主要行銷頁面`, PAGE_ROUTES.every((route) => urlsOf('page').includes(route)), `page=${urlsOf('page').join(', ')}`);

const FORBIDDEN = /^\/(admin|portal|checkout|api)(\/|$)/;
const forbidden = entries.filter((entry) => FORBIDDEN.test(entry.url));
const draftRoutes = ['/blog/launch-checklist', '/blog/faq-schema-guide', '/blog/redeem-access-code', '/cases/sample-clinic-site'];
const draftHits = entries.filter((entry) => draftRoutes.includes(entry.url));
record(
  7,
  '索引不含 draft / admin / portal / checkout / api',
  forbidden.length === 0 && draftHits.length === 0,
  [...forbidden, ...draftHits].map((entry) => entry.url).join(', ') || 'clean',
);

const missingBuild = entries.filter((entry) => !existsSync(htmlPath(DIST, entry.url)));
record(8, '索引中的每個網址都有對應的 build 輸出', missingBuild.length === 0, missingBuild.map((entry) => entry.url).join(', ') || `${entries.length} urls`);

const htmlFiles = walk(DIST).filter((file) => file.endsWith('index.html'));
const headerProblems = htmlFiles
  .map((file) => ({ file, header: read(file).match(/<header\b[^>]*data-section="header"[\s\S]*?<\/header>/)?.[0] ?? '' }))
  .filter(({ header }) => (header.match(/href="\/search"/g) ?? []).length < 2)
  .map(({ file }) => path.relative(DIST, file));
record(9, `Header 搜尋入口指向 /search（桌機 + 手機，${htmlFiles.length} 頁）`, htmlFiles.length > 0 && headerProblems.length === 0, headerProblems.slice(0, 3).join(', ') || 'ok');

// ---------------------------------------------------------------------------
// 10–12. 執行時行為
// ---------------------------------------------------------------------------
if (args.has('--skip-runtime')) {
  for (const [no, name] of [
    [10, '/search 無 JS 可用、有 JS 時 2 字元才篩選、無結果顯示訊息'],
    [11, '搜尋不把每次輸入送到伺服器'],
    [12, '/search 類型篩選'],
  ]) {
    record(no, `${name}（--skip-runtime，未執行）`, true, 'skipped');
  }
} else {
  const servers = [];
  installSignalCleanup(servers);
  let browser;
  try {
    const server = await startMarketingServer();
    servers.push(server);
    browser = await chromium.launch({ executablePath: findChrome(), headless: true });

    // 10. 無 JS：完整清單；有 JS：2 字元才篩選
    const noJsContext = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
    const noJsPage = await noJsContext.newPage();
    await noJsPage.goto(`${server.url}/search`, { waitUntil: 'networkidle' });
    const noJsVisible = await noJsPage.locator('[data-search-item]:visible').count();
    await noJsContext.close();

    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const requests = [];
    page.on('request', (request) => requests.push(request.url()));
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.goto(`${server.url}/search`, { waitUntil: 'networkidle' });

    const input = page.locator('[data-search-input]');
    await input.fill('S');
    await page.waitForTimeout(150);
    const oneCharVisible = await page.locator('[data-search-item]:visible').count();
    const hintShown = await page.locator('[data-search-hint]:visible').count();

    const requestsBefore = requests.length;
    await input.fill('SEO');
    await page.waitForTimeout(200);
    const seoVisible = await page.locator('[data-search-item]:visible').count();
    const seoCount = Number(await page.locator('[data-search-count]').innerText());

    await input.fill('zzzz-no-such-content');
    await page.waitForTimeout(200);
    const emptyVisible = await page.locator('[data-search-item]:visible').count();
    const emptyMessage = await page.locator('[data-search-empty]:visible').innerText().catch(() => '');
    const requestsAfter = requests.length;

    record(
      10,
      '/search：沒有 JS 顯示完整清單；有 JS 時 1 字元只提示、2 字元以上開始比對、沒有結果顯示「找不到符合的內容」',
      noJsVisible === entries.length && oneCharVisible === 0 && hintShown === 1 && seoVisible > 0 && seoVisible === seoCount && emptyVisible === 0 && emptyMessage.includes('找不到符合的內容') && pageErrors.length === 0,
      `noJs=${noJsVisible}/${entries.length} oneChar=${oneCharVisible} hint=${hintShown} seo=${seoVisible}(count ${seoCount}) empty=${emptyVisible} pageErrors=${pageErrors.length}`,
    );

    record(
      11,
      '搜尋不把每次鍵盤輸入送到伺服器（輸入期間沒有任何新的網路請求）',
      requestsAfter === requestsBefore,
      `requests during typing=${requestsAfter - requestsBefore}`,
    );

    // 12. 類型篩選
    await input.fill('');
    await page.waitForTimeout(150);
    const typeCounts = {};
    for (const type of ['all', 'blog', 'case', 'product', 'page']) {
      await page.locator(`[data-search-type="${type}"]`).click();
      await page.waitForTimeout(120);
      typeCounts[type] = await page.locator('[data-search-item]:visible').count();
    }
    record(
      12,
      '/search 類型篩選：全部 / 文章 / 案例 / 產品 / 頁面',
      typeCounts.all === entries.length &&
        typeCounts.blog === urlsOf('blog').length &&
        typeCounts.case === urlsOf('case').length &&
        typeCounts.product === urlsOf('product').length &&
        typeCounts.page === urlsOf('page').length,
      JSON.stringify(typeCounts),
    );

    await context.close();
  } catch (error) {
    record(10, '/search 執行時行為', false, error.message);
  } finally {
    if (browser) await browser.close().catch(() => undefined);
    await stopAll(servers);
  }
}

void ROOT;
void MARKETING_DIR;
report.finish('search:verify');
