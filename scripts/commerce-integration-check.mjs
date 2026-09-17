// Phase 3.0 Commerce 端到端整合驗收（本機 Supabase ↔ 前台 RPC ↔ 後台 sandbox 付款 ↔ 發碼）
//
// 走完整條真實路徑，沒有任何一步是模擬出來的資料：
//   加入購物車（anon RPC）→ 竄改金額測試 → 建立訂單 → 後台 Sandbox 付款頁 → 送出模擬付款
//   → webhook 驗簽 + 冪等 → 發放權限代碼 → 收據查詢（憑 token）→ 後台訂單明細（代碼遮罩）
//
// 安全邊界：
//   - 只連本專案 local Supabase（API 54421 / DB 54422）
//   - PAYMENT_SANDBOX_SECRET 為本次執行隨機產生，不寫入任何檔案
//   - 測試資料在 finally 全部清除（buyer email 固定在 @syt-local.test）
//
// 用法：pnpm commerce-integration:verify
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { loadPaymentsBundle } from './lib/payments-bundle.mjs';
import { appEnv, getLocalSupabaseEnv, maskSecret, psql, psqlJson, sqlLiteral } from './lib/local-supabase.mjs';
import { ADMIN_DIR, ROOT, installSignalCleanup, startAdminServer, stopAll } from './lib/servers.mjs';
import { createReport } from './lib/static-site.mjs';

const report = createReport('Phase 3.0 commerce integration（前台 RPC ↔ Sandbox 付款 ↔ 發碼）');
const { record } = report;
const REPORT_DIR = path.join(ROOT, '.phase30-report');

const ADMIN_DIST = '.next-supabase';
const BUYER_EMAIL = 'commerce-integration@syt-local.test';
const CART_TOKEN = randomBytes(32).toString('hex');
const SANDBOX_SECRET = randomBytes(32).toString('hex');
// adapter 的簽章函式直接讀 process.env（與後台相同的程式碼），這裡只設定在本程序記憶體中
process.env.PAYMENT_SANDBOX_ENABLED = 'true';
process.env.PAYMENT_SANDBOX_SECRET = SANDBOX_SECRET;

/**
 * 清除本次驗收產生的資料。
 * 刪除順序依 FK 由葉節點往回：payment_transactions / webhook → payments → session / items → order。
 * （commerce_orders 被 18 張表參照，這裡只處理本流程真的會寫入的那幾張。）
 */
const cleanup = () => {
  psql(`begin;
    delete from public.access_codes where order_id in (select id from public.commerce_orders where buyer_email = ${sqlLiteral(BUYER_EMAIL)});
    -- 驗簽失敗的事件沒有 related_order_id，改以 payload 中的交易編號比對
    delete from public.commerce_webhook_events
    where related_order_id in (select id from public.commerce_orders where buyer_email = ${sqlLiteral(BUYER_EMAIL)})
       or raw_payload ->> 'merchant_trade_no' in (
            select p.merchant_trade_no from public.commerce_payments p
            join public.commerce_orders o on o.id = p.order_id where o.buyer_email = ${sqlLiteral(BUYER_EMAIL)})
       -- 驗簽失敗的事件沒有 related_order_id；付款單刪除後會變成孤兒，一併清掉
       or (provider = 'sandbox' and related_order_id is null and related_payment_id is null
           and not exists (select 1 from public.commerce_payments p
                           where p.merchant_trade_no = raw_payload ->> 'merchant_trade_no'));
    delete from public.commerce_payment_transactions where payment_id in (
      select p.id from public.commerce_payments p
      join public.commerce_orders o on o.id = p.order_id where o.buyer_email = ${sqlLiteral(BUYER_EMAIL)});
    delete from public.user_entitlements where order_id in (select id from public.commerce_orders where buyer_email = ${sqlLiteral(BUYER_EMAIL)});
    delete from public.commerce_payments where order_id in (select id from public.commerce_orders where buyer_email = ${sqlLiteral(BUYER_EMAIL)});
    delete from public.commerce_checkout_sessions where order_id in (select id from public.commerce_orders where buyer_email = ${sqlLiteral(BUYER_EMAIL)});
    delete from public.commerce_order_items where order_id in (select id from public.commerce_orders where buyer_email = ${sqlLiteral(BUYER_EMAIL)});
    delete from public.commerce_cart_items where cart_id in (select id from public.commerce_carts where session_token_hash = encode(sha256(convert_to(${sqlLiteral(CART_TOKEN)}, 'UTF8')), 'hex')
         or converted_order_id in (select id from public.commerce_orders where buyer_email = ${sqlLiteral(BUYER_EMAIL)}));
    delete from public.commerce_carts where session_token_hash = encode(sha256(convert_to(${sqlLiteral(CART_TOKEN)}, 'UTF8')), 'hex')
       or converted_order_id in (select id from public.commerce_orders where buyer_email = ${sqlLiteral(BUYER_EMAIL)});
    delete from public.commerce_orders where buyer_email = ${sqlLiteral(BUYER_EMAIL)};
  commit;`);
  // audit_logs 為 append-only（0012 trigger）：驗收自己產生的紀錄以 replica 模式清除
  psql(`begin;
    set local session_replication_role = replica;
    delete from public.audit_logs where action like 'commerce.%' and metadata ->> 'buyer_email' = ${sqlLiteral(BUYER_EMAIL)};
  commit;`);
};

let env;
try {
  env = getLocalSupabaseEnv();
  record(1, '本機 Supabase 可連線（只允許本專案 local stack）', true, `API ${env.apiUrl} · anon ${maskSecret(env.anonKey)}`);
} catch (error) {
  record(1, '本機 Supabase 可連線', false, error.message);
  report.finish('commerce-integration:verify');
}

const anonHeaders = { apikey: env.anonKey, Authorization: `Bearer ${env.anonKey}`, 'Content-Type': 'application/json' };
async function rpc(fn, body) {
  const response = await fetch(`${env.apiUrl}/rest/v1/rpc/${fn}`, { method: 'POST', headers: anonHeaders, body: JSON.stringify(body) });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: response.status, json, text };
}

const servers = [];
installSignalCleanup(servers);

try {
  cleanup();

  // -------------------------------------------------------------------------
  // 2. 目錄：只有可自助購買的商品與已啟用的付款方式
  // -------------------------------------------------------------------------
  const catalog = await rpc('get_purchasable_products', {});
  const methods = await rpc('get_enabled_payment_methods', {});
  const products = Array.isArray(catalog.json) ? catalog.json : (catalog.json?.products ?? []);
  const methodRows = Array.isArray(methods.json) ? methods.json : [];
  const realMoneyMethods = methodRows.filter((row) => row.provider !== 'sandbox');
  record(
    2,
    'anon 讀得到商品目錄與付款方式，且只有 sandbox 模擬付款被啟用',
    catalog.status === 200 && products.length > 0 && methodRows.length > 0 && realMoneyMethods.length === 0,
    `products=${products.length} methods=${methodRows.map((row) => `${row.method_key}:${row.provider}`).join(',')}`,
  );

  const priceIds = products.flatMap((product) => (product.prices ?? []).map((price) => ({ id: price.price_id, amountCents: Number(price.amount_cents ?? 0) })));
  if (priceIds.length < 2) throw new Error(`目錄中的可購買價格不足（${priceIds.length}），無法完成整合驗收`);
  const [priceA, priceB] = priceIds;
  const methodKey = methodRows[0].method_key;

  // -------------------------------------------------------------------------
  // 3–4. 加入購物車（只送 price id）
  // -------------------------------------------------------------------------
  await rpc('commerce_cart_add_item', { p_cart_token: CART_TOKEN, p_price_id: priceA.id, p_quantity: 2 });
  const cart = await rpc('commerce_cart_add_item', { p_cart_token: CART_TOKEN, p_price_id: priceB.id, p_quantity: 3 });
  const expectedSubtotal = priceA.amountCents * 2 + priceB.amountCents * 3;
  record(
    3,
    '加入購物車（只送 price id）：件數與小計都由伺服器依資料庫價格計算',
    cart.status === 200 && cart.json?.item_count === 5 && Number(cart.json?.subtotal_cents) === expectedSubtotal,
    `itemCount=${cart.json?.item_count} subtotal=${cart.json?.subtotal_cents} expected=${expectedSubtotal}`,
  );

  const otherToken = randomBytes(32).toString('hex');
  const otherCart = await rpc('commerce_cart_get', { p_cart_token: otherToken });
  record(
    4,
    '換一個 cart token 只會看到自己的（空）購物車，讀不到別人的內容',
    otherCart.status === 200 && Number(otherCart.json?.item_count ?? 0) === 0,
    `otherItemCount=${otherCart.json?.item_count ?? 0}`,
  );

  // -------------------------------------------------------------------------
  // 5–6. 建立訂單（含竄改測試）
  // -------------------------------------------------------------------------
  const created = await rpc('create_order_from_cart', {
    p_cart_token: CART_TOKEN,
    p_buyer: {
      name: '整合驗收',
      email: BUYER_EMAIL,
      phone: '0900000000',
      consent: true,
      // 以下欄位是刻意送出的竄改嘗試：伺服器必須完全忽略
      total_cents: 1,
      subtotal_cents: 1,
      amount_cents: 1,
      status: 'paid',
      payment_status: 'succeeded',
    },
    p_payment_method_key: methodKey,
  });
  const orderRow = psqlJson(`select json_build_object('id', o.id, 'number', o.order_number, 'total', o.total_cents, 'status', o.status::text,
      'payment_id', p.id, 'payment_status', p.status::text, 'payment_amount', p.amount_cents, 'trade_no', p.merchant_trade_no)
    from public.commerce_orders o join public.commerce_payments p on p.order_id = o.id
    where o.buyer_email = ${sqlLiteral(BUYER_EMAIL)} order by o.created_at desc limit 1`);
  record(
    5,
    '建立訂單：金額由伺服器重算（前端送來的 total_cents / status / payment_status 一律被忽略）',
    created.status === 200 && Boolean(orderRow) && Number(orderRow.total) === expectedSubtotal && orderRow.status === 'awaiting_payment' && orderRow.payment_status === 'pending',
    orderRow ? `total=${orderRow.total} expected=${expectedSubtotal} order=${orderRow.status} payment=${orderRow.payment_status}` : `建立失敗：${created.text.slice(0, 160)}`,
  );

  const receiptToken = created.json?.checkout_token ?? created.json?.public_token ?? created.json?.receipt_token ?? '';
  const codesBeforePayment = psqlJson(`select count(*) from public.access_codes where order_id = ${sqlLiteral(orderRow.id)}::uuid`);
  const cartAfterOrder = await rpc('commerce_cart_get', { p_cart_token: CART_TOKEN });
  record(
    6,
    '下單後購物車轉為已結單（新的購物車是空的），且付款前沒有發出任何權限代碼',
    Number(codesBeforePayment) === 0 && Number(cartAfterOrder.json?.item_count ?? 0) === 0 && receiptToken.length >= 32,
    `codes=${codesBeforePayment} cartItems=${cartAfterOrder.json?.item_count ?? 0} receiptToken=${receiptToken.length} chars`,
  );

  // -------------------------------------------------------------------------
  // 7. 收據：付款前查得到訂單、但沒有代碼；用錯 token 查不到
  // -------------------------------------------------------------------------
  {
    const receipt = await rpc('get_order_receipt', { p_public_token: receiptToken });
    const wrong = await rpc('get_order_receipt', { p_public_token: randomBytes(32).toString('hex') });
    record(
      7,
      '收據必須持有 token 才查得到（換一個 token 一律查不到），付款前不回傳任何權限代碼',
      receipt.json?.ok === true && (receipt.json?.access_codes ?? []).length === 0 && wrong.json?.ok === false,
      `ok=${receipt.json?.ok} codes=${(receipt.json?.access_codes ?? []).length} wrongToken=${wrong.json?.ok}`,
    );
  }

  // -------------------------------------------------------------------------
  // 8. 啟動後台（DATA_SOURCE=supabase + sandbox 開啟）
  // -------------------------------------------------------------------------
  // PUBLIC_SUPABASE_* 會在 build 時內嵌，所以必須以本機 Supabase 設定另外 build 一份，
  // 輸出到 apps/admin/.next-supabase，不覆蓋其他驗收使用的預設 mock build。
  const adminEnv = {
    ...appEnv(env),
    PAYMENT_SANDBOX_ENABLED: 'true',
    PAYMENT_SANDBOX_SECRET: SANDBOX_SECRET,
    SITE_PUBLIC_URL: 'http://127.0.0.1:4321',
    ADMIN_DIST_DIR: ADMIN_DIST,
  };
  // build 只需要 PUBLIC_*（會被內嵌）；service role 只在 next start 的 runtime env，不進 build output
  console.log(`\n[commerce-integration] $ pnpm --filter @syt/admin build  (DATA_SOURCE=supabase → ${ADMIN_DIST})`);
  const buildEnv = { ...process.env, ...adminEnv };
  delete buildEnv.SUPABASE_SERVICE_ROLE_KEY;
  const adminBuild = spawnSync('pnpm --filter @syt/admin build', { cwd: ROOT, shell: true, stdio: 'inherit', env: buildEnv });
  if (adminBuild.status !== 0) throw new Error('後台 build（DATA_SOURCE=supabase）失敗');
  const admin = await startAdminServer({ env: { ...adminEnv, SUPABASE_SERVICE_ROLE_KEY: env.serviceRoleKey } });
  servers.push(admin);
  record(8, '後台以本機 Supabase + Sandbox 模擬付款啟動（service role 只在伺服器端）', true, `${admin.url} · ${ADMIN_DIST} · sandbox secret ${maskSecret(SANDBOX_SECRET)}`);

  // -------------------------------------------------------------------------
  // 9. Sandbox 付款頁
  // -------------------------------------------------------------------------
  const sandboxUrl = `${admin.url}/api/payments/sandbox/${orderRow.payment_id}`;
  {
    const response = await fetch(sandboxUrl);
    const html = await response.text();
    const labelled = html.includes('本機 Sandbox 付款（模擬）') && html.includes('不會真的扣款');
    const noindex = (response.headers.get('x-robots-tag') ?? '').includes('noindex');
    const hasOutcomes = ['succeeded', 'failed', 'cancelled'].every((value) => html.includes(`value="${value}"`));
    record(
      9,
      'Sandbox 付款頁：可開啟、明確標示為模擬、noindex，且提供成功 / 失敗 / 取消三種結果',
      response.status === 200 && labelled && noindex && hasOutcomes,
      `status=${response.status} labelled=${labelled} noindex=${noindex} outcomes=${hasOutcomes}`,
    );
  }

  // -------------------------------------------------------------------------
  // 10. 偽造 webhook：簽章錯誤一律拒絕
  // -------------------------------------------------------------------------
  {
    const payments = await loadPaymentsBundle(REPORT_DIR);
    const adapter = new payments.SandboxPaymentProvider();
    const payload = adapter.buildCallbackPayload({ merchantTradeNo: orderRow.trade_no, amountCents: orderRow.payment_amount, outcome: 'succeeded' });
    const body = JSON.stringify(payload);
    const response = await fetch(`${admin.url}/api/payments/webhook/sandbox`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-sandbox-signature': 'f'.repeat(64) },
      body,
    });
    const json = await response.json().catch(() => ({}));
    const stillPending = psqlJson(`select to_json(status::text) from public.commerce_payments where id = ${sqlLiteral(orderRow.payment_id)}::uuid`);
    const invalidRecorded = psqlJson(`select count(*) from public.commerce_webhook_events where signature_valid = false`);
    record(
      10,
      '偽造簽章的 webhook 會被拒絕：付款狀態不變，只留下一筆 signature_valid = false 的紀錄',
      json.status === 'invalid_signature' && stillPending === 'pending' && Number(invalidRecorded) >= 1,
      `status=${json.status} paymentStatus=${stillPending} invalidEvents=${invalidRecorded}`,
    );
  }

  // -------------------------------------------------------------------------
  // 11–12. 模擬付款成功 → 發碼
  // -------------------------------------------------------------------------
  {
    const form = new URLSearchParams({ outcome: 'succeeded', return_base: 'http://127.0.0.1:4321' });
    const response = await fetch(sandboxUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      redirect: 'manual',
    });
    const location = response.headers.get('location') ?? '';
    const after = psqlJson(`select json_build_object('order', o.status::text, 'payment', p.status::text, 'paid_at', p.paid_at,
        'issued_at', o.entitlements_issued_at,
        'codes', (select count(*) from public.access_codes c where c.order_id = o.id))
      from public.commerce_orders o join public.commerce_payments p on p.order_id = o.id where o.id = ${sqlLiteral(orderRow.id)}::uuid`);
    record(
      11,
      '模擬付款成功：導向 /checkout/success，訂單轉為已完成、付款成功，並發出 5 組權限代碼（數量 2 + 3）',
      response.status === 303 && location.includes('/checkout/success') && after.payment === 'succeeded' && ['paid', 'fulfilled'].includes(after.order) && Number(after.codes) === 5,
      `status=${response.status} location=${location} order=${after.order} payment=${after.payment} codes=${after.codes}`,
    );
    record(
      12,
      '權限代碼不出現在導向網址上（只透過收據 token 取得）',
      !/[?&](?:code|access_code|token)=/.test(location) && !/SYT-[A-Z]+-\d{4}-[A-Z0-9]{6}/.test(location),
      location,
    );
  }

  // -------------------------------------------------------------------------
  // 13. 重送同一個回調 → 冪等
  // -------------------------------------------------------------------------
  {
    const payments = await loadPaymentsBundle(REPORT_DIR);
    const adapter = new payments.SandboxPaymentProvider();
    // 同一個 event_id 送兩次：第一次測「訂單已發過碼」的守門，第二次測 webhook idempotency_key
    const payload = adapter.buildCallbackPayload({ merchantTradeNo: orderRow.trade_no, amountCents: orderRow.payment_amount, outcome: 'succeeded' });
    const { body, signature } = adapter.signPayload(payload);
    const post = () =>
      fetch(`${admin.url}/api/payments/webhook/sandbox`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-sandbox-signature': signature },
        body,
      }).then((response) => response.json().catch(() => ({})));
    const first = await post();
    const second = await post();
    const codes = psqlJson(`select count(*) from public.access_codes where order_id = ${sqlLiteral(orderRow.id)}::uuid`);
    record(
      13,
      '重送付款回調：訂單已發過碼不會再發，完全相同的事件再被判定為重複（仍是 5 組代碼）',
      Number(codes) === 5 && ['duplicate', 'processed'].includes(first.status) && first.changed === false && second.status === 'duplicate' && second.changed === false,
      `first=${first.status}/${first.changed} second=${second.status}/${second.changed} codes=${codes}`,
    );
  }

  // -------------------------------------------------------------------------
  // 14. 付款後的收據
  // -------------------------------------------------------------------------
  {
    const receipt = await rpc('get_order_receipt', { p_public_token: receiptToken });
    const codes = receipt.json?.access_codes ?? [];
    const allTestPrice = (receipt.json?.items ?? []).every((item) => item.test_price === true);
    record(
      14,
      '付款後憑收據 token 取得完整權限代碼，且品項標示為測試價格',
      receipt.json?.ok === true && codes.length === 5 && codes.every((item) => typeof item.code === 'string' && item.code.length > 0) && allTestPrice,
      `ok=${receipt.json?.ok} codes=${codes.length} testPrice=${allTestPrice}`,
    );
  }

  // -------------------------------------------------------------------------
  // 15. 後台訂單明細：代碼只顯示遮罩後的值
  // -------------------------------------------------------------------------
  {
    const fullCodes = psqlJson(`select coalesce(json_agg(code), '[]'::json) from public.access_codes where order_id = ${sqlLiteral(orderRow.id)}::uuid`) ?? [];
    const { loadDatabaseBundle } = await import('./lib/database-bundle.mjs');
    const db = await loadDatabaseBundle(REPORT_DIR);
    const masked = fullCodes.map((code) => db.maskAccessCode(code));
    const leaks = masked.filter((value, index) => value === fullCodes[index] || !value.includes('•'));
    record(
      15,
      '後台訂單明細只顯示遮罩後的權限代碼（完整代碼不離開資料庫）',
      fullCodes.length === 5 && leaks.length === 0,
      leaks.length ? `未遮罩 ${leaks.length} 組` : `${masked[0]}（共 ${masked.length} 組）`,
    );
  }

  // -------------------------------------------------------------------------
  // 16. Audit：有完整軌跡，且不含密鑰或完整代碼
  // -------------------------------------------------------------------------
  {
    const actions = psqlJson(`select coalesce(json_agg(distinct action order by action), '[]'::json) from public.audit_logs
      where action like 'commerce.%' and created_at > now() - interval '10 minutes'`) ?? [];
    const leaks = psqlJson(`select count(*) from public.audit_logs
      where action like 'commerce.%'
        and (metadata::text ~* '(hash_?key|hash_?iv|channel_?secret|sandbox_secret|service_role)'
          or metadata::text ~ 'SYT-[A-Z]+-[0-9]{4}-[A-Z0-9]{6}'
          or metadata::text like ${sqlLiteral(`%${SANDBOX_SECRET}%`)})`);
    const expected = ['commerce.order.created', 'commerce.payment.created', 'commerce.payment.succeeded', 'commerce.entitlement.issued'];
    const missing = expected.filter((action) => !actions.includes(action));
    record(
      16,
      'Audit 軌跡完整（建立訂單 / 建立付款 / 付款成功 / 發放權限），且不含密鑰或完整代碼',
      missing.length === 0 && Number(leaks) === 0,
      missing.length ? `缺少：${missing.join(',')}` : `${actions.length} actions · leaks=${leaks}`,
    );
  }
} catch (error) {
  record(99, '整合流程執行完成（無未預期錯誤）', false, error instanceof Error ? `${error.name}: ${error.message.slice(0, 300)}` : String(error));
} finally {
  await stopAll(servers);
  try {
    cleanup();
  } catch (error) {
    console.error('[commerce-integration] cleanup failed:', error instanceof Error ? error.message : error);
  }
}

report.finish('commerce-integration:verify');
