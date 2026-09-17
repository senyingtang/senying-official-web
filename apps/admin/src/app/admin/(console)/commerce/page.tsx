import type { Metadata } from 'next';
import { ModuleIndex } from '@/components/admin/ModuleIndex';
import { getAdminGroup } from '@/lib/navigation';
import { requireAdminPage } from '@/lib/auth/guards';

export const metadata: Metadata = { title: '商務' };

export default async function CommerceIndexPage() {
  await requireAdminPage('/admin/commerce');
  return <ModuleIndex group={getAdminGroup('commerce')} description="商品方案、價格、訂單、金流與訂閱。目前只開放本機 Sandbox 模擬付款；付款成功與權限代碼由金流回調觸發，後台不提供手動標記。" />;
}
