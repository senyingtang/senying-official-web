import type { Metadata } from 'next';
import { DataTablePlaceholder } from '@/components/ui/DataTablePlaceholder';
import { PageHeader } from '@/components/ui/PageHeader';
import { requireAdminPage } from '@/lib/auth/guards';

export const metadata: Metadata = { title: '版型授權' };

export default async function TemplateLicensesPage() {
  const { repos } = await requireAdminPage('/admin/templates/licenses');
  const licenses = await repos.templates.listLicenses();
  return (
    <>
      <PageHeader eyebrow="版型" title="版型授權" description="site_template_licenses：付費版型購買後建立授權；授權撤銷後網站無法再發布。" />
      <DataTablePlaceholder
        caption="版型授權"
        columns={[
          { key: 'template', label: '版型' },
          { key: 'workspace', label: '工作區' },
          { key: 'source', label: '來源' },
          { key: 'status', label: '狀態' },
        ]}
        rows={licenses.map((license) => ({
          id: license.id,
          template: license.templateName,
          workspace: license.workspaceName,
          source: license.sourceType,
          status: license.status,
        }))}
        emptyTitle="目前沒有版型授權"
        emptyDescription="付費版型開放販售後，購買紀錄會顯示在這裡。"
      />
    </>
  );
}
