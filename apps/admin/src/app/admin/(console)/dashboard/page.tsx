import { formatDateTime, formatMoneyFromCents } from '@syt/shared';
import { cardClass } from '@syt/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { DataTablePlaceholder } from '@/components/ui/DataTablePlaceholder';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ORDER_STATUS_LABELS, orderTone } from '@/lib/status';
import { requireAdminPage } from '@/lib/auth/guards';
import { ForbiddenState } from '@/components/auth/ForbiddenState';

export const metadata: Metadata = { title: '儀表板' };

const launchChecklist = [
  { label: '建立第一位 owner（admin_profiles）', href: '/admin/settings/users' },
  { label: '確認方案價格並啟用', href: '/admin/commerce/prices' },
  { label: '設定金流 sandbox 參照名稱', href: '/admin/commerce/payment-providers' },
  { label: '發布第一批免費版型', href: '/admin/templates/list' },
  { label: '確認官網頁面 SEO', href: '/admin/cms/seo' },
];

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ error?: string | string[] }> }) {
  const { repos } = await requireAdminPage('/admin/dashboard');
  const { error } = await searchParams;
  const [stats, orders] = await Promise.all([repos.dashboard.getAdminStats(), repos.commerce.listOrders()]);

  return (
    <>
      <PageHeader title="儀表板" description="平台目前為 v1 階段：模板制自助建站、預覽不公開發布、金流尚未串接。" />
      {error === 'forbidden' && (
        <div className="mb-6">
          <ForbiddenState description="你的角色無法使用剛才的功能，已帶你回到儀表板。" />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="min-w-0">
          <h2 className="mb-3 text-lg font-bold text-ink">最近訂單</h2>
          <DataTablePlaceholder
            caption="最近訂單"
            columns={[
              { key: 'orderNumber', label: '訂單編號', className: 'whitespace-nowrap font-mono text-xs' },
              { key: 'buyer', label: '購買人' },
              { key: 'total', label: '金額' },
              { key: 'status', label: '狀態' },
              { key: 'createdAt', label: '建立時間', className: 'whitespace-nowrap' },
            ]}
            rows={orders.map((order) => ({
              id: order.id,
              orderNumber: order.orderNumber,
              buyer: order.buyerEmail,
              total: formatMoneyFromCents(order.totalCents),
              status: <StatusBadge tone={orderTone[order.status]}>{ORDER_STATUS_LABELS[order.status]}</StatusBadge>,
              createdAt: formatDateTime(order.createdAt),
            }))}
          />
        </section>
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
    </>
  );
}
