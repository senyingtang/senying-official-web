// Phase 3.0 金流安全驗收（不連資料庫、不啟動伺服器）
//
// 驗收重點（對應 Phase 3.0 指令的禁止事項）：
//   - .env.example 不可出現任何正式金流值；repo 內不可出現正式 Merchant ID / HashKey / HashIV / Channel Secret
//   - 沒有憑證的 provider 一律「未設定」，不可 fallback 成假成功
//   - 前台不可決定付款成功、不可自行發 access code、不可信任前端價格
//   - 不自建信用卡表單、不儲存卡號 / CVV
//   - 金額一律整數（minor units），不可使用 float
//   - webhook 必須驗簽 + 冪等
//
// 用法：pnpm payment:verify
import path from 'node:path';
import { loadPaymentsBundle } from './lib/payments-bundle.mjs';
import { ADMIN_DIR, MARKETING_DIR, ROOT } from './lib/servers.mjs';
import { createReport, read, rel, walk } from './lib/static-site.mjs';

const report = createReport('Phase 3.0 payment verify（金流安全邊界）');
const { record } = report;
const REPORT_DIR = path.join(ROOT, '.phase30-report');

const PAYMENTS_DIR = path.join(ADMIN_DIR, 'src', 'lib', 'payments');
const paymentsFiles = walk(PAYMENTS_DIR);
const apiPaymentsDir = path.join(ADMIN_DIR, 'src', 'app', 'api', 'payments');
const apiFiles = walk(apiPaymentsDir);
const sourceFiles = [...walk(path.join(ADMIN_DIR, 'src')), ...walk(path.join(MARKETING_DIR, 'src')), ...walk(path.join(ROOT, 'packages'))].filter(
  (file) => /\.(ts|tsx|astro|mjs)$/.test(file) && !file.includes('node_modules'),
);

// ---------------------------------------------------------------------------
// 1–3. 環境變數與密鑰
// ---------------------------------------------------------------------------
{
  const envExample = read(path.join(ROOT, '.env.example'));
  const REQUIRED_EMPTY = [
    'EC_PAY_MERCHANT_ID',
    'EC_PAY_HASH_KEY',
    'EC_PAY_HASH_IV',
    'EC_PAY_ENVIRONMENT',
    'LINE_PAY_CHANNEL_ID',
    'LINE_PAY_CHANNEL_SECRET',
    'LINE_PAY_ENVIRONMENT',
    'PAYMENT_SANDBOX_ENABLED',
    'PAYMENT_SANDBOX_SECRET',
  ];
  const filled = REQUIRED_EMPTY.filter((key) => {
    const line = envExample.split(/\r?\n/).find((item) => item.startsWith(`${key}=`));
    return line === undefined || line.trim() !== `${key}=`;
  });
  record(1, `.env.example 的金流欄位全部保持空白（${REQUIRED_EMPTY.length} 個）`, filled.length === 0, filled.join(', ') || REQUIRED_EMPTY.join(' / '));
}

{
  // 正式金流憑證的形狀：綠界 MerchantID 是 7–10 位數字、HashKey / HashIV 是 16 碼英數
  const SECRET_SHAPES = [
    ['ECPay MerchantID', /\b(?:MerchantID|EC_PAY_MERCHANT_ID)\s*[:=]\s*['"]\d{7,10}['"]/],
    ['ECPay HashKey/IV', /\b(?:HashKey|HashIV|EC_PAY_HASH_(?:KEY|IV))\s*[:=]\s*['"][A-Za-z0-9]{16,}['"]/],
    ['LINE Pay Channel', /\bLINE_PAY_CHANNEL_(?:ID|SECRET)\s*[:=]\s*['"][A-Za-z0-9]{8,}['"]/],
    ['Sandbox secret', /\bPAYMENT_SANDBOX_SECRET\s*[:=]\s*['"][^'"]{8,}['"]/],
  ];
  const hits = [];
  for (const file of [...sourceFiles, path.join(ROOT, '.env.example')]) {
    const content = read(file);
    for (const [label, pattern] of SECRET_SHAPES) if (pattern.test(content)) hits.push(`${rel(file)} (${label})`);
  }
  record(2, '原始碼與 .env.example 沒有寫死的金流憑證（Merchant ID / HashKey / HashIV / Channel Secret）', hits.length === 0, hits.slice(0, 3).join(' | ') || `${sourceFiles.length} files clean`);
}

{
  // 正式金流網域只能出現在 provider adapter 內（做為 formAction），不可出現在前台
  const marketingHits = walk(path.join(MARKETING_DIR, 'src'))
    .filter((file) => /(payment\.ecpay\.com\.tw|api-pay\.line\.me)/.test(read(file)))
    .map(rel);
  record(3, '前台（apps/marketing）不直接連任何金流網域', marketingHits.length === 0, marketingHits.join(', ') || 'clean');
}

// ---------------------------------------------------------------------------
// 4–8. Provider adapter 行為
// ---------------------------------------------------------------------------
const payments = await loadPaymentsBundle(REPORT_DIR);

function withEnv(values, fn) {
  const saved = {};
  for (const [key, value] of Object.entries(values)) {
    saved[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

const CLEARED = {
  EC_PAY_MERCHANT_ID: undefined,
  EC_PAY_HASH_KEY: undefined,
  EC_PAY_HASH_IV: undefined,
  EC_PAY_ENVIRONMENT: undefined,
  LINE_PAY_CHANNEL_ID: undefined,
  LINE_PAY_CHANNEL_SECRET: undefined,
  LINE_PAY_ENVIRONMENT: undefined,
  PAYMENT_SANDBOX_ENABLED: undefined,
  PAYMENT_SANDBOX_SECRET: undefined,
};

const context = {
  paymentId: '00000000-0000-4000-8000-000000000001',
  orderId: '00000000-0000-4000-8000-000000000002',
  orderNumber: 'SYT-TEST-0001',
  merchantTradeNo: 'SYTTEST0001',
  amountCents: 100000,
  currency: 'TWD',
  buyerEmail: 'payment-check@syt-local.test',
  returnUrl: 'http://localhost:4321/checkout/success',
  notifyUrl: 'http://localhost:3000/api/payments/webhook/sandbox',
};

{
  const ecpay = new payments.EcpayPaymentProvider();
  const result = await withEnv(CLEARED, () => ({ availability: ecpay.availability(), create: ecpay.createPayment(context) }));
  const created = await result.create;
  record(
    4,
    '綠界未設定憑證時顯示「未設定」，createPayment 直接失敗（不 fallback 成假成功）',
    result.availability.configured === false && created.ok === false && !('formAction' in created),
    `configured=${result.availability.configured} ok=${created.ok} reason=${created.reason}`,
  );
}

{
  const linepay = new payments.LinePayPaymentProvider();
  const result = await withEnv(CLEARED, () => ({ availability: linepay.availability(), create: linepay.createPayment(context) }));
  const created = await result.create;
  record(
    5,
    'LINE Pay 未設定憑證時顯示「未設定」，createPayment 直接失敗（不 fallback 成假成功）',
    result.availability.configured === false && created.ok === false && !('redirectUrl' in created),
    `configured=${result.availability.configured} ok=${created.ok} reason=${created.reason}`,
  );
}

{
  const sandbox = new payments.SandboxPaymentProvider();
  const off = withEnv(CLEARED, () => sandbox.availability());
  const noSecret = withEnv({ ...CLEARED, PAYMENT_SANDBOX_ENABLED: 'true' }, () => sandbox.availability());
  const shortSecret = withEnv({ ...CLEARED, PAYMENT_SANDBOX_ENABLED: 'true', PAYMENT_SANDBOX_SECRET: 'short' }, () => sandbox.availability());
  const on = withEnv({ ...CLEARED, PAYMENT_SANDBOX_ENABLED: 'true', PAYMENT_SANDBOX_SECRET: 'a'.repeat(32) }, () => sandbox.availability());
  record(
    6,
    'Sandbox 只有在 PAYMENT_SANDBOX_ENABLED=true 且 secret ≥ 16 字元時才啟用，且永遠標示為模擬',
    off.configured === false && noSecret.configured === false && shortSecret.configured === false && on.configured === true && on.isSimulation === true && on.environment === 'sandbox',
    `off=${off.configured} noSecret=${noSecret.configured} short=${shortSecret.configured} on=${on.configured} isSimulation=${on.isSimulation}`,
  );
}

{
  // 綠界官方文件範例（AioCheckOut V5）：以固定參數驗證 CheckMacValue 實作
  const params = {
    MerchantID: '2000132',
    MerchantTradeNo: 'Test1234567890',
    MerchantTradeDate: '2020/01/01 00:00:00',
    PaymentType: 'aio',
    TotalAmount: '1000',
    TradeDesc: 'test',
    ItemName: 'item',
    ReturnURL: 'https://example.test/return',
    ChoosePayment: 'Credit',
    EncryptType: '1',
  };
  const hashKey = '5294y06JbISpM5x9';
  const hashIv = 'v77hoKGq4kWxNNIS';
  const mac = payments.ecpayCheckMacValue(params, hashKey, hashIv);
  const signed = { ...params, CheckMacValue: mac };
  const valid = payments.verifyEcpayCheckMacValue(signed, hashKey, hashIv);
  const tampered = payments.verifyEcpayCheckMacValue({ ...signed, TotalAmount: '1' }, hashKey, hashIv);
  const wrongKey = payments.verifyEcpayCheckMacValue(signed, 'x'.repeat(16), hashIv);
  record(
    7,
    'CheckMacValue：SHA256 大寫、可驗證、竄改金額或換金鑰都會失敗',
    /^[0-9A-F]{64}$/.test(mac) && valid === true && tampered === false && wrongKey === false,
    `mac=${mac.slice(0, 12)}… valid=${valid} tampered=${tampered} wrongKey=${wrongKey}`,
  );
}

{
  const secret = 'b'.repeat(32);
  const payload = JSON.stringify({ payment_id: context.paymentId, outcome: 'succeeded', amount_cents: 100000 });
  const signature = payments.sandboxSignature(secret, payload);
  const ok = payments.verifySandboxSignature(secret, payload, signature);
  const tampered = payments.verifySandboxSignature(secret, payload.replace('100000', '1'), signature);
  const wrongSecret = payments.verifySandboxSignature('c'.repeat(32), payload, signature);
  const emptySecret = payments.verifySandboxSignature('', payload, signature);
  record(
    8,
    'Sandbox callback 必須帶簽章：竄改 payload、換 secret 或空 secret 都會被拒',
    ok === true && tampered === false && wrongSecret === false && emptySecret === false,
    `ok=${ok} tampered=${tampered} wrongSecret=${wrongSecret} emptySecret=${emptySecret}`,
  );
}

{
  const linePaySecret = 'd'.repeat(32);
  const body = JSON.stringify({ amount: 1000 });
  const nonce = 'nonce-1';
  const uri = '/v3/payments/request';
  const signature = payments.linePaySignature(linePaySecret, uri, body, nonce);
  const ok = payments.verifyLinePaySignature(linePaySecret, uri, body, nonce, signature);
  const tampered = payments.verifyLinePaySignature(linePaySecret, uri, JSON.stringify({ amount: 1 }), nonce, signature);
  record(9, 'LINE Pay 簽章可驗證，竄改 body 會失敗', ok === true && tampered === false, `ok=${ok} tampered=${tampered}`);
}

{
  const a = 'a'.repeat(64);
  const equal = payments.safeCompare(a, a);
  const different = payments.safeCompare(a, 'b'.repeat(64));
  const lengthMismatch = payments.safeCompare(a, 'a');
  const signatures = read(path.join(PAYMENTS_DIR, 'signatures.ts'));
  record(
    10,
    '簽章比對使用 timingSafeEqual（不是 === 直接比字串）',
    equal === true && different === false && lengthMismatch === false && signatures.includes('timingSafeEqual'),
    `equal=${equal} different=${different} lengthMismatch=${lengthMismatch}`,
  );
}

// ---------------------------------------------------------------------------
// 11–16. 原始碼安全邊界
// ---------------------------------------------------------------------------
{
  const service = read(path.join(PAYMENTS_DIR, 'service.ts'));
  const hasIdempotency = /idempotency_key/.test(service) && /23505/.test(service);
  // 比對實際程式碼的位置（檔頭註解也會提到 RPC 名稱，所以指定呼叫的寫法）
  const verifiesFirst = service.indexOf('await adapter.verifyCallback') < service.indexOf("rpc('mark_payment_success_and_issue_entitlement'");
  record(
    11,
    'Webhook：先驗簽再處理，並以 commerce_webhook_events.idempotency_key 做冪等（重複回調不重發代碼）',
    hasIdempotency && verifiesFirst && /signatureValid/.test(service),
    `idempotency=${hasIdempotency} verifyBeforeIssue=${verifiesFirst}`,
  );
}

{
  // 付款成功只能由「已驗簽的 provider 回調」觸發，不能由 request body / query 直接決定
  const CLIENT_DECIDES = [
    /searchParams\.get\(['"](?:status|outcome|paid|success)['"]\)/,
    /body\.(?:status|paid|success)\s*===\s*['"](?:succeeded|paid|true)['"]/,
  ];
  const hits = [];
  for (const file of [...paymentsFiles, ...apiFiles]) {
    const content = read(file);
    for (const pattern of CLIENT_DECIDES) if (pattern.test(content)) hits.push(rel(file));
  }
  const storefrontIssues = walk(path.join(MARKETING_DIR, 'src'))
    .filter((file) => /mark_payment_success_and_issue_entitlement|issue_access_code|entitlement_access_codes/.test(read(file)))
    .map(rel);
  record(
    12,
    '前台不能決定付款成功、也不能發放權限代碼（只有已驗簽的回調可以）',
    hits.length === 0 && storefrontIssues.length === 0,
    [...hits, ...storefrontIssues].join(', ') || 'clean',
  );
}

{
  // 不自建信用卡表單：全站原始碼不可出現卡號 / CVV 欄位
  const CARD_FIELD = /\b(?:name|id|autoComplete|autocomplete)=["'][^"']*(?:cc-number|cc-csc|card[-_]?number|cardnumber|cvv|cvc|security[-_]?code)[^"']*["']/i;
  const CARD_COLUMN = /\b(?:card_number|cardNumber|card_no|cvv|cvc|security_code)\b\s*[:=]/;
  const hits = sourceFiles.filter((file) => CARD_FIELD.test(read(file)) || CARD_COLUMN.test(read(file))).map(rel);
  record(13, '沒有自建信用卡表單，也沒有卡號 / CVV 欄位或欄位名稱', hits.length === 0, hits.slice(0, 3).join(', ') || `${sourceFiles.length} files clean`);
}

{
  // 金額一律整數 minor units：不可出現 parseFloat / toFixed(2) 處理金額
  const FLOAT_MONEY = /(?:parseFloat|Number\.parseFloat)\s*\([^)]*(?:amount|price|total)/i;
  const TO_FIXED = /\b(?:amount|price|total)[A-Za-z]*\s*\.toFixed\(/i;
  const hits = sourceFiles.filter((file) => {
    const content = read(file);
    return FLOAT_MONEY.test(content) || TO_FIXED.test(content);
  }).map(rel);
  const commerce = read(path.join(ROOT, 'packages', 'database', 'src', 'commerce.ts'));
  const usesCents = /amountCents|totalCents|subtotalCents/.test(commerce);
  record(14, '金額一律以整數 cents 處理（沒有 parseFloat / toFixed 的金額運算）', hits.length === 0 && usesCents, hits.slice(0, 3).join(', ') || 'amountCents / totalCents');
}

{
  const sandboxRoute = read(path.join(apiPaymentsDir, 'sandbox', '[paymentId]', 'route.ts'));
  const webhookRoute = read(path.join(apiPaymentsDir, 'webhook', '[provider]', 'route.ts'));
  const guarded = /if \(!sandboxEnabled\(\)\) return notFound\(\);/.test(sandboxRoute);
  const labelled = sandboxRoute.includes('本機 Sandbox 付款（模擬）') && sandboxRoute.includes('不會真的扣款');
  const noindex = /X-Robots-Tag/.test(sandboxRoute) && /noindex/.test(sandboxRoute);
  const webhookUsesService = /handleProviderCallback/.test(webhookRoute);
  record(
    15,
    'Sandbox 付款頁：未啟用時 404、明確標示模擬、noindex；webhook 走同一條驗簽流程',
    guarded && labelled && noindex && webhookUsesService,
    `guarded=${guarded} labelled=${labelled} noindex=${noindex} webhook=${webhookUsesService}`,
  );
}

{
  // 記錄到 audit / webhook payload 前必須先過濾：不可記 secret / 卡號 / 完整 access code
  const types = read(path.join(PAYMENTS_DIR, 'types.ts'));
  const service = read(path.join(PAYMENTS_DIR, 'service.ts'));
  const sanitizes = /export function sanitizePayload/.test(types);
  const redactKeys = /CheckMacValue|HashKey|HashIV|secret|signature/i.test(types);
  const sample = payments.sanitizePayload({
    MerchantTradeNo: 'SYTTEST0001',
    CheckMacValue: 'A'.repeat(64),
    hashKey: 'should-not-appear',
    channelSecret: 'should-not-appear',
    accessCode: 'SYT-SEO-2026-A8K3Q9',
    TradeAmt: '1000',
  });
  const serialized = JSON.stringify(sample);
  const leaks = ['should-not-appear', 'SYT-SEO-2026-A8K3Q9', 'A'.repeat(64)].filter((value) => serialized.includes(value));
  const auditNoCode = !/metadata:\s*\{[^}]*\bcode\b\s*:/.test(service);
  record(
    16,
    'Webhook payload 與 audit log 不記錄密鑰、簽章或完整權限代碼',
    sanitizes && redactKeys && leaks.length === 0 && auditNoCode,
    leaks.length ? `外洩：${leaks.join(', ')}` : serialized.slice(0, 120),
  );
}

report.finish('payment:verify');
