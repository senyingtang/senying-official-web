import type { ProductCode } from './constants/product-codes';

/**
 * 權限代碼格式（ACCESS_CODE_SPEC.md）：SYT-{PRODUCT_CODE}-{YYYY}-{6 碼}
 * 字元集 32 字：A-Z 去除 I、L、O；數字 1-9。
 * 前端只做格式提示；產生與兌換一律由資料庫函式處理（generate_access_code / redeem_access_code）。
 */
export const ACCESS_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ123456789';
export const ACCESS_CODE_PATTERN = /^SYT-(SEO|LP|ECOM|DM|AI|CUSTOM)-[0-9]{4}-[A-HJKMNP-Z1-9]{6}$/;
export const ACCESS_CODE_EXAMPLE = 'SYT-SEO-2026-A8K3Q9';

export const ACCESS_CODE_EXAMPLES: Record<Exclude<ProductCode, 'CUSTOM'>, string> = {
  SEO: 'SYT-SEO-2026-A8K3Q9',
  LP: 'SYT-LP-2026-P7X2M4',
  ECOM: 'SYT-ECOM-2026-K9D6R1',
  DM: 'SYT-DM-2026-H4M8T2',
  AI: 'SYT-AI-2026-N3Q8Z5',
};

/** 與 DB normalize_access_code() 相同：轉大寫、移除空白與底線 */
export function normalizeAccessCode(input: string): string {
  return input.replace(/[\s_]+/g, '').toUpperCase();
}

export function isAccessCodeFormat(input: string): boolean {
  return ACCESS_CODE_PATTERN.test(normalizeAccessCode(input));
}

/** 顯示用遮蔽：SYT-SEO-2026-A8K••• */
export function maskAccessCode(code: string): string {
  const normalized = normalizeAccessCode(code);
  return normalized.length > 3 ? `${normalized.slice(0, -3)}•••` : normalized;
}

/** 對應 DB enum public.access_code_status */
export const ACCESS_CODE_STATUSES = ['generated', 'issued', 'redeemed', 'expired', 'revoked'] as const;
export type AccessCodeStatus = (typeof ACCESS_CODE_STATUSES)[number];

export const ACCESS_CODE_STATUS_LABELS: Record<AccessCodeStatus, string> = {
  generated: '已產生',
  issued: '已發放',
  redeemed: '已兌換',
  expired: '已過期',
  revoked: '已撤銷',
};

/** 對應 redeem_access_code() 回傳 result */
export const REDEEM_RESULTS = [
  'success',
  'invalid_format',
  'not_found',
  'already_redeemed',
  'revoked',
  'expired',
  'not_started',
  'inactive_product',
  'rate_limited',
] as const;
export type RedeemResult = (typeof REDEEM_RESULTS)[number];

/** 對一般使用者統一「無效或已使用」，避免協助猜測代碼 */
export const REDEEM_RESULT_MESSAGES: Record<RedeemResult, string> = {
  success: '兌換成功，已為你建立工作區。',
  invalid_format: '代碼格式不正確，請確認是否為 SYT-XXX-YYYY-XXXXXX。',
  not_found: '代碼無效或已被使用。',
  already_redeemed: '代碼無效或已被使用。',
  revoked: '這組代碼已停用，請聯絡客服確認。',
  expired: '這組代碼已超過兌換期限。',
  not_started: '這組代碼尚未開放兌換。',
  inactive_product: '這個方案目前暫停開通，請聯絡客服。',
  rate_limited: '嘗試次數過多，請 15 分鐘後再試。',
};

/**
 * Portal 兌換流程狀態（Server Action / UI 使用）。
 * valid = 兌換成功；not_authenticated / server_error 由應用層產生。
 */
export const REDEEM_STATUSES = [
  'valid',
  'invalid',
  'expired',
  'already_redeemed',
  'already_redeemed_by_current_user',
  'already_redeemed_by_other_user',
  'revoked',
  'rate_limited',
  'not_authenticated',
  'server_error',
] as const;
export type RedeemStatus = (typeof REDEEM_STATUSES)[number];

export function isRedeemStatus(value: unknown): value is RedeemStatus {
  return typeof value === 'string' && (REDEEM_STATUSES as readonly string[]).includes(value);
}

export type RedeemStatusTone = 'success' | 'info' | 'warning' | 'danger';

export const REDEEM_STATUS_MESSAGES: Record<RedeemStatus, { title: string; description: string; tone: RedeemStatusTone }> = {
  valid: { title: '兌換成功', description: '方案已開通，正在前往你的網站。', tone: 'success' },
  invalid: { title: '代碼無效', description: '請確認代碼是否完整，格式為 SYT-產品代碼-年份-6 碼。', tone: 'danger' },
  expired: { title: '代碼已過期', description: '這組代碼已超過兌換期限，請聯絡客服確認。', tone: 'warning' },
  already_redeemed: { title: '代碼已被使用', description: '這組代碼已經兌換過。', tone: 'warning' },
  already_redeemed_by_current_user: { title: '你已兌換過這組代碼', description: '方案已經在你的帳號中，直接前往網站即可。', tone: 'info' },
  already_redeemed_by_other_user: { title: '代碼已被其他帳號使用', description: '代碼兌換後會綁定帳號，無法再次使用。若代碼是你購買的，請聯絡客服。', tone: 'danger' },
  revoked: { title: '代碼已停用', description: '這組代碼已被撤銷，請聯絡客服確認。', tone: 'danger' },
  rate_limited: { title: '嘗試次數過多', description: '為了保護代碼安全，請 15 分鐘後再試。', tone: 'warning' },
  not_authenticated: { title: '請先登入', description: '兌換代碼需要登入帳號，登入後會回到這個頁面。', tone: 'info' },
  server_error: { title: '暫時無法兌換', description: '系統發生錯誤，請稍後再試或聯絡客服。', tone: 'danger' },
};

/**
 * DB 函式回傳 result → RedeemStatus。
 * create_workspace_from_access_code 會先處理「本人已兌換」（already_exists），
 * 因此該函式回傳 already_redeemed 時代表被其他帳號兌換。
 */
export function mapRedeemResultToStatus(result: string | null | undefined, source: 'create_workspace_from_access_code' | 'redeem_access_code'): RedeemStatus {
  switch (result) {
    case 'success':
    case 'created':
      return 'valid';
    case 'already_exists':
      return 'already_redeemed_by_current_user';
    case 'already_redeemed':
      return source === 'create_workspace_from_access_code' ? 'already_redeemed_by_other_user' : 'already_redeemed';
    case 'invalid_format':
    case 'not_found':
    case 'not_started':
    case 'inactive_product':
      return 'invalid';
    case 'expired':
      return 'expired';
    case 'revoked':
      return 'revoked';
    case 'rate_limited':
      return 'rate_limited';
    default:
      return 'server_error';
  }
}
