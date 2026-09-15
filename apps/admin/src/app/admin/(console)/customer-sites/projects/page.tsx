import { formatDateTime, SITE_PROJECT_STATUS_LABELS, SITE_TYPE_LABELS } from '@syt/shared';
import type { Metadata } from 'next';
import { DataTablePlaceholder } from '@/components/ui/DataTablePlaceholder';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { siteTone } from '@/lib/status';
import { requireAdminPage } from '@/lib/auth/guards';

export const metadata: Metadata = { title: '網站專案' };

export default async function CustomerSiteProjectsPage() {
  const { repos } = await requireAdminPage('/admin/customer-sites/projects');
  const sites = await repos.customerSites.listSites();
  return (
    <>
      <PageHeader eyebrow="客戶網站" title="網站專案" description="customer_site_projects：由 create_site_project_from_template() 建立，客戶不可自由新增頁面與區塊。" />
      <DataTablePlaceholder
        caption="網站專案"
        columns={[
          { key: 'name', label: '網站' },
          { key: 'type', label: '類型' },
          { key: 'workspace', label: '工作區' },
          { key: 'template', label: '版型' },
          { key: 'status', label: '狀態' },
          { key: 'updatedAt', label: '更新時間', className: 'whitespace-nowrap' },
        ]}
        rows={sites.map((site) => ({
          id: site.id,
          name: site.name,
          type: SITE_TYPE_LABELS[site.siteType],
          workspace: site.workspaceName,
          template: site.templateName,
          status: <StatusBadge tone={siteTone[site.status]}>{SITE_PROJECT_STATUS_LABELS[site.status]}</StatusBadge>,
          updatedAt: formatDateTime(site.updatedAt),
        }))}
      />
    </>
  );
}
