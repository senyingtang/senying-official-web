import type { ReactNode } from 'react';

export interface ForbiddenStateProps {
  title?: string;
  description?: string;
  action?: ReactNode;
}

/** 無權限狀態：guard 導回可使用頁面後顯示（?error=forbidden） */
export function ForbiddenState({ title = '沒有權限查看這個頁面', description = '你的帳號無法使用這個功能，已帶你回到可使用的頁面。', action }: ForbiddenStateProps) {
  return (
    <section role="alert" data-testid="forbidden-state" className="min-w-0 rounded-card border border-warning/30 bg-warning/10 px-4 py-4 sm:px-5">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning/20 font-bold text-warning-strong" aria-hidden="true">
          !
        </span>
        <div className="min-w-0 flex-1">
          <p className="break-words font-semibold text-ink">{title}</p>
          <p className="mt-1 break-words text-sm text-ink">{description}</p>
          {action && <div className="mt-3 flex flex-wrap gap-2">{action}</div>}
        </div>
      </div>
    </section>
  );
}
