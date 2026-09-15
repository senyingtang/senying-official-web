import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, eyebrow, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="text-sm font-medium text-teal-strong">{eyebrow}</p>}
        <h1 className="break-words text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-gray sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
