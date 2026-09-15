import { createServerClient } from '@supabase/ssr';
import { loginPath, protectedAreaFor } from '@syt/auth';
import { resolveDataSourceConfig, type DataSourceConfig } from '@syt/database/data-source';
import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseAuthCookieName, MOCK_SESSION_COOKIE, PATHNAME_HEADER } from '@/lib/auth/cookies';

/**
 * Proxy（Next.js 16，原 middleware）：只做「粗略」檢查，不是權限判斷的唯一依據。
 * - /admin/*、/portal/*（登入頁與兌換頁除外）沒有 session cookie → 導向登入頁並帶 next
 * - 不驗證簽章、不查角色、不查 workspace、不使用 service role key
 *   → 真正的檢查在 server guard（lib/auth/guards.ts），偽造 cookie 仍會被擋下
 * - DATA_SOURCE=supabase：以 anon key 更新 Supabase Auth session cookie
 * - DATA_SOURCE 設定錯誤：受保護路徑導向登入頁顯示 config_error，不改用 mock
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const area = protectedAreaFor(pathname);

  const forward = () => {
    const headers = new Headers(request.headers);
    headers.set(PATHNAME_HEADER, pathname);
    return NextResponse.next({ request: { headers } });
  };

  let dataSource: DataSourceConfig;
  try {
    dataSource = resolveDataSourceConfig(process.env);
  } catch {
    if (!area) return forward();
    return NextResponse.redirect(new URL(loginPath(area, { error: 'config_error' }), request.url));
  }

  let response = forward();
  if (dataSource.kind === 'supabase') {
    const supabase = createServerClient(dataSource.url, dataSource.anonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = forward();
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
          for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
        },
      },
    });
    try {
      await supabase.auth.getClaims();
    } catch {
      // Auth server 暫時無法連線：交給 server guard 的 getUser() 判斷
    }
  }

  if (!area) return response;

  const hasSessionCookie =
    dataSource.kind === 'mock'
      ? request.cookies.has(MOCK_SESSION_COOKIE)
      : request.cookies.getAll().some((cookie) => isSupabaseAuthCookieName(cookie.name));
  if (!hasSessionCookie) {
    return NextResponse.redirect(new URL(loginPath(area, { next: `${pathname}${search}`, error: 'login_required' }), request.url));
  }
  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/portal/:path*'],
};
