import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/**
 * 金流簽章工具（Phase 3.0）。
 *
 * 這些是純函式，沒有任何憑證寫死在檔案裡：key / secret 一律由呼叫端從 env / Vault 取得後傳入。
 * 驗收（pnpm payment:verify）會用已知向量測試，確認簽章邊界真的有效。
 */

/** 固定時間比較，避免以回應時間推測正確簽章 */
export function safeCompare(a: string, b: string): boolean {
  const left = Buffer.from(a ?? '', 'utf8');
  const right = Buffer.from(b ?? '', 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

// ---------------------------------------------------------------------------
// 綠界 ECPay：CheckMacValue
// ---------------------------------------------------------------------------

/** 綠界規定的 .NET UrlEncode 相容轉換（小寫百分比編碼 + 特定字元還原） */
export function ecpayUrlEncode(value: string): string {
  return encodeURIComponent(value)
    .toLowerCase()
    .replace(/%20/g, '+')
    .replace(/%2d/g, '-')
    .replace(/%5f/g, '_')
    .replace(/%2e/g, '.')
    .replace(/%21/g, '!')
    .replace(/%2a/g, '*')
    .replace(/%28/g, '(')
    .replace(/%29/g, ')');
}

/**
 * 綠界 CheckMacValue（EncryptType=1，SHA256）。
 * 規則：參數依 key 字母排序 → HashKey=...&參數...&HashIV=... → UrlEncode → 轉小寫 → SHA256 → 轉大寫。
 */
export function ecpayCheckMacValue(params: Record<string, string>, hashKey: string, hashIv: string): string {
  const entries = Object.entries(params)
    .filter(([key]) => key !== 'CheckMacValue')
    .sort(([a], [b]) => a.localeCompare(b));
  const raw = `HashKey=${hashKey}&${entries.map(([key, value]) => `${key}=${value}`).join('&')}&HashIV=${hashIv}`;
  return createHash('sha256').update(ecpayUrlEncode(raw)).digest('hex').toUpperCase();
}

export function verifyEcpayCheckMacValue(params: Record<string, string>, hashKey: string, hashIv: string): boolean {
  const provided = params.CheckMacValue ?? '';
  if (!provided) return false;
  return safeCompare(provided.toUpperCase(), ecpayCheckMacValue(params, hashKey, hashIv));
}

// ---------------------------------------------------------------------------
// LINE Pay v3：HMAC-SHA256 簽章
// ---------------------------------------------------------------------------

/** LINE Pay：Base64(HMAC-SHA256(channelSecret + uri + body + nonce, channelSecret)) */
export function linePaySignature(channelSecret: string, uri: string, body: string, nonce: string): string {
  return createHmac('sha256', channelSecret).update(`${channelSecret}${uri}${body}${nonce}`).digest('base64');
}

export function verifyLinePaySignature(channelSecret: string, uri: string, body: string, nonce: string, signature: string): boolean {
  return safeCompare(signature ?? '', linePaySignature(channelSecret, uri, body, nonce));
}

// ---------------------------------------------------------------------------
// 本機 Sandbox：HMAC-SHA256（與正式 provider 相同的驗章流程，只是密鑰來自本機 env）
// ---------------------------------------------------------------------------

export function sandboxSignature(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export function verifySandboxSignature(secret: string, payload: string, signature: string): boolean {
  return safeCompare(signature ?? '', sandboxSignature(secret, payload));
}
