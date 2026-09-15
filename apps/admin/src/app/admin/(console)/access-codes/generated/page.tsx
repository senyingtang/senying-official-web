import type { Metadata } from 'next';
import { AccessCodesView } from '@/components/access-codes/AccessCodesView';
import { requireAdminPage } from '@/lib/auth/guards';

export const metadata: Metadata = { title: '已產生 / 已發放代碼' };

export default async function GeneratedAccessCodesPage() {
  const { repos } = await requireAdminPage('/admin/access-codes/generated');
  return <AccessCodesView repos={repos} title="已產生 / 已發放" description="尚未兌換的代碼。已發放的代碼可重新寄送給持有人。" statuses={['generated', 'issued']} />;
}
