import { formatDateTime } from '@syt/shared';
import type { Metadata } from 'next';
import { DataTablePlaceholder } from '@/components/ui/DataTablePlaceholder';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { requireAdminPage } from '@/lib/auth/guards';

export const metadata: Metadata = { title: '操作紀錄' };

const ACTOR_LABELS = { admin: '後台', customer: '客戶', system: '系統', webhook: 'Webhook' } as const;

export default async function AuditLogsPage() {
  const { repos } = await requireAdminPage('/admin/settings/audit-logs');
  const logs = await repos.settings.listAuditLogs();
  return (
    <>
      <PageHeader eyebrow="設定" title="操作紀錄" description="audit_logs：只有 owner / admin 可讀，資料不可修改或刪除（append-only）。" />
      <DataTablePlaceholder
        caption="操作紀錄"
        columns={[
          { key: 'createdAt', label: '時間', className: 'whitespace-nowrap' },
          { key: 'actor', label: '操作者' },
          { key: 'type', label: '來源' },
          { key: 'action', label: '動作', className: 'font-mono text-xs' },
          { key: 'entity', label: '資料表', className: 'font-mono text-xs' },
        ]}
        rows={logs.map((log) => ({
          id: log.id,
          createdAt: formatDateTime(log.createdAt),
          actor: log.actorEmail ?? '—',
          type: <StatusBadge tone={log.actorType === 'admin' ? 'dark' : 'neutral'}>{ACTOR_LABELS[log.actorType]}</StatusBadge>,
          action: log.action,
          entity: log.entityType,
        }))}
      />
    </>
  );
}
