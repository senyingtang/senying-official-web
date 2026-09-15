// Phase 2.7 圖片 / 品牌素材驗收（靜態 build output，不啟動服務）
//
//   1. IMAGE_OPTIMIZATION_REPORT.csv 存在且與 manifest 同步（本腳本會先重新產生報告）
//   2. 所有 runtime PNG 都有 WebP（每個尺寸）          3. 主要 Hero 有 AVIF + WebP
//   4. ResponsiveImage 輸出 <picture>（AVIF / WebP source + PNG fallback）
//   5. 非首屏圖片 lazy（eager 只在第一個區塊）        6–7. 首頁 Hero eager + fetchpriority high
//   8. <img> 都有 width / height                      9. 無 runtime docs/design       10. 無 Downloads
//  11–14. OG 圖存在、1200×630、metadata 1200×630、twitter large image
//  15. favicon 存在並接入                              16. Logo fallback（TEMPORARY BRAND ASSET）存在
//  17–18. Header / Footer 使用同一個品牌 resolver       19. JSON-LD 品牌來自 runtime resolver
//  20. sameAs 不含空網址 / placeholder                 21. metadata 不寫死 Mori、不直接用 BRAND 拼品牌
//  22. public-facing 無 Mori                          23. 圖片 budget 報告存在       24. build
//
// 用法：pnpm asset:verify [--skip-build]
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { BRAND_DIR, BUDGET_MD, MANIFEST_FILE, OG_DIR, PUBLIC_DIR, REPORT_CSV, evaluateBudget, loadMediaAssets, readManifest, toPublicFile } from './lib/image-pipeline.mjs';
import { ADMIN_DIR, MARKETING_DIR, ROOT } from './lib/servers.mjs';
import { loadSharp } from './lib/sharp.mjs';
import {
  ALL_PAGES,
  DIST,
  SRC,
  contentImgTags,
  createReport,
  htmlPath,
  jsonLdOfType,
  linkTags,
  matchingParen,
  metaContent,
  ogKeyFor,
  pictures,
  read,
  regionHtml,
  rel,
  run,
  tagAttr,
  walk,
} from './lib/static-site.mjs';

const args = new Set(process.argv.slice(2));
const report = createReport('Phase 2.7 asset verify（圖片 / OG / Logo / Favicon）');
const { record } = report;
const sharp = loadSharp();

// ---------------------------------------------------------------------------
// 24. build
// ---------------------------------------------------------------------------
if (args.has('--skip-build')) record(24, 'build output 存在（--skip-build）', existsSync(path.join(DIST, 'index.html')));
else record(24, 'pnpm build', run('asset', 'pnpm build'));

const pages = new Map(ALL_PAGES.map((route) => [route, read(htmlPath(DIST, route))]));
const manifest = readManifest();
const media = await loadMediaAssets();
const runtimeSrcs = [...new Set(media.map((asset) => asset.src))];
const settingsModule = await import(pathToFileURL(path.join(ROOT, 'packages', 'database', 'src', 'site-settings.ts')).href);
const defaultSettings = settingsModule.getMockMarketingSiteSettings('default');
const expectedBrandName = `${defaultSettings.brand.brandNameZh} ${defaultSettings.brand.brandNameEn}`;
const { ogImages } = await import(pathToFileURL(path.join(SRC, 'content', 'ogImages.ts')).href);

// ---------------------------------------------------------------------------
// 1. 報告（先重新產生，確保與目前 build / manifest 一致）
// ---------------------------------------------------------------------------
{
  const generated = existsSync(path.join(DIST, 'index.html')) && run('asset', 'pnpm images:report');
  const csv = read(REPORT_CSV).replace(/^﻿/, '');
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const header = lines[0]?.split(',') ?? [];
  const required = ['source', 'width', 'height', 'format', 'sizeBytes', 'usedBy', 'aboveFold', 'webpPath', 'webpSize', 'avifPath', 'avifSize', 'savingPercent', 'status'];
  const missingColumns = required.filter((column) => !header.includes(column));
  const missingRows = runtimeSrcs.filter((src) => !csv.includes(`apps/marketing/public${src},`) || !csv.includes(manifest?.images?.[src]?.webp.at(-1).src ?? '__missing__'));
  record(
    1,
    'docs/design/IMAGE_OPTIMIZATION_REPORT.csv 存在、欄位齊全、列出全部 runtime 圖片',
    generated && existsSync(REPORT_CSV) && missingColumns.length === 0 && missingRows.length === 0,
    [missingColumns.length && `缺欄位 ${missingColumns.join(',')}`, missingRows.length && `缺圖片 ${missingRows.join(',')}`].filter(Boolean).join('; ') || `${lines.length - 1} rows`,
  );
}

// ---------------------------------------------------------------------------
// 2–3. WebP / AVIF
// ---------------------------------------------------------------------------
{
  const problems = [];
  if (!manifest) problems.push(`${rel(MANIFEST_FILE)} 不存在`);
  for (const src of runtimeSrcs) {
    const entry = manifest?.images?.[src];
    if (!entry) {
      problems.push(`${src} 沒有 manifest`);
      continue;
    }
    const sourceBytes = statSync(toPublicFile(src)).size;
    if (entry.bytes !== sourceBytes) problems.push(`${src} manifest 過期（PNG 已變更，請重跑 images:optimize）`);
    if (entry.webp.length === 0 || entry.webp.some((variant) => !existsSync(toPublicFile(variant.src)) || statSync(toPublicFile(variant.src)).size !== variant.bytes)) problems.push(`${src} WebP 缺少或與 manifest 不符`);
    if (entry.webp.at(-1).width !== entry.width) problems.push(`${src} 缺原尺寸 WebP`);
  }
  record(2, `所有 runtime PNG 都有 WebP（原尺寸 + srcset 尺寸，${runtimeSrcs.length} 張）`, problems.length === 0, problems.slice(0, 4).join('; ') || `${runtimeSrcs.reduce((sum, src) => sum + (manifest?.images?.[src]?.webp.length ?? 0), 0)} WebP files`);

  const heroes = media.filter((asset) => asset.role === 'hero');
  const heroProblems = heroes.filter((asset) => {
    const entry = manifest?.images?.[asset.src];
    return !entry || entry.avif.length === 0 || entry.avif.some((variant) => !existsSync(toPublicFile(variant.src))) || entry.webp.length === 0;
  });
  record(3, `主要 Hero（role=hero，${heroes.length} 張）都有 AVIF + WebP`, heroes.length >= 8 && heroProblems.length === 0, heroProblems.map((asset) => asset.src).join(', ') || heroes.map((asset) => asset.label).join(', '));
}

// ---------------------------------------------------------------------------
// 4. ResponsiveImage → <picture>
// ---------------------------------------------------------------------------
{
  const component = read(path.join(SRC, 'components', 'ResponsiveImage.astro'));
  const sourceOk = /<picture\b/.test(component) && /type="image\/avif"/.test(component) && /type="image\/webp"/.test(component) && /sizes\?: string/.test(component) && /srcset\?: string/.test(component);
  const problems = [];
  let pictureCount = 0;
  for (const [route, html] of pages) {
    const responsive = (html.match(/<img\b[^>]*data-responsive-image[^>]*>/g) ?? []).length;
    const blocks = pictures(html).filter((block) => /data-responsive-picture/.test(block.tag));
    pictureCount += blocks.length;
    if (blocks.length !== responsive) problems.push(`${route}: ${responsive} img / ${blocks.length} picture`);
    for (const block of blocks) {
      const types = block.sources.map((source) => source.type);
      const fallback = tagAttr(block.img, 'src') ?? '';
      if (types[0] !== 'image/avif' || types[1] !== 'image/webp') problems.push(`${route}: ${fallback} source 順序 ${types.join('>')}`);
      if (block.sources.some((source) => !source.sizes || !source.srcset)) problems.push(`${route}: ${fallback} 缺 srcset / sizes`);
      if (!/\.(png|jpe?g)$/.test(fallback)) problems.push(`${route}: fallback ${fallback} 不是 PNG / JPG`);
    }
  }
  record(4, 'ResponsiveImage 輸出 <picture>：AVIF → WebP source（srcset + sizes）→ PNG fallback <img>', sourceOk && pictureCount > 0 && problems.length === 0, problems.slice(0, 3).join(' | ') || `${pictureCount} pictures / ${pages.size} pages`);
}

// ---------------------------------------------------------------------------
// 5–8. loading / fetchpriority / width / height
// ---------------------------------------------------------------------------
{
  const problems = [];
  let lazy = 0;
  for (const [route, html] of pages) {
    const mainStart = html.indexOf('<main');
    const firstSectionEnd = html.indexOf('</section>', mainStart);
    const eager = [];
    for (const match of html.matchAll(/<img\b[^>]*>/g)) {
      if (/\sdata-brand-logo(?=[\s=>])/.test(match[0])) continue;
      if (tagAttr(match[0], 'loading') === 'lazy') {
        lazy += 1;
        continue;
      }
      eager.push(match);
      if (match.index < mainStart || match.index > firstSectionEnd) problems.push(`${route}: 非首屏 eager ${tagAttr(match[0], 'src')}`);
    }
    if (eager.length > 1) problems.push(`${route}: ${eager.length} 張 eager`);
  }
  record(5, '非首屏圖片 lazy（eager 只出現在頁面第一個區塊，每頁最多 1 張）', problems.length === 0, problems.slice(0, 3).join(' | ') || `${lazy} lazy images`);

  const home = pages.get('/') ?? '';
  const heroImg = contentImgTags(regionHtml(home, 'section', 'data-section="hero"')).find((tag) => tagAttr(tag, 'src') === '/images/hero/home-hero-platform-ui-final.png');
  record(6, '首頁 Hero 圖 loading="eager"', Boolean(heroImg) && tagAttr(heroImg, 'loading') === 'eager', heroImg ? `loading=${tagAttr(heroImg, 'loading')}` : 'hero img not found');
  record(7, '首頁 Hero 圖 fetchpriority="high"', Boolean(heroImg) && tagAttr(heroImg, 'fetchpriority') === 'high', heroImg ? `fetchpriority=${tagAttr(heroImg, 'fetchpriority')}` : 'hero img not found');

  const unsized = [...pages].flatMap(([route, html]) => (html.match(/<img\b[^>]*>/g) ?? []).filter((tag) => !/\swidth="\d+"/.test(tag) || !/\sheight="\d+"/.test(tag)).map((tag) => `${route}: ${tag.slice(0, 80)}`));
  record(8, '<img> 都有 width / height', unsized.length === 0, unsized.slice(0, 2).join(' | ') || 'ok');
}

// ---------------------------------------------------------------------------
// 9–10. docs/design / Downloads
// ---------------------------------------------------------------------------
{
  const sourceFiles = walk(SRC).filter((file) => /\.(astro|ts|tsx|css|mjs|js|json)$/.test(file));
  const distFiles = walk(DIST).filter((file) => /\.(html|css|js|xml|txt|json|svg)$/.test(file));
  const DESIGN_REF = /(?:src|href|srcset|content)\s*=\s*["'{`][^"'`}]*docs[\\/]design|src:\s*['"`][^'"`]*docs[\\/]design|url\(\s*['"]?[^)'"]*docs[\\/]design/i;
  const designHits = [...sourceFiles, ...distFiles].filter((file) => DESIGN_REF.test(read(file))).map(rel);
  const srcsetDesign = [...pages.values()].flatMap((html) => pictures(html).flatMap((block) => block.sources.map((source) => source.srcset))).filter((srcset) => /docs[\\/]design/i.test(srcset));
  const manifestDesign = Object.values(manifest?.images ?? {}).flatMap((entry) => [...entry.webp, ...entry.avif]).filter((variant) => !variant.src.startsWith('/images/'));
  record(9, '無 runtime docs/design 引用（原始碼、build、srcset、manifest）', designHits.length === 0 && srcsetDesign.length === 0 && manifestDesign.length === 0, [...designHits, ...srcsetDesign].slice(0, 3).join(', ') || 'clean');

  const DOWNLOADS = /[A-Za-z]:[\\/]+Users[\\/]+[^\\/"'\s]+[\\/]+Downloads|[\\/]Downloads[\\/]/i;
  const scripts = ['image-optimize.mjs', 'og-generate.mjs', 'brand-assets.mjs', 'image-report.mjs'].map((name) => path.join(ROOT, 'scripts', name));
  const downloadHits = [...sourceFiles, ...distFiles, ...scripts, MANIFEST_FILE].filter((file) => DOWNLOADS.test(read(file))).map(rel);
  const downloadPublic = walk(PUBLIC_DIR).filter((file) => /downloads/i.test(rel(file))).map(rel);
  record(10, '無 Downloads 路徑（原始碼、build、轉檔腳本、manifest、public）', downloadHits.length === 0 && downloadPublic.length === 0, [...downloadHits, ...downloadPublic].join(', ') || 'clean');
}

// ---------------------------------------------------------------------------
// 11–14. OG
// ---------------------------------------------------------------------------
{
  const configs = Object.values(ogImages);
  const required = ['default', 'home', 'products', 'seo-website', 'landing-page', 'ecommerce-website', 'promo-page-design', 'seo-article-generator', 'cases', 'blog'];
  const missing = [...required.filter((key) => !ogImages[key]), ...configs.filter((config) => !existsSync(toPublicFile(config.src))).map((config) => config.src)];
  const namingProblems = configs.filter((config) => config.src !== `/images/og/${config.key}-og-1200x630.png`).map((config) => config.src);
  record(11, `OG 圖存在（${configs.length} 張，含必要 ${required.length} 張）於 apps/marketing/public/images/og`, missing.length === 0 && namingProblems.length === 0, [...missing, ...namingProblems].join(', ') || configs.map((config) => config.key).join(', '));

  const sizeProblems = [];
  for (const file of walk(OG_DIR).filter((item) => item.endsWith('.png'))) {
    const meta = await sharp(file).metadata();
    if (meta.width !== 1200 || meta.height !== 630 || meta.format !== 'png') sizeProblems.push(`${path.basename(file)} ${meta.width}×${meta.height} ${meta.format}`);
  }
  record(12, 'OG 圖全部為 1200×630 PNG', walk(OG_DIR).length >= required.length && sizeProblems.length === 0, sizeProblems.join(', ') || `${walk(OG_DIR).length} files`);

  const metaProblems = [];
  const twitterProblems = [];
  for (const [route, html] of pages) {
    const image = (metaContent(html, 'property', 'og:image') ?? '').replace(/^https?:\/\/[^/]+/, '');
    const expected = ogImages[ogKeyFor(route)].src;
    if (image !== expected) metaProblems.push(`${route}: ${image} ≠ ${expected}`);
    if (metaContent(html, 'property', 'og:image:width') !== '1200' || metaContent(html, 'property', 'og:image:height') !== '630') metaProblems.push(`${route}: 尺寸`);
    if (metaContent(html, 'property', 'og:image:type') !== 'image/png') metaProblems.push(`${route}: og:image:type`);
    if (metaContent(html, 'name', 'twitter:card') !== 'summary_large_image') twitterProblems.push(`${route}: twitter:card`);
    if (metaContent(html, 'name', 'twitter:image') !== metaContent(html, 'property', 'og:image')) twitterProblems.push(`${route}: twitter:image`);
  }
  record(13, 'og:image 使用對應 OG 圖，og:image:width=1200 / height=630 / type=image/png', metaProblems.length === 0, metaProblems.slice(0, 3).join(' | ') || `${pages.size} pages`);
  record(14, 'twitter:card=summary_large_image，twitter:image 與 og:image 相同', twitterProblems.length === 0, twitterProblems.slice(0, 3).join(' | ') || `${pages.size} pages`);
}

// ---------------------------------------------------------------------------
// 15–16. favicon / logo fallback
// ---------------------------------------------------------------------------
{
  const expectedPng = { 'favicon-32.png': 32, 'favicon-192.png': 192, 'apple-touch-icon.png': 180, 'sen-ying-logo-512.png': 512 };
  const problems = [];
  if (!existsSync(path.join(BRAND_DIR, 'favicon.svg'))) problems.push('brand/favicon.svg');
  for (const [file, size] of Object.entries(expectedPng)) {
    const full = path.join(BRAND_DIR, file);
    if (!existsSync(full)) problems.push(`${file} 不存在`);
    else {
      const meta = await sharp(full).metadata();
      if (meta.width !== size || meta.height !== size) problems.push(`${file} ${meta.width}×${meta.height}`);
    }
  }
  for (const [route, html] of pages) {
    const icons = [...linkTags(html, 'icon'), ...linkTags(html, 'apple-touch-icon')];
    const hrefs = icons.map((tag) => tagAttr(tag, 'href') ?? '');
    const brandFavicon = icons.find((tag) => /\sdata-brand-favicon(?=[\s=>])/.test(tag));
    if (!brandFavicon) problems.push(`${route}: 沒有 data-brand-favicon`);
    if (hrefs.some((href) => href.startsWith('/') && !existsSync(toPublicFile(href)))) problems.push(`${route}: favicon 檔案不存在 ${hrefs.join(' ')}`);
    if (!hrefs.includes('/brand/apple-touch-icon.png') || !hrefs.includes('/brand/favicon-32.png')) problems.push(`${route}: 缺 PNG / apple-touch-icon`);
  }
  record(15, 'favicon 存在並接入全站（svg + 32 / 192 PNG + apple-touch-icon 180）', problems.length === 0, problems.slice(0, 3).join(' | ') || `favicon=${tagAttr(linkTags(pages.get('/') ?? '', 'icon').find((tag) => /data-brand-favicon/.test(tag)) ?? '', 'href')}`);

  const logos = ['sen-ying-logo.svg', 'sen-ying-logo-dark.svg', 'sen-ying-mark.svg', 'favicon.svg'];
  const logoProblems = logos.filter((file) => !/TEMPORARY BRAND ASSET/.test(read(path.join(BRAND_DIR, file)))).map((file) => `${file} 缺少或未標註 TEMPORARY BRAND ASSET`);
  if (!/<symbol id="sen-ying-mark"/.test(read(path.join(BRAND_DIR, 'sen-ying-mark.svg')))) logoProblems.push('sen-ying-mark.svg 缺 <symbol id="sen-ying-mark">');
  const runtime = read(path.join(SRC, 'lib', 'brand-runtime.ts'));
  for (const fallback of ['/brand/sen-ying-logo.svg', '/brand/favicon.svg', '/brand/sen-ying-mark.svg']) if (!runtime.includes(`'${fallback}'`)) logoProblems.push(`brand-runtime 缺 fallback ${fallback}`);
  record(16, 'Logo fallback 存在（sen-ying-logo / -dark / mark / favicon，標註 TEMPORARY BRAND ASSET）', logoProblems.length === 0, logoProblems.join('; ') || logos.join(', '));
}

// ---------------------------------------------------------------------------
// 17–20. 品牌 resolver
// ---------------------------------------------------------------------------
{
  const lockupSource = read(path.join(SRC, 'components', 'BrandLockup.astro'));
  const headerSource = read(path.join(SRC, 'components', 'Header.astro'));
  const footerSource = read(path.join(SRC, 'components', 'Footer.astro'));
  const lockupOk = /getBrandRuntime\(\)/.test(lockupSource) && /brand\.logoUrl/.test(lockupSource) && /brand\.markUrl/.test(lockupSource);
  const home = pages.get('/') ?? '';
  const header = regionHtml(home, 'header', 'data-section="header"');
  const footer = regionHtml(home, 'footer', 'data-section="footer"');
  const markRef = /<use href="\/brand\/sen-ying-mark\.svg#sen-ying-mark"/;
  const hardcodedMark = (source) => /<rect\b|<path d="M16 6/.test(source) || /brandNameZh|brandNameEn/.test(source);
  record(
    17,
    'Header 使用品牌 resolver（BrandLockup → getBrandRuntime，無自帶 Logo / 品牌字串）',
    lockupOk && /<BrandLockup variant="header"/.test(headerSource) && !hardcodedMark(headerSource) && /data-brand-lockup="header"/.test(header) && markRef.test(header),
    `lockup=${lockupOk} header-source=${/<BrandLockup variant="header"/.test(headerSource)} build=${markRef.test(header)}`,
  );
  const pagesWithSameLogo = [...pages.values()].filter((html) => markRef.test(regionHtml(html, 'header', 'data-section="header"')) && markRef.test(regionHtml(html, 'footer', 'data-section="footer"'))).length;
  record(
    18,
    'Footer 使用同一個 resolver（BrandLockup footer + getBrandRuntime，所有頁面 Header / Footer 引用同一 Logo）',
    /<BrandLockup variant="footer"/.test(footerSource) && /getBrandRuntime\(\)/.test(footerSource) && !hardcodedMark(footerSource) && !/from '@syt\/shared'/.test(footerSource) && /data-brand-lockup="footer"/.test(footer) && pagesWithSameLogo === pages.size,
    `${pagesWithSameLogo}/${pages.size} pages`,
  );

  const JSONLD_CALL = /\b(organizationJsonLd|webSiteJsonLd|webPageJsonLd|serviceJsonLd|softwareApplicationJsonLd)\(/g;
  const callProblems = [];
  let calls = 0;
  for (const file of walk(path.join(SRC, 'pages')).filter((item) => item.endsWith('.astro'))) {
    const source = read(file);
    // import 行沒有「(」，不會符合；只檢查實際呼叫
    for (const match of source.matchAll(JSONLD_CALL)) {
      const open = match.index + match[0].length - 1;
      const call = source.slice(match.index, matchingParen(source, open) + 1);
      if (!call.includes('(siteUrl')) continue;
      calls += 1;
      if (!/brand\.seo\)$/.test(call)) callProblems.push(`${rel(file)}: ${call.slice(0, 60)}`);
    }
  }
  const layout = read(path.join(SRC, 'layouts', 'BaseLayout.astro'));
  const organization = jsonLdOfType(home, 'Organization')[0];
  const orgOk = organization?.name === expectedBrandName && /\/brand\/sen-ying-logo-512\.png$/.test(organization?.logo ?? '');
  const namesOk = [...pages.values()].every((html) =>
    [...jsonLdOfType(html, 'WebPage'), ...jsonLdOfType(html, 'AboutPage'), ...jsonLdOfType(html, 'ContactPage'), ...jsonLdOfType(html, 'CollectionPage'), ...jsonLdOfType(html, 'CheckoutPage')].every((block) => block.isPartOf?.name === expectedBrandName) &&
    [...jsonLdOfType(html, 'Service')].every((block) => block.provider?.name === expectedBrandName),
  );
  record(
    19,
    'JSON-LD 品牌讀 runtime resolver（頁面傳入 brand.seo、BaseLayout 使用 getBrandRuntime，輸出名稱 / logo 正確）',
    calls >= 12 && callProblems.length === 0 && /getBrandRuntime\(\)/.test(layout) && orgOk && namesOk,
    callProblems.slice(0, 2).join(' | ') || `${calls} calls · Organization ${organization?.name} logo ${organization?.logo}`,
  );

  const sameAsProblems = [];
  for (const [route, html] of pages) {
    for (const block of jsonLdOfType(html, 'Organization')) {
      if (!('sameAs' in block)) continue;
      if (!Array.isArray(block.sameAs) || block.sameAs.length === 0 || block.sameAs.some((url) => !/^https?:\/\/\S+$/.test(url) || settingsModule.isPlaceholderUrl(url))) sameAsProblems.push(`${route}: ${JSON.stringify(block.sameAs)}`);
    }
  }
  const verificationSameAs = settingsModule.resolveSameAsUrls(settingsModule.getMockMarketingSiteSettings('verification').socials);
  const social = (platform, url, enabled = true) => ({ id: platform, platform, label: platform, url, enabled, sortOrder: 1, openInNewTab: true, showOnDesktop: true, showOnMobile: true });
  const crafted = settingsModule.resolveSameAsUrls([
    social('facebook', 'https://www.facebook.com/senying.studio'),
    social('instagram', ''),
    social('threads', 'https://www.threads.net/@senying.studio', false),
    social('youtube', 'javascript:alert(1)'),
    social('email', 'mailto:hello@senying.studio'),
    social('phone', 'tel:+886-2-1234-5678'),
    social('line', 'https://line.me/R/ti/p/@senying'),
    social('tiktok', 'https://www.tiktok.com/@example'),
  ]);
  if (verificationSameAs.length !== 0) sameAsProblems.push(`verification preset（example 網址）產生 ${verificationSameAs.join(',')}`);
  if (JSON.stringify(crafted) !== JSON.stringify(['https://www.facebook.com/senying.studio'])) sameAsProblems.push(`規則測試：${JSON.stringify(crafted)}`);
  record(20, 'sameAs 不含空網址 / 停用 / mailto / tel / LINE / placeholder（build 輸出 + 規則測試）', sameAsProblems.length === 0, sameAsProblems.join(' | ') || `default build sameAs：${JSON.stringify(jsonLdOfType(pages.get('/') ?? '', 'Organization')[0]?.sameAs ?? '（未輸出，後台尚未填社群網址）')}`);
}

// ---------------------------------------------------------------------------
// 21–22. Mori
// ---------------------------------------------------------------------------
{
  const metadataSources = [
    ...walk(path.join(ROOT, 'packages', 'seo', 'src')),
    path.join(ROOT, 'packages', 'shared', 'src', 'constants', 'brand.ts'),
    path.join(SRC, 'layouts', 'BaseLayout.astro'),
    path.join(SRC, 'lib', 'brand-runtime.ts'),
    path.join(SRC, 'content', 'ogImages.ts'),
    path.join(SRC, 'components', 'BrandLockup.astro'),
  ];
  const moriHits = metadataSources.filter((file) => /mori/i.test(read(file))).map(rel);
  const brandConstantInPages = walk(path.join(SRC, 'pages'))
    .concat(path.join(SRC, 'layouts', 'BaseLayout.astro'), path.join(SRC, 'components', 'Header.astro'), path.join(SRC, 'components', 'Footer.astro'))
    .filter((file) => /\bBRAND\.(name|nameZh|nameEn)\b|titleIsFull/.test(read(file)))
    .map(rel);
  record(21, 'metadata 不寫死 Mori，頁面 / layout / Header / Footer 不直接用 BRAND 常數拼品牌', moriHits.length === 0 && brandConstantInPages.length === 0, [...moriHits, ...brandConstantInPages].join(', ') || `${metadataSources.length} metadata sources clean`);

  const LEGACY_IDENTIFIER = /mori[-_][a-z]/g;
  const publicFiles = [...walk(DIST).filter((file) => /\.(html|js|css|xml|txt|json|svg)$/.test(file)), ...walk(BRAND_DIR).filter((file) => file.endsWith('.svg')), ...walk(path.join(ADMIN_DIR, 'src')).filter((file) => /site-settings/i.test(file))];
  const publicHits = publicFiles.filter((file) => /mori/i.test(read(file).replace(LEGACY_IDENTIFIER, ''))).map(rel);
  record(22, `public-facing 無 Mori（marketing dist、brand 素材；${publicFiles.length} files）`, publicHits.length === 0, publicHits.slice(0, 4).join(', ') || 'clean');
}

// ---------------------------------------------------------------------------
// 23. 預算報告
// ---------------------------------------------------------------------------
{
  const markdown = read(BUDGET_MD);
  const missing = runtimeSrcs.filter((src) => !markdown.includes(src));
  const overWithoutNote = runtimeSrcs.filter((src) => {
    const entry = manifest?.images?.[src];
    return entry && evaluateBudget(entry).some((check) => !check.ok) && !markdown.includes(`${src}（超過預算原因`);
  });
  record(
    23,
    '圖片 budget 報告存在（docs/performance/PHASE_2_7_IMAGE_BUDGET.md 列出全部 runtime 圖片，超過預算需寫原因；由 pnpm perf:verify 產生）',
    existsSync(BUDGET_MD) && missing.length === 0 && overWithoutNote.length === 0 && existsSync(path.join(MARKETING_DIR, 'public', 'images', 'og')),
    [missing.length && `未列出 ${missing.join(',')}`, overWithoutNote.length && `超過預算未說明 ${overWithoutNote.join(',')}`].filter(Boolean).join('; ') || rel(BUDGET_MD),
  );
}

report.finish('asset:verify');
