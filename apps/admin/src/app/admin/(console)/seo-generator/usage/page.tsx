import { PLATFORM_FEATURE_FLAGS_V1 } from '@syt/shared';
import type { Metadata } from 'next';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { requireAdminPage } from '@/lib/auth/guards';

export const metadata: Metadata = { title: '使用額度' };

export default async function SeoGeneratorUsagePage() {
  await requireAdminPage('/admin/seo-generator/usage');
  const customerAccess = PLATFORM_FEATURE_FLAGS_V1['ai_article_generator.customer_access'];
  return (
    <>
      <PageHeader eyebrow="SEO 文章生產器" title="使用額度" description="ai_article_usage_credits / ai_article_usage_events。客戶額度來自 AI 權限代碼（暫定每月 30 篇，待確認）。" />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="客戶版開放" value={customerAccess ? '已開放' : '未開放'} hint="platform.feature_flags" />
        <StatCard label="本月內部生成" value="0" hint="Mock 資料" />
        <StatCard label="發放中的客戶額度" value="0" />
      </div>
      <div className="mt-6">
        <EmptyState title="尚無使用紀錄" description="串接 Edge Function 生成流程後，每次扣除額度都會記錄在這裡。" />
      </div>
    </>
  );
}
