import { buttonClass } from '@syt/ui';
import type { Metadata } from 'next';
import { DataTablePlaceholder } from '@/components/ui/DataTablePlaceholder';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { requireAdminPage } from '@/lib/auth/guards';

export const metadata: Metadata = { title: '頁面管理' };

const pages = [
  { id: 'home', title: '首頁', path: '/', status: '已發布', tone: 'success' as const, sections: 10 },
  { id: 'products', title: '產品與方案', path: '/products', status: '靜態內容', tone: 'neutral' as const, sections: 3 },
  { id: 'about', title: '關於森映', path: '/about', status: '草稿', tone: 'warning' as const, sections: 3 },
  { id: 'contact', title: '聯絡我們', path: '/contact', status: '草稿', tone: 'warning' as const, sections: 3 },
  { id: 'checkout', title: '方案與結帳', path: '/checkout', status: '靜態內容', tone: 'neutral' as const, sections: 4 },
];

export default async function CmsPagesPage() {
  await requireAdminPage('/admin/cms/pages');
  return (
    <>
      <PageHeader
        eyebrow="官網 CMS"
        title="頁面管理"
        description="頁面層（標題、slug、狀態、SEO）與區塊層（類型、內容、排序、啟用）分開管理。Phase 1 前台內容仍為靜態資料。"
        actions={
          <button type="button" className={buttonClass('primary', 'md')} disabled>
            新增頁面
          </button>
        }
      />
      <DataTablePlaceholder
        caption="官網頁面"
        columns={[
          { key: 'title', label: '頁面' },
          { key: 'path', label: '路徑', className: 'font-mono text-xs' },
          { key: 'status', label: '狀態' },
          { key: 'sections', label: '區塊數' },
          { key: 'actions', label: '操作' },
        ]}
        rows={pages.map((page) => ({
          id: page.id,
          title: page.title,
          path: page.path,
          status: <StatusBadge tone={page.tone}>{page.status}</StatusBadge>,
          sections: page.sections,
          actions: (
            <button type="button" className={buttonClass('secondary', 'sm')} disabled>
              編輯
            </button>
          ),
        }))}
      />
    </>
  );
}
