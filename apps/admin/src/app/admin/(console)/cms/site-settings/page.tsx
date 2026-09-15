import { adminRouteMode, canAdmin } from '@syt/auth';
import type { Metadata } from 'next';
import { SiteSettingsForm } from '@/components/cms/SiteSettingsForm';
import { PageHeader } from '@/components/ui/PageHeader';
import { requireAdminPage } from '@/lib/auth/guards';
import { saveSiteSettingsAction } from './actions';

export const metadata: Metadata = { title: '全站設定' };

export default async function CmsSiteSettingsPage() {
  const { session, repos } = await requireAdminPage('/admin/cms/site-settings');
  const settings = await repos.siteSettings.getMarketingSiteSettings();
  const canEdit = adminRouteMode(session.role, '/admin/cms/site-settings') === 'manage' && canAdmin(session.role, 'cms_settings', 'update');

  return (
    <>
      <PageHeader
        eyebrow="官網 CMS"
        title="全站設定"
        description="官網品牌名稱、社群連結、右側浮動快捷列與購物車捷徑（cms_site_settings：site.brand / site.socials / site.floating_actions）。"
      />
      <SiteSettingsForm initialSettings={settings} canEdit={canEdit} isMock={session.mode === 'mock'} action={saveSiteSettingsAction} />
    </>
  );
}
