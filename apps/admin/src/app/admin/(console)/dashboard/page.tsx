import { formatDateTime, formatMoneyFromCents } from '@syt/shared';
import { cardClass } from '@syt/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ForbiddenState } from '@/components/auth/ForbiddenState';
import { ModuleUnavailable } from '@/components/admin/ModuleUnavailable';
import { RebuildStatusCard } from '@/components/cms/RebuildStatusCard';
import { DataTablePlaceholder } from '@/components/ui/DataTablePlaceholder';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { requireAdminPage } from '@/lib/auth/guards';
import { safeLoad } from '@/lib/safe-load';
import { ENVIRONMENT_LABELS, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, SUBSCRIPTION_STATUS_LABELS, environmentTone, orderTone, paymentTone, subscriptionTone } from '@/lib/status';

export const metadata: Metadata = { title: '儀表板' };

const launchChecklist = [
  { label: '建立第一位 owner（admin_profiles）', href: '/admin/settings/users' },
  { label: '確認方案價格並啟用', href: '/admin/commerce/prices' },
  { label: '設定金流 sandbox 參照名稱', href: '/admin/commerce/payment-providers' },
  { label: '發布第一批免費版型', href: '/admin/templates/list' },
  { label: '整理官網文章與案例', href: '/admin/cms/blog' },
  { label: '確認官網頁面 SEO', href: '/admin/cms/seo' },
];

/**
 * 儀表板。
 *
 * 每個區塊各自安全載入（safeLoad）：已完成的 repository 顯示真實統計，
 * 尚未接上 Supabase 的 Phase 3 模組顯示「尚未啟用」，不會讓整頁 500，也不用假數字冒充真資料。
 */
export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ error?: string | string[] }> }) {
  const { session, repos } = await requireAdminPage('/admin/dashboard');
  const { error } = await searchParams;

  const [stats, blogCounts, caseCounts, siteSettings, rebuild, orders, orderCounts, subscriptions] = await Promise.all([
    safeLoad('dashboard.getAdminStats', () => repos.dashboard.getAdminStats()),
    safeLoad('cmsBlog.countsByStatus', () => repos.cmsBlog.countsByStatus()),
    safeLoad('cmsCases.countsByStatus', () => repos.cmsCases.countsByStatus()),
    safeLoad('siteSettings.get', () => repos.siteSettings.getMarketingSiteSettings()),
    safeLoad('marketingRebuild.getStatus', () => repos.marketingRebuild.getStatus()),
    safeLoad('commerce.listAdminOrders', () => repos.commerce.listAdminOrders({ limit: 8 })),
    safeLoad('commerce.getOrderStatusCounts', () => repos.commerce.getOrderStatusCounts()),
    safeLoad('commerce.listSubscriptions', () => repos.commerce.listSubscriptions({ limit: 5 })),
  ]);

  return (
    <>
      <PageHeader title="儀表板" description="平台目前為 v1 階段：模板制自助建站、預覽不公開發布、正式金流尚未開放（只開放本機 Sandbox 模擬付款）。" />
      {error === 'forbidden' && (
        <div className="mb-6">
          <ForbiddenState description="你的角色無法使用剛才的功能，已帶你回到儀表板。" />
        </div>
      )}

      {/* 平台概況 */}
      <section aria-labelledby="platform-heading" className="min-w-0">
        <h2 id="platform-heading" className="mb-3 text-lg font-bold text-ink">
          平台概況
        </h2>
        {stats.ok ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.data.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </div>
        ) : (
          <ModuleUnavailable title="平台概況" reason={stats.reason} />
        )}
      </section>

      {/* 官網內容 */}
      <section aria-labelledby="content-heading" className="mt-6 min-w-0">
        <h2 id="content-heading" className="mb-3 text-lg font-bold text-ink">
          官網內容
        </h2>
        {blogCounts.ok && caseCounts.ok ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="已發布文章" value={String(blogCounts.data.published)} hint="/blog 會輸出這些文章" />
            <StatCard label="草稿文章" value={String(blogCounts.data.draft + blogCounts.data.scheduled)} hint="含排程中，不會出現在官網" />
            <StatCard label="已發布案例" value={String(caseCounts.data.published)} hint="/cases 會輸出這些案例" />
            <StatCard label="草稿案例" value={String(caseCounts.data.draft + caseCounts.data.scheduled)} hint="含排程中，不會出現在官網" />
          </div>
        ) : (
          <ModuleUnavailable title="官網內容" reason={!blogCounts.ok ? blogCounts.reason : !caseCounts.ok ? caseCounts.reason : 'error'} />
        )}
      </section>

      {/* 商務概況 */}
      <section aria-labelledby="commerce-heading" className="mt-6 min-w-0">
        <h2 id="commerce-heading" className="mb-3 text-lg font-bold text-ink">
          商務概況
        </h2>
        {orderCounts.ok ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="訂單總數" value={String(orderCounts.data.total)} hint="commerce_orders" />
            <StatCard label="已付款" value={String(orderCounts.data.paid)} hint="含已發放權限代碼" />
            <StatCard label="待付款" value={String(orderCounts.data.awaitingPayment)} hint="尚未收到付款回調" />
            <StatCard label="已收款金額" value={formatMoneyFromCents(orderCounts.data.grossPaidCents)} hint="沙箱訂單為模擬金額" />
          </div>
        ) : (
          <ModuleUnavailable title="商務概況" reason={orderCounts.reason} />
        )}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="min-w-0">
          <h2 className="mb-3 text-lg font-bold text-ink">最近訂單</h2>
          {orders.ok ? (
            <DataTablePlaceholder
              caption="最近訂單"
              emptyTitle="還沒有訂單"
              emptyDescription="官網完成一次結帳後，訂單會出現在這裡。"
              footnote="資料來自 commerce_orders；點訂單編號查看明細。"
              columns={[
                { key: 'orderNumber', label: '訂單編號', className: 'whitespace-nowrap font-mono text-xs' },
                { key: 'buyer', label: '購買人' },
                { key: 'total', label: '金額', className: 'whitespace-nowrap' },
                { key: 'status', label: '狀態' },
                { key: 'payment', label: '付款' },
                { key: 'createdAt', label: '建立時間', className: 'whitespace-nowrap' },
              ]}
              rows={orders.data.map((order) => ({
                id: order.id,
                orderNumber: (
                  <Link href={`/admin/commerce/orders/${order.id}`} className="font-semibold text-teal-strong hover:underline">
                    {order.orderNumber}
                  </Link>
                ),
                buyer: order.buyerEmail,
                total: formatMoneyFromCents(order.totalCents, order.currency),
                status: <StatusBadge tone={orderTone[order.status]}>{ORDER_STATUS_LABELS[order.status]}</StatusBadge>,
                payment: order.paymentStatus ? (
                  <span className="flex flex-wrap items-center gap-1">
                    <StatusBadge tone={paymentTone[order.paymentStatus]}>{PAYMENT_STATUS_LABELS[order.paymentStatus]}</StatusBadge>
                    {order.paymentEnvironment && <StatusBadge tone={environmentTone[order.paymentEnvironment]}>{ENVIRONMENT_LABELS[order.paymentEnvironment]}</StatusBadge>}
                  </span>
                ) : (
                  <span className="text-xs text-slate-gray">尚未建立付款</span>
                ),
                createdAt: formatDateTime(order.createdAt),
              }))}
            />
          ) : (
            <ModuleUnavailable title="最近訂單" reason={orders.reason} />
          )}
        </section>

        <div className="grid min-w-0 content-start gap-6">
          {rebuild.ok ? <RebuildStatusCard status={rebuild.data} /> : <ModuleUnavailable title="網站內容狀態" reason={rebuild.reason} />}

          {siteSettings.ok ? (
            <section className={`${cardClass} min-w-0`} aria-labelledby="site-settings-heading">
              <h2 id="site-settings-heading" className="text-lg font-bold text-ink">
                全站設定
              </h2>
              <dl className="mt-3 grid gap-2 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-slate-gray">品牌名稱</dt>
                  <dd className="font-medium text-ink">
                    {siteSettings.data.brand.brandNameZh} {siteSettings.data.brand.brandNameEn}
                  </dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-slate-gray">已啟用社群連結</dt>
                  <dd className="font-medium text-ink">{siteSettings.data.socials.filter((item) => item.enabled && item.url).length} 組</dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-slate-gray">浮動快捷列</dt>
                  <dd className="font-medium text-ink">{siteSettings.data.floatingActions.enabled ? '已啟用' : '已關閉'}</dd>
                </div>
              </dl>
              <Link href="/admin/cms/site-settings" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-teal-strong hover:underline">
                前往全站設定 →
              </Link>
            </section>
          ) : (
            <ModuleUnavailable title="全站設定" reason={siteSettings.reason} />
          )}

          {subscriptions.ok ? (
            <section className={`${cardClass} min-w-0`} aria-labelledby="subscriptions-heading">
              <h2 id="subscriptions-heading" className="text-lg font-bold text-ink">
                訂閱
              </h2>
              <p className="mt-1 text-xs text-slate-gray">唯讀：目前沒有實作定期扣款。</p>
              {subscriptions.data.length === 0 ? (
                <p className="mt-3 text-sm text-slate-gray">還沒有訂閱紀錄。</p>
              ) : (
                <ul className="mt-3 grid gap-2 text-sm">
                  {subscriptions.data.map((sub) => (
                    <li key={sub.id} className="flex flex-wrap items-center justify-between gap-2">
                      <span className="min-w-0 text-ink">{sub.planName}</span>
                      <StatusBadge tone={subscriptionTone[sub.status]}>{SUBSCRIPTION_STATUS_LABELS[sub.status]}</StatusBadge>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/admin/commerce/subscriptions" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-teal-strong hover:underline">
                前往訂閱 →
              </Link>
            </section>
          ) : (
            <ModuleUnavailable title="訂閱" reason={subscriptions.reason} />
          )}
          <ModuleUnavailable title="部署紀錄" reason="not_implemented" note="客戶網站部署模組將於後續階段接入，目前沒有可顯示的資料。" />

          <section className={`${cardClass} min-w-0`}>
            <h2 className="text-lg font-bold text-ink">上線前待辦</h2>
            <ul className="mt-3 grid gap-2">
              {launchChecklist.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="block rounded-lg px-3 py-2 text-sm text-ink hover:bg-mist-white">
                    ☐ {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {session.mode === 'supabase' && (
        <p className="mt-6 text-xs text-slate-gray">
          資料來源：Supabase（DATA_SOURCE=supabase）。尚未接線的模組會標示「尚未啟用」，不會以示範數字取代真實資料。
        </p>
      )}
    </>
  );
}
