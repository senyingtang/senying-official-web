import Link from 'next/link';
import { findActiveHref, resolveSiteHref, type NavGroup } from '@/lib/navigation';

export interface SidebarProps {
  variant: 'admin' | 'portal';
  productName: string;
  homeHref: string;
  groups: NavGroup[];
  pathname: string;
  siteId: string | null;
  onNavigate?: () => void;
}

export function Sidebar({ variant, productName, homeHref, groups, pathname, siteId, onNavigate }: SidebarProps) {
  const dark = variant === 'admin';
  const hrefs = groups.flatMap((group) => group.items.map((item) => resolveSiteHref(item.href, siteId)));
  const activeHref = findActiveHref(pathname, hrefs);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={`flex h-16 shrink-0 items-center gap-2 border-b px-5 ${dark ? 'border-white/10' : 'border-border-gray'}`}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal text-sm font-bold text-navy-black" aria-hidden="true">
          森
        </span>
        <Link href={homeHref} onClick={onNavigate} className="min-w-0 truncate font-bold">
          {productName}
        </Link>
      </div>
      <nav aria-label={dark ? '官方後台選單' : '客戶後台選單'} className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <div key={group.key} className="mb-4 last:mb-0">
            {groups.length > 1 && (
              <p className={`px-3 pb-1 text-xs font-semibold tracking-wide ${dark ? 'text-slate-400' : 'text-slate-gray'}`}>{group.label}</p>
            )}
            <ul className="grid gap-0.5">
              {group.items.map((item) => {
                const href = resolveSiteHref(item.href, siteId);
                const active = href === activeHref;
                const tone = dark
                  ? active
                    ? 'bg-white/10 text-teal'
                    : 'text-slate-200 hover:bg-white/5'
                  : active
                    ? 'bg-teal-soft text-teal-strong'
                    : 'text-ink hover:bg-mist-white';
                return (
                  <li key={item.label}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${tone}`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}
