import { SITE_PROJECT_STATUS_LABELS, SITE_TYPE_LABELS } from '@syt/shared';
import type { ReactNode } from 'react';
import { SiteTabs } from '@/components/portal/SiteTabs';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { requireSiteAccess } from '@/lib/auth/guards';
import { siteTone } from '@/lib/status';

/** 網站層 guard：網站必須屬於使用者的 workspace，否則導向 /portal/dashboard?error=forbidden */
export default async function SiteLayout({ children, params }: { children: ReactNode; params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const { site } = await requireSiteAccess(siteId, `/portal/sites/${siteId}`);

  return (
    <div className="min-w-0">
      <div className="mb-3">
        <p className="text-xs text-slate-gray">目前網站</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <p className="break-words text-lg font-bold text-ink">{site.name}</p>
          <StatusBadge tone={siteTone[site.status]}>{SITE_PROJECT_STATUS_LABELS[site.status]}</StatusBadge>
          <StatusBadge>{SITE_TYPE_LABELS[site.siteType]}</StatusBadge>
        </div>
      </div>
      <SiteTabs siteId={site.id} />
      <div className="mt-6 min-w-0">{children}</div>
    </div>
  );
}
