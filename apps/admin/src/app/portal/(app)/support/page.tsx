import { buttonClass, cardClass } from '@syt/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { serverEnv } from '@/lib/env';
import { requirePortalPage } from '@/lib/auth/guards';

export const metadata: Metadata = { title: '客服協助' };

const faq = [
  { question: '權限代碼兌換失敗怎麼辦？', answer: '確認代碼是否完整、是否已被兌換或過期；仍無法兌換請把代碼前幾碼與畫面截圖傳給客服。' },
  { question: '可以修改網站版面嗎？', answer: '版型提供固定版面，可以修改內容、顏色與區塊排序；需要特殊版面可以洽詢客製版型。' },
  { question: '自訂網域什麼時候可以用？', answer: '自訂網域規劃在第三版開放，網域設定頁已提供 DNS 設定說明。' },
];

export default async function SupportPage() {
  await requirePortalPage('/portal/support', { requireWorkspace: false });
  const lineHref = serverEnv.lineOaUrl;
  return (
    <>
      <PageHeader title="客服協助" description="遇到問題時，LINE@ 是最快的聯絡方式。" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section className={`${cardClass} min-w-0`}>
          <h2 className="text-lg font-bold text-ink">聯絡客服</h2>
          <p className="mt-2 text-sm text-slate-gray">請提供網站名稱、遇到的問題與畫面截圖，會更快協助你處理。</p>
          {lineHref ? (
            <a href={lineHref} target="_blank" rel="noopener noreferrer" className={buttonClass('primary', 'md', 'mt-4 w-full sm:w-auto')}>
              開啟 LINE@
            </a>
          ) : (
            <p className="mt-4 rounded-xl bg-mist-white px-4 py-3 text-sm text-slate-gray">LINE@ 連結尚未設定（PUBLIC_LINE_OA_URL）。</p>
          )}
          <Link href="/portal/redeem-code" className={buttonClass('secondary', 'md', 'mt-3 w-full sm:w-auto')}>
            兌換權限代碼
          </Link>
        </section>
        <section className="min-w-0" aria-labelledby="support-faq">
          <h2 id="support-faq" className="mb-3 text-lg font-bold text-ink">
            常見問題
          </h2>
          <div className="grid gap-3">
            {faq.map((item) => (
              <details key={item.question} className="rounded-card border border-border-gray bg-surface px-4 py-1">
                <summary className="cursor-pointer py-3 text-sm font-semibold text-ink">{item.question}</summary>
                <p className="pb-3 text-sm text-slate-gray">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
