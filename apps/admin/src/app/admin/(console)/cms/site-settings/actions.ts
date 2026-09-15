'use server';

import { adminRouteMode, canAdmin } from '@syt/auth';
import { isPermissionDeniedError, SupabaseRepositoryError } from '@syt/database';
import { validateMarketingSiteSettings } from '@syt/database/site-settings';
import { requireAdminPage } from '@/lib/auth/guards';
import { parseSiteSettingsForm, type SiteSettingsFormState } from '@/lib/site-settings/form';

const ROUTE = '/admin/cms/site-settings';

/**
 * 儲存官網全站設定。
 * 權限在伺服器端再檢查一次（UI disabled 不是安全控制）：只有 owner / admin 可以寫入；supabase 模式另由 RLS 把關。
 */
export async function saveSiteSettingsAction(_state: SiteSettingsFormState, formData: FormData): Promise<SiteSettingsFormState> {
  const { session, repos } = await requireAdminPage(ROUTE);
  if (adminRouteMode(session.role, ROUTE) !== 'manage' || !canAdmin(session.role, 'cms_settings', 'update')) {
    return { status: 'forbidden', message: '你的角色只能查看全站設定，不能修改。', errors: {} };
  }

  const settings = parseSiteSettingsForm(formData);
  const validation = validateMarketingSiteSettings(settings);
  if (!validation.ok) return { status: 'invalid', message: '部分欄位需要修正，尚未儲存。', errors: validation.errors };

  try {
    const result = await repos.siteSettings.updateMarketingSiteSettings(settings);
    if (!result.persisted) return { status: 'mock', message: 'Mock 模式：欄位驗證通過，但不會寫入任何資料。', errors: {} };
    if (result.changedKeys.length === 0) return { status: 'saved', message: '沒有變更，資料未更新。', errors: {} };
    return { status: 'saved', message: '已儲存。官網為靜態網站，重新建置後才會套用新設定。', errors: {} };
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      return { status: 'forbidden', message: '資料庫拒絕寫入：你的角色沒有修改全站設定的權限。', errors: {} };
    }
    // 伺服器端記錄錯誤類型與代碼（不含設定內容、token 或 key），畫面只顯示一般訊息
    const name = error instanceof Error ? error.name : 'UnknownError';
    const code = error instanceof SupabaseRepositoryError ? error.code : null;
    const operation = error instanceof SupabaseRepositoryError ? error.operation : 'siteSettings.update';
    console.error(`[site-settings] save failed: ${name} operation=${operation} code=${code ?? 'none'}`);
    return { status: 'error', message: '儲存失敗，請稍後再試。', errors: {} };
  }
}
