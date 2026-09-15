import type { AuthArea, AuthUser } from '@syt/auth';
import { buttonClass, cardClass } from '@syt/ui';
import Link from 'next/link';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { logoutAction } from '@/lib/auth/actions';

export interface SessionStatusCardProps {
  area: AuthArea;
  user: AuthUser | null;
  roleLabel?: string | null;
  workspaceName?: string | null;
  isMock: boolean;
  loginHref: string;
}

/** 顯示目前登入狀態（只顯示 email 與角色名稱，不含 token 或權限明細） */
export function SessionStatusCard({ area, user, roleLabel, workspaceName, isMock, loginHref }: SessionStatusCardProps) {
  return (
    <section className={`${cardClass} min-w-0`} aria-labelledby="session-status-heading" data-testid="session-status">
      <h2 id="session-status-heading" className="text-base font-bold text-ink">
        登入狀態
      </h2>
      {user ? (
        <>
          <p className="mt-2 break-all text-sm text-ink">{user.email}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {roleLabel && <StatusBadge tone="teal">{roleLabel}</StatusBadge>}
            <StatusBadge>{workspaceName ?? '尚未開通工作區'}</StatusBadge>
            {isMock && <StatusBadge tone="warning">Mock</StatusBadge>}
          </div>
          <form action={logoutAction} className="mt-4">
            <input type="hidden" name="area" value={area} />
            <button type="submit" className={buttonClass('secondary', 'sm', 'w-full sm:w-auto')}>
              登出
            </button>
          </form>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-slate-gray">尚未登入。兌換代碼前需要先登入，登入後會回到這個頁面。</p>
          <Link href={loginHref} className={buttonClass('primary', 'sm', 'mt-4 w-full sm:w-auto')}>
            登入
          </Link>
        </>
      )}
    </section>
  );
}
