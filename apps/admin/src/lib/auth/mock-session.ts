import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Mock 模式登入 cookie（僅 DATA_SOURCE=mock）。
 * 內容為 {sub, exp} + HMAC-SHA256 簽章：伺服器端驗證簽章與到期時間，偽造或竄改的 cookie 一律視為未登入。
 * DATA_SOURCE=supabase 時完全不讀這個 cookie，改用 Supabase Auth。
 */
export const MOCK_SESSION_MAX_AGE = 60 * 60 * 8;

// 本機示範用預設值；可用 AUTH_COOKIE_SECRET 覆寫。mock 資料不含任何真實客戶資料。
const LOCAL_MOCK_SIGNING_KEY = 'syt-local-mock-session-signing-key';

function signingKey(): string {
  return process.env.AUTH_COOKIE_SECRET?.trim() || LOCAL_MOCK_SIGNING_KEY;
}

function sign(payload: string): string {
  return createHmac('sha256', signingKey()).update(payload).digest('base64url');
}

export function createMockSessionToken(userId: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp: Math.floor(now / 1000) + MOCK_SESSION_MAX_AGE })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

/** 回傳 userId；簽章錯誤、格式錯誤或過期回傳 null */
export function verifyMockSessionToken(token: string | undefined, now = Date.now()): string | null {
  if (!token || token.length > 512) return null;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra !== undefined) return null;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { sub?: unknown; exp?: unknown };
    if (typeof data.sub !== 'string' || typeof data.exp !== 'number' || data.exp * 1000 <= now) return null;
    return data.sub;
  } catch {
    return null;
  }
}
