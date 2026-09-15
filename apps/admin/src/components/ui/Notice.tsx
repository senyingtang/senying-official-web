import type { ReactNode } from 'react';

const tones = {
  info: 'border-teal/30 bg-teal-soft text-ink',
  warning: 'border-warning/30 bg-warning/10 text-ink',
  danger: 'border-danger/30 bg-danger/10 text-ink',
} as const;

export function Notice({ tone = 'info', title, children }: { tone?: keyof typeof tones; title?: string; children: ReactNode }) {
  return (
    <div className={`rounded-card border px-4 py-3 text-sm sm:px-5 ${tones[tone]}`}>
      {title && <p className="font-semibold">{title}</p>}
      <div className={title ? 'mt-1' : ''}>{children}</div>
    </div>
  );
}
