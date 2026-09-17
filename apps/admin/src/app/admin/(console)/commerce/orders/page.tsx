import { formatDateTime, formatMoneyFromCents } from '@syt/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ModuleUnavailable } from '@/components/admin/ModuleUnavailable';
import { DataTablePlaceholder } from '@/components/ui/DataTablePlaceholder';
import { EmptyState } from '@/components/ui/EmptyState';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { requireAdminPage } from '@/lib/auth/guards';
import { safeLoad } from '@/lib/safe-load';
import { ENVIRONMENT_LABELS, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, environmentTone, orderTone, paymentTone } from '@/lib/status';

export const metadata: Metadata = { title: '訂單' };

/**
 * 訂單列表（Phase 3.0）。
 *
 * 資料全部來自 commerce_orders / commerce_payments / entitlement_access_codes。
 * 後台不提供「手動標記付款成功」：付款狀態只能由金流回調寫入
 * （mark_payment_success_and_issue_entitlement），避免後台變成第二條發碼路徑。
 */
export default async function CommerceOrdersPage() {
  const { repos } = await requireAdminPage('/admin/commerce/orders');
  const [orders, counts] = await Promise.all([
    safeLoad('commerce.listAdminOrders', () => repos.commerce.listAdminOrders({ limit: 100 })),
    safeLoad('commerce.getOrderStatusCounts', () => repos.commerce.getOrderStatusCounts()),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="商務"
        title="訂單"
        description="訂單金額由 create_order_from_cart() 依資料庫價格重新計算；付款成功與權限代碼由金流回調觸發 mark_payment_success_and_issue_entitlement()（冪等，不會重複發放）。"
      />
      <div className="grid gap-4">
        <Notice tone="warning" title="目前只開放本機 Sandbox 模擬付款">
          正式金流（綠界、LINE Pay、銀行轉帳）尚未啟用，下方「沙箱（模擬）」的訂單沒有任何實際金流往來。後台無法手動標記付款成功。
        </Notice>

        {counts.ok ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="訂單總數" value={String(counts.data.total)} hint="commerce_orders" />
            <StatCard label="已付款" value={String(counts.data.paid)} hint="含已發放權限代碼" />
            <StatCard label="待付款" value={String(counts.data.awaitingPayment)} hint="尚未收到付款回調" />
            <StatCard label="已收款金額" value={formatMoneyFromCents(counts.data.grossPaidCents)} hint="沙箱訂單為模擬金額" />
          </div>
        ) : (
          <ModuleUnavailable title="訂單統計" reason={counts.reason} />
        )}

        {!orders.ok ? (
          <ModuleUnavailable title="訂單" reason={orders.reason} />
        ) : orders.data.length === 0 ? (
          <EmptyState title="還沒有訂單" description="官網完成一次結帳後，訂單會出現在這裡。" />
        ) : (
          <DataTablePlaceholder
            caption="訂單"
            footnote="資料來自 commerce_orders / commerce_payments；點訂單編號查看明細。"
            columns={[
              { key: 'orderNumber', label: '訂單編號', className: 'whitespace-nowrap font-mono text-xs' },
              { key: 'buyer', label: '購買人' },
              { key: 'total', label: '金額', className: 'whitespace-nowrap' },
              { key: 'status', label: '訂單狀態' },
              { key: 'payment', label: '付款' },
              { key: 'codes', label: '權限代碼', className: 'whitespace-nowrap' },
              { key: 'createdAt', label: '建立時間', className: 'whitespace-nowrap' },
            ]}
            rows={orders.data.map((order) => ({
              id: order.id,
              orderNumber: (
                <Link href={`/admin/commerce/orders/${order.id}`} className="font-semibold text-teal-strong hover:underline">
                  {order.orderNumber}
                </Link>
              ),
              buyer: (
                <span>
                  <span className="block text-ink">{order.buyerName}</span>
                  <span className="block text-xs text-slate-gray">{order.buyerEmail}</span>
                </span>
              ),
              total: (
                <span>
                  <span className="block font-semibold text-ink">{formatMoneyFromCents(order.totalCents, order.currency)}</span>
                  <span className="block text-xs text-slate-gray">{order.itemCount} 項</span>
                </span>
              ),
              status: <StatusBadge tone={orderTone[order.status]}>{ORDER_STATUS_LABELS[order.status]}</StatusBadge>,
              payment: order.paymentStatus ? (
                <span className="flex flex-wrap items-center gap-1">
                  <StatusBadge tone={paymentTone[order.paymentStatus]}>{PAYMENT_STATUS_LABELS[order.paymentStatus]}</StatusBadge>
                  {order.paymentEnvironment && <StatusBadge tone={environmentTone[order.paymentEnvironment]}>{ENVIRONMENT_LABELS[order.paymentEnvironment]}</StatusBadge>}
                </span>
              ) : (
                <span className="text-xs text-slate-gray">尚未建立付款</span>
              ),
              codes: order.accessCodeCount > 0 ? `${order.accessCodeCount} 組` : '—',
              createdAt: formatDateTime(order.createdAt),
            }))}
          />
        )}
      </div>
    </>
  );
}
