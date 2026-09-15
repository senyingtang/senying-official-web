import type { Metadata } from 'next';
import { ModuleIndex } from '@/components/admin/ModuleIndex';
import { getAdminGroup } from '@/lib/navigation';
import { requireAdminPage } from '@/lib/auth/guards';

export const metadata: Metadata = { title: '商務' };

export default async function CommerceIndexPage() {
  await requireAdminPage('/admin/commerce');
  return <ModuleIndex group={getAdminGroup('commerce')} description="商品方案、價格、訂單、金流與訂閱。第一版不串正式金流，可由後台標記付款成功並自動發放權限代碼。" />;
}
