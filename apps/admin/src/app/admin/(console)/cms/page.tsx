import type { Metadata } from 'next';
import { ModuleIndex } from '@/components/admin/ModuleIndex';
import { getAdminGroup } from '@/lib/navigation';
import { requireAdminPage } from '@/lib/auth/guards';

export const metadata: Metadata = { title: '官網 CMS' };

export default async function CmsIndexPage() {
  await requireAdminPage('/admin/cms');
  return <ModuleIndex group={getAdminGroup('cms')} description="管理森映官網（Astro 前台）的頁面、選單、媒體、SEO 與全站設定。" />;
}
