import { formatDateTime } from '@syt/shared';
import { cardClass } from '@syt/ui';
import type { Metadata } from 'next';
import { DomainSetupPanel } from '@/components/domain/DomainSetupPanel';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { serverEnv } from '@/lib/env';
import { requireSiteAccess } from '@/lib/auth/guards';

export const metadata: Metadata = { title: '網域設定' };

export default async function SiteDomainPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const { repos, site } = await requireSiteAccess(siteId, `/portal/sites/${siteId}/domain`);
  const domains = await repos.customerSites.listDomains(siteId);

  const platformRoot = serverEnv.platformSubdomainRoot;
  const defaultUrl = platformRoot ? `https://${site.id}.${platformRoot}` : null;
  const current = domains[0];

  return (
    <>
      <PageHeader title="網域設定" description="目前為第一版：網站先以預覽網址呈現。平台子網域於第二版開放，自訂網域於第三版開放。" />
      <div className="grid gap-6">
        <section className={`${cardClass} min-w-0`} aria-labelledby="default-url-heading">
          <h2 id="default-url-heading" className="text-lg font-bold text-ink">
            目前預設網址
          </h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="text-xs text-slate-gray">平台子網域</dt>
              <dd className="mt-1 break-all font-mono text-sm text-ink">{defaultUrl ?? '尚未設定平台網域（PLATFORM_SUBDOMAIN_ROOT）'}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-slate-gray">預覽</dt>
              <dd className="mt-1 flex flex-wrap items-center gap-2">
                <span className="break-all font-mono text-sm text-ink">{site.previewPath}</span>
                <StatusBadge tone="teal">v1 預覽</StatusBadge>
              </dd>
            </div>
          </dl>
        </section>

        <DomainSetupPanel
          platformRoot={platformRoot}
          lineHref={serverEnv.lineOaUrl ?? '/portal/support'}
          currentStatus={current?.status ?? 'pending'}
          currentSslStatus={current?.sslStatus ?? 'not_requested'}
          lastCheckedLabel={formatDateTime(current?.lastCheckedAt)}
        />
      </div>
    </>
  );
}
