import { DOMAIN_STATUS_LABELS, formatDateTime, SSL_STATUS_LABELS } from '@syt/shared';
import type { Metadata } from 'next';
import { DataTablePlaceholder } from '@/components/ui/DataTablePlaceholder';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { domainTone, sslTone } from '@/lib/status';
import { requireAdminPage } from '@/lib/auth/guards';

export const metadata: Metadata = { title: '網域' };

const KIND_LABELS = { platform_subdomain: '平台子網域', custom_subdomain: '自訂子網域', custom_apex: '根網域' } as const;

export default async function CustomerDomainsPage() {
  const { repos } = await requireAdminPage('/admin/customer-sites/domains');
  const domains = await repos.customerSites.listDomains();
  return (
    <>
      <PageHeader eyebrow="客戶網站" title="網域" description="site_project_domains：v2 平台子網域、v3 自訂網域。驗證狀態由 DNS 檢查 worker 更新，客戶無法自行標記。" />
      <DataTablePlaceholder
        caption="網域"
        columns={[
          { key: 'domain', label: '網域', className: 'font-mono text-xs' },
          { key: 'kind', label: '類型' },
          { key: 'status', label: '驗證' },
          { key: 'ssl', label: 'SSL' },
          { key: 'primary', label: '主要網域' },
          { key: 'checked', label: '最後檢查', className: 'whitespace-nowrap' },
        ]}
        rows={domains.map((domain) => ({
          id: domain.id,
          domain: domain.domain,
          kind: KIND_LABELS[domain.kind],
          status: <StatusBadge tone={domainTone[domain.status]}>{DOMAIN_STATUS_LABELS[domain.status]}</StatusBadge>,
          ssl: <StatusBadge tone={sslTone[domain.sslStatus]}>{SSL_STATUS_LABELS[domain.sslStatus]}</StatusBadge>,
          primary: domain.isPrimary ? '是' : '否',
          checked: formatDateTime(domain.lastCheckedAt),
        }))}
      />
    </>
  );
}
