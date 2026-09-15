import type { Metadata } from 'next';
import { ModuleIndex } from '@/components/admin/ModuleIndex';
import { getAdminGroup } from '@/lib/navigation';
import { requireAdminPage } from '@/lib/auth/guards';

export const metadata: Metadata = { title: '客戶網站' };

export default async function CustomerSitesIndexPage() {
  await requireAdminPage('/admin/customer-sites');
  return <ModuleIndex group={getAdminGroup('customer-sites')} description="客戶網站專案、網域驗證與部署紀錄（客服支援用）。" />;
}
