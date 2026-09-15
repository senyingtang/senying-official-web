import 'server-only';
import { decideAdminRoute, decideAdminSession, decidePortalAccess, decideSiteAccess, type AdminSession, type PortalSession } from '@syt/auth';
import type { CustomerSiteSummary, Repositories } from '@syt/database';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { PATHNAME_HEADER } from './cookies';
import { getAdminContext, getPortalContext } from './server';

/**
 * Server guard：真正的權限檢查（proxy.ts 只做 cookie 粗檢）。
 * - layout 呼叫 require*Session：進入該後台區域的基本條件
 * - 每個 page 再呼叫 require*Page / requireSiteAccess：layout 在 client 導覽時不會重新執行，不能只靠 layout
 * - 回傳的 repos 已綁定目前使用者範圍；權限明細只留在伺服器端
 */

export interface AdminGuardResult {
  session: AdminSession;
  repos: Repositories;
}

export interface PortalGuardResult {
  session: PortalSession;
  repos: Repositories;
}

export interface SiteGuardResult extends PortalGuardResult {
  site: CustomerSiteSummary;
}

async function requestPathname(): Promise<string | undefined> {
  return (await headers()).get(PATHNAME_HEADER) ?? undefined;
}

/** 官方後台 layout：已登入 + admin_profiles 有效角色；不是後台成員 → /admin/login?error=not_admin */
export async function requireAdminSession(): Promise<AdminGuardResult> {
  const context = await getAdminContext();
  const decision = decideAdminSession({ user: context.user, role: context.role, pathname: await requestPathname() });
  if (decision.kind === 'redirect') redirect(decision.location);
  if (!context.session || !context.repos) redirect('/admin/login?error=login_required');
  return { session: context.session, repos: context.repos };
}

/** 官方後台頁面：再依路由規則檢查角色；無權限 → /admin/dashboard?error=forbidden */
export async function requireAdminPage(pathname: string): Promise<AdminGuardResult> {
  const context = await getAdminContext();
  const decision = decideAdminRoute({ user: context.user, role: context.role, pathname });
  if (decision.kind === 'redirect') redirect(decision.location);
  if (!context.session || !context.repos) redirect('/admin/login?error=login_required');
  return { session: context.session, repos: context.repos };
}

/** 客戶後台 layout：已登入即可（無工作區的使用者仍可使用客服頁） */
export async function requirePortalSession(): Promise<PortalGuardResult> {
  const context = await getPortalContext();
  const decision = decidePortalAccess({
    user: context.user,
    memberships: context.memberships,
    pathname: (await requestPathname()) ?? '/portal/dashboard',
    requireWorkspace: false,
  });
  if (decision.kind === 'redirect') redirect(decision.location);
  if (!context.session || !context.repos) redirect('/portal/login?error=login_required');
  return { session: context.session, repos: context.repos };
}

/** 客戶後台頁面：預設需要至少一個 active workspace；沒有 → /portal/redeem-code?reason=no_workspace */
export async function requirePortalPage(pathname: string, options: { requireWorkspace?: boolean } = {}): Promise<PortalGuardResult> {
  const context = await getPortalContext();
  const decision = decidePortalAccess({
    user: context.user,
    memberships: context.memberships,
    pathname,
    requireWorkspace: options.requireWorkspace ?? true,
  });
  if (decision.kind === 'redirect') redirect(decision.location);
  if (!context.session || !context.repos) redirect('/portal/login?error=login_required');
  return { session: context.session, repos: context.repos };
}

/**
 * /portal/sites/[siteId]/*：網站必須屬於使用者的 workspace。
 * 不存在或不屬於自己的網站都導向 /portal/dashboard?error=forbidden，不透露網站是否存在。
 */
export async function requireSiteAccess(siteId: string, pathname: string): Promise<SiteGuardResult> {
  const { session, repos } = await requirePortalPage(pathname);
  const siteWorkspaceId = await repos.customerSites.getSiteWorkspaceId(siteId);
  const decision = decideSiteAccess({ user: session.user, memberships: session.memberships, siteWorkspaceId, pathname });
  if (decision.kind === 'redirect') redirect(decision.location);
  const site = await repos.customerSites.getSite(siteId);
  if (!site) redirect('/portal/dashboard?error=forbidden');
  return { session, repos, site };
}
