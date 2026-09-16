import { adminRouteMode, canAdmin } from '@syt/auth';
import { CONTENT_STATUSES, type ContentStatus } from '@syt/database/cms-content';
import type { Metadata } from 'next';
import { BlogPostForm } from '@/components/cms/BlogPostForm';
import { PageHeader } from '@/components/ui/PageHeader';
import { requireAdminPage } from '@/lib/auth/guards';
import { saveBlogPostAction } from '../actions';

export const metadata: Metadata = { title: '新增文章' };

const ROUTE = '/admin/cms/blog';
const AUTHOR_STATUSES: readonly ContentStatus[] = ['draft', 'scheduled'];

export default async function NewBlogPostPage() {
  const { session, repos } = await requireAdminPage('/admin/cms/blog/new');
  const categories = await repos.cmsBlog.listCategories();
  const canManage = adminRouteMode(session.role, ROUTE) === 'manage' && canAdmin(session.role, 'cms_content', 'create');
  const canAuthor = canAdmin(session.role, 'blog_own', 'create');
  const canEdit = canManage || canAuthor;

  return (
    <>
      <PageHeader eyebrow="官網 CMS · 文章" title="新增文章" description="儲存後會建立一筆 blog_posts 紀錄；預設為草稿，草稿不會出現在官網或搜尋索引。" />
      <BlogPostForm
        post={null}
        categories={categories}
        canEdit={canEdit}
        isMock={session.mode === 'mock'}
        action={saveBlogPostAction}
        allowedStatuses={canManage ? CONTENT_STATUSES : AUTHOR_STATUSES}
      />
    </>
  );
}
