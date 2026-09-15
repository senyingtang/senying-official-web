import type { ReactNode } from 'react';

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-border-gray bg-surface px-4 py-10 text-center sm:px-8">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-soft text-xl text-teal-strong" aria-hidden="true">
        ○
      </span>
      <p className="mt-4 text-base font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-slate-gray">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
