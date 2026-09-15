import { cardClass } from '@syt/ui';
import Link from 'next/link';
import type { NavGroup } from '@/lib/navigation';
import { PageHeader } from '@/components/ui/PageHeader';

export function ModuleIndex({ group, description }: { group: NavGroup; description: string }) {
  return (
    <>
      <PageHeader title={group.label} description={description} />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {group.items.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className={`${cardClass} block h-full min-w-0 transition-shadow hover:shadow-card-hover`}>
              <p className="font-semibold text-ink">{item.label}</p>
              {item.description && <p className="mt-1 text-sm text-slate-gray">{item.description}</p>}
              <p className="mt-3 text-sm font-medium text-teal-strong" aria-hidden="true">
                進入 →
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
