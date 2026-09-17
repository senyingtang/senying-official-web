// Phase 3.0 購物車 / 結帳前台驗收（靜態 build 輸出 + 原始碼邊界）
//
// 驗收重點：
//   - /cart 與 /checkout 都是 noindex、不進 sitemap、不進搜尋索引
//   - 加入購物車只送 price id：金額、可購買性、幣別都由伺服器決定
//   - 訪客購物車以隨機 token 識別（瀏覽器存明文、資料庫只存 sha256），不使用流水號 id
//   - 顯示任何金額的頁面都必須標示「測試價格 / 非正式售價」
//   - 結帳頁不收卡號 / CVV、沒有 form action、付款按鈕預設停用
//   - 官網不打包 @supabase/supabase-js（購物車只用 fetch 打 RPC）
//
// 預設會先 build（DATA_SOURCE=mock）；已經有 build 時可加 --skip-build。
//
// 用法：pnpm cart:verify [--skip-build]
import path from 'node:path';
import { MARKETING_DIR, ROOT } from './lib/servers.mjs';
import { DIST, SRC, createReport, htmlPath, read, rel, run, walk } from './lib/static-site.mjs';

const report = createReport('Phase 3.0 cart verify（購物車 / 結帳前台）');
const { record } = report;
const skipBuild = process.argv.includes('--skip-build');

const PRODUCT_ROUTES = ['/products/seo-website', '/products/landing-page', '/products/ecommerce-website', '/products/promo-page-design', '/products/seo-article-generator'];
const COMMERCE_ROUTES = ['/cart', '/checkout', '/checkout/success', '/checkout/failed'];

// ---------------------------------------------------------------------------
// 1. Build
// ---------------------------------------------------------------------------
{
  const built = skipBuild ? true : run('cart', 'pnpm --filter @syt/marketing build');
  record(1, `Marketing build（DATA_SOURCE=mock）${skipBuild ? '（--skip-build）' : ''}`, built && read(htmlPath(DIST, '/cart')).length > 0, rel(DIST));
}

const pages = new Map();
for (const route of [...COMMERCE_ROUTES, ...PRODUCT_ROUTES]) {
  const html = read(htmlPath(DIST, route));
  pages.set(route, { html, text: visibleText(html) });
}

function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<template[\s\S]*?<\/template>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}
const metaContent = (html, name) => {
  const tag = (html.match(/<meta\b[^>]*>/g) ?? []).find((item) => new RegExp(`\\sname="${name}"`).test(item));
  return tag?.match(/\scontent="([^"]*)"/)?.[1] ?? '';
};

// ---------------------------------------------------------------------------
// 2–4. 頁面存在 / noindex / 不被收錄
// ---------------------------------------------------------------------------
{
  const missing = COMMERCE_ROUTES.filter((route) => pages.get(route).html.length === 0);
  record(2, `購物流程頁面都有 build 輸出（${COMMERCE_ROUTES.join('、')}）`, missing.length === 0, missing.join(', ') || `${COMMERCE_ROUTES.length} pages`);
}

{
  const notNoindex = COMMERCE_ROUTES.filter((route) => !metaContent(pages.get(route).html, 'robots').includes('noindex'));
  record(3, '購物流程頁面全部為 noindex', notNoindex.length === 0, notNoindex.join(', ') || COMMERCE_ROUTES.map((route) => `${route}=noindex`).join(' '));
}

{
  const sitemap = read(path.join(DIST, 'sitemap.xml'));
  const inSitemap = COMMERCE_ROUTES.filter((route) => sitemap.includes(`${route}</loc>`) || sitemap.includes(`${route}/</loc>`));
  let indexUrls = [];
  try {
    indexUrls = (JSON.parse(read(path.join(DIST, 'search-index.json'))).entries ?? []).map((entry) => entry.url);
  } catch {
    indexUrls = [];
  }
  const inSearch = COMMERCE_ROUTES.filter((route) => indexUrls.includes(route));
  const robots = read(path.join(DIST, 'robots.txt'));
  record(
    4,
    '購物流程頁面不進 sitemap、不進站內搜尋索引',
    inSitemap.length === 0 && inSearch.length === 0,
    `sitemap=${inSitemap.join(',') || 'none'} search=${inSearch.join(',') || 'none'} robots=${JSON.stringify(robots.trim().slice(0, 40))}`,
  );
}

// ---------------------------------------------------------------------------
// 5–7. 加入購物車
// ---------------------------------------------------------------------------
{
  const withAddToCart = PRODUCT_ROUTES.filter((route) => /\sdata-add-to-cart-root\b/.test(pages.get(route).html));
  const withPriceId = withAddToCart.filter((route) => /\sdata-price-id="[^"]+"/.test(pages.get(route).html));
  record(
    5,
    `可自助購買的產品頁有「加入購物車」，且帶的是 price id（${withAddToCart.length} 頁）`,
    withAddToCart.length >= 2 && withAddToCart.length === withPriceId.length,
    withAddToCart.join(', ') || '沒有產品頁提供加入購物車',
  );
}

{
  // 前台不可把金額送給伺服器：加入購物車 / 更新數量的 RPC 參數裡不能有 amount / price 金額
  const addToCart = read(path.join(SRC, 'components', 'AddToCart.astro'));
  const cartClient = read(path.join(SRC, 'lib', 'cart-client.ts'));
  const sendsAmount = /p_amount|amount_cents\s*:|unit_amount|p_price_cents/.test(cartClient) || /amountCents\s*:/.test(addToCart.split('<script>')[1] ?? '');
  const addsByPriceId = /addItem\(\s*priceId/.test(addToCart) && /p_price_id/.test(cartClient);
  record(
    6,
    '加入購物車只送 price id，不送任何金額（伺服器重新計價，前端金額不被採用）',
    !sendsAmount && addsByPriceId,
    `sendsAmount=${sendsAmount} addsByPriceId=${addsByPriceId}`,
  );
}

{
  const cartClient = read(path.join(SRC, 'lib', 'cart-client.ts'));
  const randomToken = /crypto\.getRandomValues/.test(cartClient) && /new Uint8Array\(32\)/.test(cartClient);
  const storesPlaintextLocally = /localStorage\.setItem\(CART_TOKEN_STORAGE_KEY/.test(cartClient);
  // 資料庫只存 hash：RPC 參數名是 p_cart_token，資料表欄位是 session_token_hash
  const migration = read(path.join(ROOT, 'supabase', 'migrations', '0018_commerce_checkout_mvp.sql'));
  const hashesOnServer = /session_token_hash/.test(migration) && /encode\(\s*sha256\(/.test(migration) && !/session_token\s+text\s+not null/.test(migration);
  // 不可用流水號 id 當識別
  const noSequentialId = !/\bcart_id=\d+|\/cart\/\d+/.test(cartClient);
  record(
    7,
    '訪客購物車以 32 bytes 隨機 token 識別（瀏覽器存明文、資料庫只存 sha256，不使用流水號 id）',
    randomToken && storesPlaintextLocally && hashesOnServer && noSequentialId,
    `random=${randomToken} local=${storesPlaintextLocally} hashed=${hashesOnServer}`,
  );
}

// ---------------------------------------------------------------------------
// 8–10. 購物車頁
// ---------------------------------------------------------------------------
{
  const html = pages.get('/cart').html;
  const parts = ['data-cart-root', 'data-cart-empty', 'data-cart-list', 'data-cart-summary', 'data-cart-subtotal', 'data-cart-clear'];
  const missing = parts.filter((part) => !html.includes(part));
  const checkout = /<a\b[^>]*\shref="\/checkout"[^>]*\sdata-cart-checkout|<a\b[^>]*\sdata-cart-checkout[^>]*\shref="\/checkout"/.test(html);
  record(8, '/cart 有空車狀態、明細、摘要、清空與前往結帳', missing.length === 0 && checkout, missing.join(', ') || `→ /checkout=${checkout}`);
}

{
  const html = pages.get('/cart').html;
  const quantityInput = html.match(/<input\b[^>]*\sdata-row-quantity[^>]*>/)?.[0] ?? html.match(/<input\b[^>]*type="number"[^>]*>/)?.[0] ?? '';
  const min = quantityInput.match(/\smin="(\d+)"/)?.[1];
  const max = quantityInput.match(/\smax="(\d+)"/)?.[1];
  record(9, '購物車數量限制 1–100（與資料庫 CHECK 一致）', min === '1' && max === '100', `min=${min} max=${max}`);
}

{
  // 購物車列與小計都沒有在 build 時寫死金額（金額由 RPC 回來後才填）
  const html = pages.get('/cart').html;
  const templateBlock = html.match(/<template\b[^>]*data-cart-row[\s\S]*?<\/template>/)?.[0] ?? '';
  const hardcoded = templateBlock.match(/NT\$|\$\s?\d/g) ?? [];
  const placeholders = ['data-row-unit', 'data-row-total', 'data-cart-subtotal'].every((key) => html.includes(key));
  record(10, '購物車金額欄位在 build 時是空的，只由伺服器回傳後填入', hardcoded.length === 0 && placeholders, hardcoded.join(',') || 'unit / total / subtotal 由 RPC 填入');
}

// ---------------------------------------------------------------------------
// 11–13. 結帳頁
// ---------------------------------------------------------------------------
{
  const html = pages.get('/checkout').html;
  const sections = ['cart-review', 'customer', 'payment-methods', 'order-summary'];
  const missing = sections.filter((name) => !html.includes(`data-section="${name}"`));
  record(11, '/checkout 依序有購物車確認、客戶資料、付款方式、訂單摘要', missing.length === 0, missing.join(', ') || sections.join(' → '));
}

{
  const html = pages.get('/checkout').html;
  const inputs = html.match(/<input\b[^>]*>/g) ?? [];
  const CARD_FIELD = /\s(?:name|id|autocomplete)="[^"]*(?:card|cvv|cvc|credit[-_]?card|security[-_]?code|cc[-_]?num)[^"]*"/i;
  const cardFields = inputs.filter((tag) => CARD_FIELD.test(tag));
  const formAction = /<form\b[^>]*\saction=/.test(html);
  const submit = (html.match(/<button\b[^>]*>/g) ?? []).filter((tag) => /data-checkout-submit/.test(tag));
  const enabled = submit.filter((tag) => !/\sdisabled/.test(tag));
  record(
    12,
    '/checkout 不收卡號 / CVV、沒有 form action、付款按鈕預設停用',
    cardFields.length === 0 && !formAction && submit.length === 1 && enabled.length === 0,
    `card=${cardFields.length} formAction=${formAction} submit=${submit.length} enabled=${enabled.length}`,
  );
}

{
  const html = pages.get('/checkout').html;
  const methods = (html.match(/<input\b[^>]*\sname="payment_method"[^>]*>/g) ?? []);
  const realMoney = methods.filter((tag) => /\svalue="(?:ecpay|linepay|bank_transfer)/i.test(tag));
  const labelled = pages.get('/checkout').text.includes('Sandbox') && pages.get('/checkout').text.includes('不會真的扣款');
  record(
    13,
    '/checkout 只提供已啟用的模擬付款方式，且明確標示是模擬付款',
    methods.length > 0 && realMoney.length === 0 && labelled,
    `methods=${methods.length} realMoney=${realMoney.length} labelled=${labelled}`,
  );
}

// ---------------------------------------------------------------------------
// 14–15. 訂單完成 / 失敗頁
// ---------------------------------------------------------------------------
{
  const success = pages.get('/checkout/success');
  const usesToken = /readCheckoutToken/.test(read(path.join(SRC, 'pages', 'checkout', 'success.astro')));
  const codeInUrl = /[?&](?:code|access_code|accessCode)=/.test(success.html);
  const noCodeInHtml = !/SYT-[A-Z]+-\d{4}-[A-Z0-9]{6}/.test(success.html.replace(/例如 SYT-[A-Z0-9-]+/g, ''));
  record(
    14,
    '/checkout/success 以不可猜測的收據 token 查詢，權限代碼不出現在網址、也不寫進 build 輸出',
    usesToken && !codeInUrl && noCodeInHtml,
    `token=${usesToken} codeInUrl=${codeInUrl}`,
  );
}

{
  const failed = pages.get('/checkout/failed');
  const saysNoEntitlement = failed.text.includes('沒有發放任何權限代碼') && failed.text.includes('不會向你收取任何費用');
  const retry = failed.html.includes('href="/checkout"') && failed.html.includes('href="/cart"');
  record(15, '/checkout/failed 明確說明沒有發碼、沒有收費，並提供重新付款與回購物車', saysNoEntitlement && retry, `說明=${saysNoEntitlement} 重試=${retry}`);
}

// ---------------------------------------------------------------------------
// 16–18. 全站金額標示 / bundle / 浮動購物車
// ---------------------------------------------------------------------------
{
  const PRICE = /(?:NT\$|NTD|新台幣|US\$|\$)\s?\d{1,3}(?:,\d{3})+|(?:NT\$|NTD|新台幣|US\$|\$)\s?\d{3,}|\d{1,3}(?:,\d{3})+\s*元|\d{4,}\s*元/g;
  const htmlFiles = walk(DIST).filter((file) => file.endsWith('.html'));
  const unlabelled = [];
  for (const file of htmlFiles) {
    const text = visibleText(read(file));
    const amounts = text.match(PRICE) ?? [];
    if (amounts.length && !(text.includes('測試價格') && text.includes('非正式售價'))) unlabelled.push(`${rel(file)}: ${amounts.slice(0, 2).join(',')}`);
  }
  record(16, `顯示金額的頁面都標示「測試價格 / 非正式售價」（掃描 ${htmlFiles.length} 頁）`, unlabelled.length === 0, unlabelled.slice(0, 3).join(' | ') || 'clean');
}

{
  // 官網 bundle 不應該包含整包 supabase-js（購物車只需要一個 POST）
  const jsFiles = walk(path.join(DIST, '_astro')).filter((file) => file.endsWith('.js'));
  const sdkHits = jsFiles.filter((file) => /GoTrueClient|SupabaseClient|PostgrestClient/.test(read(file))).map(rel);
  const inlineKeys = walk(DIST)
    .filter((file) => file.endsWith('.html') || file.endsWith('.js'))
    .filter((file) => /SUPABASE_SERVICE_ROLE_KEY|service_role/.test(read(file)))
    .map(rel);
  record(
    17,
    `官網 bundle 不含 supabase-js SDK，也沒有 service role key（${jsFiles.length} js files）`,
    sdkHits.length === 0 && inlineKeys.length === 0,
    [...sdkHits, ...inlineKeys].slice(0, 3).join(', ') || 'clean',
  );
}

{
  // 浮動購物車由 site_settings 控制：連結來自設定（不是寫死），預設值指向 /cart，
  // 而且設定驗證只允許站內路徑（不能被改成外部網址）
  const floating = read(path.join(SRC, 'components', 'FloatingActions.astro'));
  const settings = read(path.join(ROOT, 'packages', 'database', 'src', 'site-settings.ts'));
  const gated = /fa\.cartEnabled/.test(floating);
  const hrefFromSettings = /href=\{fa\.cartHref\}/.test(floating);
  const defaultsToCart = /cartHref: '\/cart'/.test(settings);
  const internalOnly = /cart\.href.*站內路徑|站內路徑[\s\S]{0,40}cart/.test(settings) || /\/\^\\\/\(\?!\\\/\)\/\.test\(settings\.floatingActions\.cartHref\)/.test(settings);
  record(
    18,
    '浮動購物車由全站設定控制（cartEnabled / cartHref），預設連到 /cart 且只允許站內路徑',
    gated && hrefFromSettings && defaultsToCart && internalOnly,
    `gated=${gated} href=設定值(${hrefFromSettings}) 預設=/cart(${defaultsToCart}) 站內限制=${internalOnly}`,
  );
}

report.finish('cart:verify');
