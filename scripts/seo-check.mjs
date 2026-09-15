// Phase 2.7 SEO 驗收（靜態 build output，不啟動服務）
//
// 檢查兩份 build：
//   A. 預設 build（apps/marketing/dist，未設定 SITE_PUBLIC_URL：本機 fallback + 全站 noindex）
//   B. 正式設定驗收 build（SITE_PUBLIC_URL=https://staging.senying.test、SITE_ALLOW_INDEXING=true）
//      只輸出到 .phase27-report/production-dist，不覆蓋 apps/marketing/dist、不部署
//
//   1. title（統一 formatter、唯一）   2. description   3. canonical（SITE_PUBLIC_URL、無寫死 localhost）
//   4. og:title   5. og:description   6. og:image   7. og:image width / height / type   8. twitter card
//   9. H1 唯一   10. Organization   11. WebSite   12. BreadcrumbList   13. FAQPage   14. Checkout noindex
//  15. logo URL   16. sameAs   17. SEN YING 品牌   18. 無 Mori   19. sitemap   20. robots
//
// 用法：pnpm seo:verify [--skip-build] [--skip-production-build]
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PUBLIC_DIR, toPublicFile } from './lib/image-pipeline.mjs';
import { MARKETING_DIR, ROOT } from './lib/servers.mjs';
import { loadSharp } from './lib/sharp.mjs';
import {
  ALL_PAGES,
  DIST,
  REPORT_DIR,
  SRC,
  createReport,
  decode,
  htmlPath,
  jsonLdBlocks,
  jsonLdOfType,
  metaContent,
  ogKeyFor,
  read,
  rel,
  run,
  titleOf,
  walk,
} from './lib/static-site.mjs';

const args = new Set(process.argv.slice(2));
const report = createReport('Phase 2.7 SEO verify');
const { record } = report;
const sharp = loadSharp();

const PRODUCTION_URL = 'https://staging.senying.test';
const PRODUCTION_DIST = path.join(REPORT_DIR, 'production-dist');
const LOCAL_FALLBACK = 'http://localhost:4321';

const settingsModule = await import(pathToFileURL(path.join(ROOT, 'packages', 'database', 'src', 'site-settings.ts')).href);
const siteUrlModule = await import(pathToFileURL(path.join(ROOT, 'packages', 'seo', 'src', 'site-url.ts')).href);
const { ogImages } = await import(pathToFileURL(path.join(SRC, 'content', 'ogImages.ts')).href);
const brand = settingsModule.getMockMarketingSiteSettings('default').brand;
const BRAND_NAME = `${brand.brandNameZh} ${brand.brandNameEn}`;
const HOME_TITLE = `${BRAND_NAME}｜網站設計、電商建置與 SEO 數位工具`;

// ---------------------------------------------------------------------------
// builds
// ---------------------------------------------------------------------------
const builds = [];
if (!args.has('--skip-build')) builds.push(['預設 build', run('seo', 'pnpm build')]);
if (!args.has('--skip-production-build')) {
  rmSync(PRODUCTION_DIST, { recursive: true, force: true });
  builds.push([
    `正式設定驗收 build（${PRODUCTION_URL}，只輸出到 ${rel(PRODUCTION_DIST)}）`,
    run('seo', 'pnpm --filter @syt/marketing build', { SITE_PUBLIC_URL: PRODUCTION_URL, SITE_ALLOW_INDEXING: 'true', ASTRO_OUT_DIR: PRODUCTION_DIST }),
  ]);
}
const hasDefault = existsSync(path.join(DIST, 'index.html'));
const hasProduction = existsSync(path.join(PRODUCTION_DIST, 'index.html'));
if (builds.some(([, ok]) => !ok) || !hasDefault || (!args.has('--skip-production-build') && !hasProduction)) {
  record(0, 'build', false, builds.map(([name, ok]) => `${ok ? '✓' : '✗'} ${name}`).join(' / ') || 'dist missing');
  report.finish('seo:verify');
}

const variants = [{ name: 'default', dist: DIST, base: LOCAL_FALLBACK, indexing: false }];
if (hasProduction && !args.has('--skip-production-build')) variants.push({ name: 'production', dist: PRODUCTION_DIST, base: PRODUCTION_URL, indexing: true });
const pagesOf = (variant) => new Map(ALL_PAGES.map((route) => [route, read(htmlPath(variant.dist, route))]));
const all = variants.map((variant) => ({ ...variant, pages: pagesOf(variant) }));
const [defaultBuild] = all;
const production = all.find((variant) => variant.name === 'production');
const label = (variant) => `[${variant.name}]`;
const expectedCanonical = (variant, route) => `${variant.base}${route === '/' ? '/' : route}`;

// 在每份 build 的每一頁執行檢查，回傳問題清單
const eachPage = (fn) => all.flatMap((variant) => [...variant.pages].flatMap(([route, html]) => (html ? fn(variant, route, html) : [`${label(variant)} ${route}: build output missing`])));

// ---------------------------------------------------------------------------
// 1–2. title / description
// ---------------------------------------------------------------------------
{
  const problems = eachPage((variant, route, html) => {
    const title = titleOf(html);
    const issues = [];
    if (route === '/' && title !== HOME_TITLE) issues.push(`${label(variant)} /: ${title}`);
    if (route !== '/' && !title.endsWith(`｜${BRAND_NAME}`)) issues.push(`${label(variant)} ${route}: ${title}`);
    if (title.split(BRAND_NAME).length - 1 !== 1) issues.push(`${label(variant)} ${route}: 品牌重複 / 缺少`);
    return issues;
  });
  const titles = [...defaultBuild.pages.values()].map(titleOf);
  const duplicates = titles.filter((title, index) => titles.indexOf(title) !== index);
  const formatter = read(path.join(ROOT, 'packages', 'seo', 'src', 'metadata.ts'));
  record(
    1,
    `title 使用 formatPageTitle（首頁「${HOME_TITLE}」、其他「標題｜${BRAND_NAME}」，全站唯一）`,
    /export function formatPageTitle/.test(formatter) && problems.length === 0 && duplicates.length === 0,
    [...problems, ...duplicates.map((title) => `重複：${title}`)].slice(0, 3).join(' | ') || `${titles.length} titles`,
  );

  const descProblems = eachPage((variant, route, html) => {
    const description = metaContent(html, 'name', 'description') ?? '';
    return description.length < 30 ? [`${label(variant)} ${route}: ${description.length} chars`] : [];
  });
  const descriptions = [...defaultBuild.pages.values()].map((html) => metaContent(html, 'name', 'description'));
  const dupDesc = descriptions.filter((value, index) => descriptions.indexOf(value) !== index);
  record(2, 'meta description 存在且全站唯一', descProblems.length === 0 && dupDesc.length === 0, [...descProblems, ...dupDesc].slice(0, 3).join(' | ') || `${descriptions.length} descriptions`);
}

// ---------------------------------------------------------------------------
// 3. canonical
// ---------------------------------------------------------------------------
{
  const problems = eachPage((variant, route, html) => {
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    const issues = [];
    if (canonical !== expectedCanonical(variant, route)) issues.push(`${label(variant)} ${route}: ${canonical}`);
    const fallbackMeta = metaContent(html, 'name', 'syt-site-url');
    if (variant.indexing && (fallbackMeta || /localhost/.test(html))) issues.push(`${label(variant)} ${route}: 正式 build 出現 localhost / fallback 標記`);
    if (!variant.indexing && (fallbackMeta !== 'local-fallback' || !(metaContent(html, 'name', 'robots') ?? '').includes('noindex'))) issues.push(`${label(variant)} ${route}: fallback build 必須標示 local-fallback 且 noindex`);
    return issues;
  });
  // 原始碼：localhost 只允許出現在 fallback 常數（packages/seo/src/site-url.ts）與開發模式後台網址（lib/site.ts DEV）
  const allowed = new Set(['packages/seo/src/site-url.ts', 'apps/marketing/src/lib/site.ts']);
  const hardcoded = [...walk(SRC), ...walk(path.join(ROOT, 'packages', 'seo', 'src')), path.join(MARKETING_DIR, 'astro.config.mjs')]
    .filter((file) => /localhost/.test(read(file)) && !allowed.has(rel(file)))
    .map(rel);
  const guard = [
    siteUrlModule.siteUrlIndexingProblem({ url: LOCAL_FALLBACK, isFallback: true }, true),
    siteUrlModule.siteUrlIndexingProblem({ url: 'http://localhost:4321', isFallback: false }, true),
    siteUrlModule.siteUrlIndexingProblem({ url: 'http://www.senying.test', isFallback: false }, true),
  ];
  const guardOk = guard.every(Boolean) && siteUrlModule.siteUrlIndexingProblem({ url: PRODUCTION_URL, isFallback: false }, true) === null && siteUrlModule.siteUrlIndexingProblem({ url: LOCAL_FALLBACK, isFallback: true }, false) === null;
  record(
    3,
    'canonical 由 SITE_PUBLIC_URL 統一產生（正式 build 無 localhost；未設定時標示 local-fallback + noindex；允許索引但網址缺少 / localhost / 非 https 時 build 失敗）',
    problems.length === 0 && hardcoded.length === 0 && guardOk && Boolean(production),
    [...problems, ...hardcoded.map((file) => `寫死 localhost：${file}`), !guardOk && 'site-url guard 規則不符', !production && '未執行正式設定 build'].filter(Boolean).slice(0, 3).join(' | ') ||
      `${all.map((variant) => `${variant.name}=${variant.base}`).join(' · ')}`,
  );
}

// ---------------------------------------------------------------------------
// 4–8. Open Graph / Twitter
// ---------------------------------------------------------------------------
{
  const og = { title: [], description: [], image: [], size: [], twitter: [] };
  const checkedImages = new Set();
  for (const variant of all) {
    for (const [route, html] of variant.pages) {
      const title = titleOf(html);
      if (metaContent(html, 'property', 'og:title') !== title) og.title.push(`${label(variant)} ${route}`);
      if (metaContent(html, 'property', 'og:description') !== metaContent(html, 'name', 'description')) og.description.push(`${label(variant)} ${route}`);
      const image = metaContent(html, 'property', 'og:image') ?? '';
      const expected = `${variant.base}${ogImages[ogKeyFor(route)].src}`;
      if (image !== expected) og.image.push(`${label(variant)} ${route}: ${image}`);
      if (!metaContent(html, 'property', 'og:image:alt')?.includes(BRAND_NAME)) og.image.push(`${label(variant)} ${route}: og:image:alt`);
      checkedImages.add(ogImages[ogKeyFor(route)].src);
      if (metaContent(html, 'property', 'og:image:width') !== '1200' || metaContent(html, 'property', 'og:image:height') !== '630' || metaContent(html, 'property', 'og:image:type') !== 'image/png') og.size.push(`${label(variant)} ${route}`);
      if (metaContent(html, 'name', 'twitter:card') !== 'summary_large_image' || metaContent(html, 'name', 'twitter:image') !== image || metaContent(html, 'name', 'twitter:title') !== title) og.twitter.push(`${label(variant)} ${route}`);
    }
  }
  for (const src of checkedImages) {
    const meta = existsSync(toPublicFile(src)) ? await sharp(toPublicFile(src)).metadata() : null;
    if (!meta || meta.width !== 1200 || meta.height !== 630) og.size.push(`${src} 實際 ${meta?.width}×${meta?.height}`);
  }
  record(4, 'og:title 與 title 一致', og.title.length === 0, og.title.slice(0, 3).join(', ') || 'ok');
  record(5, 'og:description 與 meta description 一致', og.description.length === 0, og.description.slice(0, 3).join(', ') || 'ok');
  record(6, 'og:image 為絕對網址、指向對應頁面的正式 OG 圖，og:image:alt 含品牌', og.image.length === 0, og.image.slice(0, 3).join(' | ') || `${checkedImages.size} OG images`);
  record(7, 'og:image:width=1200、height=630、type=image/png（實際檔案也是 1200×630）', og.size.length === 0, og.size.slice(0, 3).join(', ') || 'ok');
  record(8, 'twitter:card=summary_large_image、twitter:image / title 與 OG 一致', og.twitter.length === 0, og.twitter.slice(0, 3).join(', ') || 'ok');
}

// ---------------------------------------------------------------------------
// 9–13. 結構
// ---------------------------------------------------------------------------
{
  const h1 = eachPage((variant, route, html) => ((html.match(/<h1\b/g) ?? []).length === 1 ? [] : [`${label(variant)} ${route}: ${(html.match(/<h1\b/g) ?? []).length}`]));
  record(9, '每頁 H1 唯一', h1.length === 0, h1.slice(0, 3).join(', ') || 'ok');

  const orgProblems = [];
  const siteProblems = [];
  for (const variant of all) {
    for (const route of ['/', '/about']) {
      const organization = jsonLdOfType(variant.pages.get(route) ?? '', 'Organization')[0];
      if (!organization) orgProblems.push(`${label(variant)} ${route}: 缺 Organization`);
      else if (organization.name !== BRAND_NAME || organization.url !== variant.base || organization['@id'] !== `${variant.base}/#organization` || !organization.description) orgProblems.push(`${label(variant)} ${route}: ${JSON.stringify(organization).slice(0, 120)}`);
    }
    const webSite = jsonLdOfType(variant.pages.get('/') ?? '', 'WebSite')[0];
    if (!webSite || webSite.name !== BRAND_NAME || webSite.url !== variant.base || webSite.publisher?.['@id'] !== `${variant.base}/#organization`) siteProblems.push(`${label(variant)}: ${JSON.stringify(webSite)}`);
  }
  record(10, `Organization JSON-LD（首頁 / 關於）：name=${BRAND_NAME}、url、@id、description`, orgProblems.length === 0, orgProblems.slice(0, 2).join(' | ') || 'ok');
  record(11, 'WebSite JSON-LD（首頁）：name、url、publisher → Organization @id', siteProblems.length === 0, siteProblems.join(' | ') || 'ok');

  const breadcrumbs = eachPage((variant, route, html) => {
    const block = jsonLdOfType(html, 'BreadcrumbList')[0];
    const items = block?.itemListElement ?? [];
    const last = items.at(-1)?.item;
    const issues = [];
    if (!block || items.length === 0) issues.push(`${label(variant)} ${route}: 缺 BreadcrumbList`);
    else if (last !== expectedCanonical(variant, route) && !(route === '/' && last === `${variant.base}/`)) issues.push(`${label(variant)} ${route}: 最後一項 ${last}`);
    if (!html.includes('aria-label="麵包屑"')) issues.push(`${label(variant)} ${route}: 缺可見 / sr-only 麵包屑`);
    return issues;
  });
  record(12, 'BreadcrumbList：每頁都有，最後一項等於 canonical', breadcrumbs.length === 0, breadcrumbs.slice(0, 3).join(' | ') || 'ok');

  const faq = eachPage((variant, route, html) => {
    if (!/id="faq"/.test(html)) return [];
    const block = jsonLdOfType(html, 'FAQPage')[0];
    const entities = block?.mainEntity ?? [];
    const details = (html.match(/<details\b/g) ?? []).length;
    if (entities.length === 0) return [`${label(variant)} ${route}: 缺 FAQPage`];
    if (entities.some((entity) => entity['@type'] !== 'Question' || !entity.name || !entity.acceptedAnswer?.text)) return [`${label(variant)} ${route}: Question 欄位不完整`];
    return entities.length > details ? [`${label(variant)} ${route}: FAQ schema ${entities.length} > 頁面 details ${details}`] : [];
  });
  record(13, 'FAQPage schema：有 FAQ 區塊的頁面輸出完整 Question / Answer，且不多於頁面上的問答', faq.length === 0, faq.slice(0, 3).join(' | ') || 'ok');
}

// ---------------------------------------------------------------------------
// 14–18. checkout / logo / sameAs / brand / Mori
// ---------------------------------------------------------------------------
{
  const checkout = all.map((variant) => [variant, metaContent(variant.pages.get('/checkout') ?? '', 'name', 'robots') ?? '']);
  const productionIndexable = production ? [...production.pages].filter(([route]) => route !== '/checkout').every(([, html]) => metaContent(html, 'name', 'robots') === 'index,follow') : false;
  record(
    14,
    'Checkout noindex（兩份 build 都是 noindex；正式設定 build 其他頁 index,follow）',
    checkout.every(([, robots]) => robots.includes('noindex')) && productionIndexable,
    checkout.map(([variant, robots]) => `${variant.name}=${robots}`).join(' · ') + ` · production 其他頁 index=${productionIndexable}`,
  );

  const logoProblems = [];
  for (const variant of all) {
    const organization = jsonLdOfType(variant.pages.get('/') ?? '', 'Organization')[0];
    const logo = organization?.logo ?? '';
    if (!logo.startsWith(`${variant.base}/`)) logoProblems.push(`${label(variant)} logo 不是絕對網址：${logo}`);
    const file = toPublicFile(logo.replace(variant.base, ''));
    if (!existsSync(file)) logoProblems.push(`${label(variant)} logo 檔案不存在`);
    else {
      const meta = await sharp(file).metadata();
      if (meta.width < 112 || meta.height < 112 || meta.format === 'svg') logoProblems.push(`${label(variant)} logo ${meta.width}×${meta.height} ${meta.format}`);
    }
  }
  record(15, 'Organization logo：絕對網址、檔案存在、點陣圖 ≥ 112×112（內建 /brand/sen-ying-logo-512.png）', logoProblems.length === 0, logoProblems.join(' | ') || jsonLdOfType(production?.pages.get('/') ?? defaultBuild.pages.get('/'), 'Organization')[0]?.logo);

  const sameAsProblems = [];
  for (const variant of all) {
    for (const [route, html] of variant.pages) {
      for (const block of jsonLdOfType(html, 'Organization')) {
        if ('sameAs' in block && (!Array.isArray(block.sameAs) || block.sameAs.length === 0 || block.sameAs.some((url) => !/^https?:\/\/\S+$/.test(url) || settingsModule.isPlaceholderUrl(url)))) sameAsProblems.push(`${label(variant)} ${route}`);
      }
    }
  }
  const expected = settingsModule.resolveSameAsUrls(settingsModule.getMockMarketingSiteSettings('default').socials);
  const actual = jsonLdOfType(defaultBuild.pages.get('/') ?? '', 'Organization')[0]?.sameAs ?? [];
  if (JSON.stringify(actual) !== JSON.stringify(expected)) sameAsProblems.push(`首頁 sameAs ${JSON.stringify(actual)} ≠ 設定 ${JSON.stringify(expected)}`);
  record(16, 'sameAs 只來自全站設定中已啟用的 http(s) 社群網址（沒有網址時不輸出 sameAs）', sameAsProblems.length === 0, sameAsProblems.slice(0, 3).join(' | ') || `sameAs=${JSON.stringify(actual)}（預設設定尚未提供正式社群網址）`);

  const brandProblems = eachPage((variant, route, html) => {
    const issues = [];
    if (metaContent(html, 'property', 'og:site_name') !== BRAND_NAME) issues.push(`${label(variant)} ${route}: og:site_name`);
    if (!html.includes(`aria-label="${BRAND_NAME} 首頁"`)) issues.push(`${label(variant)} ${route}: Header / Footer 品牌`);
    const names = jsonLdBlocks(html).flatMap((block) => [block.provider?.name, block.isPartOf?.name, block['@type'] === 'Organization' || block['@type'] === 'WebSite' ? block.name : undefined, block.publisher?.name]).filter(Boolean);
    if (names.some((name) => name !== BRAND_NAME)) issues.push(`${label(variant)} ${route}: JSON-LD ${names.join('/')}`);
    return issues;
  });
  record(17, `SEN YING 品牌一致（og:site_name、Header / Footer、JSON-LD 名稱都是「${BRAND_NAME}」）`, brandProblems.length === 0, brandProblems.slice(0, 3).join(' | ') || 'ok');

  const LEGACY_IDENTIFIER = /mori[-_][a-z]/g;
  const seoSurface = (html) => [titleOf(html), ...(html.match(/<meta\b[^>]*>/g) ?? []), ...jsonLdBlocks(html).map((block) => JSON.stringify(block))].join('\n');
  const moriHits = eachPage((variant, route, html) => (/mori/i.test(decode(seoSurface(html)).replace(LEGACY_IDENTIFIER, '')) ? [`${label(variant)} ${route}`] : []));
  const xmlHits = all.flatMap((variant) => ['sitemap.xml', 'robots.txt'].filter((file) => /mori/i.test(read(path.join(variant.dist, file)))).map((file) => `${label(variant)} ${file}`));
  record(18, '無 Mori（title / meta / JSON-LD / sitemap / robots）', moriHits.length === 0 && xmlHits.length === 0, [...moriHits, ...xmlHits].join(', ') || 'clean');
}

// ---------------------------------------------------------------------------
// 19–20. sitemap / robots
// ---------------------------------------------------------------------------
{
  const INDEXABLE = ALL_PAGES.filter((route) => route !== '/checkout');
  const problems = [];
  for (const variant of all) {
    const xml = read(path.join(variant.dist, 'sitemap.xml'));
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    const missing = INDEXABLE.filter((route) => !locs.includes(expectedCanonical(variant, route)));
    if (!xml.startsWith('<?xml')) problems.push(`${label(variant)} sitemap.xml 不存在`);
    if (missing.length) problems.push(`${label(variant)} 缺 ${missing.join(',')}`);
    if (locs.some((loc) => loc.includes('/checkout'))) problems.push(`${label(variant)} 收錄 checkout`);
    if (locs.some((loc) => !loc.startsWith(variant.base))) problems.push(`${label(variant)} loc 網域不一致`);
    if (variant.indexing && locs.some((loc) => /localhost/.test(loc))) problems.push(`${label(variant)} 出現 localhost`);
  }
  record(19, `sitemap.xml 收錄 ${INDEXABLE.length} 個可索引頁面、不含 checkout、網址使用 SITE_PUBLIC_URL`, problems.length === 0, problems.join(' | ') || 'ok');

  const robotsDefault = read(path.join(DIST, 'robots.txt'));
  const robotsProduction = production ? read(path.join(PRODUCTION_DIST, 'robots.txt')) : '';
  const robotsOk =
    robotsDefault.trim() === 'User-agent: *\nDisallow: /' &&
    /User-agent: \*\nAllow: \/\nDisallow: \/checkout/.test(robotsProduction) &&
    robotsProduction.includes(`Sitemap: ${PRODUCTION_URL}/sitemap.xml`);
  record(20, 'robots.txt：未允許索引時 Disallow: /；正式設定為 Allow + Disallow /checkout + 絕對 Sitemap', robotsOk, `default=${JSON.stringify(robotsDefault.trim())} production=${JSON.stringify(robotsProduction.trim())}`);
}

// 正式設定 build 只是驗收用，完成後刪除，避免誤用
if (!process.env.SEO_KEEP_PRODUCTION_DIST) rmSync(PRODUCTION_DIST, { recursive: true, force: true });
void PUBLIC_DIR;
report.finish('seo:verify');
