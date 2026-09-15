import { cardClass } from '@syt/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { requireSiteAccess } from '@/lib/auth/guards';
import { RedeemCodeResult } from '@/components/portal/RedeemCodeResult';

export const metadata: Metadata = { title: '網站總覽' };

const CHECKLIST = [
  { segment: 'content', label: '填寫頁面內容', done: true },
  { segment: 'appearance', label: '確認外觀與品牌色', done: true },
  { segment: 'seo', label: '設定每頁 SEO', done: false },
  { segment: 'forms', label: '確認表單欄位與通知', done: false },
  { segment: 'preview', label: '檢查手機與桌機預覽', done: false },
  { segment: 'publish', label: '發布（v1 產生預覽版本）', done: false },
];

export default async function SiteOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ redeem?: string | string[] }>;
}) {
  const { siteId } = await params;
  const { site } = await requireSiteAccess(siteId, `/portal/sites/${siteId}`);
  const { redeem } = await searchParams;

  return (
    <>
      <PageHeader title="網站總覽" description={`版型：${site.templateName}`} />
      {(redeem === 'valid' || redeem === 'already_redeemed_by_current_user') && (
        <div className="mb-6">
          <RedeemCodeResult status={redeem} />
        </div>
      )}
      <section className={cardClass} aria-labelledby="checklist-heading">
        <h2 id="checklist-heading" className="text-lg font-bold text-ink">
          上線前檢查
        </h2>
        <ul className="mt-4 grid gap-2">
          {CHECKLIST.map((item) => (
            <li key={item.segment}>
              <Link
                href={`/portal/sites/${site.id}/${item.segment}`}
                className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border-gray px-4 py-3 hover:bg-mist-white"
              >
                <span className="min-w-0 text-sm text-ink">{item.label}</span>
                <StatusBadge tone={item.done ? 'success' : 'neutral'}>{item.done ? '完成' : '待處理'}</StatusBadge>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
