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
import { transitionCaseStudyAction } from './actions';

export const metadata: Metadata = { title: '案例管理' };

const ROUTE = '/admin/cms/cases';
const STATUS_TONE: Record<ContentStatus, 'success' | 'warning' | 'teal' | 'neutral'> = { published: 'success', draft: 'warning', scheduled: 'teal', archived: 'neutral' };
const first = (value: string | string[] | undefined): string => (Array.isArray(value) ? (value[0] ?? '') : (value ?? ''));

export default async function CmsCasesListPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { session, repos } = await requireAdminPage('/admin/cms/cases');
  const params = await searchParams;
  const search = first(params.q);
  const status = first(params.status) || 'all';
  const industry = first(params.industry);
  const featured = first(params.featured);
  const canEdit = adminRouteMode(session.role, ROUTE) === 'manage' && canAdmin(session.role, 'cms_content', 'update');

  const [all, counts, rebuild] = await Promise.all([repos.cmsCases.listAdmin({ limit: 500 }), repos.cmsCases.countsByStatus(), repos.marketingRebuild.getStatus()]);
  const industries = [...new Set(all.map((item) => item.industry).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-Hant'));
  const cases = await repos.cmsCases.listAdmin({
    search,
    status: status as ContentStatus | 'all',
    industry: industry || undefined,
    featured: featured === 'yes' ? true : featured === 'no' ? false : undefined,
  });

  return (
    <>
      <PageHeader
        eyebrow="官網 CMS"
        title="案例管理"
        description="案例作品（case_studies）：產業、服務類型、發布狀態與排序。沒有取得客戶同意並完成統計的成效數字請留空。"
        actions={
          canEdit ? (
            <Link href={`${ROUTE}/new`} className={buttonClass('primary', 'md')}>
              新增案例
            </Link>
          ) : undefined
        }
      />

      {first(params.error) && (
        <div className="mb-4">
          <Notice tone="danger" title={first(params.error) === 'forbidden' ? '你的角色不能修改案例。' : '操作失敗，請稍後再試。'}> </Notice>
        </div>
      )}
      {first(params.done) && (
        <div className="mb-4" role="status">
          <Notice tone="info" title="已更新案例狀態。官網為靜態網站，重新建置後才會套用。"> </Notice>
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
          { name: 'industry', label: '產業', value: industry, options: [{ value: '', label: '全部產業' }, ...industries.map((item) => ({ value: item, label: item }))] },
          {
            name: 'featured',
            label: '精選',
            value: featured,
            options: [
              { value: '', label: '全部' },
              { value: 'yes', label: '只看精選' },
              { value: 'no', label: '非精選' },
            ],
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <DataTablePlaceholder
            caption="案例列表"
            minWidth={900}
            emptyTitle="沒有符合條件的案例"
            emptyDescription="調整搜尋或篩選條件，或先新增一個案例。"
            footnote={session.mode === 'mock' ? 'Mock 模式：顯示記憶體中的示範內容，修改不會寫入資料庫。' : '資料來自 Supabase（case_studies），寫入範圍由 RLS 決定。'}
            columns={[
              { key: 'title', label: '案例' },
              { key: 'industry', label: '產業' },
              { key: 'serviceType', label: '服務類型' },
              { key: 'sortOrder', label: '排序' },
              { key: 'status', label: '狀態' },
              { key: 'updatedAt', label: '最後更新', className: 'whitespace-nowrap' },
              { key: 'actions', label: '操作' },
            ]}
            rows={cases.map((item) => ({
              id: item.id,
              title: (
                <span className="flex flex-col gap-1">
                  <Link href={`${ROUTE}/${item.id}`} className="font-medium text-ink hover:text-teal-strong">
                    {item.title}
                  </Link>
                  <span className="flex flex-wrap gap-1">
                    {item.isFeatured && <StatusBadge tone="teal">精選</StatusBadge>}
                    {item.isSample && <StatusBadge tone="neutral">非客戶專案</StatusBadge>}
                  </span>
                </span>
              ),
              industry: item.industry || '—',
              serviceType: item.serviceType || '—',
              sortOrder: item.sortOrder,
              status: <StatusBadge tone={STATUS_TONE[item.status]}>{CONTENT_STATUS_LABELS[item.status]}</StatusBadge>,
              updatedAt: formatDateTime(item.updatedAt),
              actions: <ContentRowActions id={item.id} status={item.status} editHref={`${ROUTE}/${item.id}`} action={transitionCaseStudyAction} canEdit={canEdit} />,
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
