import { formatDateTime } from '@syt/shared';
import { cardClass } from '@syt/ui';
import type { Metadata } from 'next';
import { DataTablePlaceholder } from '@/components/ui/DataTablePlaceholder';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { requireAdminPage } from '@/lib/auth/guards';
import { serverEnv } from '@/lib/env';

export const metadata: Metadata = { title: '頁面管理' };

const GROUP_LABELS = { main: '主要頁面', product: '產品頁', content: '內容列表', legal: '法律頁' } as const;

/**
 * 官網固定頁清單。
 *
 * Phase 2.9 的範圍：可以看到每個 route 的頁面名稱、SEO 來源、索引狀態與對應的 cms_pages 資料列。
 * 固定頁的 title / description / canonical 仍由 Astro 頁面本身提供（單一來源），
 * 這裡不提供第二套可編輯的 SEO 欄位，避免與頁面 metadata 衝突；
 * 逐篇可編輯的 SEO 目前只有文章與案例（存在 seo_metadata）。
 */
export default async function CmsPagesPage() {
  const { session, repos } = await requireAdminPage('/admin/cms/pages');
  const pages = await repos.cmsStructure.listPages();
  const withCmsRow = pages.filter((page) => page.cmsPageId !== null).length;
  // 官網與後台是兩個不同的站：只有設定了 SITE_PUBLIC_URL 才輸出可點的外部連結，
  // 否則以純文字顯示 route（用 next/link 會讓後台去 prefetch 不存在的路徑）
  const siteUrl = serverEnv.sitePublicUrl;

  return (
    <>
      <PageHeader
        eyebrow="官網 CMS"
        title="頁面管理"
        description="官網固定頁的 route、頁面名稱、SEO 來源與索引狀態。文章與案例的內容在「文章管理」與「案例管理」維護。"
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className={`${cardClass} min-w-0`}>
          <h2 className="text-base font-bold text-ink">這一頁可以做什麼</h2>
          <ul className="mt-2 grid gap-1.5 text-sm leading-relaxed text-slate-gray">
            <li>• 確認官網有哪些固定頁、各自的網址與是否允許被搜尋引擎索引</li>
            <li>• 確認每個 route 是否有對應的 cms_pages 資料列（供 Phase 3 的區塊編輯使用）</li>
            <li>• 內容型頁面（文章、案例）改由對應的 CMS 頁面管理</li>
          </ul>
        </div>
        <Notice tone="info" title="固定頁的 SEO 由頁面本身提供">
          首頁與產品頁等固定頁的 title / description / canonical 寫在 Astro 頁面裡，是唯一來源。這一頁只顯示狀態，不提供重複的編輯欄位；
          逐篇可編輯的 SEO 目前是文章（/admin/cms/blog）與案例（/admin/cms/cases）。
        </Notice>
      </div>

      <DataTablePlaceholder
        caption="官網固定頁"
        minWidth={860}
        footnote={`共 ${pages.length} 個固定頁；其中 ${withCmsRow} 個已有 cms_pages 資料列。${session.mode === 'mock' ? '（Mock 模式不連線資料庫）' : ''}`}
        columns={[
          { key: 'name', label: '頁面' },
          { key: 'route', label: 'Route', className: 'font-mono text-xs' },
          { key: 'group', label: '分組' },
          { key: 'indexable', label: '索引' },
          { key: 'seoSource', label: 'SEO 來源' },
          { key: 'cmsPage', label: 'cms_pages' },
          { key: 'updatedAt', label: '更新時間', className: 'whitespace-nowrap' },
        ]}
        rows={pages.map((page) => ({
          id: page.route,
          name: page.name,
          route: siteUrl ? (
            <a href={`${siteUrl}${page.route === '/' ? '' : page.route}`} target="_blank" rel="noopener noreferrer" className="hover:text-teal-strong">
              {page.route}
            </a>
          ) : (
            page.route
          ),
          group: GROUP_LABELS[page.group],
          indexable: <StatusBadge tone={page.indexable ? 'success' : 'neutral'}>{page.indexable ? 'index' : 'noindex'}</StatusBadge>,
          seoSource: <StatusBadge tone={page.seoSource === 'cms' ? 'teal' : 'neutral'}>{page.seoSource === 'cms' ? 'CMS 覆寫' : '頁面自帶'}</StatusBadge>,
          cmsPage: page.cmsPageId ? <StatusBadge tone="success">已建立</StatusBadge> : <StatusBadge tone="warning">尚未建立</StatusBadge>,
          updatedAt: formatDateTime(page.updatedAt),
        }))}
      />
    </>
  );
}
