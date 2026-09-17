// Phase 3.0 Commerce 資料庫 / RLS 驗收（只連本專案 local Supabase：API 54421 / DB 54422）
//
//   1. 本機 Supabase 可連線（安全檢查：只接受本機 port）
//   2. 0018 migration 已套用，且 supabase/ 與 docs/ 的 SQL 內容一致
//   3. supabase/tests/*.sql 全數通過（含 commerce_checkout_rls.sql）
//   4. 購物車結構：訪客 token 只存 sha256、數量限制、cart item 不存單價
//   5. RPC 權限：deny-by-default，只有結帳需要的函式開放給 anon
//   6. anon（PostgREST）讀不到 carts / orders / payments / webhook / access codes
//   7. anon 不能呼叫發碼 RPC
//   8. 下單金額由伺服器重算：竄改前端金額無效
//   9. 購物車只接受可購買的商品與價格
//  10. 發碼冪等：重複呼叫不會重複發代碼
//  11. 沒有任何真實金流 provider / 付款方式被啟用，且 commerce.live_payments 保持 false
//  12. 目前啟用的價格都標記為測試價格
//  13. 收據 token 只存 sha256，權限代碼不出現在 order / checkout session 的可公開欄位
//  14. audit log 不含密鑰或完整權限代碼
//
// 全程在單一 transaction 內執行並 rollback，不留下資料。
// 用法：pnpm commerce:verify
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { getLocalSupabaseEnv, maskSecret, psql, psqlJson } from './lib/local-supabase.mjs';
import { ROOT } from './lib/servers.mjs';
import { createReport } from './lib/static-site.mjs';

const report = createReport('Phase 3.0 commerce verify（資料庫 / RLS）');
const { record } = report;

let env;
try {
  env = getLocalSupabaseEnv();
  record(1, '本機 Supabase 可連線（只允許本專案 local stack）', true, `API ${env.apiUrl} · DB 127.0.0.1:54422 · anon ${maskSecret(env.anonKey)}`);
} catch (error) {
  record(1, '本機 Supabase 可連線', false, error.message);
  report.finish('commerce:verify');
}

const MIGRATION = '0018_commerce_checkout_mvp.sql';

// ---------------------------------------------------------------------------
// 2–3. migration / SQL tests
// ---------------------------------------------------------------------------
{
  const files = readdirSync(path.join(ROOT, 'supabase', 'migrations')).filter((file) => file.endsWith('.sql')).map((file) => file.split('_')[0]).sort();
  const applied = psqlJson('select json_agg(version order by version) from supabase_migrations.schema_migrations') ?? [];
  const src = readFileSync(path.join(ROOT, 'supabase', 'migrations', MIGRATION), 'utf8');
  const docs = readFileSync(path.join(ROOT, 'docs', '森映_Headless自助建站平台_DB_SQL_v2.0', 'supabase', 'migrations', MIGRATION), 'utf8');
  record(
    2,
    `migrations 全部依序套用（${files.length} 支，含 0018），且 supabase/ 與 docs/ 的 0018 完全一致`,
    JSON.stringify(files) === JSON.stringify(applied) && applied.includes('0018') && src === docs,
    `applied=${applied.join(',')} docsInSync=${src === docs}`,
  );
}

{
  const testsDir = path.join(ROOT, 'supabase', 'tests');
  const results = readdirSync(testsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => {
      const result = psql(readFileSync(path.join(testsDir, file), 'utf8'));
      return { file, ok: result.ok, error: result.stderr.split('\n').find((line) => /ERROR/.test(line)) ?? '' };
    });
  record(
    3,
    `supabase/tests SQL 測試全數通過（${results.length} 支，含 commerce_checkout_rls.sql，全程 rollback）`,
    results.some((item) => item.file === 'commerce_checkout_rls.sql') && results.every((item) => item.ok),
    results.map((item) => `${item.ok ? '✓' : '✗'} ${item.file}${item.error ? ` ${item.error}` : ''}`).join(' · '),
  );
}

// ---------------------------------------------------------------------------
// 4–5. 結構與函式權限
// ---------------------------------------------------------------------------
{
  const columns = psqlJson(`select json_agg(json_build_object('t', table_name, 'c', column_name) order by table_name, column_name)
    from information_schema.columns where table_schema = 'public' and table_name in ('commerce_carts', 'commerce_cart_items')`) ?? [];
  const cartCols = columns.filter((row) => row.t === 'commerce_carts').map((row) => row.c);
  const itemCols = columns.filter((row) => row.t === 'commerce_cart_items').map((row) => row.c);
  // cart item 刻意不保存單價：避免「加入購物車時的價格」被拿來當成結帳金額
  const noPriceOnItem = !itemCols.some((column) => /amount|price_cents|unit/.test(column));
  const tokenHashed = cartCols.includes('session_token_hash') && !cartCols.includes('session_token');
  const quantityCheck = psqlJson(`select json_agg(pg_get_constraintdef(oid)) from pg_constraint
    where conrelid = 'public.commerce_cart_items'::regclass and contype = 'c'`) ?? [];
  const boundedQuantity = quantityCheck.some((def) => /quantity\s*>=\s*1/.test(def) && /quantity\s*<=\s*100/.test(def));
  const rls = psqlJson(`select json_agg(json_build_object('t', relname, 'rls', relrowsecurity)) from pg_class
    where relnamespace = 'public'::regnamespace and relname in ('commerce_carts', 'commerce_cart_items')`) ?? [];
  record(
    4,
    '購物車結構：只存 token 的 sha256、數量 1–100、cart item 不保存單價、兩張表都開 RLS',
    tokenHashed && boundedQuantity && noPriceOnItem && rls.length === 2 && rls.every((row) => row.rls),
    `tokenHashed=${tokenHashed} quantity=${boundedQuantity} noPriceOnItem=${noPriceOnItem} rls=${rls.map((row) => `${row.t}:${row.rls}`).join(',')}`,
  );
}

{
  // deny-by-default：只有結帳流程需要的函式可以給 anon 執行
  const ALLOWED_ANON = [
    'commerce_cart_get',
    'commerce_cart_add_item',
    'commerce_cart_set_quantity',
    'commerce_cart_clear',
    'create_order_from_cart',
    'get_order_receipt',
    'get_purchasable_products',
    'get_enabled_payment_methods',
    'commerce_cart_token_hash',
    'commerce_product_is_purchasable',
    'commerce_price_is_purchasable',
  ];
  const anonExecutable = psqlJson(`select json_agg(p.proname order by p.proname) from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and has_function_privilege('anon', p.oid, 'execute')
      and p.proname in ('commerce_cart_get','commerce_cart_add_item','commerce_cart_set_quantity','commerce_cart_clear',
                        'create_order_from_cart','get_order_receipt','get_purchasable_products','get_enabled_payment_methods',
                        '_commerce_resolve_cart','_commerce_cart_state','mark_payment_success_and_issue_entitlement',
                        'commerce_cart_token_hash','commerce_product_is_purchasable','commerce_price_is_purchasable')`) ?? [];
  const extra = anonExecutable.filter((name) => !ALLOWED_ANON.includes(name));
  const missing = ALLOWED_ANON.filter((name) => !anonExecutable.includes(name));
  record(
    5,
    'RPC 權限 deny-by-default：anon 只能執行結帳需要的函式（內部 helper 與發碼 RPC 一律不開放）',
    extra.length === 0 && missing.length === 0,
    extra.length ? `多開放：${extra.join(',')}` : missing.length ? `缺少：${missing.join(',')}` : `${anonExecutable.length} functions`,
  );
}

// ---------------------------------------------------------------------------
// 6–7. anon 邊界（PostgREST 真實路徑）
// ---------------------------------------------------------------------------
const restHeaders = { apikey: env.anonKey, Authorization: `Bearer ${env.anonKey}`, 'Content-Type': 'application/json' };
const restGet = async (table) => {
  const response = await fetch(`${env.apiUrl}/rest/v1/${table}?select=id&limit=1`, { headers: restHeaders });
  return { status: response.status, body: await response.text() };
};
const restRpc = async (fn, body) => {
  const response = await fetch(`${env.apiUrl}/rest/v1/rpc/${fn}`, { method: 'POST', headers: restHeaders, body: JSON.stringify(body) });
  return { status: response.status, body: await response.text() };
};

{
  const TABLES = ['commerce_carts', 'commerce_cart_items', 'commerce_orders', 'commerce_order_items', 'commerce_payments', 'commerce_webhook_events', 'access_codes', 'commerce_checkout_sessions'];
  const readable = [];
  for (const table of TABLES) {
    const { status, body } = await restGet(table);
    // 200 + [] 代表 RLS 擋住（沒有可讀的列）；200 + 資料才是外洩
    if (status === 200 && body.trim() !== '[]') readable.push(`${table}(${body.slice(0, 40)})`);
  }
  record(6, `anon 透過 PostgREST 讀不到任何購物車 / 訂單 / 付款 / webhook / 權限代碼（${TABLES.length} 張表）`, readable.length === 0, readable.join(', ') || 'all empty');
}

{
  const issue = await restRpc('mark_payment_success_and_issue_entitlement', { order_id: '00000000-0000-4000-8000-000000000000' });
  const blocked = issue.status === 404 || issue.status === 401 || issue.status === 403 || /permission denied|Could not find the function/i.test(issue.body);
  const providerConfigs = await restGet('commerce_payment_provider_configs');
  const providerLeak = providerConfigs.status === 200 && providerConfigs.body.trim() !== '[]';
  record(
    7,
    'anon 不能呼叫發碼 RPC，也讀不到金流設定（secret_refs 不對外曝光）',
    blocked && !providerLeak,
    `issueRpc=${issue.status} providerConfigs=${providerConfigs.status}/${providerConfigs.body.slice(0, 20)}`,
  );
}

// ---------------------------------------------------------------------------
// 8–10. 下單金額與發碼（在 transaction 內執行後 rollback）
// ---------------------------------------------------------------------------
{
  // 嘗試把「便宜的價格」加進購物車，然後檢查訂單金額是不是 DB 價格（前端無法指定金額）
  const sql = `
begin;
set local role postgres;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
with target as (
  select pr.id as price_id, pr.amount_cents
  from public.commerce_product_prices pr
  join public.commerce_products p on p.id = pr.product_id
  where public.commerce_price_is_purchasable(pr) and public.commerce_product_is_purchasable(p)
  order by pr.amount_cents limit 1
)
select public.commerce_cart_add_item('${'a'.repeat(64)}', (select price_id from target), 3) as cart;
select public.create_order_from_cart(
  '${'a'.repeat(64)}',
  jsonb_build_object('name', '驗收', 'email', 'commerce-check@syt-local.test', 'consent', true,
                     'total_cents', 1, 'amount_cents', 1, 'subtotal_cents', 1),
  (select method_key from public.get_enabled_payment_methods() limit 1)
) as created;
select json_build_object(
  'order_total', (select total_cents from public.commerce_orders order by created_at desc limit 1),
  'expected', (select 3 * pr.amount_cents from public.commerce_product_prices pr
               join public.commerce_products p on p.id = pr.product_id
               where public.commerce_price_is_purchasable(pr) and public.commerce_product_is_purchasable(p)
               order by pr.amount_cents limit 1),
  'payment_status', (select status::text from public.commerce_payments order by created_at desc limit 1),
  'order_status', (select status::text from public.commerce_orders order by created_at desc limit 1),
  'codes', (select count(*) from public.access_codes c
            join public.commerce_orders o on o.id = c.order_id
            where o.buyer_email = 'commerce-check@syt-local.test')
) as result;
rollback;`;
  const rows = psql(sql, { tuplesOnly: true });
  const json = rows.stdout.split('\n').map((line) => line.trim()).filter((line) => line.startsWith('{') && line.includes('order_total')).pop();
  let parsed = null;
  try {
    parsed = JSON.parse(json ?? 'null');
  } catch {
    parsed = null;
  }
  record(
    8,
    '下單金額一律由伺服器依資料庫價格重算（前端送來的 total_cents / amount_cents 完全不採用）',
    Boolean(parsed) && parsed.order_total === parsed.expected && parsed.order_total > 1,
    parsed ? `orderTotal=${parsed.order_total} expected=${parsed.expected}` : `無法解析：${rows.stderr.split('\n').find((line) => /ERROR/.test(line)) ?? rows.stdout.slice(0, 160)}`,
  );
  record(
    9,
    '新訂單一律是「待付款 + pending 付款」，且在付款前不會發任何權限代碼',
    Boolean(parsed) && parsed.payment_status === 'pending' && parsed.order_status === 'awaiting_payment' && Number(parsed.codes) === 0,
    parsed ? `payment=${parsed.payment_status} order=${parsed.order_status} codes=${parsed.codes}` : 'n/a',
  );
}

{
  // 發碼冪等：以 service role 身分連續呼叫兩次 mark_payment_success_and_issue_entitlement
  const sql = `
begin;
set local role postgres;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
with target as (
  select pr.id as price_id from public.commerce_product_prices pr
  join public.commerce_products p on p.id = pr.product_id
  where public.commerce_price_is_purchasable(pr) and public.commerce_product_is_purchasable(p)
  order by pr.amount_cents limit 1
)
select public.commerce_cart_add_item('${'b'.repeat(64)}', (select price_id from target), 2);
select public.create_order_from_cart('${'b'.repeat(64)}',
  jsonb_build_object('name', '驗收', 'email', 'commerce-idem@syt-local.test', 'consent', true),
  (select method_key from public.get_enabled_payment_methods() limit 1));
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select public.mark_payment_success_and_issue_entitlement(
  (select order_id from public.commerce_payments order by created_at desc limit 1),
  (select id from public.commerce_payments order by created_at desc limit 1),
  'sandbox-trade-1', 'commerce:verify') as first;
select public.mark_payment_success_and_issue_entitlement(
  (select order_id from public.commerce_payments order by created_at desc limit 1),
  (select id from public.commerce_payments order by created_at desc limit 1),
  'sandbox-trade-1', 'commerce:verify') as second;
select json_build_object(
  'codes', (select count(*) from public.access_codes c
            join public.commerce_orders o on o.id = c.order_id where o.buyer_email = 'commerce-idem@syt-local.test'),
  'order_status', (select status::text from public.commerce_orders where buyer_email = 'commerce-idem@syt-local.test'),
  'payment_status', (select p.status::text from public.commerce_payments p
                     join public.commerce_orders o on o.id = p.order_id where o.buyer_email = 'commerce-idem@syt-local.test')
) as result;
rollback;`;
  const rows = psql(sql, { tuplesOnly: true });
  const json = rows.stdout.split('\n').map((line) => line.trim()).filter((line) => line.startsWith('{') && line.includes('order_status')).pop();
  let parsed = null;
  try {
    parsed = JSON.parse(json ?? 'null');
  } catch {
    parsed = null;
  }
  record(
    10,
    '付款成功發碼冪等：重複呼叫不會重複發代碼（數量 2 → 剛好 2 組，訂單轉為已完成）',
    Boolean(parsed) && Number(parsed.codes) === 2 && parsed.payment_status === 'succeeded' && ['paid', 'fulfilled'].includes(parsed.order_status),
    parsed ? `codes=${parsed.codes} payment=${parsed.payment_status} order=${parsed.order_status}` : `無法解析：${rows.stderr.split('\n').find((line) => /ERROR/.test(line)) ?? rows.stdout.slice(0, 160)}`,
  );
}

// ---------------------------------------------------------------------------
// 11–14. 正式付款未開放 / 測試價格 / token / audit
// ---------------------------------------------------------------------------
{
  const enabledProviders = psqlJson(`select json_agg(json_build_object('p', provider::text, 'e', environment::text) order by provider)
    from public.commerce_payment_provider_configs where is_enabled`) ?? [];
  const enabledMethods = psqlJson(`select json_agg(json_build_object('k', method_key, 'p', provider::text) order by method_key)
    from public.commerce_payment_methods where is_enabled`) ?? [];
  const flags = psqlJson(`select setting_value from public.cms_site_settings where setting_key = 'platform.feature_flags'`) ?? {};
  const livePayments = flags['commerce.live_payments'];
  const checkoutEnabled = flags['commerce.checkout_enabled'];
  const realProviders = enabledProviders.filter((row) => row.p !== 'sandbox');
  const realMethods = enabledMethods.filter((row) => row.p !== 'sandbox');
  const production = enabledProviders.filter((row) => row.e === 'production');
  record(
    11,
    '正式付款未開放：沒有真實金流 provider / 付款方式被啟用、沒有 production 環境，commerce.live_payments 保持 false（checkout_enabled 只代表可建立訂單）',
    realProviders.length === 0 && realMethods.length === 0 && production.length === 0 && livePayments === false && checkoutEnabled === true,
    `providers=${enabledProviders.map((row) => `${row.p}:${row.e}`).join(',')} methods=${enabledMethods.map((row) => row.k).join(',')} livePayments=${JSON.stringify(livePayments)} checkoutEnabled=${JSON.stringify(checkoutEnabled)}`,
  );
}

{
  const activePrices = psqlJson(`select json_agg(json_build_object('k', pr.price_key, 'a', pr.amount_cents, 'test', coalesce((pr.metadata ->> 'test_price')::boolean, false), 'n', pr.name) order by pr.price_key)
    from public.commerce_product_prices pr
    join public.commerce_products p on p.id = pr.product_id
    where public.commerce_price_is_purchasable(pr) and public.commerce_product_is_purchasable(p)`) ?? [];
  const unlabelled = activePrices.filter((row) => !row.test || !String(row.n).includes('測試價格'));
  // TWD 金額必須是整數元（綠界 TotalAmount 是整數）
  const nonWhole = activePrices.filter((row) => Number(row.a) % 100 !== 0);
  record(
    12,
    '目前可購買的價格都標記為測試價格（metadata.test_price + 名稱），且金額都是整數元',
    activePrices.length > 0 && unlabelled.length === 0 && nonWhole.length === 0,
    unlabelled.length ? `未標記：${unlabelled.map((row) => row.k).join(',')}` : activePrices.map((row) => `${row.k}=${row.a}`).join(' · '),
  );
}

{
  const sessionCols = psqlJson(`select json_agg(column_name order by column_name) from information_schema.columns
    where table_schema = 'public' and table_name = 'commerce_checkout_sessions'`) ?? [];
  const hashedOnly = sessionCols.includes('public_token_hash') && !sessionCols.some((column) => /^public_token$|^token$/.test(column));
  // 權限代碼不可出現在任何「可公開查詢」的回傳：get_order_receipt 只在已付款時回傳代碼給持有 token 的人
  const receiptSource = psqlJson(`select to_json(pg_get_functiondef(oid)) from pg_proc where proname = 'get_order_receipt' and pronamespace = 'public'::regnamespace`) ?? '';
  const requiresToken = /public_token_hash\s*=\s*encode\(\s*sha256/.test(receiptSource);
  // invoice_love_code 是發票愛心碼（由買家填寫），不是權限代碼
  const codeNotInOrder = (psqlJson(`select coalesce(json_agg(column_name), '[]'::json) from information_schema.columns
    where table_schema = 'public' and table_name = 'commerce_orders'
      and column_name ~ '(access_code|redeem|entitlement_code)'`) ?? []).length === 0;
  record(
    13,
    '收據 token 只存 sha256（需持有明文才查得到），訂單資料表本身不保存權限代碼',
    hashedOnly && requiresToken && codeNotInOrder,
    `hashedOnly=${hashedOnly} requiresToken=${requiresToken} codeNotInOrder=${codeNotInOrder}`,
  );
}

{
  // audit / webhook 保存的 payload 不可含密鑰或完整權限代碼
  const leaks = psqlJson(`select coalesce(json_agg(json_build_object('t', src, 'n', n)), '[]'::json) from (
      select 'audit_logs' as src, count(*) as n from public.audit_logs
        where action like 'commerce.%'
          and (metadata::text ~* '(hash_?key|hash_?iv|channel_?secret|CheckMacValue|service_role)'
            or metadata::text ~ 'SYT-[A-Z]+-[0-9]{4}-[A-Z0-9]{6}')
      union all
      select 'commerce_webhook_events', count(*) from public.commerce_webhook_events
        where (coalesce(raw_payload::text, '') || coalesce(raw_body, '') || headers_sanitized::text) ~* '(hash_?key|hash_?iv|channel_?secret|CheckMacValue)'
           or (coalesce(raw_payload::text, '') || coalesce(raw_body, '') || headers_sanitized::text) ~ 'SYT-[A-Z]+-[0-9]{4}-[A-Z0-9]{6}'
    ) t where n > 0`) ?? [];
  const totals = psqlJson(`select json_build_object('audit', (select count(*) from public.audit_logs where action like 'commerce.%'), 'webhook', (select count(*) from public.commerce_webhook_events))`);
  record(
    14,
    'Audit log 與 webhook payload 沒有密鑰、簽章或完整權限代碼',
    leaks.length === 0,
    leaks.length ? leaks.map((row) => `${row.t}:${row.n}`).join(', ') : `audit=${totals.audit} webhook=${totals.webhook} rows clean`,
  );
}

report.finish('commerce:verify');
