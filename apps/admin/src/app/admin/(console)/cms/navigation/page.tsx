import { adminRouteMode, canAdmin } from '@syt/auth';
import { buttonClass, cardClass } from '@syt/ui';
import type { Metadata } from 'next';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { TextInput, ToggleField } from '@/components/ui/fields';
import { requireAdminPage } from '@/lib/auth/guards';
import { saveNavigationItemAction } from './actions';

export const metadata: Metadata = { title: '選單管理' };

const ROUTE = '/admin/cms/navigation';
const MESSAGES: Record<string, string> = {
  forbidden: '你的角色不能修改選單（只有擁有者與管理員可以）。',
  label: '選單文字必須填寫，且不超過 60 字。',
  href: '連結請使用站內路徑（/ 開頭）或 https 網址。',
  sort_order: '排序請填 0–9999 的整數。',
  failed: '儲存失敗，請稍後再試。',
};

export default async function CmsNavigationPage({ searchParams }: { searchParams: Promise<{ done?: string; error?: string }> }) {
  const { session, repos } = await requireAdminPage('/admin/cms/navigation');
  const { done, error } = await searchParams;
  const items = await repos.cmsStructure.listNavigation();
  const canEdit = adminRouteMode(session.role, ROUTE) === 'manage' && canAdmin(session.role, 'navigation', 'update');
  const menus = [
    { key: 'header' as const, title: '主選單（Header）', description: '官網頁首導覽；停用的項目不會出現在官網。' },
    { key: 'footer' as const, title: '頁尾選單（Footer）', description: '官網頁尾的法律與說明連結。' },
  ];

  return (
    <>
      <PageHeader
        eyebrow="官網 CMS"
        title="選單管理"
        description="對應 cms_navigation_menus / cms_navigation_items。官網為靜態網站：儲存後需要重新建置才會套用。只有擁有者與管理員可以修改選單。"
      />

      {error && (
        <div className="mb-4">
          <Notice tone="danger" title={MESSAGES[error] ?? '操作失敗，請稍後再試。'}> </Notice>
        </div>
      )}
      {done && (
        <div className="mb-4" role="status">
          <Notice tone={done === 'mock' ? 'warning' : 'info'} title={done === 'mock' ? 'Mock 模式：欄位驗證通過，但不會寫入資料庫。' : '已儲存。重新建置官網後才會套用。'}>
            {' '}
          </Notice>
        </div>
      )}

      <div className="mt-6 grid gap-6">
        {menus.map((menu) => {
          const menuItems = items.filter((item) => item.menuKey === menu.key);
          return (
            <section key={menu.key} className={`${cardClass} min-w-0`} aria-labelledby={`menu-${menu.key}`}>
              <h2 id={`menu-${menu.key}`} className="text-lg font-bold text-ink">
                {menu.title}
              </h2>
              <p className="mt-1 text-sm text-slate-gray">{menu.description}</p>
              {menuItems.length === 0 ? (
                <p className="mt-4 text-sm text-slate-gray">這個選單目前沒有項目。</p>
              ) : (
                <div className="mt-4 grid gap-4">
                  {menuItems.map((item) => (
                    <form key={item.id} action={saveNavigationItemAction} data-nav-item={item.id} className="grid min-w-0 gap-3 rounded-xl border border-border-gray p-4 md:grid-cols-2">
                      <input type="hidden" name="id" value={item.id} />
                      <TextInput label="選單文字" name="label" defaultValue={item.label} maxLength={60} disabled={!canEdit} required />
                      <TextInput label="連結" name="href" defaultValue={item.href} disabled={!canEdit} required hint="站內路徑（/ 開頭）或 https 網址" />
                      <TextInput label="排序" name="sort_order" type="number" min={0} max={9999} step={10} defaultValue={String(item.sortOrder)} disabled={!canEdit} />
                      <div className="grid content-start gap-3">
                        <ToggleField label="啟用" name="enabled" defaultChecked={item.enabled} disabled={!canEdit} />
                        <ToggleField label="另開新視窗" name="open_in_new_tab" defaultChecked={item.openInNewTab} disabled={!canEdit} />
                      </div>
                      <div className="md:col-span-2 md:justify-self-end">
                        <button type="submit" className={buttonClass('primary', 'sm', 'w-full sm:w-auto')} disabled={!canEdit}>
                          儲存此項目
                        </button>
                      </div>
                    </form>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
