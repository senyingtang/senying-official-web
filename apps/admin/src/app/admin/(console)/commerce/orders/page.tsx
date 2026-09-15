import { formatDateTime, formatMoneyFromCents } from '@syt/shared';
import { buttonClass } from '@syt/ui';
import type { Metadata } from 'next';
import { DataTablePlaceholder } from '@/components/ui/DataTablePlaceholder';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ORDER_STATUS_LABELS, orderTone } from '@/lib/status';
import { requireAdminPage } from '@/lib/auth/guards';

export const metadata: Metadata = { title: '訂單' };

export default async function CommerceOrdersPage() {
  const { repos } = await requireAdminPage('/admin/commerce/orders');
  const orders = await repos.commerce.listOrders();
  return (
    <>
      <PageHeader
        eyebrow="商務"
        title="訂單"
        description="建立訂單與計價由伺服器端處理；付款成功後呼叫 mark_payment_success_and_issue_entitlement() 自動產生權限代碼（冪等，不會重複發放）。"
        actions={
          <button type="button" className={buttonClass('primary')} disabled>
            建立人工訂單
          </button>
        }
      />
      <div className="grid gap-4">
        <Notice>第一版未串金流：銀行轉帳或客服收款後，由 owner / admin 在訂單按「標記付款成功」。</Notice>
        <DataTablePlaceholder
          caption="訂單"
          columns={[
            { key: 'orderNumber', label: '訂單編號', className: 'whitespace-nowrap font-mono text-xs' },
            { key: 'buyer', label: '購買人' },
            { key: 'total', label: '金額' },
            { key: 'status', label: '狀態' },
            { key: 'createdAt', label: '建立時間', className: 'whitespace-nowrap' },
            { key: 'actions', label: '操作' },
          ]}
          rows={orders.map((order) => ({
            id: order.id,
            orderNumber: order.orderNumber,
            buyer: order.buyerEmail,
            total: formatMoneyFromCents(order.totalCents),
            status: <StatusBadge tone={orderTone[order.status]}>{ORDER_STATUS_LABELS[order.status]}</StatusBadge>,
            createdAt: formatDateTime(order.createdAt),
            actions: (
              <button type="button" className={buttonClass('dark', 'sm')} disabled>
                標記付款成功
              </button>
            ),
          }))}
        />
      </div>
    </>
  );
}
