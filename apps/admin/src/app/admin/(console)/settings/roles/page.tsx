import { canAdmin, CMS_ADMIN_ROLE_LABELS, CMS_ADMIN_ROLES, type AdminResource } from '@syt/auth';
import type { Metadata } from 'next';
import { DataTablePlaceholder } from '@/components/ui/DataTablePlaceholder';
import { PageHeader } from '@/components/ui/PageHeader';
import { requireAdminPage } from '@/lib/auth/guards';

export const metadata: Metadata = { title: '角色權限' };

const RESOURCES: { key: AdminResource; label: string }[] = [
  { key: 'cms_content', label: '頁面 / 產品 / 案例 / SEO' },
  { key: 'cms_settings', label: '站點設定' },
  { key: 'navigation', label: '選單 / 轉址' },
  { key: 'blog_own', label: '文章' },
  { key: 'commerce', label: '商品 / 訂單' },
  { key: 'payment_providers', label: '金流設定' },
  { key: 'access_codes', label: '權限代碼' },
  { key: 'templates', label: '版型' },
  { key: 'customer_sites', label: '客戶網站' },
  { key: 'seo_generator', label: 'SEO 文章生產器' },
  { key: 'admin_users', label: '後台帳號' },
  { key: 'audit_logs', label: '操作紀錄' },
];

function describe(role: (typeof CMS_ADMIN_ROLES)[number], resource: AdminResource): string {
  const letters = [
    canAdmin(role, resource, 'create') ? 'C' : '',
    canAdmin(role, resource, 'read') ? 'R' : '',
    canAdmin(role, resource, 'update') ? 'U' : '',
    canAdmin(role, resource, 'delete') ? 'D' : '',
  ].join('');
  return letters || '—';
}

export default async function SettingsRolesPage() {
  await requireAdminPage('/admin/settings/roles');
  return (
    <>
      <PageHeader eyebrow="設定" title="角色權限" description="UI 與 Server Action 使用 @syt/auth 權限矩陣；資料庫 RLS 為最後防線（RLS_SPEC_v2.md）。權限代碼不提供 C（由系統自動產生）。" />
      <DataTablePlaceholder
        caption="角色權限矩陣"
        minWidth={760}
        footnote="C 新增・R 讀取・U 修改・D 刪除。文章的 author 權限限自己撰寫的文章。"
        columns={[{ key: 'resource', label: '功能' }, ...CMS_ADMIN_ROLES.map((role) => ({ key: role, label: CMS_ADMIN_ROLE_LABELS[role], className: 'font-mono' }))]}
        rows={RESOURCES.map((resource) => ({
          id: resource.key,
          resource: resource.label,
          ...Object.fromEntries(CMS_ADMIN_ROLES.map((role) => [role, describe(role, resource.key)])),
        }))}
      />
    </>
  );
}
