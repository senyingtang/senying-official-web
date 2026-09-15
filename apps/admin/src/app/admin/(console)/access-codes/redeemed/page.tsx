import type { Metadata } from 'next';
import { AccessCodesView } from '@/components/access-codes/AccessCodesView';
import { requireAdminPage } from '@/lib/auth/guards';

export const metadata: Metadata = { title: '已兌換代碼' };

export default async function RedeemedAccessCodesPage() {
  const { repos } = await requireAdminPage('/admin/access-codes/redeemed');
  return <AccessCodesView repos={repos} title="已兌換" description="已綁定兌換帳號的代碼，無法再轉讓；撤銷時會一併停用權限。" statuses={['redeemed']} />;
}
