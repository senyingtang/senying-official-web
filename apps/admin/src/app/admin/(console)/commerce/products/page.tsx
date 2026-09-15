import { PRODUCT_CODE_LABELS } from '@syt/shared';
import type { Metadata } from 'next';
import { DataTablePlaceholder } from '@/components/ui/DataTablePlaceholder';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { requireAdminPage } from '@/lib/auth/guards';

export const metadata: Metadata = { title: '商品方案' };

export default async function CommerceProductsPage() {
  const { repos } = await requireAdminPage('/admin/commerce/products');
  const products = await repos.commerce.listProducts();
  return (
    <>
      <PageHeader eyebrow="商務" title="商品方案" description="commerce_products：每個方案對應一組權限（entitlement_products），付款成功後依此發放代碼。" />
      <DataTablePlaceholder
        caption="商品方案"
        columns={[
          { key: 'name', label: '方案' },
          { key: 'code', label: '產品代碼' },
          { key: 'mode', label: '銷售方式' },
          { key: 'status', label: '狀態' },
        ]}
        rows={products.map((product) => ({
          id: product.id,
          name: product.name,
          code: (
            <span>
              <span className="font-mono">{product.productCode}</span>
              <span className="block text-xs text-slate-gray">{PRODUCT_CODE_LABELS[product.productCode]}</span>
            </span>
          ),
          mode: product.isSelfServe ? <StatusBadge tone="teal">自助建站</StatusBadge> : product.requiresQuote ? <StatusBadge>客製報價</StatusBadge> : <StatusBadge tone="warning">內部使用</StatusBadge>,
          status: <StatusBadge tone={product.status === 'published' ? 'success' : 'warning'}>{product.status === 'published' ? '已上架' : '草稿'}</StatusBadge>,
        }))}
      />
    </>
  );
}
