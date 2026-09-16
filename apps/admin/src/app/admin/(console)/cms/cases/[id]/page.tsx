import { adminRouteMode, canAdmin } from '@syt/auth';
import { CONTENT_STATUS_LABELS, type ContentStatus } from '@syt/database/cms-content';
import { formatDateTime } from '@syt/shared';
import { cardClass } from '@syt/ui';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CaseStudyForm } from '@/components/cms/CaseStudyForm';
import { ContentRowActions } from '@/components/cms/ContentRowActions';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { requireAdminPage } from '@/lib/auth/guards';
import { saveCaseStudyAction, transitionCaseStudyAction } from '../actions';

export const metadata: Metadata = { title: '編輯案例' };

const ROUTE = '/admin/cms/cases';
const STATUS_TONE: Record<ContentStatus, 'success' | 'warning' | 'teal' | 'neutral'> = { published: 'success', draft: 'warning', scheduled: 'teal', archived: 'neutral' };

export default async function EditCaseStudyPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const { saved } = await searchParams;
  const { session, repos } = await requireAdminPage('/admin/cms/cases/[id]');
  const item = await repos.cmsCases.getById(id);
  if (!item) notFound();
  const canEdit = adminRouteMode(session.role, ROUTE) === 'manage' && canAdmin(session.role, 'cms_content', 'update');

  return (
    <>
      <PageHeader
        eyebrow="官網 CMS · 案例"
        title={item.title}
        description={`前台網址：/cases/${item.slug}（發布後重新建置官網才會出現）`}
        actions={<ContentRowActions id={item.id} status={item.status} editHref={`${ROUTE}/${item.id}`} action={transitionCaseStudyAction} canEdit={canEdit} />}
      />

      {saved && (
        <div className="mb-4" role="status">
          <Notice tone="info" title="案例已建立。"> </Notice>
        </div>
      )}

      <section className={`${cardClass} mb-6 min-w-0`} aria-label="案例狀態">
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <dt className="text-sm text-slate-gray">狀態</dt>
            <dd className="mt-1">
              <StatusBadge tone={STATUS_TONE[item.status]}>{CONTENT_STATUS_LABELS[item.status]}</StatusBadge>
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate-gray">產業 / 服務</dt>
            <dd className="mt-1 text-sm font-medium text-ink">{[item.industry, item.serviceType].filter(Boolean).join(' · ') || '—'}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-gray">發布時間</dt>
            <dd className="mt-1 text-sm font-medium text-ink">{formatDateTime(item.publishedAt)}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-gray">最後更新</dt>
            <dd className="mt-1 text-sm font-medium text-ink">{formatDateTime(item.updatedAt)}</dd>
          </div>
        </dl>
      </section>

      <CaseStudyForm item={item} canEdit={canEdit} isMock={session.mode === 'mock'} action={saveCaseStudyAction} />
    </>
  );
}
