import { formatDateTime, SITE_PROJECT_STATUS_LABELS, SITE_TYPE_LABELS } from '@syt/shared';
import { buttonClass, cardClass } from '@syt/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { siteTone } from '@/lib/status';
import { requirePortalPage } from '@/lib/auth/guards';

export const metadata: Metadata = { title: '我的網站' };

export default async function PortalSitesPage() {
  const { repos } = await requirePortalPage('/portal/sites');
  const sites = await repos.customerSites.listSites();
  return (
    <>
      <PageHeader
        title="我的網站"
        description="點選網站即可設定內容、外觀、SEO 與網域。"
        actions={
          <Link href="/portal/sites/new" className={buttonClass('primary')}>
            建立網站
          </Link>
        }
      />
      {sites.length === 0 ? (
        <EmptyState
          title="還沒有網站"
          description="先兌換權限代碼，再選擇版型建立網站。"
          action={
            <Link href="/portal/redeem-code" className={buttonClass('primary')}>
              兌換權限代碼
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {sites.map((site) => (
            <li key={site.id} className={`${cardClass} flex min-w-0 flex-col`}>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={siteTone[site.status]}>{SITE_PROJECT_STATUS_LABELS[site.status]}</StatusBadge>
                <StatusBadge>{SITE_TYPE_LABELS[site.siteType]}</StatusBadge>
              </div>
              <h2 className="mt-3 break-words text-lg font-bold text-ink">{site.name}</h2>
              <p className="mt-1 text-sm text-slate-gray">版型：{site.templateName}</p>
              <p className="mt-1 text-xs text-slate-gray">最後更新：{formatDateTime(site.updatedAt)}</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Link href={`/portal/sites/${site.id}`} className={buttonClass('primary', 'sm', 'w-full sm:w-auto')}>
                  管理網站
                </Link>
                <Link href={`/portal/sites/${site.id}/preview`} className={buttonClass('secondary', 'sm', 'w-full sm:w-auto')}>
                  預覽
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
