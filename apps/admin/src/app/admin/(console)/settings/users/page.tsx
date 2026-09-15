import { CMS_ADMIN_ROLE_LABELS } from '@syt/auth';
import { buttonClass } from '@syt/ui';
import type { Metadata } from 'next';
import { DataTablePlaceholder } from '@/components/ui/DataTablePlaceholder';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { requireAdminPage } from '@/lib/auth/guards';

export const metadata: Metadata = { title: '後台帳號' };

export default async function SettingsUsersPage() {
  const { session } = await requireAdminPage('/admin/settings/users');
  return (
    <>
      <PageHeader
        eyebrow="設定"
        title="後台帳號"
        description="admin_profiles：只有 owner 可以新增、修改或停用後台帳號。"
        actions={
          <button type="button" className={buttonClass('primary')} disabled>
            邀請帳號
          </button>
        }
      />
      <div className="grid gap-4">
        <Notice tone="warning" title="最後一位 owner 受保護">資料庫會阻擋刪除、停用或降級最後一位啟用中的 owner。第一位 owner 需由 SQL Editor（service role）建立，不寫入 migration。</Notice>
        <DataTablePlaceholder
          caption="後台帳號"
          minWidth={560}
          columns={[
            { key: 'name', label: '名稱' },
            { key: 'email', label: 'Email' },
            { key: 'role', label: '角色' },
            { key: 'status', label: '狀態' },
          ]}
          rows={[
            {
              id: session.user.id,
              name: session.user.displayName,
              email: session.user.email,
              role: CMS_ADMIN_ROLE_LABELS[session.role],
              status: <StatusBadge tone="success">{session.mode === 'mock' ? '啟用（mock）' : '啟用'}</StatusBadge>,
            },
          ]}
        />
      </div>
    </>
  );
}
