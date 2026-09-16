'use server';

import { adminRouteMode, canAdmin } from '@syt/auth';
import { isPermissionDeniedError } from '@syt/database';
import { isSafeContentUrl } from '@syt/shared';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdminPage } from '@/lib/auth/guards';

const ROUTE = '/admin/cms/navigation';

/**
 * 更新單一選單項目（label / href / 排序 / 啟用）。
 * 只有 owner / admin 可以修改（RLS：cms_navigation_items_admin_manage）。
 */
export async function saveNavigationItemAction(formData: FormData): Promise<void> {
  const { session, repos } = await requireAdminPage(ROUTE);
  const id = String(formData.get('id') ?? '').trim();
  if (adminRouteMode(session.role, ROUTE) !== 'manage' || !canAdmin(session.role, 'navigation', 'update') || !id) redirect(`${ROUTE}?error=forbidden`);

  const label = String(formData.get('label') ?? '').trim();
  const href = String(formData.get('href') ?? '').trim();
  const sortOrder = Number(String(formData.get('sort_order') ?? '0'));
  const enabled = formData.get('enabled') === 'on';
  const openInNewTab = formData.get('open_in_new_tab') === 'on';

  if (!label || label.length > 60) redirect(`${ROUTE}?error=label`);
  if (!isSafeContentUrl(href) || !/^(\/(?!\/)|https:\/\/)/.test(href)) redirect(`${ROUTE}?error=href`);
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 9999) redirect(`${ROUTE}?error=sort_order`);

  // redirect() 以例外實作，必須放在 try 之外
  let outcome: string | null = null;
  try {
    const result = await repos.cmsStructure.updateNavigationItem(id, { label, href, sortOrder, enabled, openInNewTab });
    if (!result.persisted) outcome = 'mock';
    else await repos.marketingRebuild.trigger('選單已更新').catch(() => undefined);
  } catch (error) {
    outcome = isPermissionDeniedError(error) ? 'forbidden' : 'failed';
    console.error(`[cms.navigation] update failed: ${error instanceof Error ? error.name : 'UnknownError'}`);
  }
  revalidatePath(ROUTE);
  redirect(outcome === 'mock' ? `${ROUTE}?done=mock` : outcome ? `${ROUTE}?error=${outcome}` : `${ROUTE}?done=saved`);
}
