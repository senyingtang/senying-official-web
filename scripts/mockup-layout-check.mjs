// Phase 2.6B Mockup Layout 驗收：森映官網前台是否依設計稿（docs/design/uiux-mockups）的區塊順序與規格重構
//
// 檢查項目（對應 Phase 2.6B 任務清單）：
//   1. apps/marketing/src/content/mockupLayout.ts 存在、可載入，對應的設計稿檔案存在
//   2–11. 首頁 / 產品總覽 / 5 個產品頁 / Cases / Blog / Checkout：build 輸出的 data-section 順序與數量完全符合 mockupLayout.ts
//        （supplemental 區塊需寫明原因；未宣告的區塊視為失敗）
//   12. Header 有搜尋 / 登入 / 立即開始 + 手機選單
//   13. 主要頁面 Hero 有主 CTA 與次 CTA（HTML 文字）
//   14. 主要頁面有 Final CTA（data-final-cta 內有可點擊 CTA）
//   15. 產品總覽有比較表（6 個比較列、手機卡片版、價格不寫 NT$）
//   16. Checkout 標示「目前尚未開放正式付款」，沒有可送出的付款表單
//   17. Cases 沒有未標示的成效數字宣稱，成果區標示示意
//   18. Blog 文章卡不連到不存在的文章頁，頁內站內連結都存在
//   19. 圖片不引用 docs/design
//   20. 不引用 Downloads 路徑
//   21. 沒有正式金鑰 / 金流密鑰
//   22. RWD（pnpm rwd:check marketing）
//   23. build（pnpm build）
//   24. 設計稿右側說明欄文字沒有進入正式頁面
//
// 用法：pnpm mockup:verify [--skip-build] [--skip-rwd]
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { MARKETING_DIR, ROOT } from './lib/servers.mjs';

const args = new Set(process.argv.slice(2));
const DIST = path.join(MARKETING_DIR, 'dist');
const SRC = path.join(MARKETING_DIR, 'src');
const results = [];
const record = (no, name, ok, detail = '') => results.push({ no, name, ok: Boolean(ok), detail: String(detail ?? '') });
const rel = (file) => path.relative(ROOT, file).split(path.sep).join('/');
const read = (file) => (existsSync(file) ? readFileSync(file, 'utf8') : '');

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : walk(full);
    return [full];
  });
}

function run(command) {
  console.log(`\n[mockup] $ ${command}`);
  return spawnSync(command, { cwd: ROOT, stdio: 'inherit', shell: true, env: { ...process.env, DATA_SOURCE: process.env.DATA_SOURCE || 'mock' } }).status === 0;
}

const htmlPath = (route) => (route === '/' ? path.join(DIST, 'index.html') : path.join(DIST, ...route.split('/').filter(Boolean), 'index.html'));
const decode = (value) => value.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const tagAttr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1] ?? null;
const visibleText = (html) =>
  decode(
    html
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<style[\s\S]*?<\/style>/g, ' ')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ');
/** 取出 <tag ... data-section="key"> 到對應的結束標籤（區塊內不巢狀同名標籤） */
const sectionHtml = (html, key) => html.match(new RegExp(`<(section|header|footer)\\b[^>]*\\sdata-section="${key}"[\\s\\S]*?</\\1>`))?.[0] ?? '';
const mainHtml = (html) => html.match(/<main\b[\s\S]*?<\/main>/)?.[0] ?? '';

// 使用者指定的各頁區塊數量（Phase 2.6B 任務說明）
const EXPECTED_COUNTS = {
  '/': 9,
  '/products': 9,
  '/products/seo-website': 9,
  '/products/landing-page': 10,
  '/products/ecommerce-website': 10,
  '/products/promo-page-design': 10,
  '/products/seo-article-generator': 10,
  '/cases': 9,
  '/blog': 7,
  '/checkout': 9,
};
const PAGE_CHECK_NO = {
  '/': 2,
  '/products': 3,
  '/products/seo-website': 4,
  '/products/landing-page': 5,
  '/products/ecommerce-website': 6,
  '/products/promo-page-design': 7,
  '/products/seo-article-generator': 8,
  '/cases': 9,
  '/blog': 10,
  '/checkout': 11,
};

// ---------------------------------------------------------------------------
// 23. build（先執行，後續檢查都依 build 輸出）
// ---------------------------------------------------------------------------
if (args.has('--skip-build')) record(23, 'build output 存在（--skip-build）', existsSync(path.join(DIST, 'index.html')));
else record(23, 'pnpm build', run('pnpm build'));

// ---------------------------------------------------------------------------
// 1. mockupLayout.ts
// ---------------------------------------------------------------------------
const layoutFile = path.join(SRC, 'content', 'mockupLayout.ts');
let layouts = [];
try {
  const module = await import(pathToFileURL(layoutFile).href);
  layouts = module.MOCKUP_LAYOUTS ?? [];
  const missingDesign = layouts.flatMap((layout) =>
    [
      path.join(ROOT, 'docs', 'design', 'uiux-mockups', layout.mockup),
      path.join(ROOT, 'docs', 'design', 'designer-handoff', layout.handoff),
    ].filter((file) => !existsSync(file)),
  );
  const routes = layouts.map((layout) => layout.route);
  const missingRoutes = Object.keys(EXPECTED_COUNTS).filter((route) => !routes.includes(route));
  record(
    1,
    'mockupLayout.ts 存在且涵蓋 10 個頁面，設計稿檔案存在',
    existsSync(layoutFile) && missingRoutes.length === 0 && missingDesign.length === 0,
    [missingRoutes.length ? `缺少頁面：${missingRoutes.join(', ')}` : `${layouts.length} pages`, ...missingDesign.map(rel)].join(' | '),
  );
} catch (error) {
  record(1, 'mockupLayout.ts 存在且可載入', false, error.message.split('\n')[0]);
}

const pages = new Map();
for (const route of Object.keys(EXPECTED_COUNTS)) pages.set(route, read(htmlPath(route)));

// ---------------------------------------------------------------------------
// 2–11. 各頁區塊順序與數量
// ---------------------------------------------------------------------------
for (const [route, expectedCount] of Object.entries(EXPECTED_COUNTS)) {
  const no = PAGE_CHECK_NO[route];
  const layout = layouts.find((item) => item.route === route);
  const html = pages.get(route);
  if (!layout || !html) {
    record(no, `${route} 區塊（${expectedCount}）`, false, !layout ? 'mockupLayout.ts 沒有此頁' : `build output missing: ${rel(htmlPath(route))}`);
    continue;
  }
  const expected = layout.sections.map((section) => section.key);
  const supplemental = layout.supplemental.map((item) => item.key);
  const rendered = [...html.matchAll(/<(?:section|header|footer)\b[^>]*\sdata-section="([^"]+)"/g)].map((match) => match[1]);
  const compared = rendered.filter((key) => !supplemental.includes(key)).filter((key) => expected.includes('header') || key !== 'header');
  const problems = [];
  if (expected.length !== expectedCount) problems.push(`mockupLayout.ts 列了 ${expected.length} 個區塊，任務要求 ${expectedCount} 個`);
  if (JSON.stringify(compared) !== JSON.stringify(expected)) problems.push(`輸出順序 ${compared.join(' → ')}；預期 ${expected.join(' → ')}`);
  const missingSupplement = supplemental.filter((key) => !rendered.includes(key));
  if (missingSupplement.length) problems.push(`supplemental 未輸出：${missingSupplement.join(', ')}`);
  if (layout.supplemental.some((item) => !item.reason?.trim())) problems.push('supplemental 缺少原因');
  if (expected.includes('header') && rendered[0] !== 'header') problems.push('header 不在第一個');
  if (rendered[rendered.length - 1] !== 'footer') problems.push('footer 不在最後');
  record(no, `${route} 區塊順序與數量（${expectedCount}）`, problems.length === 0, problems.join('; ') || `${expected.join(' → ')}${supplemental.length ? `（+ ${supplemental.join(', ')}：驗收保留）` : ''}`);
}

// ---------------------------------------------------------------------------
// 12. Header
// ---------------------------------------------------------------------------
{
  const allRoutes = walk(DIST)
    .filter((file) => file.endsWith('index.html'))
    .map((file) => file);
  const problems = [];
  for (const file of allRoutes) {
    const header = read(file).match(/<header\b[^>]*data-section="header"[\s\S]*?<\/header>/)?.[0] ?? '';
    const text = visibleText(header);
    const labels = [...header.matchAll(/aria-label="([^"]+)"/g)].map((match) => match[1]).join(' ');
    const missing = [];
    if (!header) missing.push('header');
    if (!/搜尋/.test(`${text} ${labels}`) || !/data-header-action="search"/.test(header)) missing.push('搜尋');
    if (!/data-header-action="login"/.test(header) || !text.includes('登入')) missing.push('登入');
    if (!/data-cta="header-start"/.test(header) || !text.includes('立即開始')) missing.push('立即開始');
    if (!/<summary\b/.test(header)) missing.push('手機選單');
    if (!/syt-glass-header/.test(header)) missing.push('深色玻璃樣式');
    if (missing.length) problems.push(`${rel(file)}: ${missing.join('/')}`);
  }
  record(12, `Header 有搜尋 / 登入 / 立即開始 + 手機漢堡選單（${allRoutes.length} 頁）`, allRoutes.length > 0 && problems.length === 0, problems.slice(0, 3).join(' | ') || 'ok');
}

// ---------------------------------------------------------------------------
// 13. Hero 主 / 次 CTA
// ---------------------------------------------------------------------------
{
  const problems = [];
  for (const [route, html] of pages) {
    const hero = sectionHtml(html, 'hero');
    const ctas = [...hero.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)]
      .map((match) => ({ cta: tagAttr(` ${match[1]}`, 'data-cta'), cls: tagAttr(` ${match[1]}`, 'class') ?? '', text: visibleText(match[2]).trim() }))
      .filter((item) => item.cta);
    const primary = ctas.find((item) => item.cta === 'primary' || item.cta === 'hero-primary');
    const secondary = ctas.find((item) => item.cta === 'secondary' || item.cta === 'hero-secondary');
    const hidden = (item) => item && ['hidden', 'invisible', 'opacity-0'].some((name) => item.cls.split(/\s+/).includes(name));
    if (!hero) problems.push(`${route}: 沒有 hero`);
    else if (!primary?.text || !secondary?.text || hidden(primary) || hidden(secondary)) problems.push(`${route}: 主 ${primary?.text ?? '-'} / 次 ${secondary?.text ?? '-'}`);
    if (hero && !/<h1\b/.test(hero)) problems.push(`${route}: hero 沒有 H1`);
  }
  record(13, '主要頁面 Hero 有主 CTA + 次 CTA（文字、非隱藏）與 H1', problems.length === 0, problems.join(' | ') || [...pages.keys()].join(', '));
}

// ---------------------------------------------------------------------------
// 14. Final CTA
// ---------------------------------------------------------------------------
{
  const problems = [];
  for (const [route, html] of pages) {
    const layout = layouts.find((item) => item.route === route);
    const block = layout ? sectionHtml(html, layout.finalCta) : '';
    const finalBlock = block.match(/<(section|aside)\b[^>]*data-final-cta[\s\S]*?<\/\1>/)?.[0] ?? '';
    const links = [...finalBlock.matchAll(/<a\b[^>]*\shref="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].filter((match) => visibleText(match[2]).trim());
    if (!finalBlock || links.length === 0) problems.push(`${route}: ${layout?.finalCta ?? '?'} 沒有 data-final-cta 或 CTA 連結`);
  }
  record(14, '主要頁面有 Final CTA（data-final-cta 內有 CTA）', problems.length === 0, problems.join(' | ') || 'ok');
}

// ---------------------------------------------------------------------------
// 15. 產品總覽比較表
// ---------------------------------------------------------------------------
{
  const html = pages.get('/products') ?? '';
  const comparison = sectionHtml(html, 'comparison');
  const rows = ['適合對象', '頁面數量', '金流 / 會員', 'SEO 優化', '製作時間', '價格區間'];
  const rowHeads = [...comparison.matchAll(/<th\b[^>]*scope="row"[^>]*>([\s\S]*?)<\/th>/g)].map((match) => visibleText(match[1]).trim());
  const cards = comparison.match(/<ul\b[^>]*data-comparison-cards[\s\S]*?<\/ul>\s*<\/div>|<ul\b[^>]*data-comparison-cards[\s\S]*$/)?.[0] ?? '';
  const problems = [];
  if (!/<table\b/.test(comparison)) problems.push('沒有 <table>');
  if (!/<caption\b/.test(comparison)) problems.push('沒有 caption');
  const missingRows = rows.filter((row) => !rowHeads.includes(row));
  if (missingRows.length) problems.push(`缺少比較列：${missingRows.join('、')}`);
  if (!/overflow-x-auto/.test(comparison.match(/<div\b[^>]*data-comparison-table[^>]*>/)?.[0] ?? '')) problems.push('表格容器沒有 overflow-x-auto');
  if (!cards || rows.some((row) => !visibleText(cards).includes(row))) problems.push('沒有手機卡片版比較');
  if (/NT\$|NTD|新台幣|\d{1,3}(,\d{3})+\s*元/.test(visibleText(comparison))) problems.push('比較表出現金額');
  record(15, '/products 有產品功能比較表（6 列 + 手機卡片版，價格只寫狀態）', problems.length === 0, problems.join('; ') || rowHeads.join(' / '));
}

// ---------------------------------------------------------------------------
// 16. Checkout
// ---------------------------------------------------------------------------
{
  const html = pages.get('/checkout') ?? '';
  const text = visibleText(html);
  const phrases = ['目前尚未開放正式付款', '付款流程為示意', '預約討論', '人工開單', '銀行轉帳', '綠界', 'LINE Pay', '預留'];
  const missing = phrases.filter((phrase) => !text.includes(phrase));
  const forms = html.match(/<form\b[^>]*>/g) ?? [];
  const enabledSubmit = (html.match(/<button\b[^>]*>/g) ?? []).filter((tag) => /type="submit"/.test(tag) && !/\sdisabled/.test(tag));
  const paymentSection = sectionHtml(html, 'payment-methods');
  const paymentInputs = paymentSection.match(/<input\b[^>]*>/g) ?? [];
  const enabledPayment = paymentInputs.filter((tag) => !/\sdisabled/.test(tag));
  const summary = sectionHtml(html, 'order-summary');
  const payButton = (summary.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? []).find((tag) => tag.includes('付款'));
  const problems = [];
  if (missing.length) problems.push(`缺少：${missing.join('、')}`);
  if (!/data-checkout-notice/.test(html)) problems.push('沒有 data-checkout-notice');
  if (forms.some((tag) => /\saction=/.test(tag))) problems.push('有 form action');
  if (enabledSubmit.length) problems.push(`可送出按鈕 ${enabledSubmit.length}`);
  if (paymentInputs.length === 0 || enabledPayment.length) problems.push(`付款方式可選取 ${enabledPayment.length}`);
  if (!payButton || !/\sdisabled/.test(payButton)) problems.push('付款按鈕未停用');
  if (/NT\$|NTD|新台幣|\d{1,3}(,\d{3})+\s*元/.test(text)) problems.push('出現金額');
  record(16, '/checkout 標示尚未開放正式付款、付款為示意、無法送出付款', problems.length === 0, problems.join('; ') || phrases.join('、'));
}

// ---------------------------------------------------------------------------
// 17. Cases 成效數字
// ---------------------------------------------------------------------------
{
  const html = pages.get('/cases') ?? '';
  const text = visibleText(html);
  const CLAIM = /\d[\d,]*\s*\+|[+＋]\s*\d+|\d+(?:\.\d+)?\s*[%％]|\d+(?:\.\d+)?\s*倍|\d+\s*萬|滿意度\s*\d|成長\s*\d/g;
  const claims = text.match(CLAIM) ?? [];
  const results = visibleText(sectionHtml(html, 'results'));
  const problems = [];
  if (claims.length) problems.push(`成效數字：${claims.slice(0, 5).join(', ')}`);
  if (!results.includes('示意版面，正式案例數據待確認')) problems.push('成果區沒有「示意版面，正式案例數據待確認」');
  record(17, '/cases 沒有未標示的成效數字（+200% / 300+ / 98% 等），成果區標示示意', html && problems.length === 0, problems.join('; ') || '成果數值為整理中 / 示範，已標示示意');
}

// ---------------------------------------------------------------------------
// 18. Blog 連結
// ---------------------------------------------------------------------------
{
  const html = pages.get('/blog') ?? '';
  const main = mainHtml(html);
  const cards = main.match(/<article\b[^>]*data-blog-card[\s\S]*?<\/article>/g) ?? [];
  const cardLinks = cards.filter((card) => /<a\b/.test(card));
  const hrefs = [...main.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)].map((match) => decode(match[1]));
  const brokenLinks = hrefs.filter((href) => {
    if (/^(https?:|mailto:|tel:|#)/.test(href)) return false;
    const pathname = href.split(/[?#]/)[0];
    if (!pathname.startsWith('/')) return true;
    const file = pathname === '/' ? path.join(DIST, 'index.html') : path.join(DIST, ...pathname.split('/').filter(Boolean));
    return !(existsSync(path.join(file, 'index.html')) || (existsSync(file) && !file.endsWith(path.sep)));
  });
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
  const brokenAnchors = hrefs.filter((href) => href.startsWith('#') && href.length > 1 && !ids.has(href.slice(1)));
  const problems = [];
  if (cards.length === 0) problems.push('沒有文章卡');
  if (cardLinks.length) problems.push(`${cardLinks.length} 張文章卡含連結`);
  if (brokenLinks.length) problems.push(`不存在的頁面：${brokenLinks.join(', ')}`);
  if (brokenAnchors.length) problems.push(`不存在的錨點：${brokenAnchors.join(', ')}`);
  record(18, '/blog 文章卡不連到不存在的文章頁，站內連結與錨點都存在', problems.length === 0, problems.join('; ') || `${cards.length} 張文章卡、${hrefs.length} 個連結`);
}

// ---------------------------------------------------------------------------
// 19–21. 圖片來源 / Downloads / 密鑰
// ---------------------------------------------------------------------------
const sourceFiles = walk(SRC).filter((file) => /\.(astro|ts|tsx|css|mjs|js|md|mdx)$/.test(file));
const distFiles = walk(DIST).filter((file) => /\.(html|css|js|xml|txt|json|svg)$/.test(file));
{
  const SOURCE_REF = /(?:\ssrc|\shref|srcset)\s*=\s*["'{`][^"'`}]*docs[\\/]design|src:\s*['"`][^'"`]*docs[\\/]design|url\(\s*['"]?[^)'"]*docs[\\/]design|from\s+['"][^'"]*docs[\\/]design|import\(\s*['"][^'"]*docs[\\/]design/i;
  const DIST_REF = /(?:src|href|srcset|content)="[^"]*docs[\\/]design|url\(\s*['"]?[^)'"]*docs[\\/]design/i;
  const hits = [...sourceFiles.filter((file) => SOURCE_REF.test(read(file))), ...distFiles.filter((file) => DIST_REF.test(read(file)))].map(rel);
  const imgSrc = distFiles
    .filter((file) => file.endsWith('.html'))
    // 品牌 Logo（data-brand-logo）來自全站設定，不是設計圖片
    .flatMap((file) => (read(file).match(/<img\b[^>]*>/g) ?? []).filter((tag) => !/\sdata-brand-logo(?=[\s=>])/.test(tag)).map((tag) => tagAttr(tag, 'src') ?? ''))
    .filter((src) => !/^\/images\/[a-z0-9/-]+\.(png|jpe?g|webp|avif)$/.test(src));
  record(19, '圖片不引用 docs/design（原始碼、build 輸出、<img src> 都在 /images）', hits.length === 0 && imgSrc.length === 0, [...hits, ...imgSrc].slice(0, 5).join(', ') || `${sourceFiles.length} source + ${distFiles.length} dist files`);
}
{
  const DOWNLOADS = /[A-Za-z]:[\\/]+Users[\\/]+[^\\/"'\s]+[\\/]+Downloads|[\\/]Downloads[\\/]/i;
  const publicFiles = walk(path.join(MARKETING_DIR, 'public')).map(rel).filter((file) => /downloads/i.test(file));
  const hits = [...sourceFiles, ...distFiles].filter((file) => DOWNLOADS.test(read(file))).map(rel);
  record(20, '不引用 Downloads 路徑', hits.length === 0 && publicFiles.length === 0, [...hits, ...publicFiles].join(', ') || 'clean');
}
{
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
  const files = [...sourceFiles, ...distFiles, path.join(MARKETING_DIR, 'astro.config.mjs')];
  const hits = files.flatMap((file) => SECRET_PATTERNS.filter(([, pattern]) => pattern.test(read(file))).map(([label]) => `${label}: ${rel(file)}`));
  const envReaders = sourceFiles.filter((file) => /SUPABASE_SERVICE_ROLE_KEY|EC_PAY_|LINE_PAY_CHANNEL|AUTH_COOKIE_SECRET/.test(read(file))).map(rel);
  record(21, `沒有正式金鑰 / 金流密鑰，前台不讀 server-only env（${files.length} files）`, hits.length === 0 && envReaders.length === 0, [...hits, ...envReaders].join(' | ') || 'clean');
}

// ---------------------------------------------------------------------------
// 24. 設計稿右側說明欄不進正式頁面
// ---------------------------------------------------------------------------
{
  const ANNOTATIONS = ['區塊說明', '設計重點', 'UI/UX 設計提案', '頁面定位', '色彩規範', '字體建議', 'Mockup'];
  const hits = distFiles
    .filter((file) => file.endsWith('.html'))
    .flatMap((file) => {
      const text = visibleText(read(file));
      return ANNOTATIONS.filter((phrase) => text.includes(phrase)).map((phrase) => `${rel(file)}: ${phrase}`);
    });
  record(24, '設計稿右側說明欄（區塊說明 / 設計重點 / 色彩規範…）沒有放進正式頁面', hits.length === 0, hits.slice(0, 5).join(' | ') || 'clean');
}

// ---------------------------------------------------------------------------
// 22. RWD
// ---------------------------------------------------------------------------
if (args.has('--skip-rwd')) record(22, 'RWD（--skip-rwd，未執行）', true, 'skipped by flag');
else record(22, 'pnpm rwd:check marketing（375 / 430 / 768 / 1024 / 1280 / 1440）', run('pnpm rwd:check marketing'));

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
console.log('\n━━━━ Mockup layout verify（Phase 2.6B）━━━━');
for (const item of [...results].sort((a, b) => a.no - b.no)) {
  console.log(`${item.ok ? 'PASS' : 'FAIL'}  ${String(item.no).padStart(2, ' ')}. ${item.name}${item.detail && (!item.ok || process.env.MOCKUP_VERBOSE) ? `  — ${item.detail}` : ''}`);
}
const failures = results.filter((item) => !item.ok);
console.log(`\n[mockup:verify] ${results.length - failures.length}/${results.length} checks passed`);
console.log(failures.length ? '[mockup:verify] FAILED' : '[mockup:verify] All mockup layout checks passed.');
process.exit(failures.length ? 1 : 0);
