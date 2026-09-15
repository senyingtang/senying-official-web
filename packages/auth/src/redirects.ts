export type AuthArea = 'admin' | 'portal';

export const AUTH_ERROR_CODES = [
  'login_required',
  'invalid_credentials',
  'not_admin',
  'forbidden',
  'no_workspace',
  'session_expired',
  'config_error',
  'logged_out',
] as const;
export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];

export function isAuthErrorCode(value: unknown): value is AuthErrorCode {
  return typeof value === 'string' && (AUTH_ERROR_CODES as readonly string[]).includes(value);
}

export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, { title: string; description: string; tone: 'info' | 'warning' | 'danger' }> = {
  login_required: { title: '請先登入', description: '這個頁面需要登入後才能使用。', tone: 'info' },
  invalid_credentials: { title: '登入失敗', description: 'Email 或密碼不正確，請再試一次。', tone: 'danger' },
  not_admin: { title: '這個帳號沒有後台權限', description: '只有森映後台成員可以進入官方後台。若你是客戶，請改用客戶後台登入。', tone: 'danger' },
  forbidden: { title: '沒有權限查看這個頁面', description: '你的角色無法使用這個功能，已帶你回到可使用的頁面。', tone: 'warning' },
  no_workspace: { title: '尚未開通工作區', description: '請先兌換權限代碼，開通後就能建立網站。', tone: 'info' },
  session_expired: { title: '登入已過期', description: '請重新登入。', tone: 'warning' },
  config_error: { title: '登入設定錯誤', description: '系統的資料來源設定不完整，請聯絡管理員。', tone: 'danger' },
  logged_out: { title: '已登出', description: '你已安全登出。', tone: 'info' },
};

/**
 * 登入後導回路徑：只允許同一後台區域內的站內路徑，防止 open redirect。
 * 不接受 //、反斜線、控制字元、協定、login 頁本身。
 */
export function sanitizeNextPath(value: string | null | undefined, area: AuthArea): string | null {
  if (!value) return null;
  const candidate = value.trim();
  if (candidate.length === 0 || candidate.length > 512) return null;
  if (!candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')) return null;
  for (const char of candidate) {
    const code = char.charCodeAt(0);
    if (code < 0x20 || code === 0x7f) return null;
  }
  const pathOnly = candidate.split(/[?#]/)[0] ?? '';
  const root = `/${area}`;
  if (pathOnly !== root && !pathOnly.startsWith(`${root}/`)) return null;
  if (pathOnly === `${root}/login`) return null;
  return candidate;
}

export function defaultHomePath(area: AuthArea): string {
  return area === 'admin' ? '/admin/dashboard' : '/portal/dashboard';
}

export function loginPath(area: AuthArea, options: { next?: string | null; error?: AuthErrorCode } = {}): string {
  const params = new URLSearchParams();
  const next = sanitizeNextPath(options.next, area);
  if (next) params.set('next', next);
  if (options.error) params.set('error', options.error);
  const query = params.toString();
  return `/${area}/login${query ? `?${query}` : ''}`;
}

/** 不需要登入即可開啟的後台路徑（兌換頁可公開輸入，兌換動作仍需登入） */
export const PUBLIC_AUTH_PATHS = ['/admin/login', '/portal/login', '/portal/redeem-code'] as const;

/** 回傳需要登入的後台區域；公開路徑或非後台路徑回傳 null */
export function protectedAreaFor(pathname: string): AuthArea | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  if ((PUBLIC_AUTH_PATHS as readonly string[]).includes(path)) return null;
  for (const area of ['admin', 'portal'] as const) {
    if (path === `/${area}` || path.startsWith(`/${area}/`)) return area;
  }
  return null;
}
