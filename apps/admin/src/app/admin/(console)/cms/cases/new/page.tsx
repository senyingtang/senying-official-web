import { adminRouteMode, canAdmin } from '@syt/auth';
import type { Metadata } from 'next';
import { CaseStudyForm } from '@/components/cms/CaseStudyForm';
import { PageHeader } from '@/components/ui/PageHeader';
import { requireAdminPage } from '@/lib/auth/guards';
import { saveCaseStudyAction } from '../actions';

export const metadata: Metadata = { title: '新增案例' };

const ROUTE = '/admin/cms/cases';

export default async function NewCaseStudyPage() {
  const { session } = await requireAdminPage('/admin/cms/cases/new');
  const canEdit = adminRouteMode(session.role, ROUTE) === 'manage' && canAdmin(session.role, 'cms_content', 'create');

  return (
    <>
      <PageHeader eyebrow="官網 CMS · 案例" title="新增案例" description="儲存後會建立一筆 case_studies 紀錄；預設為草稿，草稿不會出現在官網或搜尋索引。" />
      <CaseStudyForm item={null} canEdit={canEdit} isMock={session.mode === 'mock'} action={saveCaseStudyAction} />
    </>
  );
}
