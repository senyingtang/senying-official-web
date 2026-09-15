import type { Metadata } from 'next';
import { TemplateCard } from '@/components/templates/TemplateCard';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { requirePortalPage } from '@/lib/auth/guards';

export const metadata: Metadata = { title: '版型' };

export default async function PortalTemplatesPage() {
  const { repos } = await requirePortalPage('/portal/templates');
  const templates = await repos.templates.listTemplates();
  return (
    <>
      <PageHeader title="版型" description="免費版型可直接使用；付費與方案限定版型可以先預覽，購買或升級後才能套用發布。" />
      <div className="grid gap-4">
        <Notice>版型商店準備中，目前提供 SEO 形象官網與一頁式網頁的基本版型。</Notice>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      </div>
    </>
  );
}
