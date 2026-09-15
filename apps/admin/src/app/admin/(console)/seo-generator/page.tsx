import type { Metadata } from 'next';
import { ModuleIndex } from '@/components/admin/ModuleIndex';
import { getAdminGroup } from '@/lib/navigation';
import { requireAdminPage } from '@/lib/auth/guards';

export const metadata: Metadata = { title: 'SEO 文章生產器' };

export default async function SeoGeneratorIndexPage() {
  await requireAdminPage('/admin/seo-generator');
  return <ModuleIndex group={getAdminGroup('seo-generator')} description="第一版森映內部使用；第二版開放客戶權限與使用額度。" />;
}
