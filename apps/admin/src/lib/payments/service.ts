import 'server-only';
import { createHash } from 'node:crypto';
import { getServiceRoleSupabase } from '@/lib/supabase/service-role';
import { getPaymentAdapter } from './providers';
import type { PaymentOutcome } from './types';

/**
 * 付款 callback 處理（Phase 3.0）。
 *
 * 這是**唯一**能把訂單標記為已付款的路徑：
 *   provider callback → 驗簽 → 寫入 commerce_webhook_events（idempotency_key 唯一）
 *   → mark_payment_success_and_issue_entitlement（SECURITY DEFINER，冪等發碼）
 *
 * 瀏覽器不能直接呼叫任何一步：service role 只存在伺服器端，且 `server-only` 保證不會進入 bundle。
 */

export type CallbackResultStatus =
  | 'processed'
  | 'duplicate'
  | 'invalid_signature'
  | 'unknown_provider'
  | 'payment_not_found'
  | 'failed_recorded'
  | 'error';

export interface CallbackResult {
  status: CallbackResultStatus;
  httpStatus: number;
  message: string;
  orderId?: string;
  paymentId?: string;
  outcome?: PaymentOutcome;
  /** true：這次呼叫真的改變了狀態（重送時為 false） */
  changed: boolean;
}

export interface RawCallback {
  body: string;
  headers: Record<string, string>;
  query: Record<string, string>;
}

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

/** audit log：只記錄識別碼與金額，不記錄密鑰、卡號或完整權限代碼 */
async function writeAudit(
  supabase: ReturnType<typeof getServiceRoleSupabase>,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from('audit_logs').insert({
    actor_id: null,
    actor_type: 'webhook',
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata: { ...metadata, recorded_at: new Date().toISOString() },
  });
  if (error) console.error(`[payments.audit] ${action} failed (code=${error.code ?? 'unknown'})`);
}

export async function handleProviderCallback(provider: string, raw: RawCallback): Promise<CallbackResult> {
  const adapter = getPaymentAdapter(provider);
  if (!adapter) return { status: 'unknown_provider', httpStatus: 404, message: 'unknown payment provider', changed: false };

  const verified = await adapter.verifyCallback(raw);
  const supabase = getServiceRoleSupabase();
  const environment = adapter.availability().environment;

  // 驗簽失敗：留下紀錄但絕不處理付款
  if (!verified.signatureValid) {
    await supabase.from('commerce_webhook_events').insert({
      provider,
      environment,
      event_type: 'payment_notify',
      provider_event_id: verified.providerEventId || null,
      idempotency_key: `${provider}:invalid:${sha256(raw.body)}`,
      request_path: `/api/payments/webhook/${provider}`,
      payload_sha256: sha256(raw.body),
      signature_valid: false,
      signature_checked_at: new Date().toISOString(),
      processing_status: 'failed',
      error_message: verified.reason ?? 'signature verification failed',
      headers_sanitized: {},
    });
    return { status: 'invalid_signature', httpStatus: 400, message: verified.reason ?? 'signature verification failed', changed: false };
  }

  if (!verified.providerEventId || !verified.merchantTradeNo) {
    return { status: 'error', httpStatus: 400, message: 'callback is missing event id or trade number', changed: false };
  }

  // Webhook idempotency：同一個 provider event 只會處理一次
  const idempotencyKey = `${provider}:${verified.providerEventId}`;
  const inserted = await supabase
    .from('commerce_webhook_events')
    .insert({
      provider,
      environment,
      event_type: 'payment_notify',
      provider_event_id: verified.providerEventId,
      idempotency_key: idempotencyKey,
      request_path: `/api/payments/webhook/${provider}`,
      raw_payload: verified.sanitizedPayload,
      payload_sha256: sha256(raw.body),
      signature_valid: true,
      signature_checked_at: new Date().toISOString(),
      processing_status: 'processing',
      processing_attempts: 1,
      headers_sanitized: {},
    })
    .select('id')
    .maybeSingle();

  if (inserted.error) {
    if (inserted.error.code === '23505') {
      return { status: 'duplicate', httpStatus: 200, message: 'event already processed', changed: false };
    }
    console.error(`[payments.callback] webhook insert failed (code=${inserted.error.code ?? 'unknown'})`);
    return { status: 'error', httpStatus: 500, message: 'failed to record webhook event', changed: false };
  }
  const webhookEventId = String(inserted.data?.id ?? '');

  const finish = async (status: string, errorMessage: string | null, related: { orderId?: string; paymentId?: string }) => {
    await supabase
      .from('commerce_webhook_events')
      .update({
        processing_status: status,
        processed_at: new Date().toISOString(),
        error_message: errorMessage,
        related_order_id: related.orderId ?? null,
        related_payment_id: related.paymentId ?? null,
      })
      .eq('id', webhookEventId);
  };

  // 以 merchant_trade_no 找付款單（provider 回傳的金額只用於比對，不決定金額）
  const paymentRow = await supabase
    .from('commerce_payments')
    .select('id, order_id, amount_cents, status, provider')
    .eq('merchant_trade_no', verified.merchantTradeNo)
    .maybeSingle();

  if (paymentRow.error || !paymentRow.data) {
    await finish('failed', 'payment not found', {});
    return { status: 'payment_not_found', httpStatus: 404, message: 'payment not found for merchant trade no', changed: false };
  }
  const payment = paymentRow.data as { id: string; order_id: string; amount_cents: number; status: string; provider: string };

  // 金額不符：不處理（避免 provider 端被竄改的通知）
  if (verified.amountCents !== null && Number(verified.amountCents) !== Number(payment.amount_cents)) {
    await finish('failed', 'amount mismatch', { orderId: payment.order_id, paymentId: payment.id });
    await writeAudit(supabase, 'commerce.payment.failed', 'commerce_payments', payment.id, {
      order_id: payment.order_id,
      provider,
      reason: 'amount_mismatch',
      expected_amount_cents: payment.amount_cents,
      reported_amount_cents: verified.amountCents,
    });
    return { status: 'error', httpStatus: 400, message: 'amount mismatch', changed: false };
  }

  if (verified.outcome === 'succeeded') {
    const result = await supabase.rpc('mark_payment_success_and_issue_entitlement', {
      order_id: payment.order_id,
      payment_id: payment.id,
      provider_trade_no: verified.providerTradeNo,
      note: `${provider} callback`,
    });
    if (result.error) {
      await finish('failed', result.error.message.slice(0, 200), { orderId: payment.order_id, paymentId: payment.id });
      console.error(`[payments.callback] mark_paid failed (code=${result.error.code ?? 'unknown'})`);
      return { status: 'error', httpStatus: 500, message: 'failed to mark payment as paid', changed: false };
    }
    const payload = (result.data ?? {}) as { already_processed?: boolean; access_codes?: unknown[] };
    const alreadyProcessed = payload.already_processed === true;
    await finish('processed', null, { orderId: payment.order_id, paymentId: payment.id });
    if (!alreadyProcessed) {
      await writeAudit(supabase, 'commerce.payment.succeeded', 'commerce_payments', payment.id, {
        order_id: payment.order_id,
        provider,
        environment,
        amount_cents: payment.amount_cents,
        currency: 'TWD',
      });
      // 只記錄發放數量，不記錄任何權限代碼內容
      await writeAudit(supabase, 'commerce.entitlement.issued', 'commerce_orders', payment.order_id, {
        payment_id: payment.id,
        provider,
        access_code_count: Array.isArray(payload.access_codes) ? payload.access_codes.length : 0,
      });
    }
    return {
      status: alreadyProcessed ? 'duplicate' : 'processed',
      httpStatus: 200,
      message: alreadyProcessed ? 'order already fulfilled' : 'payment processed',
      orderId: payment.order_id,
      paymentId: payment.id,
      outcome: 'succeeded',
      changed: !alreadyProcessed,
    };
  }

  // 失敗 / 取消：更新付款與訂單狀態，絕不發放任何權限
  const failedAt = new Date().toISOString();
  await supabase
    .from('commerce_payments')
    .update({
      status: verified.outcome === 'cancelled' ? 'cancelled' : 'failed',
      failed_at: failedAt,
      failure_code: verified.failureCode ?? null,
      failure_message: verified.failureMessage ?? null,
      provider_trade_no: verified.providerTradeNo,
    })
    .eq('id', payment.id);
  await supabase.from('commerce_orders').update({ status: 'failed' }).eq('id', payment.order_id).in('status', ['pending', 'awaiting_payment']);
  await supabase.from('commerce_payment_transactions').insert({
    payment_id: payment.id,
    transaction_type: 'notify',
    status: 'failed',
    amount_cents: payment.amount_cents,
    provider_transaction_id: verified.providerTradeNo,
    provider_rtn_code: verified.failureCode ?? null,
    provider_rtn_msg: verified.failureMessage ?? null,
    webhook_event_id: webhookEventId,
    response_payload: verified.sanitizedPayload,
  });
  await finish('processed', null, { orderId: payment.order_id, paymentId: payment.id });
  await writeAudit(supabase, 'commerce.payment.failed', 'commerce_payments', payment.id, {
    order_id: payment.order_id,
    provider,
    environment,
    amount_cents: payment.amount_cents,
    outcome: verified.outcome,
    failure_code: verified.failureCode ?? null,
  });

  return {
    status: 'failed_recorded',
    httpStatus: 200,
    message: 'payment failure recorded',
    orderId: payment.order_id,
    paymentId: payment.id,
    outcome: verified.outcome,
    changed: true,
  };
}

/** Sandbox 模擬頁使用：取得付款單資訊（service role，僅伺服器端） */
export async function getSandboxPaymentContext(paymentId: string): Promise<{
  found: boolean;
  paymentId: string;
  orderId: string;
  orderNumber: string;
  merchantTradeNo: string;
  amountCents: number;
  currency: string;
  status: string;
  provider: string;
} | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paymentId)) return null;
  const supabase = getServiceRoleSupabase();
  const { data, error } = await supabase
    .from('commerce_payments')
    .select('id, order_id, merchant_trade_no, amount_cents, currency, status, provider, order:commerce_orders(order_number)')
    .eq('id', paymentId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  const order = (Array.isArray(row.order) ? row.order[0] : row.order) as Record<string, unknown> | null;
  return {
    found: true,
    paymentId: String(row.id),
    orderId: String(row.order_id),
    orderNumber: String(order?.order_number ?? ''),
    merchantTradeNo: String(row.merchant_trade_no ?? ''),
    amountCents: Number(row.amount_cents ?? 0),
    currency: String(row.currency ?? 'TWD'),
    status: String(row.status ?? 'pending'),
    provider: String(row.provider ?? 'sandbox'),
  };
}
