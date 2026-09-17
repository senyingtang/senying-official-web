import 'server-only';
import { randomUUID } from 'node:crypto';
import type { CreatePaymentResult, PaymentContext, PaymentProviderAdapter, ProviderAvailability, VerifiedCallback } from './types';
import { sanitizePayload } from './types';
import { ecpayCheckMacValue, linePaySignature, sandboxSignature, verifyEcpayCheckMacValue, verifyLinePaySignature, verifySandboxSignature } from './signatures';

/**
 * Provider 實作（Phase 3.0）。
 *
 * - SandboxPaymentProvider：本機模擬，唯一能在本階段完成付款的 provider
 * - EcpayPaymentProvider / LinePayPaymentProvider：adapter skeleton + 簽章邊界；
 *   沒有憑證時 availability().configured = false，createPayment 直接失敗，**不會 fallback 成假成功**
 */

const NOT_CONFIGURED = '未設定正式憑證，這個付款方式目前停用。';

function envValue(name: string): string {
  return (process.env[name] ?? '').trim();
}

/** 本機 sandbox 是否啟用：正式環境一律拒絕 */
export function sandboxEnabled(): boolean {
  if (process.env.NODE_ENV === 'production' && envValue('PAYMENT_SANDBOX_ENABLED') !== 'true') return false;
  return envValue('PAYMENT_SANDBOX_ENABLED') === 'true';
}

export function sandboxSecret(): string {
  return envValue('PAYMENT_SANDBOX_SECRET');
}

// ---------------------------------------------------------------------------
// Sandbox
// ---------------------------------------------------------------------------
export class SandboxPaymentProvider implements PaymentProviderAdapter {
  readonly provider = 'sandbox' as const;

  availability(): ProviderAvailability {
    const enabled = sandboxEnabled();
    const hasSecret = sandboxSecret().length >= 16;
    return {
      configured: enabled && hasSecret,
      reason: !enabled
        ? 'PAYMENT_SANDBOX_ENABLED 未開啟（正式環境一律停用模擬付款）'
        : hasSecret
          ? '本機 Sandbox 模擬付款'
          : 'PAYMENT_SANDBOX_SECRET 未設定（至少 16 字元）',
      environment: 'sandbox',
      isSimulation: true,
    };
  }

  async createPayment(context: PaymentContext): Promise<CreatePaymentResult> {
    const availability = this.availability();
    if (!availability.configured) return { ok: false, reason: availability.reason };
    // 模擬付款頁在後台 app 內；使用者在那裡選擇成功 / 失敗 / 取消
    return { ok: true, redirectUrl: `/api/payments/sandbox/${context.paymentId}` };
  }

  async verifyCallback(raw: { body: string; headers: Record<string, string>; query: Record<string, string> }): Promise<VerifiedCallback> {
    const secret = sandboxSecret();
    const signature = raw.headers['x-sandbox-signature'] ?? raw.query.signature ?? '';
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(raw.body || '{}') as Record<string, unknown>;
    } catch {
      return {
        ok: false,
        signatureValid: false,
        providerEventId: '',
        merchantTradeNo: '',
        providerTradeNo: null,
        outcome: 'failed',
        amountCents: null,
        sanitizedPayload: {},
        reason: 'invalid json body',
      };
    }
    const signatureValid = secret.length >= 16 && verifySandboxSignature(secret, raw.body, signature);
    const outcomeRaw = String(payload.outcome ?? '');
    const outcome = outcomeRaw === 'succeeded' || outcomeRaw === 'failed' || outcomeRaw === 'cancelled' ? outcomeRaw : 'failed';
    return {
      ok: signatureValid,
      signatureValid,
      providerEventId: String(payload.event_id ?? ''),
      merchantTradeNo: String(payload.merchant_trade_no ?? ''),
      providerTradeNo: payload.provider_trade_no ? String(payload.provider_trade_no) : null,
      outcome,
      amountCents: typeof payload.amount_cents === 'number' ? payload.amount_cents : null,
      failureCode: outcome === 'succeeded' ? undefined : String(payload.failure_code ?? 'sandbox_declined'),
      failureMessage: outcome === 'succeeded' ? undefined : String(payload.failure_message ?? '模擬付款未完成'),
      sanitizedPayload: sanitizePayload(payload),
      reason: signatureValid ? undefined : 'sandbox signature mismatch',
    };
  }

  async queryPayment(): Promise<{ ok: boolean; status?: string; reason?: string }> {
    return { ok: false, reason: 'sandbox 沒有外部查詢介面；付款狀態以資料庫為準' };
  }

  async cancelPayment(): Promise<{ ok: boolean; reason?: string }> {
    return { ok: true };
  }

  /** 模擬頁送出時使用，與 verifyCallback 對稱 */
  signPayload(payload: Record<string, unknown>): { body: string; signature: string } {
    const body = JSON.stringify(payload);
    return { body, signature: sandboxSignature(sandboxSecret(), body) };
  }

  buildCallbackPayload(context: { merchantTradeNo: string; amountCents: number; outcome: string }): Record<string, unknown> {
    return {
      event_id: `sbx_${randomUUID()}`,
      merchant_trade_no: context.merchantTradeNo,
      provider_trade_no: `SBXTRADE${Date.now()}`,
      outcome: context.outcome,
      amount_cents: context.amountCents,
      simulated: true,
      occurred_at: new Date().toISOString(),
    };
  }
}

// ---------------------------------------------------------------------------
// 綠界 ECPay（skeleton）
// ---------------------------------------------------------------------------
export class EcpayPaymentProvider implements PaymentProviderAdapter {
  readonly provider = 'ecpay' as const;

  private credentials(): { merchantId: string; hashKey: string; hashIv: string } {
    return { merchantId: envValue('EC_PAY_MERCHANT_ID'), hashKey: envValue('EC_PAY_HASH_KEY'), hashIv: envValue('EC_PAY_HASH_IV') };
  }

  availability(): ProviderAvailability {
    const { merchantId, hashKey, hashIv } = this.credentials();
    const configured = merchantId !== '' && hashKey !== '' && hashIv !== '';
    return {
      configured,
      reason: configured ? '已設定（尚未經過 staging 驗證）' : NOT_CONFIGURED,
      environment: envValue('EC_PAY_ENVIRONMENT') === 'production' ? 'production' : 'sandbox',
      isSimulation: false,
    };
  }

  async createPayment(context: PaymentContext): Promise<CreatePaymentResult> {
    const availability = this.availability();
    // 沒有憑證時不可 fallback 成假成功
    if (!availability.configured) return { ok: false, reason: availability.reason };
    const { merchantId, hashKey, hashIv } = this.credentials();
    const fields: Record<string, string> = {
      MerchantID: merchantId,
      MerchantTradeNo: context.merchantTradeNo,
      MerchantTradeDate: new Date().toISOString().slice(0, 19).replace('T', ' ').replace(/-/g, '/'),
      PaymentType: 'aio',
      // 綠界 TotalAmount 是整數新台幣元
      TotalAmount: String(Math.round(context.amountCents / 100)),
      TradeDesc: context.orderNumber,
      ItemName: context.orderNumber,
      ReturnURL: context.notifyUrl,
      ClientBackURL: context.returnUrl,
      ChoosePayment: 'Credit',
      EncryptType: '1',
    };
    fields.CheckMacValue = ecpayCheckMacValue(fields, hashKey, hashIv);
    return {
      ok: true,
      formAction: `${availability.environment === 'production' ? 'https://payment.ecpay.com.tw' : 'https://payment-stage.ecpay.com.tw'}/Cashier/AioCheckOut/V5`,
      formFields: fields,
    };
  }

  async verifyCallback(raw: { body: string; headers: Record<string, string>; query: Record<string, string> }): Promise<VerifiedCallback> {
    const { hashKey, hashIv } = this.credentials();
    const params = Object.fromEntries(new URLSearchParams(raw.body));
    const signatureValid = hashKey !== '' && hashIv !== '' && verifyEcpayCheckMacValue(params, hashKey, hashIv);
    const succeeded = params.RtnCode === '1';
    return {
      ok: signatureValid,
      signatureValid,
      providerEventId: params.TradeNo ?? '',
      merchantTradeNo: params.MerchantTradeNo ?? '',
      providerTradeNo: params.TradeNo ?? null,
      outcome: succeeded ? 'succeeded' : 'failed',
      amountCents: params.TradeAmt ? Number(params.TradeAmt) * 100 : null,
      failureCode: succeeded ? undefined : (params.RtnCode ?? 'unknown'),
      failureMessage: succeeded ? undefined : (params.RtnMsg ?? '綠界回報付款未完成'),
      sanitizedPayload: sanitizePayload(params),
      reason: signatureValid ? undefined : 'CheckMacValue mismatch or credentials missing',
    };
  }

  async queryPayment(): Promise<{ ok: boolean; status?: string; reason?: string }> {
    return { ok: false, reason: this.availability().configured ? 'Phase 3.1 接上查詢 API' : NOT_CONFIGURED };
  }

  async cancelPayment(): Promise<{ ok: boolean; reason?: string }> {
    return { ok: false, reason: this.availability().configured ? 'Phase 3.1 接上取消 API' : NOT_CONFIGURED };
  }
}

// ---------------------------------------------------------------------------
// LINE Pay（skeleton）
// ---------------------------------------------------------------------------
export class LinePayPaymentProvider implements PaymentProviderAdapter {
  readonly provider = 'linepay' as const;

  private credentials(): { channelId: string; channelSecret: string } {
    return { channelId: envValue('LINE_PAY_CHANNEL_ID'), channelSecret: envValue('LINE_PAY_CHANNEL_SECRET') };
  }

  availability(): ProviderAvailability {
    const { channelId, channelSecret } = this.credentials();
    const configured = channelId !== '' && channelSecret !== '';
    return {
      configured,
      reason: configured ? '已設定（尚未經過 staging 驗證）' : NOT_CONFIGURED,
      environment: envValue('LINE_PAY_ENVIRONMENT') === 'production' ? 'production' : 'sandbox',
      isSimulation: false,
    };
  }

  /** LINE Pay v3 Request API 的 DTO（Phase 3.0 只組裝，不送出） */
  buildRequestDto(context: PaymentContext): Record<string, unknown> {
    return {
      amount: Math.round(context.amountCents / 100),
      currency: context.currency,
      orderId: context.merchantTradeNo,
      packages: [
        {
          id: context.orderNumber,
          amount: Math.round(context.amountCents / 100),
          products: [{ name: context.orderNumber, quantity: 1, price: Math.round(context.amountCents / 100) }],
        },
      ],
      redirectUrls: { confirmUrl: context.returnUrl, cancelUrl: context.returnUrl },
    };
  }

  async createPayment(context: PaymentContext): Promise<CreatePaymentResult> {
    const availability = this.availability();
    if (!availability.configured) return { ok: false, reason: availability.reason };
    const { channelSecret } = this.credentials();
    const nonce = randomUUID();
    const uri = '/v3/payments/request';
    const body = JSON.stringify(this.buildRequestDto(context));
    // 簽章邊界已完成；實際呼叫 LINE Pay API 於 Phase 3.1 接上
    void linePaySignature(channelSecret, uri, body, nonce);
    return { ok: false, reason: 'LINE Pay 尚未接上 API（Phase 3.1）；adapter 與簽章已就緒。' };
  }

  async verifyCallback(raw: { body: string; headers: Record<string, string>; query: Record<string, string> }): Promise<VerifiedCallback> {
    const { channelSecret } = this.credentials();
    const nonce = raw.headers['x-line-authorization-nonce'] ?? '';
    const signature = raw.headers['x-line-authorization'] ?? '';
    const uri = raw.query.uri ?? '/v3/payments/confirm';
    const signatureValid = channelSecret !== '' && verifyLinePaySignature(channelSecret, uri, raw.body, nonce, signature);
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(raw.body || '{}') as Record<string, unknown>;
    } catch {
      payload = {};
    }
    const succeeded = String(payload.returnCode ?? '') === '0000';
    return {
      ok: signatureValid,
      signatureValid,
      providerEventId: String(payload.transactionId ?? ''),
      merchantTradeNo: String(payload.orderId ?? ''),
      providerTradeNo: payload.transactionId ? String(payload.transactionId) : null,
      outcome: succeeded ? 'succeeded' : 'failed',
      amountCents: typeof payload.amount === 'number' ? payload.amount * 100 : null,
      failureCode: succeeded ? undefined : String(payload.returnCode ?? 'unknown'),
      failureMessage: succeeded ? undefined : String(payload.returnMessage ?? 'LINE Pay 回報付款未完成'),
      sanitizedPayload: sanitizePayload(payload),
      reason: signatureValid ? undefined : 'LINE Pay signature mismatch or credentials missing',
    };
  }

  async queryPayment(): Promise<{ ok: boolean; status?: string; reason?: string }> {
    return { ok: false, reason: this.availability().configured ? 'Phase 3.1 接上查詢 API' : NOT_CONFIGURED };
  }

  async cancelPayment(): Promise<{ ok: boolean; reason?: string }> {
    return { ok: false, reason: this.availability().configured ? 'Phase 3.1 接上取消 API' : NOT_CONFIGURED };
  }
}

const adapters = {
  sandbox: new SandboxPaymentProvider(),
  ecpay: new EcpayPaymentProvider(),
  linepay: new LinePayPaymentProvider(),
} as const;

export type SupportedProvider = keyof typeof adapters;

export function getPaymentAdapter(provider: string): PaymentProviderAdapter | null {
  return provider in adapters ? adapters[provider as SupportedProvider] : null;
}

export function getSandboxAdapter(): SandboxPaymentProvider {
  return adapters.sandbox;
}

export function listProviderAvailability(): { provider: string; availability: ProviderAvailability }[] {
  return Object.entries(adapters).map(([provider, adapter]) => ({ provider, availability: adapter.availability() }));
}
