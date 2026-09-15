import { SITE_PROJECT_STATUS_LABELS, SITE_TYPE_LABELS } from '@syt/shared';
import { buttonClass, cardClass } from '@syt/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { siteTone } from '@/lib/status';
import { requirePortalPage } from '@/lib/auth/guards';
import { ForbiddenState } from '@/components/auth/ForbiddenState';

export const metadata: Metadata = { title: '總覽' };

export default async function PortalDashboardPage({ searchParams }: { searchParams: Promise<{ error?: string | string[] }> }) {
  const { repos } = await requirePortalPage('/portal/dashboard');
  const { error } = await searchParams;
  const [stats, sites] = await Promise.all([repos.dashboard.getPortalStats(), repos.customerSites.listSites()]);

  return (
    <>
      <PageHeader
        title="歡迎回來"
        description="在這裡管理你的網站內容、SEO 與表單紀錄。"
        actions={
          <>
            <Link href="/portal/redeem-code" className={buttonClass('secondary')}>
              兌換權限代碼
            </Link>
            <Link href="/portal/sites/new" className={buttonClass('primary')}>
              建立網站
            </Link>
          </>
        }
      />
      {error === 'forbidden' && (
        <div className="mb-6">
          <ForbiddenState title="無法開啟這個網站" description="這個網站不存在，或不屬於你的工作區，已帶你回到總覽。" />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>
      <h2 className="mb-3 mt-8 text-lg font-bold text-ink">我的網站</h2>
      <ul className="grid gap-4 md:grid-cols-2">
        {sites.map((site) => (
          <li key={site.id} className={`${cardClass} min-w-0`}>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={siteTone[site.status]}>{SITE_PROJECT_STATUS_LABELS[site.status]}</StatusBadge>
              <StatusBadge>{SITE_TYPE_LABELS[site.siteType]}</StatusBadge>
            </div>
            <p className="mt-3 break-words font-semibold text-ink">{site.name}</p>
            <p className="mt-1 text-sm text-slate-gray">版型：{site.templateName}</p>
            <Link href={`/portal/sites/${site.id}`} className={buttonClass('secondary', 'sm', 'mt-4')}>
              管理網站
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
