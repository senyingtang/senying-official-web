import { cardClass } from '@syt/ui';
import type { ReactNode } from 'react';

export interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  columns?: 1 | 2;
}

export function FormSection({ title, description, children, footer, columns = 2 }: FormSectionProps) {
  return (
    <section className={`${cardClass} min-w-0`}>
      <div className="mb-5">
        <h2 className="text-lg font-bold text-ink">{title}</h2>
        {description && <p className="mt-1 text-sm text-slate-gray">{description}</p>}
      </div>
      <div className={`grid gap-4 ${columns === 2 ? 'md:grid-cols-2' : ''}`}>{children}</div>
      {footer && <div className="mt-6 flex flex-col gap-2 border-t border-border-gray pt-4 sm:flex-row sm:flex-wrap sm:justify-end">{footer}</div>}
    </section>
  );
}
