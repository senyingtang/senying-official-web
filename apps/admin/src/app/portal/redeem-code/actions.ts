'use server';

import { isAccessCodeFormat, normalizeAccessCode, type RedeemStatus } from '@syt/shared';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PENDING_REDEEM_COOKIE } from '@/lib/auth/cookies';
import { redirectToLogin } from '@/lib/auth/redirects';
import { authCookieOptions, getPortalContext } from '@/lib/auth/server';
import { tryGetDataSourceConfig } from '@/lib/config';

export interface RedeemFormState {
  status: RedeemStatus | 'idle';
  code: string;
}

const PENDING_CODE_MAX_AGE = 60 * 10;

/**
 * 兌換權限代碼（Server Action）。
 * 1. 格式錯誤 → invalid（不呼叫資料庫）
 * 2. 未登入 → 暫存代碼（httpOnly cookie，10 分鐘）→ /portal/login?next=/portal/redeem-code
 * 3. mock：mock repository；supabase：使用者 session 呼叫 RPC create_workspace_from_access_code
 * 4. 成功 / 本人已兌換 → /portal/sites/[siteId]（尚無網站 → /portal/redeem-code?result=valid）
 */
export async function redeemAccessCodeAction(_previous: RedeemFormState, formData: FormData): Promise<RedeemFormState> {
  const input = String(formData.get('code') ?? '')
    .trim()
    .slice(0, 64);
  const code = normalizeAccessCode(input);
  if (!isAccessCodeFormat(code)) return { status: 'invalid', code: input };
  if (!tryGetDataSourceConfig().ok) return { status: 'server_error', code };

  const portal = await getPortalContext();
  const cookieStore = await cookies();
  if (!portal.session || !portal.repos) {
    cookieStore.set(PENDING_REDEEM_COOKIE, code, authCookieOptions(PENDING_CODE_MAX_AGE));
    redirectToLogin('portal', { next: '/portal/redeem-code', error: 'login_required' });
  }

  let outcome;
  try {
    outcome = await portal.repos.accessCodes.redeem(code);
  } catch (error) {
    // 只記錄錯誤類型，不記錄代碼或 token
    console.error('[redeem] repository error:', error instanceof Error ? error.name : 'unknown');
    return { status: 'server_error', code };
  }

  if (outcome.status === 'valid' || outcome.status === 'already_redeemed_by_current_user') {
    cookieStore.delete(PENDING_REDEEM_COOKIE);
    redirect(outcome.siteId ? `/portal/sites/${encodeURIComponent(outcome.siteId)}?redeem=${outcome.status}` : `/portal/redeem-code?result=${outcome.status}`);
  }
  return { status: outcome.status, code };
}
