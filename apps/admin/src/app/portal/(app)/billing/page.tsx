import { formatDateTime, PRODUCT_CODE_LABELS } from '@syt/shared';
import { buttonClass, cardClass } from '@syt/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { requirePortalPage } from '@/lib/auth/guards';

export const metadata: Metadata = { title: '方案權限' };

const STATUS = { active: ['使用中', 'success'], expired: ['已到期', 'neutral'], revoked: ['已撤銷', 'danger'], suspended: ['已暫停', 'warning'] } as const;

export default async function BillingPage() {
  const { repos } = await requirePortalPage('/portal/billing');
  const entitlements = await repos.portal.listEntitlements();
  return (
    <>
      <PageHeader
        title="方案權限"
        description="目前工作區已開通的方案、網站額度與到期日。"
        actions={
          <Link href="/portal/redeem-code" className={buttonClass('primary')}>
            兌換新代碼
          </Link>
        }
      />
      <ul className="grid gap-4 md:grid-cols-2">
        {entitlements.map((item) => {
          const [label, tone] = STATUS[item.status];
          return (
            <li key={item.id} className={`${cardClass} min-w-0`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-ink">{item.planName}</p>
                <StatusBadge tone={tone}>{label}</StatusBadge>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-slate-gray">類型</dt>
                  <dd className="mt-1 text-ink">{PRODUCT_CODE_LABELS[item.productCode]}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-gray">網站額度</dt>
                  <dd className="mt-1 text-ink">
                    {item.siteQuotaUsed} / {item.siteQuotaLimit ?? '不限'}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-slate-gray">到期日</dt>
                  <dd className="mt-1 text-ink">{item.expiresAt ? formatDateTime(item.expiresAt) : '無期限'}</dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ul>
      <p className="mt-6 text-sm text-slate-gray">月繳 / 年繳訂閱與帳單將在線上付款開放後顯示；需要發票或方案調整請聯絡客服。</p>
    </>
  );
}
