import { buttonClass, cardClass } from '@syt/ui';
import type { Metadata } from 'next';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { requireSiteAccess } from '@/lib/auth/guards';

export const metadata: Metadata = { title: '發布' };

const checks = [
  { label: '必填欄位都已填寫', ok: false, hint: '服務項目標題尚未填寫' },
  { label: '版型授權有效', ok: true, hint: '免費版型' },
  { label: '方案權限有效', ok: true, hint: 'SEO 形象官網（v1）' },
  { label: '每頁 SEO 標題與描述', ok: false, hint: '2 個頁面尚未設定' },
];

export default async function SitePublishPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  await requireSiteAccess(siteId, `/portal/sites/${siteId}/publish`);
  return (
    <>
      <PageHeader title="發布" description="發布會把草稿內容複製為正式版本，並保留每次發布的版本紀錄。" />
      <div className="grid gap-6">
        <Notice tone="warning" title="第一版不公開發布">發布後會產生新的內容版本與預覽，正式網址需等平台子網域（第二版）或自訂網域（第三版）開放。</Notice>
        <section className={`${cardClass} min-w-0`} aria-labelledby="publish-check-heading">
          <h2 id="publish-check-heading" className="text-lg font-bold text-ink">
            發布前檢查
          </h2>
          <ul className="mt-4 grid gap-2">
            {checks.map((check) => (
              <li key={check.label} className="flex min-w-0 flex-col gap-1 rounded-xl border border-border-gray px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="min-w-0">
                  <span className="block text-sm text-ink">{check.label}</span>
                  <span className="block text-xs text-slate-gray">{check.hint}</span>
                </span>
                <StatusBadge tone={check.ok ? 'success' : 'warning'}>{check.ok ? '通過' : '待處理'}</StatusBadge>
              </li>
            ))}
          </ul>
          <button type="button" className={buttonClass('primary', 'lg', 'mt-6 w-full sm:w-auto')} disabled>
            發布新版本（尚未串接）
          </button>
        </section>
      </div>
    </>
  );
}
