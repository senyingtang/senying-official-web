import type { Metadata } from 'next';
import { AccessCodesView } from '@/components/access-codes/AccessCodesView';
import { requireAdminPage } from '@/lib/auth/guards';

export const metadata: Metadata = { title: '權限代碼' };

export default async function AccessCodesPage() {
  const { repos } = await requireAdminPage('/admin/access-codes');
  return <AccessCodesView repos={repos} title="全部代碼" description="代碼狀態：已產生、已發放、已兌換、已過期、已撤銷。兌換前可轉讓，兌換後綁定帳號。" />;
}
