import { adminRouteMode, canAdmin } from '@syt/auth';
import type { ContentStatus } from '@syt/database/cms-content';
import { CONTENT_STATUS_LABELS } from '@syt/database/cms-content';
import { formatDateTime } from '@syt/shared';
import { buttonClass } from '@syt/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ContentRowActions } from '@/components/cms/ContentRowActions';
import { ContentToolbar } from '@/components/cms/ContentToolbar';
import { RebuildStatusCard } from '@/components/cms/RebuildStatusCard';
import { DataTablePlaceholder } from '@/components/ui/DataTablePlaceholder';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { requireAdminPage } from '@/lib/auth/guards';
import { transitionBlogPostAction } from './actions';

export const metadata: Metadata = { title: '文章管理' };

const ROUTE = '/admin/cms/blog';
const STATUS_TONE: Record<ContentStatus, 'success' | 'warning' | 'teal' | 'neutral'> = {
  published: 'success',
  draft: 'warning',
  scheduled: 'teal',
  archived: 'neutral',
};

const first = (value: string | string[] | undefined): string => (Array.isArray(value) ? (value[0] ?? '') : (value ?? ''));

export default async function CmsBlogListPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { session, repos } = await requireAdminPage('/admin/cms/blog');
  const params = await searchParams;
  const search = first(params.q);
  const status = first(params.status) || 'all';
  const category = first(params.category);
  const canManageContent = adminRouteMode(session.role, ROUTE) === 'manage' && canAdmin(session.role, 'cms_content', 'update');
  // author 可以建立 / 編輯自己的未發布文章，但不能切換發布狀態（RLS posts_author_update 只允許 draft / review）
  const canEdit = canManageContent || canAdmin(session.role, 'blog_own', 'create');
  const canPublish = canManageContent;

  const [posts, categories, counts, rebuild] = await Promise.all([
    repos.cmsBlog.listAdmin({ search, status: status as ContentStatus | 'all', category: category || undefined }),
    repos.cmsBlog.listCategories(),
    repos.cmsBlog.countsByStatus(),
    repos.marketingRebuild.getStatus(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="官網 CMS"
        title="文章管理"
        description="部落格文章（blog_posts）：建立、編輯、發布與下架。前台 /blog 只會輸出已發布且發布時間已到的文章。"
        actions={
          canEdit ? (
            <Link href={`${ROUTE}/new`} className={buttonClass('primary', 'md')}>
              新增文章
            </Link>
          ) : undefined
        }
      />

      {first(params.error) && (
        <div className="mb-4">
          <Notice tone="danger" title={first(params.error) === 'forbidden' ? '你的角色不能修改文章。' : '操作失敗，請稍後再試。'}> </Notice>
        </div>
      )}
      {first(params.done) && (
        <div className="mb-4" role="status">
          <Notice tone="info" title="已更新文章狀態。官網為靜態網站，重新建置後才會套用。"> </Notice>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="已發布" value={String(counts.published)} />
        <StatCard label="草稿" value={String(counts.draft)} />
        <StatCard label="排程中" value={String(counts.scheduled)} />
        <StatCard label="已下架" value={String(counts.archived)} />
      </div>

      <ContentToolbar
        action={ROUTE}
        search={search}
        status={status}
        filters={[
          {
            name: 'category',
            label: '分類',
            value: category,
            options: [{ value: '', label: '全部分類' }, ...categories.map((item) => ({ value: item.slug, label: item.name }))],
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <DataTablePlaceholder
            caption="文章列表"
            minWidth={860}
            emptyTitle="沒有符合條件的文章"
            emptyDescription="調整搜尋或狀態條件，或先新增一篇文章。"
            footnote={session.mode === 'mock' ? 'Mock 模式：顯示記憶體中的示範內容，修改不會寫入資料庫。' : '資料來自 Supabase（blog_posts），寫入範圍由 RLS 決定。'}
            columns={[
              { key: 'title', label: '標題' },
              { key: 'slug', label: 'slug', className: 'font-mono text-xs' },
              { key: 'category', label: '分類' },
              { key: 'status', label: '狀態' },
              { key: 'publishedAt', label: '發布時間', className: 'whitespace-nowrap' },
              { key: 'actions', label: '操作' },
            ]}
            rows={posts.map((post) => ({
              id: post.id,
              title: (
                <span className="flex flex-col gap-1">
                  <Link href={`${ROUTE}/${post.id}`} className="font-medium text-ink hover:text-teal-strong">
                    {post.title}
                  </Link>
                  {post.isFeatured && <StatusBadge tone="teal">精選</StatusBadge>}
                </span>
              ),
              slug: post.slug,
              category: post.categoryName,
              status: <StatusBadge tone={STATUS_TONE[post.status]}>{CONTENT_STATUS_LABELS[post.status]}</StatusBadge>,
              publishedAt: formatDateTime(post.publishedAt),
              actions: <ContentRowActions id={post.id} status={post.status} editHref={`${ROUTE}/${post.id}`} action={transitionBlogPostAction} canEdit={canEdit} canPublish={canPublish} />,
            }))}
          />
        </div>
        <div className="min-w-0">
          <RebuildStatusCard status={rebuild} />
        </div>
      </div>
    </>
  );
}
