import { formatDateTime } from '@syt/shared';
import type { Metadata } from 'next';
import { DataTablePlaceholder } from '@/components/ui/DataTablePlaceholder';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DEPLOYMENT_STATUS_LABELS, deploymentTone } from '@/lib/status';
import { requireAdminPage } from '@/lib/auth/guards';

export const metadata: Metadata = { title: '部署紀錄' };

export default async function DeploymentsPage() {
  const { repos } = await requireAdminPage('/admin/customer-sites/deployments');
  const deployments = await repos.customerSites.listDeployments();
  return (
    <>
      <PageHeader eyebrow="客戶網站" title="部署紀錄" description="customer_site_deployments 為內容版本；site_deployments 為把版本部署到目標的紀錄。" />
      <div className="grid gap-4">
        <Notice tone="warning">v1 不實際部署：發布只產生內容版本與預覽，部署紀錄狀態為「略過（預覽模式）」。</Notice>
        <DataTablePlaceholder
          caption="部署紀錄"
          minWidth={600}
          columns={[
            { key: 'site', label: '網站' },
            { key: 'version', label: '版本' },
            { key: 'status', label: '狀態' },
            { key: 'dryRun', label: 'Dry run' },
            { key: 'createdAt', label: '時間', className: 'whitespace-nowrap' },
          ]}
          rows={deployments.map((item) => ({
            id: item.id,
            site: item.siteName,
            version: `v${item.version}`,
            status: <StatusBadge tone={deploymentTone[item.status]}>{DEPLOYMENT_STATUS_LABELS[item.status]}</StatusBadge>,
            dryRun: item.isDryRun ? '是' : '否',
            createdAt: formatDateTime(item.createdAt),
          }))}
        />
      </div>
    </>
  );
}
