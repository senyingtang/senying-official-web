import { ACCESS_CODE_STATUS_LABELS, formatDateTime, formatMoneyFromCents } from '@syt/shared';
import { cardClass } from '@syt/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DataTablePlaceholder } from '@/components/ui/DataTablePlaceholder';
import { EmptyState } from '@/components/ui/EmptyState';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { requireAdminPage } from '@/lib/auth/guards';
import {
  ENVIRONMENT_LABELS,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  accessCodeTone,
  environmentTone,
  orderTone,
  paymentTone,
} from '@/lib/status';

export const metadata: Metadata = { title: '訂單明細' };

/**
 * 訂單明細（Phase 3.0）。
 *
 * 安全規則：
 * - 權限代碼只顯示遮罩後的值（repository 已在伺服器端遮罩，完整代碼不會離開資料庫）。
 * - 後台沒有「標記付款成功」按鈕：付款結果只能由金流回調寫入。
 * - Audit trail 顯示 commerce_audit_logs 的動作與時間，不含任何密鑰或完整代碼。
 */
export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { repos } = await requireAdminPage('/admin/commerce/orders/[id]');
  const { id } = await params;
  const order = await repos.commerce.getAdminOrder(id);
  if (!order) notFound();

  const sandbox = order.payments.some((payment) => payment.environment === 'sandbox' || payment.provider === 'sandbox');
  const hasTestPrice = order.items.some((item) => item.isTestPrice);

  return (
    <>
      <Link href="/admin/commerce/orders" className="mb-3 inline-flex min-h-11 items-center text-sm font-semibold text-teal-strong hover:underline">
        ← 回訂單列表
      </Link>
      <PageHeader
        eyebrow="商務 / 訂單"
        title={order.orderNumber}
        description={`建立於 ${formatDateTime(order.createdAt)}・來源 ${order.source}`}
        actions={<StatusBadge tone={orderTone[order.status]}>{ORDER_STATUS_LABELS[order.status]}</StatusBadge>}
      />

      <div className="grid gap-4">
        {sandbox && (
          <Notice tone="warning" title="這是本機 Sandbox 模擬付款">
            這筆訂單沒有任何實際金流往來，金額不代表真實收款。正式金流尚未啟用。
          </Notice>
        )}
        {hasTestPrice && <Notice tone="warning" title="使用測試價格">訂單中的品項使用測試價格（非正式售價），正式價格確認後才會公開。</Notice>}
        <Notice>付款結果只接受金流回調寫入；後台不提供手動標記付款成功，避免出現第二條發碼路徑。</Notice>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="grid min-w-0 gap-4">
            {/* 品項 */}
            <section className={`${cardClass} min-w-0`} aria-labelledby="items-heading">
              <h2 id="items-heading" className="text-lg font-bold text-ink">
                訂單品項
              </h2>
              <DataTablePlaceholder
                caption="訂單品項"
                footnote="品項與單價在建立訂單時由伺服器寫入，之後不會被前台修改。"
                columns={[
                  { key: 'product', label: '方案' },
                  { key: 'sku', label: 'SKU', className: 'font-mono text-xs' },
                  { key: 'quantity', label: '數量', className: 'whitespace-nowrap' },
                  { key: 'unit', label: '單價', className: 'whitespace-nowrap' },
                  { key: 'total', label: '小計', className: 'whitespace-nowrap' },
                ]}
                rows={order.items.map((item) => ({
                  id: item.id,
                  product: (
                    <span>
                      <span className="block text-ink">{item.productName}</span>
                      {item.isTestPrice && <span className="block text-xs text-warning-strong">測試價格（非正式售價）</span>}
                    </span>
                  ),
                  sku: item.sku,
                  quantity: String(item.quantity),
                  unit: formatMoneyFromCents(item.unitAmountCents, order.currency),
                  total: formatMoneyFromCents(item.totalCents, order.currency),
                }))}
              />
              <dl className="mt-4 grid gap-2 border-t border-border-gray pt-4 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-gray">小計</dt>
                  <dd className="font-medium text-ink">{formatMoneyFromCents(order.subtotalCents, order.currency)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-gray">折扣</dt>
                  <dd className="font-medium text-ink">{formatMoneyFromCents(order.discountCents, order.currency)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-gray">稅額</dt>
                  <dd className="font-medium text-ink">{formatMoneyFromCents(order.taxCents, order.currency)}</dd>
                </div>
                <div className="flex justify-between gap-2 border-t border-border-gray pt-2">
                  <dt className="font-semibold text-ink">總金額</dt>
                  <dd className="text-lg font-bold text-ink">{formatMoneyFromCents(order.totalCents, order.currency)}</dd>
                </div>
              </dl>
            </section>

            {/* 付款紀錄 */}
            <section className={`${cardClass} min-w-0`} aria-labelledby="payments-heading">
              <h2 id="payments-heading" className="text-lg font-bold text-ink">
                付款紀錄
              </h2>
              {order.payments.length === 0 ? (
                <p className="mt-2 text-sm text-slate-gray">這筆訂單還沒有付款紀錄。</p>
              ) : (
                <DataTablePlaceholder
                  caption="付款紀錄"
                  footnote="資料來自 commerce_payments；狀態只由金流回調更新。"
                  columns={[
                    { key: 'provider', label: '金流' },
                    { key: 'status', label: '狀態' },
                    { key: 'amount', label: '金額', className: 'whitespace-nowrap' },
                    { key: 'tradeNo', label: '交易編號', className: 'font-mono text-xs' },
                    { key: 'createdAt', label: '建立時間', className: 'whitespace-nowrap' },
                  ]}
                  rows={order.payments.map((payment) => ({
                    id: payment.id,
                    provider: (
                      <span className="flex flex-wrap items-center gap-1">
                        <span className="text-ink">{payment.provider}</span>
                        <StatusBadge tone={environmentTone[payment.environment]}>{ENVIRONMENT_LABELS[payment.environment]}</StatusBadge>
                        <span className="block w-full text-xs text-slate-gray">{payment.methodType}</span>
                      </span>
                    ),
                    status: (
                      <span>
                        <StatusBadge tone={paymentTone[payment.status]}>{PAYMENT_STATUS_LABELS[payment.status]}</StatusBadge>
                        {payment.failureMessage && <span className="mt-1 block text-xs text-danger">{payment.failureMessage}</span>}
                        {payment.paidAt && <span className="mt-1 block text-xs text-slate-gray">{formatDateTime(payment.paidAt)}</span>}
                      </span>
                    ),
                    amount: formatMoneyFromCents(payment.amountCents, payment.currency),
                    tradeNo: (
                      <span>
                        <span className="block">{payment.merchantTradeNo ?? '—'}</span>
                        {payment.providerTradeNo && <span className="block text-slate-gray">{payment.providerTradeNo}</span>}
                      </span>
                    ),
                    createdAt: formatDateTime(payment.createdAt),
                  }))}
                />
              )}
            </section>

            {/* 權限代碼 */}
            <section className={`${cardClass} min-w-0`} aria-labelledby="codes-heading">
              <h2 id="codes-heading" className="text-lg font-bold text-ink">
                權限代碼
              </h2>
              <p className="mt-1 text-sm text-slate-gray">後台只顯示遮罩後的代碼；完整代碼只會出現在客戶的訂單完成頁與通知信。</p>
              {order.entitlements.length === 0 ? (
                <EmptyState title="尚未發放權限代碼" description="付款成功後由 mark_payment_success_and_issue_entitlement() 自動發放。" />
              ) : (
                <DataTablePlaceholder
                  caption="權限代碼"
                  footnote="資料來自 entitlement_access_codes；代碼已在伺服器端遮罩。"
                  columns={[
                    { key: 'code', label: '代碼', className: 'font-mono text-xs' },
                    { key: 'product', label: '產品', className: 'font-mono text-xs' },
                    { key: 'status', label: '狀態' },
                    { key: 'issuedTo', label: '發放對象' },
                    { key: 'expiresAt', label: '有效期限', className: 'whitespace-nowrap' },
                  ]}
                  rows={order.entitlements.map((code) => ({
                    id: code.id,
                    code: code.maskedCode,
                    product: code.productCode,
                    status: <StatusBadge tone={accessCodeTone[code.status]}>{ACCESS_CODE_STATUS_LABELS[code.status]}</StatusBadge>,
                    issuedTo: code.issuedToEmail ?? '—',
                    expiresAt: code.expiresAt ? formatDateTime(code.expiresAt) : '無期限',
                  }))}
                />
              )}
            </section>
          </div>

          <div className="grid min-w-0 content-start gap-4">
            {/* 購買人 */}
            <section className={`${cardClass} min-w-0`} aria-labelledby="buyer-heading">
              <h2 id="buyer-heading" className="text-lg font-bold text-ink">
                購買人
              </h2>
              <dl className="mt-3 grid gap-2 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-slate-gray">姓名</dt>
                  <dd className="font-medium text-ink">{order.buyerName}</dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-slate-gray">Email</dt>
                  <dd className="break-all font-medium text-ink">{order.buyerEmail}</dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-slate-gray">電話</dt>
                  <dd className="font-medium text-ink">{order.buyerPhone ?? '—'}</dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-slate-gray">公司</dt>
                  <dd className="font-medium text-ink">{order.buyerCompany ?? '—'}</dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-slate-gray">統一編號</dt>
                  <dd className="font-mono font-medium text-ink">{order.buyerTaxId ?? '—'}</dd>
                </div>
              </dl>
            </section>

            {/* 時間軸 */}
            <section className={`${cardClass} min-w-0`} aria-labelledby="timeline-heading">
              <h2 id="timeline-heading" className="text-lg font-bold text-ink">
                訂單時間
              </h2>
              <dl className="mt-3 grid gap-2 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-slate-gray">建立</dt>
                  <dd className="font-medium text-ink">{formatDateTime(order.createdAt)}</dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-slate-gray">付款成功</dt>
                  <dd className="font-medium text-ink">{order.paidAt ? formatDateTime(order.paidAt) : '—'}</dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-slate-gray">發放代碼</dt>
                  <dd className="font-medium text-ink">{order.entitlementsIssuedAt ? formatDateTime(order.entitlementsIssuedAt) : '—'}</dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-slate-gray">完成</dt>
                  <dd className="font-medium text-ink">{order.fulfilledAt ? formatDateTime(order.fulfilledAt) : '—'}</dd>
                </div>
              </dl>
              {order.adminNote && <p className="mt-3 rounded-lg bg-mist-white px-3 py-2 text-sm text-ink">{order.adminNote}</p>}
            </section>

            {/* Audit */}
            <section className={`${cardClass} min-w-0`} aria-labelledby="audit-heading">
              <h2 id="audit-heading" className="text-lg font-bold text-ink">
                操作紀錄
              </h2>
              {order.auditTrail.length === 0 ? (
                <p className="mt-2 text-sm text-slate-gray">沒有操作紀錄。</p>
              ) : (
                <ol className="mt-3 grid gap-3">
                  {order.auditTrail.map((entry) => (
                    <li key={entry.id} className="border-l-2 border-border-gray pl-3">
                      <p className="font-mono text-xs text-ink">{entry.action}</p>
                      <p className="text-xs text-slate-gray">
                        {entry.actorType}・{formatDateTime(entry.createdAt)}
                      </p>
                      {entry.summary && <p className="mt-1 text-sm text-ink">{entry.summary}</p>}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
