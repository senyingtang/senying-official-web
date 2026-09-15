import { buttonClass } from '@syt/ui';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/EmptyState';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center bg-mist-white px-4 py-10">
      <div className="mx-auto w-full max-w-lg">
        <EmptyState
          title="找不到這個頁面"
          description="網址可能輸入錯誤，或這個網站專案不存在。"
          action={
            <Link href="/" className={buttonClass('primary')}>
              回到後台入口
            </Link>
          }
        />
      </div>
    </main>
  );
}
