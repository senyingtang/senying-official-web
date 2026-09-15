'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { label: '總覽', segment: '' },
  { label: '內容', segment: 'content' },
  { label: '外觀', segment: 'appearance' },
  { label: 'SEO', segment: 'seo' },
  { label: '表單', segment: 'forms' },
  { label: '網域', segment: 'domain' },
  { label: '預覽', segment: 'preview' },
  { label: '發布', segment: 'publish' },
];

/** 網站子頁籤：窄螢幕時只在頁籤列內水平捲動，頁面本身不出現水平捲軸 */
export function SiteTabs({ siteId }: { siteId: string }) {
  const pathname = usePathname();
  const base = `/portal/sites/${siteId}`;

  return (
    <nav aria-label="網站設定" className="-mx-4 overflow-x-auto border-b border-border-gray px-4 md:mx-0 md:px-0">
      <ul className="flex min-w-max gap-1">
        {TABS.map((tab) => {
          const href = tab.segment ? `${base}/${tab.segment}` : base;
          const active = tab.segment ? pathname.startsWith(href) : pathname === base;
          return (
            <li key={tab.label}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-medium ${
                  active ? 'border-teal-strong text-teal-strong' : 'border-transparent text-slate-gray hover:text-ink'
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
