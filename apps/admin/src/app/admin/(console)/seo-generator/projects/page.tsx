import { formatDateTime } from '@syt/shared';
import { buttonClass } from '@syt/ui';
import type { Metadata } from 'next';
import { DataTablePlaceholder } from '@/components/ui/DataTablePlaceholder';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { requireAdminPage } from '@/lib/auth/guards';

export const metadata: Metadata = { title: '文章專案' };

const OUTPUT_STATUS_LABELS = {
  draft: '草稿',
  in_review: '審核中',
  approved: '已核准',
  published: '已發布',
  rejected: '退回',
  archived: '封存',
} as const;

export default async function SeoGeneratorProjectsPage() {
  const { repos } = await requireAdminPage('/admin/seo-generator/projects');
  const projects = await repos.seoGenerator.listProjects();
  return (
    <>
      <PageHeader
        eyebrow="SEO 文章生產器"
        title="文章專案"
        description="品牌資料、關鍵字、地區、語氣與禁止詞；輸出 SEO title、description、H1–H3、FAQ、FAQ schema 與 HTML。"
        actions={
          <button type="button" className={buttonClass('primary')} disabled>
            建立專案
          </button>
        }
      />
      <DataTablePlaceholder
        caption="文章專案"
        minWidth={620}
        columns={[
          { key: 'name', label: '專案' },
          { key: 'scope', label: '範圍' },
          { key: 'keywords', label: '關鍵字數' },
          { key: 'status', label: '最新文章狀態' },
          { key: 'updatedAt', label: '更新時間', className: 'whitespace-nowrap' },
        ]}
        rows={projects.map((project) => ({
          id: project.id,
          name: project.name,
          scope: <StatusBadge tone={project.scope === 'internal' ? 'dark' : 'teal'}>{project.scope === 'internal' ? '內部' : '客戶'}</StatusBadge>,
          keywords: project.keywordCount,
          status: project.latestOutputStatus ? OUTPUT_STATUS_LABELS[project.latestOutputStatus] : '—',
          updatedAt: formatDateTime(project.updatedAt),
        }))}
      />
    </>
  );
}
