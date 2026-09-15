import { canAccessAdminRoute } from './permissions';
import { loginPath } from './redirects';
import type { CmsAdminRole } from './roles';
import type { AuthUser, WorkspaceMembership } from './session';

/**
 * 純函式權限判斷（不讀 cookie、不查資料庫），由 app 的 server guard 取得資料後呼叫。
 * 方便在不同框架重用與測試。
 */
export type GuardDenyReason = 'unauthenticated' | 'not_admin' | 'forbidden' | 'no_workspace' | 'site_forbidden';

export type GuardDecision = { kind: 'allow' } | { kind: 'redirect'; location: string; reason: GuardDenyReason };

const allow: GuardDecision = { kind: 'allow' };

/** 官方後台 session（layout 層）：已登入 + admin_profiles 有效角色 */
export function decideAdminSession(input: { user: AuthUser | null; role: CmsAdminRole | null; pathname?: string }): GuardDecision {
  if (!input.user) {
    return { kind: 'redirect', location: loginPath('admin', { next: input.pathname, error: 'login_required' }), reason: 'unauthenticated' };
  }
  if (!input.role) {
    return { kind: 'redirect', location: loginPath('admin', { error: 'not_admin' }), reason: 'not_admin' };
  }
  return allow;
}

/** 官方後台頁面：session + 路由角色權限 */
export function decideAdminRoute(input: { user: AuthUser | null; role: CmsAdminRole | null; pathname: string }): GuardDecision {
  const session = decideAdminSession(input);
  if (session.kind === 'redirect') return session;
  if (!canAccessAdminRoute(input.role, input.pathname)) {
    return { kind: 'redirect', location: '/admin/dashboard?error=forbidden', reason: 'forbidden' };
  }
  return allow;
}

/** 客戶後台：已登入；需要工作區的頁面另外檢查是否有 active membership */
export function decidePortalAccess(input: {
  user: AuthUser | null;
  memberships: WorkspaceMembership[];
  pathname: string;
  requireWorkspace: boolean;
}): GuardDecision {
  if (!input.user) {
    return { kind: 'redirect', location: loginPath('portal', { next: input.pathname, error: 'login_required' }), reason: 'unauthenticated' };
  }
  if (input.requireWorkspace && input.memberships.length === 0) {
    return { kind: 'redirect', location: '/portal/redeem-code?reason=no_workspace', reason: 'no_workspace' };
  }
  return allow;
}

/**
 * 網站頁面：siteWorkspaceId 必須屬於使用者的 workspace。
 * siteWorkspaceId 為 null（不存在或 RLS 看不到）一律視為無權限，不透露網站是否存在。
 */
export function decideSiteAccess(input: {
  user: AuthUser | null;
  memberships: WorkspaceMembership[];
  siteWorkspaceId: string | null;
  pathname: string;
}): GuardDecision {
  const portal = decidePortalAccess({ ...input, requireWorkspace: true });
  if (portal.kind === 'redirect') return portal;
  if (!input.siteWorkspaceId || !input.memberships.some((membership) => membership.workspaceId === input.siteWorkspaceId)) {
    return { kind: 'redirect', location: '/portal/dashboard?error=forbidden', reason: 'site_forbidden' };
  }
  return allow;
}
