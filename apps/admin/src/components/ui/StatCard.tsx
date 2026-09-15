import { cardClass } from '@syt/ui';

export interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
}

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className={`${cardClass} min-w-0`}>
      <p className="text-sm text-slate-gray">{label}</p>
      <p className="mt-2 break-words text-2xl font-bold text-ink sm:text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-gray">{hint}</p>}
    </div>
  );
}
