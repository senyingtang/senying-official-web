import { BILLING_INTERVAL_LABELS, formatMoneyFromCents } from '@syt/shared';
import type { Metadata } from 'next';
import { DataTablePlaceholder } from '@/components/ui/DataTablePlaceholder';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { requireAdminPage } from '@/lib/auth/guards';

export const metadata: Metadata = { title: '價格' };

export default async function CommercePricesPage() {
  const { repos } = await requireAdminPage('/admin/commerce/prices');
  const prices = await repos.commerce.listPrices();
  return (
    <>
      <PageHeader eyebrow="商務" title="價格" description="commerce_product_prices：一次購買、月繳、年繳。TWD 金額必須是整數元（綠界 TotalAmount 為整數）。" />
      <div className="grid gap-4">
        <Notice tone="warning" title="目前只有測試價格">
          已啟用的價格是本機驗收用的「測試價格（非正式售價）」，官網會同步標示。正式售價確認後再另行建立並啟用。
        </Notice>
        <DataTablePlaceholder
          caption="價格"
          footnote="資料來自 commerce_product_prices；結帳金額一律以這裡的資料重新計算。"
          columns={[
            { key: 'product', label: '方案' },
            { key: 'priceKey', label: 'price_key', className: 'font-mono text-xs' },
            { key: 'interval', label: '週期' },
            { key: 'amount', label: '金額' },
            { key: 'status', label: '狀態' },
          ]}
          rows={prices.map((price) => ({
            id: price.id,
            product: price.productName,
            priceKey: price.priceKey,
            interval: BILLING_INTERVAL_LABELS[price.interval],
            amount: formatMoneyFromCents(price.amountCents),
            status: <StatusBadge tone={price.isActive ? 'success' : 'neutral'}>{price.isActive ? '啟用' : '未啟用'}</StatusBadge>,
          }))}
        />
      </div>
    </>
  );
}
