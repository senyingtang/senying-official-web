import { buttonClass } from '@syt/ui';
import type { Metadata } from 'next';
import { TemplateCard } from '@/components/templates/TemplateCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { requireAdminPage } from '@/lib/auth/guards';

export const metadata: Metadata = { title: '版型列表' };

export default async function TemplateListPage() {
  const { repos } = await requireAdminPage('/admin/templates/list');
  const templates = await repos.templates.listTemplates();
  return (
    <>
      <PageHeader
        eyebrow="版型"
        title="版型列表"
        description="site_templates / site_template_versions：每個版本記錄 astro_entry_path、schema_json 與 default_content_json。"
        actions={
          <button type="button" className={buttonClass('primary')} disabled>
            新增版型
          </button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => (
          <TemplateCard key={template.id} template={template} actionLabel="編輯版型" />
        ))}
      </div>
    </>
  );
}
