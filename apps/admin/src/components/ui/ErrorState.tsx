import type { ReactNode } from 'react';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  action?: ReactNode;
}

export function ErrorState({ title = '畫面載入失敗', description = '請重新整理頁面；若持續發生，請聯絡系統管理員。', action }: ErrorStateProps) {
  return (
    <div role="alert" className="rounded-card border border-danger/30 bg-danger/10 px-4 py-6 sm:px-6">
      <p className="font-semibold text-danger-strong">{title}</p>
      <p className="mt-1 text-sm text-ink">{description}</p>
      {action && <div className="mt-4 flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}
