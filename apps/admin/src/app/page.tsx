import { BRAND } from '@syt/shared';
import { buttonClass, cardClass } from '@syt/ui';
import Link from 'next/link';

export default function EntryPage() {
  return (
    <main className="flex min-h-dvh items-center bg-mist-white px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <p className="text-sm font-semibold text-teal-strong">{BRAND.platformName}</p>
        <h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">選擇要進入的後台</h1>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <section className={cardClass}>
            <h2 className="text-lg font-bold text-ink">森映官方後台</h2>
            <p className="mt-2 text-sm text-slate-gray">CMS、商品方案、金流設定、權限代碼、版型與客戶網站管理。</p>
            <Link href="/admin/login" className={buttonClass('dark', 'md', 'mt-5 w-full sm:w-auto')}>
              進入官方後台
            </Link>
          </section>
          <section className={cardClass}>
            <h2 className="text-lg font-bold text-ink">客戶自助建站後台</h2>
            <p className="mt-2 text-sm text-slate-gray">兌換權限代碼、建立網站、編輯內容、SEO 與網域設定。</p>
            <Link href="/portal/login" className={buttonClass('primary', 'md', 'mt-5 w-full sm:w-auto')}>
              進入客戶後台
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}
