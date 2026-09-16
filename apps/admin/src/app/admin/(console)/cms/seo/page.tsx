import { CONTENT_STATUS_LABELS } from '@syt/database/cms-content';
import { buttonClass, cardClass } from '@syt/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { DataTablePlaceholder } from '@/components/ui/DataTablePlaceholder';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { requireAdminPage } from '@/lib/auth/guards';

export const metadata: Metadata = { title: 'SEO 管理' };

/**
 * SEO 總覽。
 *
 * 單一來源原則：
 *   - 固定頁（首頁 / 產品頁 / 關於 / 聯絡…）的 title、description、canonical、JSON-LD 由 Astro 頁面提供
 *   - 逐篇內容（文章 / 案例）的 SEO 覆寫存在 seo_metadata，於各自的編輯頁維護
 * 這一頁只顯示狀態與入口，不建立第三套會互相衝突的欄位。
 */
export default async function CmsSeoPage() {
  const { session, repos } = await requireAdminPage('/admin/cms/seo');
  const [pages, posts, cases] = await Promise.all([
    repos.cmsStructure.listPages(),
    repos.cmsBlog.listAdmin({ limit: 200 }),
    repos.cmsCases.listAdmin({ limit: 200 }),
  ]);
  const indexable = pages.filter((page) => page.indexable).length;

  return (
    <>
      <PageHeader
        eyebrow="官網 CMS"
        title="SEO 管理"
        description="每個 route 的索引狀態、SEO 來源，以及文章與案例的 SEO 覆寫狀況（seo_metadata）。"
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Notice tone="info" title="SEO 資料只有兩個來源">
          固定頁：Astro 頁面的 seo 設定（title / description / canonical / OG / JSON-LD）。
          文章與案例：seo_metadata（entity_type = blog_post / case_study），在各自的編輯頁填寫，留空時自動使用標題與摘要。
        </Notice>
        <div className={`${cardClass} min-w-0`}>
          <h2 className="text-base font-bold text-ink">全站索引設定</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-gray">
            官網 build 必須設定 <code className="font-mono text-xs">SITE_PUBLIC_URL</code> 與{' '}
            <code className="font-mono text-xs">SITE_ALLOW_INDEXING=true</code> 才會輸出 index,follow 與絕對網址的 sitemap；
            未設定時整站輸出 noindex，適合預覽環境。
          </p>
          <p className="mt-2 text-sm text-slate-gray">
            目前固定頁 {indexable} / {pages.length} 頁允許索引（/checkout 為 noindex）。
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        <section aria-labelledby="seo-pages-heading" className="min-w-0">
          <h2 id="seo-pages-heading" className="mb-3 text-lg font-bold text-ink">
            固定頁
          </h2>
          <DataTablePlaceholder
            caption="固定頁 SEO 狀態"
            minWidth={720}
            footnote="固定頁的 SEO 欄位寫在 Astro 頁面中，是唯一來源；這裡不提供重複的編輯欄位。"
            columns={[
              { key: 'name', label: '頁面' },
              { key: 'route', label: 'Route', className: 'font-mono text-xs' },
              { key: 'robots', label: 'Robots' },
              { key: 'source', label: 'SEO 來源' },
              { key: 'canonical', label: 'Canonical 覆寫' },
            ]}
            rows={pages.map((page) => ({
              id: page.route,
              name: page.name,
              route: page.route,
              robots: <StatusBadge tone={page.indexable ? 'success' : 'neutral'}>{page.indexable ? 'index,follow' : 'noindex,nofollow'}</StatusBadge>,
              source: <StatusBadge tone={page.seoSource === 'cms' ? 'teal' : 'neutral'}>{page.seoSource === 'cms' ? 'seo_metadata' : 'Astro 頁面'}</StatusBadge>,
              canonical: page.canonicalOverride || '—',
            }))}
          />
        </section>

        <section aria-labelledby="seo-blog-heading" className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="seo-blog-heading" className="text-lg font-bold text-ink">
              文章
            </h2>
            <Link href="/admin/cms/blog" className={buttonClass('secondary', 'sm')}>
              前往文章管理
            </Link>
          </div>
          <DataTablePlaceholder
            caption="文章 SEO 狀態"
            minWidth={680}
            emptyTitle="目前沒有文章"
            emptyDescription="新增文章後即可在這裡檢查 SEO 狀態。"
            footnote="SEO 欄位留空時，前台會使用文章標題與摘要。"
            columns={[
              { key: 'title', label: '文章' },
              { key: 'url', label: '網址', className: 'font-mono text-xs' },
              { key: 'status', label: '狀態' },
            ]}
            rows={posts.map((post) => ({
              id: post.id,
              title: (
                <Link href={`/admin/cms/blog/${post.id}`} className="hover:text-teal-strong">
                  {post.title}
                </Link>
              ),
              url: `/blog/${post.slug}`,
              status: <StatusBadge tone={post.status === 'published' ? 'success' : 'warning'}>{CONTENT_STATUS_LABELS[post.status]}</StatusBadge>,
            }))}
          />
        </section>

        <section aria-labelledby="seo-cases-heading" className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="seo-cases-heading" className="text-lg font-bold text-ink">
              案例
            </h2>
            <Link href="/admin/cms/cases" className={buttonClass('secondary', 'sm')}>
              前往案例管理
            </Link>
          </div>
          <DataTablePlaceholder
            caption="案例 SEO 狀態"
            minWidth={680}
            emptyTitle="目前沒有案例"
            emptyDescription="新增案例後即可在這裡檢查 SEO 狀態。"
            footnote={session.mode === 'mock' ? 'Mock 模式：顯示記憶體中的示範內容。' : 'SEO 欄位存在 seo_metadata（entity_type = case_study）。'}
            columns={[
              { key: 'title', label: '案例' },
              { key: 'url', label: '網址', className: 'font-mono text-xs' },
              { key: 'status', label: '狀態' },
            ]}
            rows={cases.map((item) => ({
              id: item.id,
              title: (
                <Link href={`/admin/cms/cases/${item.id}`} className="hover:text-teal-strong">
                  {item.title}
                </Link>
              ),
              url: `/cases/${item.slug}`,
              status: <StatusBadge tone={item.status === 'published' ? 'success' : 'warning'}>{CONTENT_STATUS_LABELS[item.status]}</StatusBadge>,
            }))}
          />
        </section>
      </div>
    </>
  );
}
