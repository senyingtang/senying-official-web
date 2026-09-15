import type { Metadata } from 'next';
import { ModuleIndex } from '@/components/admin/ModuleIndex';
import { getAdminGroup } from '@/lib/navigation';
import { requireAdminPage } from '@/lib/auth/guards';

export const metadata: Metadata = { title: '設定' };

export default async function SettingsIndexPage() {
  await requireAdminPage('/admin/settings');
  return <ModuleIndex group={getAdminGroup('settings')} description="後台帳號、角色權限與操作紀錄。" />;
}
