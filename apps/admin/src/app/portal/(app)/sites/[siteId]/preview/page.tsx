import type { Metadata } from 'next';
import { PreviewFrame } from '@/components/portal/PreviewFrame';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { requireSiteAccess } from '@/lib/auth/guards';

export const metadata: Metadata = { title: '預覽' };

export default async function SitePreviewPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const { site } = await requireSiteAccess(siteId, `/portal/sites/${siteId}/preview`);

  return (
    <>
      <PageHeader title="預覽" description="切換手機、平板與桌機寬度，確認排版正常後再發布。" />
      <div className="grid gap-4">
        <Notice>預覽網址帶有一次性 token，並設定 noindex，不會被搜尋引擎收錄。</Notice>
        <PreviewFrame siteName={site.name} />
      </div>
    </>
  );
}
