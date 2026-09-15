/**
 * Auth 相關 cookie / header 名稱（proxy 與 server 共用）。
 * 本檔只有名稱常數，不含密鑰與驗證邏輯，可被 proxy 匯入。
 */
export const MOCK_SESSION_COOKIE = 'syt_mock_session';
export const PENDING_REDEEM_COOKIE = 'syt_pending_redeem_code';
/** proxy 轉交給 server guard 的目前路徑（只用於登入後導回，會再經 sanitizeNextPath） */
export const PATHNAME_HEADER = 'x-syt-pathname';

const SUPABASE_AUTH_COOKIE = /^sb-[a-z0-9-]+-auth-token(?:\.\d+)?$/i;

export function isSupabaseAuthCookieName(name: string): boolean {
  return SUPABASE_AUTH_COOKIE.test(name);
}
