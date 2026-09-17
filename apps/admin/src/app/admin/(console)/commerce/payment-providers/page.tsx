import type { Metadata } from 'next';
import { PaymentProviderCard } from '@/components/commerce/PaymentProviderCard';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { requireAdminPage } from '@/lib/auth/guards';

export const metadata: Metadata = { title: '金流設定' };

export default async function PaymentProvidersPage() {
  const { repos } = await requireAdminPage('/admin/commerce/payment-providers');
  const cards = await repos.commerce.listPaymentProviderCards();
  return (
    <>
      <PageHeader
        eyebrow="商務"
        title="金流設定"
        description="對應 commerce_payment_provider_configs 與 commerce_payment_methods。勾選啟用後才顯示設定欄位；只有 owner / admin 可以檢視與修改。"
      />
      <div className="grid gap-4">
        <Notice tone="warning" title="目前只啟用本機 Sandbox 模擬付款">
          綠界與 LINE Pay 只有骨架：沒有 sandbox credentials 時一律顯示「未設定」，不會 fallback 成假成功。
        </Notice>
        <Notice tone="danger" title="不要在這裡填入正式金流資訊">
          HashKey、HashIV、Channel Secret 等密鑰只存放在 Supabase Vault 或 Edge Function Secrets，這裡只填「參照名稱」，例如 vault:ecpay_sandbox_hash_key。
        </Notice>
        <div className="grid gap-4 xl:grid-cols-2">
          {cards.map((card) => (
            <PaymentProviderCard key={card.key} config={card} />
          ))}
        </div>
      </div>
    </>
  );
}
