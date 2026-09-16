import { adminRouteMode, canAdmin } from '@syt/auth';
import { CONTENT_STATUS_LABELS, CONTENT_STATUSES, type ContentStatus } from '@syt/database/cms-content';
import { formatDateTime } from '@syt/shared';
import { cardClass } from '@syt/ui';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlogPostForm } from '@/components/cms/BlogPostForm';
import { ContentRowActions } from '@/components/cms/ContentRowActions';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { requireAdminPage } from '@/lib/auth/guards';
import { saveBlogPostAction, transitionBlogPostAction } from '../actions';

export const metadata: Metadata = { title: '編輯文章' };

const ROUTE = '/admin/cms/blog';
const AUTHOR_STATUSES: readonly ContentStatus[] = ['draft', 'scheduled'];
const STATUS_TONE: Record<ContentStatus, 'success' | 'warning' | 'teal' | 'neutral'> = { published: 'success', draft: 'warning', scheduled: 'teal', archived: 'neutral' };

export default async function EditBlogPostPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const { saved } = await searchParams;
  const { session, repos } = await requireAdminPage('/admin/cms/blog/[id]');
  const [post, categories] = await Promise.all([repos.cmsBlog.getById(id), repos.cmsBlog.listCategories()]);
  if (!post) notFound();

  const canManage = adminRouteMode(session.role, ROUTE) === 'manage' && canAdmin(session.role, 'cms_content', 'update');
  const canAuthor = canAdmin(session.role, 'blog_own', 'update');
  const canEdit = canManage || canAuthor;
  // author 不能切換發布狀態（RLS posts_author_update 只允許 draft / review）
  const canPublish = canManage;

  return (
    <>
      <PageHeader
        eyebrow="官網 CMS · 文章"
        title={post.title}
        description={`前台網址：/blog/${post.slug}（發布後重新建置官網才會出現）`}
        actions={<ContentRowActions id={post.id} status={post.status} editHref={`${ROUTE}/${post.id}`} action={transitionBlogPostAction} canEdit={canEdit} canPublish={canPublish} />}
      />

      {saved && (
        <div className="mb-4" role="status">
          <Notice tone="info" title="文章已建立。"> </Notice>
        </div>
      )}

      <section className={`${cardClass} mb-6 min-w-0`} aria-label="文章狀態">
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <dt className="text-sm text-slate-gray">狀態</dt>
            <dd className="mt-1">
              <StatusBadge tone={STATUS_TONE[post.status]}>{CONTENT_STATUS_LABELS[post.status]}</StatusBadge>
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate-gray">分類</dt>
            <dd className="mt-1 text-sm font-medium text-ink">{post.categoryName}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-gray">發布時間</dt>
            <dd className="mt-1 text-sm font-medium text-ink">{formatDateTime(post.publishedAt)}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-gray">最後更新</dt>
            <dd className="mt-1 text-sm font-medium text-ink">{formatDateTime(post.updatedAt)}</dd>
          </div>
        </dl>
      </section>

      <BlogPostForm
        post={post}
        categories={categories}
        canEdit={canEdit}
        isMock={session.mode === 'mock'}
        action={saveBlogPostAction}
        allowedStatuses={canManage ? CONTENT_STATUSES : AUTHOR_STATUSES}
      />
    </>
  );
}
