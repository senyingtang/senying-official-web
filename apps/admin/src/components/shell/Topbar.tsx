import { badgeClass } from '@syt/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { logoutAction } from '@/lib/auth/actions';

export interface TopbarProps {
  context: ReactNode;
  userName: string;
  roleLabel?: string;
  isMock: boolean;
  logoutArea: 'admin' | 'portal';
  switchHref?: string;
  switchLabel?: string;
  onOpenMenu?: () => void;
}

export function Topbar({ context, userName, roleLabel, isMock, logoutArea, switchHref, switchLabel, onOpenMenu }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-border-gray bg-surface px-4 sm:gap-3 md:px-6 lg:px-8">
      <button
        type="button"
        onClick={onOpenMenu}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-gray text-ink lg:hidden"
        aria-label="開啟選單"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      <div className="min-w-0 flex-1">{context}</div>
      {isMock && <span className={badgeClass('warning')}>Mock</span>}
      {switchHref && switchLabel && (
        <Link href={switchHref} className="hidden whitespace-nowrap text-sm text-slate-gray hover:text-ink xl:inline">
          {switchLabel}
        </Link>
      )}
      <span className="hidden max-w-48 truncate text-sm text-ink md:inline" data-testid="session-user">
        {userName}
        {roleLabel ? `（${roleLabel}）` : ''}
      </span>
      <form action={logoutAction} className="shrink-0">
        <input type="hidden" name="area" value={logoutArea} />
        <button
          type="submit"
          data-testid="logout-button"
          className="inline-flex min-h-9 items-center whitespace-nowrap rounded-lg border border-border-gray px-3 text-sm font-medium text-ink hover:bg-mist-white"
        >
          登出
        </button>
      </form>
    </header>
  );
}
