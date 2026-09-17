/**
 * 金流 Provider 介面（Phase 3.0）。
 *
 * 所有 provider 都實作同一組方法，付款流程（建立付款 → 導向 → callback → webhook）不需要知道是哪一家。
 * Phase 3.0 只有 SandboxPaymentProvider 可以真的完成付款；ECPay / LINE Pay 是 adapter skeleton，
 * 沒有正式憑證時一律回報「未設定」，絕不 fallback 成假成功。
 */

export type PaymentOutcome = 'succeeded' | 'failed' | 'cancelled';

export interface PaymentContext {
  paymentId: string;
  orderId: string;
  orderNumber: string;
  merchantTradeNo: string;
  amountCents: number;
  currency: string;
  buyerEmail: string;
  /** 付款完成後要回到的官網網址（已含收據 token） */
  returnUrl: string;
  /** provider 通知伺服器的網址 */
  notifyUrl: string;
}

export interface CreatePaymentResult {
  ok: boolean;
  /** 需要把使用者導向的位置（sandbox 是本機模擬頁；正式 provider 是金流頁） */
  redirectUrl?: string;
  /** 以 POST form 導向時的欄位（綠界使用） */
  formAction?: string;
  formFields?: Record<string, string>;
  /** ok=false 時的原因（顯示給後台，不顯示密鑰） */
  reason?: string;
}

export interface VerifiedCallback {
  ok: boolean;
  /** 簽章是否通過；false 時一律不處理 */
  signatureValid: boolean;
  /** provider 端的事件識別碼，用於 webhook idempotency */
  providerEventId: string;
  merchantTradeNo: string;
  providerTradeNo: string | null;
  outcome: PaymentOutcome;
  amountCents: number | null;
  failureCode?: string;
  failureMessage?: string;
  /** 已移除敏感欄位的原始內容（存進 commerce_webhook_events） */
  sanitizedPayload: Record<string, unknown>;
  reason?: string;
}

export interface ProviderAvailability {
  /** true：有完整設定，可以建立付款 */
  configured: boolean;
  /** 顯示給後台 / 結帳頁的原因（例如「未設定正式憑證」） */
  reason: string;
  environment: 'sandbox' | 'production';
  /** true：模擬付款，UI 必須明確標示 */
  isSimulation: boolean;
}

export interface PaymentProviderAdapter {
  readonly provider: 'sandbox' | 'ecpay' | 'linepay' | 'bank_transfer' | 'manual';
  availability(): ProviderAvailability;
  createPayment(context: PaymentContext): Promise<CreatePaymentResult>;
  verifyCallback(raw: { body: string; headers: Record<string, string>; query: Record<string, string> }): Promise<VerifiedCallback>;
  queryPayment(merchantTradeNo: string): Promise<{ ok: boolean; status?: string; reason?: string }>;
  cancelPayment(merchantTradeNo: string): Promise<{ ok: boolean; reason?: string }>;
}

/** 從 payload 移除任何疑似密鑰的欄位後再保存 */
export function sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  // 也擋掉權限代碼與各種 token：金流商不會回傳這些，但 payload 會原樣保存，寧可多擋
  const SENSITIVE =
    /(secret|password|passwd|hash_?key|hash_?iv|private_?key|api_?key|access_?token|refresh_?token|client_?secret|channel_?secret|credential|check_?mac|signature|card|cvv|cvc|access_?code|redemption_?code|redeem_?code|entitlement_?code|cart_?token|checkout_?token|receipt_?token)/i;
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (SENSITIVE.test(key)) {
      output[key] = '[redacted]';
      continue;
    }
    output[key] = value && typeof value === 'object' && !Array.isArray(value) ? sanitizePayload(value as Record<string, unknown>) : value;
  }
  return output;
}
