import { BILLING_INTERVAL_LABELS, formatDateTime } from '@syt/shared';
import type { Metadata } from 'next';
import { DataTablePlaceholder } from '@/components/ui/DataTablePlaceholder';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SUBSCRIPTION_STATUS_LABELS, subscriptionTone } from '@/lib/status';
import { requireAdminPage } from '@/lib/auth/guards';

export const metadata: Metadata = { title: '訂閱' };

export default async function SubscriptionsPage() {
  const { repos } = await requireAdminPage('/admin/commerce/subscriptions');
  const subscriptions = await repos.commerce.listSubscriptions();
  return (
    <>
      <PageHeader
        eyebrow="商務"
        title="訂閱"
        description="customer_subscriptions：月繳 / 年繳、到期日、續訂狀態。到期未續訂由排程 run_entitlement_expiry_job() 停用權限。"
      />
      <Notice tone="warning" title="訂閱為唯讀">目前沒有實作定期扣款；這一頁只顯示資料庫既有的訂閱紀錄。</Notice>
      <DataTablePlaceholder
        caption="訂閱"
        footnote="資料來自 customer_subscriptions（唯讀）。Phase 3.0 不實作定期扣款。"
        columns={[
          { key: 'plan', label: '方案' },
          { key: 'customer', label: '客戶' },
          { key: 'interval', label: '週期' },
          { key: 'status', label: '狀態' },
          { key: 'periodEnd', label: '本期到期', className: 'whitespace-nowrap' },
        ]}
        rows={subscriptions.map((sub) => ({
          id: sub.id,
          plan: sub.planName,
          customer: sub.customerEmail,
          interval: BILLING_INTERVAL_LABELS[sub.interval],
          status: <StatusBadge tone={subscriptionTone[sub.status]}>{SUBSCRIPTION_STATUS_LABELS[sub.status]}</StatusBadge>,
          periodEnd: formatDateTime(sub.currentPeriodEnd),
        }))}
      />
    </>
  );
}
