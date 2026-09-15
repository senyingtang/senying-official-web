import type { Metadata } from 'next';
import { ModuleIndex } from '@/components/admin/ModuleIndex';
import { getAdminGroup } from '@/lib/navigation';
import { requireAdminPage } from '@/lib/auth/guards';

export const metadata: Metadata = { title: '版型' };

export default async function TemplatesIndexPage() {
  await requireAdminPage('/admin/templates');
  return <ModuleIndex group={getAdminGroup('templates')} description="免費、付費、方案限定與私人客製版型。未購買者可預覽，不可套用發布。" />;
}
