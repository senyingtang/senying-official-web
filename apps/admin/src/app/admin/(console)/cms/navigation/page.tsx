import type { Metadata } from 'next';
import { DataTablePlaceholder } from '@/components/ui/DataTablePlaceholder';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { requireAdminPage } from '@/lib/auth/guards';

export const metadata: Metadata = { title: '選單管理' };

const items = [
  { menu: 'header', label: '產品與方案', url: '/products' },
  { menu: 'header', label: '解決方案', url: '/solutions' },
  { menu: 'header', label: '案例', url: '/cases' },
  { menu: 'header', label: '文章', url: '/blog' },
  { menu: 'header', label: '關於森映', url: '/about' },
  { menu: 'header', label: '聯絡我們', url: '/contact' },
  { menu: 'footer', label: '服務條款', url: '/legal/terms' },
  { menu: 'footer', label: '隱私權政策', url: '/legal/privacy' },
];

export default async function CmsNavigationPage() {
  await requireAdminPage('/admin/cms/navigation');
  return (
    <>
      <PageHeader eyebrow="官網 CMS" title="選單管理" description="對應 cms_navigation_menus / cms_navigation_items。只有 owner 與 admin 可以修改選單。" />
      <DataTablePlaceholder
        caption="選單項目"
        minWidth={560}
        columns={[
          { key: 'menu', label: '選單' },
          { key: 'label', label: '文字' },
          { key: 'url', label: '連結', className: 'font-mono text-xs' },
          { key: 'status', label: '狀態' },
        ]}
        rows={items.map((item, index) => ({
          id: `${item.menu}-${index}`,
          menu: item.menu === 'header' ? '主選單' : '頁尾選單',
          label: item.label,
          url: item.url,
          status: <StatusBadge tone="success">啟用</StatusBadge>,
        }))}
      />
    </>
  );
}
