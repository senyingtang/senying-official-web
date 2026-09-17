import { NextResponse, type NextRequest } from 'next/server';
import { formatMoneyFromCents } from '@syt/shared';
import { getSandboxAdapter, sandboxEnabled } from '@/lib/payments/providers';
import { getSandboxPaymentContext, handleProviderCallback } from '@/lib/payments/service';
import { resolveStorefrontOrigin } from '@/lib/payments/storefront';

/**
 * 本機 Sandbox 模擬付款頁（Phase 3.0）。
 *
 * ⚠️ 只在 PAYMENT_SANDBOX_ENABLED=true 時開放；正式環境一律回 404。
 * 這裡不會向任何金流機構請款，也不會真的扣款。
 * 送出後由伺服器建立一個帶簽章的 callback，走與正式 provider 完全相同的 webhook 流程
 * （驗簽 → commerce_webhook_events 冪等 → mark_payment_success_and_issue_entitlement）。
 */

export const dynamic = 'force-dynamic';

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function notFound(): NextResponse {
  return new NextResponse('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' } });
}

function page(body: string): NextResponse {
  return new NextResponse(
    `<!doctype html><html lang="zh-Hant-TW"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">` +
      `<meta name="robots" content="noindex, nofollow"><title>本機 Sandbox 付款（模擬）</title>` +
      `<style>
        :root { color-scheme: light; }
        body { margin:0; font-family: "Noto Sans TC", system-ui, sans-serif; background:#f8fafc; color:#111827; }
        main { max-width: 560px; margin: 0 auto; padding: 24px 16px 48px; }
        .card { background:#fff; border:1px solid #e2e8f0; border-radius:20px; padding:20px; box-shadow:0 12px 30px rgb(15 23 42 / 0.06); }
        .warn { background:#fffbeb; border:1px solid #fcd34d; border-radius:12px; padding:12px 14px; font-size:14px; line-height:1.7; }
        h1 { font-size:20px; margin:16px 0 4px; }
        dl { display:grid; grid-template-columns: 7rem 1fr; gap:8px 12px; font-size:14px; margin:16px 0 0; }
        dt { color:#64748b; } dd { margin:0; font-weight:600; word-break:break-all; }
        form { margin-top:20px; display:grid; gap:10px; }
        button { min-height:48px; border-radius:12px; border:0; font-size:16px; font-weight:700; cursor:pointer; }
        .ok { background:#14b8a6; color:#04121f; } .no { background:#fff; border:1px solid #e2e8f0; color:#111827; }
        .muted { color:#64748b; font-size:12px; line-height:1.7; margin-top:16px; }
      </style></head><body><main>${body}</main></body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' } },
  );
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ paymentId: string }> }) {
  if (!sandboxEnabled()) return notFound();
  const { paymentId } = await params;
  const context = await getSandboxPaymentContext(paymentId);
  if (!context || context.provider !== 'sandbox') return notFound();

  const origin = resolveStorefrontOrigin(request.nextUrl.searchParams.get('return_base'));
  const done = context.status !== 'pending' && context.status !== 'processing';

  return page(
    `<div class="warn"><strong>本機 Sandbox 付款（模擬）</strong><br>這不是真實交易：不會真的扣款，也不會向任何金流機構請款。只有本機驗收環境才看得到這一頁。</div>
     <div class="card" style="margin-top:16px">
       <h1>模擬付款</h1>
       <dl>
         <dt>訂單編號</dt><dd>${escapeHtml(context.orderNumber)}</dd>
         <dt>交易編號</dt><dd>${escapeHtml(context.merchantTradeNo)}</dd>
         <dt>金額</dt><dd>${escapeHtml(formatMoneyFromCents(context.amountCents, context.currency))}<span style="font-weight:400;color:#64748b"> · 測試價格</span></dd>
         <dt>目前狀態</dt><dd>${escapeHtml(context.status)}</dd>
       </dl>
       ${
         done
           ? `<p class="muted">這筆付款已經處理過（${escapeHtml(context.status)}），不會重複送出。</p>`
           : `<form method="post" data-sandbox-form>
                <input type="hidden" name="return_base" value="${escapeHtml(origin)}">
                <button class="ok" type="submit" name="outcome" value="succeeded" data-outcome="succeeded">模擬付款成功</button>
                <button class="no" type="submit" name="outcome" value="failed" data-outcome="failed">模擬付款失敗</button>
                <button class="no" type="submit" name="outcome" value="cancelled" data-outcome="cancelled">模擬取消付款</button>
              </form>`
       }
       <p class="muted">送出後會產生一個帶簽章的通知，走與正式金流相同的 webhook 流程（驗簽 → 冪等紀錄 → 發放權限）。</p>
     </div>`,
  );
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ paymentId: string }> }) {
  if (!sandboxEnabled()) return notFound();
  const { paymentId } = await params;
  const context = await getSandboxPaymentContext(paymentId);
  if (!context || context.provider !== 'sandbox') return notFound();

  const form = await request.formData();
  const outcomeRaw = String(form.get('outcome') ?? '');
  const outcome = outcomeRaw === 'succeeded' || outcomeRaw === 'failed' || outcomeRaw === 'cancelled' ? outcomeRaw : 'failed';
  const origin = resolveStorefrontOrigin(String(form.get('return_base') ?? ''));

  const adapter = getSandboxAdapter();
  const payload = adapter.buildCallbackPayload({ merchantTradeNo: context.merchantTradeNo, amountCents: context.amountCents, outcome });
  const { body, signature } = adapter.signPayload(payload);
  const result = await handleProviderCallback('sandbox', { body, headers: { 'x-sandbox-signature': signature }, query: {} });

  const target = result.outcome === 'succeeded' && (result.status === 'processed' || result.status === 'duplicate') ? '/checkout/success' : '/checkout/failed';
  return NextResponse.redirect(`${origin}${target}?sandbox=${outcome}`, { status: 303, headers: { 'Cache-Control': 'no-store' } });
}
