// Phase 2.5 UI/UX 驗收：森映官網前台（apps/marketing）
//
// 檢查項目：
//   1. build（pnpm build）
//   2. 每頁 SEO 與結構：title / description / canonical / OG / robots(noindex) / JSON-LD / Breadcrumb / FAQ / H1 唯一 / 標題層級 / 禁用套話
//   3. 首頁：必要區塊（Phase 2.6B 設計稿版型）、Hero 主標、查看方案 / 看作品 / Line@ 客製詢問、Hero 不用影片與背景圖
//   4. 產品頁（含一頁式子頁與產品目錄）：H1、主 / 次 CTA、FAQ、Service JSON-LD、價格說明
//   5. 結帳 / 聯絡 / 案例 / 文章 / 關於 / 解決方案 / 法律頁的必要內容
//   6. 文案：禁用 AI 套話、不寫死未確認價格、重要內容不靠 hover 才出現
//   7. 安全：正式 Supabase URL / key、正式金流資料、前台不讀 server-only env
//   8. 效能：無影片、無大型動畫套件、JS / CSS / 圖片 / HTML 大小預算、img 尺寸
//   9. runtime（Chrome）：Hero 高度、CTA 不需 hover 即可見、手機 CTA 直向排列、Mockup 不超出、LCP、
//      首頁精選作品 rail 為有限輪播（375 / 430 / 1440：滑到最後一張停住、不回第一張）
//  10. RWD：pnpm rwd:check marketing（375 / 430 / 768 / 1024 / 1280 / 1440）
//  11. 圖片（Phase 2.6）：media.ts 與 IMAGE_SELECTION_PLAN.csv 對齊、各頁引用對應 final 圖、src 規則、alt / width / height、
//      首頁 Hero 圖 eager + fetchpriority high、每頁最多 1 張 eager、og:image 使用對應的 1200×630 正式 OG 圖（Phase 2.7）
//
// 用法：pnpm ui:verify [--skip-build] [--skip-rwd]
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { MARKETING_DIR, ROOT, findChrome, installSignalCleanup, startMarketingServer, stopAll } from './lib/servers.mjs';

const args = new Set(process.argv.slice(2));
const DIST = path.join(MARKETING_DIR, 'dist');
const SRC = path.join(MARKETING_DIR, 'src');
const results = [];
const record = (group, name, ok, detail = '') => results.push({ group, name, ok: Boolean(ok), detail: String(detail ?? '') });
const rel = (file) => path.relative(ROOT, file).split(path.sep).join('/');
const read = (file) => (existsSync(file) ? readFileSync(file, 'utf8') : '');
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : walk(full);
    return [full];
  });
}

function run(command) {
  console.log(`\n[ui] $ ${command}`);
  return spawnSync(command, { cwd: ROOT, stdio: 'inherit', shell: true, env: { ...process.env, DATA_SOURCE: process.env.DATA_SOURCE || 'mock' } }).status === 0;
}

const PRODUCT_PAGES = ['/products/seo-website', '/products/landing-page', '/products/ecommerce-website', '/products/promo-page-design', '/products/seo-article-generator'];
const LANDING_PAGES = [
  '/products/landing-page/group-buy-promo',
  '/products/landing-page/event-registration',
  '/products/landing-page/course-enrollment',
  '/products/landing-page/booking-form',
];
const ALL_PAGES = ['/', '/products', ...PRODUCT_PAGES, ...LANDING_PAGES, '/solutions', '/cases', '/blog', '/about', '/contact', '/checkout', '/legal/terms', '/legal/privacy'];
// Phase 2.6B：首頁依 mockup-home-page 區塊重構（Header / Footer 由 layout 輸出，完整順序由 pnpm mockup:verify 檢查）
const HOME_SECTIONS = ['hero', 'brand-trust', 'featured-works', 'products', 'process', 'templates', 'faq', 'cta'];

// ---------------------------------------------------------------------------
// 1. Build
// ---------------------------------------------------------------------------
if (args.has('--skip-build')) record('1. Build', 'dist 已存在（--skip-build）', existsSync(path.join(DIST, 'index.html')));
else record('1. Build', 'pnpm build', run('pnpm build'));

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------
const htmlPath = (route) => (route === '/' ? path.join(DIST, 'index.html') : path.join(DIST, ...route.split('/').filter(Boolean), 'index.html'));
const decode = (value) => value.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const tagAttr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1] ?? null;
const hasClass = (attrs, className) => (tagAttr(` ${attrs}`, 'class') ?? '').split(/\s+/).includes(className);
const visibleText = (html) =>
  decode(html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');

function metaContent(html, key, value) {
  const tag = (html.match(/<meta\b[^>]*>/g) ?? []).find((item) => tagAttr(item, key) === value);
  return tag ? decode(tagAttr(tag, 'content') ?? '') : null;
}

function jsonLdBlocks(html) {
  return [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((match) => {
    try {
      return JSON.parse(match[1]);
    } catch {
      return { parseError: true };
    }
  });
}

function anchors(html, attr, value) {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)]
    .filter((match) => tagAttr(` ${match[1]}`, attr) === value)
    .map((match) => ({ attrs: match[1], text: visibleText(match[2]).trim() }));
}

const brand = await import(pathToFileURL(path.join(ROOT, 'packages', 'shared', 'src', 'constants', 'brand.ts')).href);
const BANNED = [...brand.BANNED_COPY_PHRASES];
const allowIndexing = process.env.SITE_ALLOW_INDEXING === 'true';
const pages = new Map();

// ---------------------------------------------------------------------------
// 2. 每頁 SEO / 結構
// ---------------------------------------------------------------------------
for (const route of ALL_PAGES) {
  const group = '2. 頁面 SEO / 結構';
  const html = read(htmlPath(route));
  if (!html) {
    record(group, route, false, `build output missing: ${rel(htmlPath(route))}`);
    continue;
  }
  const text = visibleText(html);
  pages.set(route, { html, text });
  const problems = [];
  const title = decode(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '').trim();
  if (!title) problems.push('title');
  if (!metaContent(html, 'name', 'description')) problems.push('meta description');
  if (!/<link rel="canonical" href="[^"]+"/.test(html)) problems.push('canonical');
  for (const property of ['og:title', 'og:description', 'og:image', 'og:url']) if (!metaContent(html, 'property', property)) problems.push(property);
  const robots = metaContent(html, 'name', 'robots') ?? '';
  const expectNoindex = !allowIndexing || route === '/checkout';
  if (expectNoindex !== robots.includes('noindex')) problems.push(`robots=${robots}`);
  const h1Count = (html.match(/<h1\b/g) ?? []).length;
  if (h1Count !== 1) problems.push(`h1 x${h1Count}`);
  const levels = [...html.matchAll(/<h([1-6])\b/g)].map((match) => Number(match[1]));
  const skipAt = levels.findIndex((level, index) => index > 0 && level > levels[index - 1] + 1);
  if (levels[0] !== 1 || skipAt !== -1) problems.push(`heading order ${levels.join('')}`);
  if (!html.includes('aria-label="麵包屑"')) problems.push('breadcrumb');
  const blocks = jsonLdBlocks(html);
  if (blocks.some((block) => block.parseError)) problems.push('JSON-LD parse error');
  const types = blocks.map((block) => block['@type']);
  if (!types.includes('BreadcrumbList')) problems.push('BreadcrumbList');
  if (!types.includes('FAQPage')) problems.push('FAQPage');
  if (!/id="faq"/.test(html) || !/<details\b/.test(html)) problems.push('FAQ section');
  const banned = BANNED.filter((phrase) => text.includes(phrase));
  if (banned.length) problems.push(`banned: ${banned.join(',')}`);
  record(group, route, problems.length === 0, problems.join('; ') || `${title} · robots=${robots} · JSON-LD ${types.join('/')}`);
}

// ---------------------------------------------------------------------------
// 3. 首頁
// ---------------------------------------------------------------------------
const home = pages.get('/');
if (home) {
  const group = '3. 首頁';
  const missingSections = HOME_SECTIONS.filter((key) => !home.html.includes(`data-section="${key}"`));
  record(group, `必要區塊 ${HOME_SECTIONS.length} 個`, missingSections.length === 0, missingSections.length ? `缺少：${missingSections.join(', ')}` : HOME_SECTIONS.join(' / '));
  const h1Text = visibleText(home.html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? '').trim();
  record(group, 'Hero 主標', h1Text.replace(/\s+/g, '') === '把網站、App和內容，做成真的能用的產品', h1Text);
  const primary = anchors(home.html, 'data-cta', 'hero-primary');
  const secondary = anchors(home.html, 'data-cta', 'hero-secondary');
  const line = anchors(home.html, 'data-cta', 'hero-line');
  record(group, 'Hero 主 CTA「查看方案」', primary.length === 1 && primary[0].text.startsWith('查看方案'), primary.map((item) => item.text).join(', '));
  record(group, 'Hero 次 CTA「看作品」', secondary.length === 1 && secondary[0].text === '看作品', secondary.map((item) => item.text).join(', '));
  record(group, 'Hero 第三個 CTA「Line@ 客製詢問」', line.length === 1 && line[0].text === 'Line@ 客製詢問', line.map((item) => item.text).join(', '));
  record(
    group,
    'Hero CTA 沒有 opacity-0 / invisible / hidden（不藏在 hover 後）',
    [...primary, ...secondary, ...line].every((item) => !['opacity-0', 'invisible', 'hidden'].some((className) => hasClass(item.attrs, className))),
  );
  const heroHtml = home.html.match(/<section[^>]*data-section="hero"[\s\S]*?<\/section>/)?.[0] ?? '';
  const heroImages = heroHtml.match(/<img\b[^>]*>/g) ?? [];
  record(
    group,
    'Hero 只有 1 張主視覺圖（home hero final），不使用影片或 CSS 背景圖檔',
    heroHtml.length > 0 && !/<video\b|url\(/.test(heroHtml) && heroImages.length === 1 && tagAttr(heroImages[0], 'src') === '/images/hero/home-hero-platform-ui-final.png',
    heroImages.map((tag) => tagAttr(tag, 'src')).join(', ') || 'no image',
  );
  record(group, 'Hero 主標與 CTA 仍為文字（不被圖片取代）', /<h1\b/.test(heroHtml) && /data-cta="hero-primary"/.test(heroHtml) && !/<img\b[^>]*data-cta/.test(heroHtml));
  record(group, '版型方向錨點 #templates 存在', /id="templates"/.test(home.html));
}

// ---------------------------------------------------------------------------
// 4. 產品頁
// ---------------------------------------------------------------------------
for (const route of ['/products', ...PRODUCT_PAGES, ...LANDING_PAGES]) {
  const page = pages.get(route);
  if (!page) continue;
  const ctas = [...page.html.matchAll(/data-cta="([^"]+)"/g)].map((match) => match[1]);
  const types = jsonLdBlocks(page.html).map((block) => block['@type']);
  const problems = [];
  if ((page.html.match(/<h1\b/g) ?? []).length !== 1) problems.push('H1');
  if (!ctas.includes('primary')) problems.push('主 CTA');
  if (!ctas.includes('secondary')) problems.push('次 CTA');
  if (!/id="faq"/.test(page.html) || !types.includes('FAQPage')) problems.push('FAQ');
  if (route !== '/products' && !types.some((type) => type === 'Service' || type === 'SoftwareApplication')) problems.push('Service JSON-LD');
  if (route === '/products' && !types.includes('ItemList')) problems.push('ItemList JSON-LD');
  if (!page.text.includes('方案整理中') || !page.text.includes('正式價格以確認報價為準')) problems.push('價格說明（方案整理中 / 正式價格以確認報價為準）');
  record('4. 產品頁', route, problems.length === 0, problems.join('; ') || `H1 ✓ · CTA ${[...new Set(ctas)].join(', ')} · FAQ ✓`);
}

// ---------------------------------------------------------------------------
// 5. 其他頁面必要內容
// ---------------------------------------------------------------------------
const group5 = '5. 結帳 / 聯絡 / 案例 / 文章 / 關於 / 解決方案 / 法律';
const expectText = (route, phrases) => {
  const page = pages.get(route);
  if (!page) return;
  const missing = phrases.filter((phrase) => !page.text.includes(phrase));
  record(group5, `${route} 包含必要內容`, missing.length === 0, missing.length ? `缺少：${missing.join('、')}` : phrases.join('、'));
};
// Phase 3.0：/checkout 是真的結帳流程（購物車 → 客戶資料 → 付款方式 → 訂單摘要），但只開放本機 Sandbox 模擬付款。
expectText('/checkout', ['購物車內容', '客戶資料', '付款方式', '訂單摘要', '權限代碼流程', 'Sandbox', '不會真的扣款', '綠界', 'LINE Pay', '銀行轉帳', '尚未開放', '測試價格', '非正式售價', '隱私權政策']);
expectText('/contact', ['LINE@', '需求表單', '常見需求', '預算區間', '服務類型', '聯絡方式', '不會送出']);
expectText('/cases', ['Hungjui 形象官網', '品牌電商官網', 'SEO 文章生產器', '預約 / 活動頁', '產業', '需求', '使用產品', '成效指標', '頁面截圖']);
// Phase 2.9：文章改由 CMS 發布，卡片顯示發布日期與閱讀時間，不再是「即將發布」
expectText('/blog', ['全部文章', 'SEO 優化', '網站設計', '內容行銷', '數位工具', '品牌經營', '案例分享', '產業觀點', '閱讀約']);
expectText('/about', ['不是單純的接案工作室', '產品', '可自助', '客製', '人工協助']);
expectText('/solutions', ['新品牌起步', '舊網站翻新', 'SEO 內容累積', '活動短期轉換', '美業 / 店家預約', 'B2B 形象與詢價', '電商與商品展示']);
expectText('/legal/terms', ['草稿', '目錄', '權限代碼']);
expectText('/legal/privacy', ['草稿', '目錄', '資料']);

const checkout = pages.get('/checkout');
if (checkout) {
  // Phase 3.0：可以送出訂單，但不可以有任何卡號 / CVV 欄位，也不可以把資料直接 POST 給第三方；
  // 付款按鈕必須預設停用，等購物車與客戶資料在瀏覽器就緒後才由 script 開啟。
  const checkoutInputs = checkout.html.match(/<input\b[^>]*>/g) ?? [];
  const CARD_FIELD = /\s(?:name|id|autocomplete)="[^"]*(?:card|cvv|cvc|credit[-_]?card|security[-_]?code|cc[-_]?num)[^"]*"/i;
  const cardFields = checkoutInputs.filter((tag) => CARD_FIELD.test(tag));
  const submitButtons = (checkout.html.match(/<button\b[^>]*>/g) ?? []).filter((tag) => /data-checkout-submit/.test(tag));
  const enabledSubmit = submitButtons.filter((tag) => !/\sdisabled/.test(tag));
  record(
    group5,
    '/checkout 不收卡號 / CVV、無 form action、付款按鈕預設停用',
    cardFields.length === 0 && !/<form\b[^>]*\saction=/.test(checkout.html) && submitButtons.length === 1 && enabledSubmit.length === 0,
    `card fields: ${cardFields.length}, submit: ${submitButtons.length}, enabled: ${enabledSubmit.length}`,
  );
  const methodInputs = checkoutInputs.filter((tag) => /\sname="payment_method"/.test(tag));
  const realMoney = methodInputs.filter((tag) => /\svalue="(?:ecpay|linepay|bank_transfer)/i.test(tag));
  record(
    group5,
    '/checkout 只提供模擬付款方式（沒有真實金流選項）',
    methodInputs.length > 0 && realMoney.length === 0,
    `methods: ${methodInputs.length}, real-money: ${realMoney.length}`,
  );
  record(group5, '/checkout 為 noindex', (metaContent(checkout.html, 'name', 'robots') ?? '').includes('noindex'));
}
const contact = pages.get('/contact');
if (contact) {
  const form = contact.html.match(/<form\b[^>]*>/)?.[0] ?? '';
  const submit = contact.html.match(/<button\b[^>]*type="submit"[^>]*>/)?.[0] ?? '';
  record(group5, '/contact 詢問表單為 mock（data-mock-form、無 action、送出停用）', form.includes('data-mock-form') && !/\saction=/.test(form) && /\sdisabled/.test(submit), form.slice(0, 80));
}
const casesPage = pages.get('/cases');
if (casesPage) {
  const claim = casesPage.text.match(/\d+(\.\d+)?\s*(%|％|倍)|成長\s*\d+/);
  record(group5, '/cases 不宣稱未證實的成效數字（百分比 / 倍數）', !claim, claim?.[0] ?? '整理中 placeholder');
}

// ---------------------------------------------------------------------------
// 6. 文案
// ---------------------------------------------------------------------------
const sourceFiles = walk(SRC).filter((file) => /\.(astro|ts|css|md|mdx)$/.test(file));
const bannedInSource = sourceFiles.flatMap((file) => BANNED.filter((phrase) => read(file).includes(phrase)).map((phrase) => `${rel(file)}: ${phrase}`));
record('6. 文案', `禁用 AI 套話未出現（${BANNED.join('、')}）`, bannedInSource.length === 0, bannedInSource.join(' | ') || `${sourceFiles.length} source files + ${pages.size} pages`);
// Phase 3.0：價格不再全部隱藏，但目前資料庫裡只有測試價格。
// 規則改成「頁面只要出現金額，同一頁就必須標示測試價格與非正式售價」，避免測試金額被當成正式報價。
const PRICE_PATTERN = /(?:NT\$|NTD|新台幣|US\$|\$)\s?\d{1,3}(?:,\d{3})+|(?:NT\$|NTD|新台幣|US\$|\$)\s?\d{3,}|\d{1,3}(?:,\d{3})+\s*元|\d{4,}\s*元/g;
const pricedPages = [...pages.entries()]
  .map(([route, page]) => ({ route, amounts: page.text.match(PRICE_PATTERN) ?? [], text: page.text }))
  .filter(({ amounts }) => amounts.length > 0);
const unlabelledPrices = pricedPages
  .filter(({ text }) => !(text.includes('測試價格') && text.includes('非正式售價')))
  .map(({ route, amounts }) => `${route}: ${amounts.slice(0, 3).join(', ')}`);
record(
  '6. 文案',
  '出現金額的頁面都標示「測試價格 / 非正式售價」（沒有未標示的價格）',
  unlabelledPrices.length === 0,
  unlabelledPrices.join(' | ') || (pricedPages.length ? `已標示：${pricedPages.map(({ route }) => route).join('、')}` : '目前沒有頁面顯示金額'),
);
const hoverOnly = sourceFiles.flatMap((file) =>
  [...read(file).matchAll(/(?:group-)?hover:(?:block|flex|grid|inline|inline-block|inline-flex|visible|opacity-100)(?![\w-])/g)].map((match) => `${rel(file)}: ${match[0]}`),
);
record('6. 文案', '重要內容不靠 hover 才出現（無 hover:block / hover:opacity-100 等）', hoverOnly.length === 0, hoverOnly.join(' | ') || 'hover 只用於漸層 / 邊框 / 顏色');

// ---------------------------------------------------------------------------
// 7. 安全
// ---------------------------------------------------------------------------
const SECRET_PATTERNS = [
  ['Supabase 專案網址', /https?:\/\/[a-z0-9]{20}\.supabase\.(co|in)\b/i],
  ['JWT 形式的 key', /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ['Supabase secret / publishable key', /\bsb_(secret|publishable)_[A-Za-z0-9_-]{16,}/],
  ['Stripe live key', /\b(sk|pk|rk)_live_[A-Za-z0-9]{10,}/],
  ['綠界 HashKey / HashIV 值', /(HashKey|HashIV|HASH_KEY|HASH_IV)["']?[ \t]*[:=][ \t]*["']?[A-Za-z0-9]{16}\b/],
  ['綠界 MerchantID 值', /MerchantID["']?[ \t]*[:=][ \t]*["']?\d{7}\b/],
  ['LINE Pay Channel Secret 值', /(ChannelSecret|CHANNEL_SECRET)["']?[ \t]*[:=][ \t]*["']?[a-f0-9]{32}\b/i],
  ['私鑰', /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/],
];
const distFiles = walk(DIST);
const scanFiles = [...sourceFiles, ...distFiles.filter((file) => /\.(html|js|css|xml|txt|json|svg)$/.test(file)), path.join(MARKETING_DIR, 'astro.config.mjs')];
const secretHits = scanFiles.flatMap((file) => SECRET_PATTERNS.filter(([, pattern]) => pattern.test(read(file))).map(([label]) => `${label}: ${rel(file)}`));
record('7. 安全', `無正式 Supabase URL / key、無正式金流資料（${scanFiles.length} files）`, secretHits.length === 0, secretHits.join(' | ') || 'clean');
const envReaders = sourceFiles.filter((file) => /SUPABASE_SERVICE_ROLE_KEY|EC_PAY_|LINE_PAY_CHANNEL|CLOUDFLARE_API_TOKEN|AUTH_COOKIE_SECRET/.test(read(file))).map(rel);
record('7. 安全', '前台不讀 service role / 金流 / 簽章 env', envReaders.length === 0, envReaders.join(', ') || 'clean');

// ---------------------------------------------------------------------------
// 8. 效能（靜態）
// ---------------------------------------------------------------------------
const marketingPackage = JSON.parse(read(path.join(MARKETING_DIR, 'package.json')));
const dependencies = Object.keys({ ...marketingPackage.dependencies, ...marketingPackage.devDependencies });
const heavy = dependencies.filter((name) => /^(gsap|framer-motion|motion|lottie-web|lottie-react|@lottiefiles\/.+|three|@react-three\/.+|swiper|aos|animejs|@splinetool\/.+)$/.test(name));
record('8. 效能', '沒有大型動畫套件', heavy.length === 0, heavy.join(', ') || dependencies.join(', '));
record('8. 效能', '沒有影片', !sourceFiles.some((file) => /<video\b/.test(read(file))));
const totalSize = (files) => files.reduce((sum, file) => sum + statSync(file).size, 0);
const jsFiles = distFiles.filter((file) => /\.m?js$/.test(file));
const cssFiles = distFiles.filter((file) => file.endsWith('.css'));
const imageFiles = distFiles.filter((file) => /\.(png|jpe?g|webp|avif|gif|svg)$/.test(file));
record('8. 效能', `前台 JS ≤ 50 KB（${jsFiles.length} 個檔案）`, totalSize(jsFiles) <= 50_000, kb(totalSize(jsFiles)));
record('8. 效能', `CSS ≤ 150 KB（${cssFiles.length} 個檔案）`, totalSize(cssFiles) <= 150_000, kb(totalSize(cssFiles)));
// Phase 2.7：PNG 原檔保留作為 <img> fallback（1.5–2.3 MB），瀏覽器實際載入 WebP / AVIF；各圖與各頁預算由 pnpm asset:verify / perf:verify 檢查
const bigImages = imageFiles.filter((file) => statSync(file).size > 2_500_000);
const largestImage = imageFiles.reduce((max, file) => Math.max(max, statSync(file).size), 0);
record('8. 效能', '單張圖片 ≤ 2.5 MB（PNG 原檔 fallback；WebP / AVIF 預算見 perf:verify）', bigImages.length === 0, bigImages.map(rel).join(', ') || `${imageFiles.length} images, largest ${kb(largestImage)}`);
if (existsSync(htmlPath('/'))) record('8. 效能', '首頁 HTML ≤ 200 KB', statSync(htmlPath('/')).size <= 200_000, kb(statSync(htmlPath('/')).size));
const imgWithoutSize = [...pages.values()].flatMap((page) => (page.html.match(/<img\b[^>]*>/g) ?? []).filter((tag) => !/\swidth=/.test(tag) || !/\sheight=/.test(tag)));
record('8. 效能', '<img> 都有 width / height', imgWithoutSize.length === 0, imgWithoutSize.slice(0, 2).join(' ') || 'no oversized / unsized images');

// ---------------------------------------------------------------------------
// 11. 圖片（Phase 2.6 final images）
// ---------------------------------------------------------------------------
{
  const group = '11. 圖片（final images）';
  const PUBLIC_DIR = path.join(MARKETING_DIR, 'public');
  const mediaFile = path.join(SRC, 'content', 'media.ts');
  const csvFile = path.join(ROOT, 'docs', 'design', 'IMAGE_SELECTION_PLAN.csv');
  const publicFileFor = (webPath) => path.join(PUBLIC_DIR, ...webPath.split('/').filter(Boolean));
  // 品牌 Logo（data-brand-logo，全站設定）不算內容圖片
  const imgTags = (html) => (html.match(/<img\b[^>]*>/g) ?? []).filter((tag) => !/\sdata-brand-logo(?=[\s=>])/.test(tag));
  const sectionHtml = (html, name) => html.match(new RegExp(`<section[^>]*data-section="${name}"[\\s\\S]*?</section>`))?.[0] ?? '';

  record(group, 'apps/marketing/src/content/media.ts 存在', existsSync(mediaFile), rel(mediaFile));
  record(group, 'docs/design/IMAGE_SELECTION_PLAN.csv 存在', existsSync(csvFile), rel(csvFile));

  const csvRows = read(csvFile)
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => [...line.matchAll(/"([^"]*)"/g)].map((match) => match[1]));
  const header = csvRows.shift() ?? [];
  const planned = csvRows.map((row) => ({ label: row[header.indexOf('Label')], webPath: row[header.indexOf('WebPath')] })).filter((row) => row.webPath);
  const mediaSource = read(mediaFile);
  const missingInMedia = planned.filter((row) => !mediaSource.includes(`'${row.webPath}'`));
  const finalPathsInMedia = new Set(mediaSource.match(/'\/images\/[^']+-final\.(?:png|jpe?g|webp|avif)'/g) ?? []);
  record(
    group,
    `media.ts 包含 CSV 全部 final WebPath（CSV ${planned.length} 張，media.ts ${finalPathsInMedia.size} 張）`,
    planned.length >= 16 && finalPathsInMedia.size >= 16 && missingInMedia.length === 0,
    missingInMedia.length ? `缺少：${missingInMedia.map((row) => row.label).join(', ')}` : planned.map((row) => row.label).join(', '),
  );
  const missingFiles = planned.filter((row) => !existsSync(publicFileFor(row.webPath)));
  record(group, 'CSV 的 final 圖片都存在於 apps/marketing/public', planned.length > 0 && missingFiles.length === 0, missingFiles.map((row) => row.webPath).join(', ') || 'ok');

  const usesImage = (route, webPath, html = pages.get(route)?.html ?? '') => imgTags(html).some((tag) => tagAttr(tag, 'src') === webPath);
  const homeHtml = pages.get('/')?.html ?? '';
  const expectations = [
    ['首頁 Hero', '/', '/images/hero/home-hero-platform-ui-final.png', sectionHtml(homeHtml, 'hero')],
    ['SEO 形象官網產品頁', '/products/seo-website', '/images/products/seo-website/seo-website-hero-final.png'],
    ['一頁式網頁產品頁', '/products/landing-page', '/images/products/landing-page/landing-page-hero-final.png'],
    ['電商網站產品頁', '/products/ecommerce-website', '/images/products/ecommerce-website/ecommerce-website-hero-final.png'],
    ['活動 DM / 宣傳頁產品頁', '/products/promo-page-design', '/images/products/promo-page-design/promo-page-design-hero-final.png'],
    ['SEO 文章生產器產品頁', '/products/seo-article-generator', '/images/products/seo-article-generator/seo-article-generator-hero-final.png'],
    ['Blog 頁', '/blog', '/images/blog/blog-visual-final.png'],
    ['Cases 頁', '/cases', '/images/cases/case-visual-final.png'],
    ['版型展示區（首頁 templates）', '/', '/images/templates/template-showcase-devices-final.png', sectionHtml(homeHtml, 'templates')],
    [
      '後台 / SEO 工具展示（SEO 文章生產器 tool-ui）',
      '/products/seo-article-generator',
      '/images/ui-mockups/admin-dashboard-seo-score-final.png',
      sectionHtml(pages.get('/products/seo-article-generator')?.html ?? '', 'tool-ui'),
    ],
    ['活動 DM 範例 A', '/products/promo-page-design', '/images/products/promo-page-design/promo-page-examples-a-final.png'],
    ['電商版型輔助圖 A', '/products/ecommerce-website', '/images/products/ecommerce-website/ecommerce-backup-a-final.png'],
  ];
  for (const [label, route, webPath, scopeHtml] of expectations) {
    const product = PRODUCT_PAGES.includes(route) && webPath.endsWith('-hero-final.png');
    const scope = scopeHtml ?? (product ? (pages.get(route)?.html.match(/<section[^>]*data-page-hero[\s\S]*?<\/section>/)?.[0] ?? '') : undefined);
    record(group, `${label} 引用 ${path.basename(webPath)}`, usesImage(route, webPath, scope), `${route}${scopeHtml || product ? '（限定區塊內）' : ''}`);
  }

  const renderedSrc = [...pages.values()].flatMap((page) => imgTags(page.html).map((tag) => tagAttr(tag, 'src') ?? ''));
  const mediaSrc = [...mediaSource.matchAll(/src:\s*'([^']+)'/g)].map((match) => match[1]);
  const allSrc = [...new Set([...renderedSrc, ...mediaSrc])];
  const offending = (pattern) => allSrc.filter((src) => pattern.test(src));
  const srcRules = [
    ['圖片 src 不引用 docs/design', /docs[\\/]design/i],
    ['圖片 src 不引用 Downloads 或 Windows 本機路徑', /downloads|^[a-z]:[\\/]|\\/i],
    ['圖片 src 沒有空格檔名', /\s|%20/],
    ['圖片 src 沒有中文 / 非 ASCII 檔名', /[^\x21-\x7e]/],
  ];
  for (const [label, pattern] of srcRules) {
    const bad = offending(pattern);
    record(group, label, allSrc.length > 0 && bad.length === 0, bad.join(', ') || `${allSrc.length} src`);
  }
  const nonPublic = allSrc.filter((src) => !/^\/(images|og)\//.test(src) || !existsSync(publicFileFor(src)));
  record(group, '圖片 src 都是 public 內存在的檔案', nonPublic.length === 0, nonPublic.join(', ') || 'ok');

  const usages = sourceFiles.flatMap((file) => [...read(file).matchAll(/<ResponsiveImage\b[\s\S]*?\/>/g)].map((match) => ({ file: rel(file), tag: match[0] })));
  const missingAlt = usages.filter((usage) => !/\salt=/.test(usage.tag));
  const missingSize = usages.filter((usage) => !/\swidth=/.test(usage.tag) || !/\sheight=/.test(usage.tag));
  record(group, `ResponsiveImage 使用都有 alt（${usages.length} 處）`, usages.length > 0 && missingAlt.length === 0, missingAlt.map((usage) => usage.file).join(', ') || usages.map((usage) => usage.file).join(', '));
  record(group, 'ResponsiveImage 使用都有 width / height', usages.length > 0 && missingSize.length === 0, missingSize.map((usage) => usage.file).join(', ') || 'ok');
  const rawImg = sourceFiles.filter((file) => /<img\b/.test(read(file))).map(rel);
  // BrandLockup.astro：只在全站設定填了 Logo URL 時輸出品牌 Logo <img>（不是 /images 內容圖）
  // ContentImage.astro（Phase 2.9）：CMS 內容圖片的網址由後台填寫，沒有預先產生的 WebP / AVIF 變體，只能輸出單一 <img>（仍必須有 width / height）
  record(
    group,
    '前台原始碼沒有繞過 ResponsiveImage 的 <img>（BrandLockup 品牌 Logo、ContentImage CMS 圖片除外）',
    rawImg.filter((file) => !/(ResponsiveImage|BrandLockup|ContentImage)\.astro$/.test(file)).length === 0,
    rawImg.join(', '),
  );

  const imgProblems = [...pages.entries()].flatMap(([route, page]) =>
    imgTags(page.html)
      .filter((tag) => {
        // Astro 會把 alt="" 輸出成沒有值的 alt 屬性（HTML 上等同空 alt）
        const alt = tagAttr(tag, 'alt') ?? (/\salt(?=[\s/>])/.test(tag) ? '' : null);
        const decorative = alt === '' && /aria-hidden="true"/.test(tag);
        return alt === null || (alt === '' && !decorative) || !/\swidth="\d+"/.test(tag) || !/\sheight="\d+"/.test(tag) || tagAttr(tag, 'decoding') !== 'async';
      })
      .map((tag) => `${route}: ${tag.slice(0, 90)}`),
  );
  record(group, '輸出的 <img> 都有 alt（裝飾背景為空 alt + aria-hidden）、width / height、decoding="async"', imgProblems.length === 0, imgProblems.slice(0, 3).join(' | ') || 'ok');

  const heroImg = imgTags(sectionHtml(homeHtml, 'hero')).find((tag) => tagAttr(tag, 'src') === '/images/hero/home-hero-platform-ui-final.png');
  record(
    group,
    '首頁 Hero 圖 loading="eager" + fetchpriority="high"',
    Boolean(heroImg) && tagAttr(heroImg, 'loading') === 'eager' && tagAttr(heroImg, 'fetchpriority') === 'high',
    heroImg ? `loading=${tagAttr(heroImg, 'loading')} fetchpriority=${tagAttr(heroImg, 'fetchpriority')}` : 'not found',
  );
  const eagerPerPage = [...pages.entries()].map(([route, page]) => [route, imgTags(page.html).filter((tag) => tagAttr(tag, 'loading') !== 'lazy')]);
  const tooManyEager = eagerPerPage.filter(([, tags]) => tags.length > 1).map(([route, tags]) => `${route}: ${tags.length}`);
  record(group, '每頁首屏最多 1 張 eager 圖片，其餘 lazy', tooManyEager.length === 0, tooManyEager.join(', ') || 'ok');
  const homeImages = imgTags(homeHtml);
  const homeLazy = homeImages.filter((tag) => tagAttr(tag, 'loading') === 'lazy').length;
  const homeEager = homeImages.length - homeLazy;
  record(group, '首頁非首屏圖片使用 lazy（不是全部 eager）', homeEager === 1 && homeLazy >= 1, `eager ${homeEager} / lazy ${homeLazy}`);
  const heavyEager = eagerPerPage.flatMap(([route, tags]) =>
    tags
      .map((tag) => tagAttr(tag, 'src') ?? '')
      .filter((src) => existsSync(publicFileFor(src)) && statSync(publicFileFor(src)).size > 2_500_000)
      .map((src) => `${route}: ${src}`),
  );
  record(group, '首屏 eager 圖片 ≤ 2.5 MB', heavyEager.length === 0, heavyEager.join(', ') || 'ok');

  // Phase 2.7：正式 OG 圖（1200×630 PNG，apps/marketing/src/content/ogImages.ts），不再暫用頁面 final 圖
  const ogExpectations = {
    '/': 'home',
    '/products': 'products',
    '/products/seo-website': 'seo-website',
    '/products/landing-page': 'landing-page',
    '/products/ecommerce-website': 'ecommerce-website',
    '/products/promo-page-design': 'promo-page-design',
    '/products/seo-article-generator': 'seo-article-generator',
    '/cases': 'cases',
    '/blog': 'blog',
    '/about': 'about',
    '/contact': 'contact',
    '/solutions': 'solutions',
  };
  const ogProblems = [...pages.entries()].flatMap(([route, page]) => {
    const ogPath = (metaContent(page.html, 'property', 'og:image') ?? '').replace(/^https?:\/\/[^/]+/, '');
    const problems = [];
    if (!ogPath || !existsSync(publicFileFor(ogPath))) problems.push(`${route}: ${ogPath || 'missing'}`);
    const expected = ogExpectations[route] ?? (route.startsWith('/products/landing-page/') ? 'landing-page' : 'default');
    if (ogPath !== `/images/og/${expected}-og-1200x630.png`) problems.push(`${route}: expected ${expected}-og-1200x630.png, got ${ogPath}`);
    if (metaContent(page.html, 'property', 'og:image:width') !== '1200' || metaContent(page.html, 'property', 'og:image:height') !== '630') problems.push(`${route}: og:image 尺寸應為 1200×630`);
    return problems;
  });
  record(group, 'og:image 使用對應的 1200×630 正式 OG 圖（首頁 / 產品頁 / Blog / Cases / About / Contact / Solutions，其餘 default）', ogProblems.length === 0, ogProblems.slice(0, 4).join(' | ') || `${pages.size} pages`);
}

// ---------------------------------------------------------------------------
// 9. runtime（Chrome）
// ---------------------------------------------------------------------------
const servers = [];
installSignalCleanup(servers);
let browser;
const visible = (box, viewportWidth) =>
  Boolean(box) && box.w > 0 && box.h > 0 && box.opacity === '1' && box.visibility === 'visible' && box.display !== 'none' && box.x >= -1 && box.x + box.w <= viewportWidth + 1;

try {
  if (!existsSync(path.join(DIST, 'index.html'))) throw new Error('apps/marketing/dist 不存在');
  const server = await startMarketingServer();
  servers.push(server);
  browser = await chromium.launch({ executablePath: findChrome(), headless: true });

  for (const [width, height] of [
    [375, 812],
    [768, 1024],
    [1440, 900],
  ]) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.goto(`${server.url}/`, { waitUntil: 'networkidle' });
    const info = await page.evaluate(() => {
      const box = (selector) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return { x: rect.x, y: rect.y, w: rect.width, h: rect.height, opacity: style.opacity, visibility: style.visibility, display: style.display };
      };
      const hero = document.querySelector('[data-section="hero"]');
      const inner = document.querySelector('[data-hero-inner]');
      return {
        heroHeight: hero?.getBoundingClientRect().height ?? 0,
        innerMinHeight: inner ? getComputedStyle(inner).minHeight : null,
        primary: box('[data-cta="hero-primary"]'),
        secondary: box('[data-cta="hero-secondary"]'),
        line: box('[data-cta="hero-line"]'),
        visual: box('[data-hero-visual]'),
        scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      };
    });
    const group = '9. Hero runtime';
    record(group, `${width}px 查看方案 / 看作品 / Line@ CTA 不需 hover 就完整可見`, visible(info.primary, width) && visible(info.secondary, width) && visible(info.line, width), JSON.stringify({ primary: info.primary, secondary: info.secondary }));
    record(group, `${width}px 無水平捲軸`, info.scrollWidth <= width + 1, `scrollWidth=${info.scrollWidth}`);
    record(group, `${width}px Mockup 不超出畫面`, Boolean(info.visual) && info.visual.x >= -1 && info.visual.x + info.visual.w <= width + 1, `x=${Math.round(info.visual?.x ?? -1)} w=${Math.round(info.visual?.w ?? 0)}`);
    if (width === 375) {
      record(group, '375px Hero 不強制滿版高度（min-height 為 0）', info.innerMinHeight === '0px' || info.innerMinHeight === 'auto', `min-height=${info.innerMinHeight} height=${Math.round(info.heroHeight)}`);
      record(group, '375px CTA 直向排列', info.primary && info.secondary && info.primary.y + info.primary.h <= info.secondary.y + 1, `primary.y=${Math.round(info.primary?.y ?? 0)} secondary.y=${Math.round(info.secondary?.y ?? 0)}`);
    }
    if (width === 1440) {
      record(group, '1440px Hero 高度接近首屏（≥ 70vh）', info.heroHeight >= height * 0.7, `${Math.round(info.heroHeight)}px / ${height}px`);
      record(group, '1440px Mockup 在標題右側', Boolean(info.visual) && info.visual.x > width / 2 - 80, `visual.x=${Math.round(info.visual?.x ?? 0)}`);
    }
    const lcp = await page.evaluate(
      () =>
        new Promise((resolve) => {
          let value = 0;
          try {
            new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) value = Math.max(value, entry.startTime);
            }).observe({ type: 'largest-contentful-paint', buffered: true });
          } catch {
            resolve(-1);
            return;
          }
          setTimeout(() => resolve(value), 1000);
        }),
    );
    record('9. LCP', `${width}px 首頁 LCP ≤ 2500 ms（本機靜態服務）`, lcp >= 0 && lcp <= 2500, `${Math.round(lcp)} ms`);
    await context.close();
  }

  // 首頁「精選作品」rail：有限輪播（不循環）。一路往右滑到最後一張，scrollLeft 只能往右增加；
  // 停在最後一張 ≥ 2 秒不可被拉回第一張；桌機 / 手機都維持 scroll-snap（snap 點在每張卡片，不是整條 ul）
  {
    // 原始碼：rail 沒有 JS 輪播（autoplay / 程式捲動 / clone 無限循環）；唯一的程式捲動是回到頁首（window.scrollTo）
    const railScripts = walk(SRC)
      .filter((file) => /\.(ts|astro)$/.test(file))
      .filter((file) => /scrollLeft\s*=|\.scrollTo\(|\.scrollBy\(|scrollIntoView\(|setInterval\(/.test(read(file)) && !/back-to-top-client\.ts$/.test(file))
      .map(rel);
    const component = read(path.join(SRC, 'components', 'HorizontalShowcaseRail.astro'));
    record(
      '9. 精選作品 carousel',
      '沒有 JS 強制捲動 / autoplay / clone 無限循環（rail 只用原生捲動 + scroll-snap）',
      railScripts.length === 0 && !/<script\b/.test(component),
      railScripts.join(', ') || 'HorizontalShowcaseRail 無 client script',
    );
  }
  for (const width of [375, 430, 1440]) {
    const railContext = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    const page = await railContext.newPage();
    await page.goto(`${server.url}/`, { waitUntil: 'networkidle' });
    const rail = page.locator('[data-section="featured-works"] .syt-rail').first();
    await rail.scrollIntoViewIfNeeded();
    const readRail = () =>
      rail.evaluate((element) => {
        const items = [...element.querySelectorAll(':scope > ul > li')];
        const railRect = element.getBoundingClientRect();
        const last = items.at(-1)?.getBoundingClientRect();
        return {
          left: element.scrollLeft,
          max: element.scrollWidth - element.clientWidth,
          step: items[0]?.getBoundingClientRect().width ?? 0,
          count: items.length,
          snapType: getComputedStyle(element).scrollSnapType,
          itemSnap: items.map((item) => getComputedStyle(item).scrollSnapAlign),
          listSnap: getComputedStyle(element.firstElementChild).scrollSnapAlign,
          lastVisible: Boolean(last) && last.right <= railRect.right + 1 && last.left >= railRect.left - 1,
        };
      });
    const start = await readRail();
    const box = await rail.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const positions = [start.left];
    // 以卡片寬度為一步的水平滾輪（trackpad / wheel），每步等 snap 結束
    for (let step = 0; step < start.count + 2; step += 1) {
      await page.mouse.wheel(Math.round(start.step * 0.9), 0);
      await page.waitForTimeout(700);
      positions.push((await readRail()).left);
      if (positions.at(-1) >= start.max - 1) break;
    }
    const atEnd = await readRail();
    await page.waitForTimeout(2500);
    const afterWait = await readRail();
    const monotonic = positions.every((value, index) => index === 0 || value >= positions[index - 1] - 1);
    const strictlyAdvanced = start.max <= 1 || positions.slice(1).every((value, index) => value > positions[index] + 1 || value >= start.max - 1);
    const reachedEnd = atEnd.left >= start.max - 1 && atEnd.lastVisible;
    const stayed = Math.abs(afterWait.left - atEnd.left) <= 1 && (start.max <= 1 || afterWait.left > 1);
    const snapKept = start.snapType.includes('x') && start.snapType.includes('mandatory') && start.itemSnap.every((value) => value === 'start') && start.listSnap === 'none';
    record(
      '9. 精選作品 carousel',
      `${width}px 由第一張滑到最後一張：scrollLeft 單調往右、停在最後一張 2.5 秒不回第一張、維持 scroll-snap（${start.count} 張）`,
      start.count > 0 && monotonic && strictlyAdvanced && reachedEnd && stayed && snapKept,
      `scrollLeft ${positions.map(Math.round).join('→')} / max ${Math.round(start.max)} · 2.5s 後 ${Math.round(afterWait.left)} · snap=${start.snapType} li=${[...new Set(start.itemSnap)].join(',')} ul=${start.listSnap}${start.max <= 1 ? ' · 此寬度全部卡片已在畫面內' : ''}`,
    );
    await railContext.close();
  }

  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1 });
  for (const route of ['/products', ...PRODUCT_PAGES, ...LANDING_PAGES, '/solutions', '/cases', '/blog', '/about', '/contact', '/checkout']) {
    const page = await context.newPage();
    await page.goto(`${server.url}${route}`, { waitUntil: 'networkidle' });
    const box = await page.evaluate(() => {
      const element = document.querySelector('[data-page-hero] [data-cta="primary"]');
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return { x: rect.x, y: rect.y, w: rect.width, h: rect.height, opacity: style.opacity, visibility: style.visibility, display: style.display };
    });
    record('9. CTA runtime', `375px ${route} 主要 CTA 直接可見（不需 hover）`, visible(box, 375), box ? `${Math.round(box.w)}×${Math.round(box.h)} at y=${Math.round(box.y)}` : 'not found');
    await page.close();
  }
  await context.close();
} catch (error) {
  record('9. Runtime', 'runtime 檢查', false, error.message.split('\n')[0]);
} finally {
  await browser?.close().catch(() => undefined);
  await stopAll(servers);
}

// ---------------------------------------------------------------------------
// 10. RWD
// ---------------------------------------------------------------------------
if (!args.has('--skip-rwd')) record('10. RWD', 'pnpm rwd:check marketing（375 / 430 / 768 / 1024 / 1280 / 1440）', run('pnpm rwd:check marketing'));

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
console.log('\n━━━━ UI/UX verify（Phase 2.5 / 2.6B 官網前台）━━━━');
for (const group of [...new Set(results.map((item) => item.group))]) {
  const items = results.filter((item) => item.group === group);
  const failed = items.filter((item) => !item.ok);
  console.log(`\n${failed.length ? '✗' : '✓'} ${group}  (${items.length - failed.length}/${items.length})`);
  for (const item of items) {
    if (!item.ok || process.env.UI_VERBOSE) console.log(`  ${item.ok ? 'PASS' : 'FAIL'}  ${item.name}${item.detail ? `  — ${item.detail}` : ''}`);
  }
}
const failures = results.filter((item) => !item.ok);
console.log(`\n[ui:verify] ${results.length - failures.length}/${results.length} checks passed`);
console.log(failures.length ? '[ui:verify] FAILED' : '[ui:verify] All UI/UX checks passed.');
process.exit(failures.length ? 1 : 0);
