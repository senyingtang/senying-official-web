'use client';

import { adminRouteMode, findAdminRouteRule, type CmsAdminRole } from '@syt/auth';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { PermissionNotice } from '@/components/auth/PermissionNotice';
import type { NavGroup } from '@/lib/navigation';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export interface ShellFrameProps {
  variant: 'admin' | 'portal';
  productName: string;
  homeHref: string;
  navGroups: NavGroup[];
  defaultSiteId?: string | null;
  context: ReactNode;
  userName: string;
  roleLabel?: string;
  /** 官方後台角色：只用來顯示唯讀提示；實際權限由 server guard 判斷 */
  adminRole?: CmsAdminRole | null;
  isMock: boolean;
  logoutArea: 'admin' | 'portal';
  switchHref?: string;
  switchLabel?: string;
  children: ReactNode;
}

export function ShellFrame({
  variant,
  productName,
  homeHref,
  navGroups,
  defaultSiteId,
  context,
  userName,
  roleLabel,
  adminRole,
  isMock,
  logoutArea,
  switchHref,
  switchLabel,
  children,
}: ShellFrameProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const siteMatch = pathname.match(/^\/portal\/sites\/([^/]+)/);
  const siteId = siteMatch?.[1] && siteMatch[1] !== 'new' ? siteMatch[1] : (defaultSiteId ?? null);
  const readOnly = variant === 'admin' && adminRole ? adminRouteMode(adminRole, pathname) === 'read_only' : false;

  const sidebarProps = { variant, productName, homeHref, groups: navGroups, pathname, siteId };
  const sidebarTone = variant === 'admin' ? 'bg-deep-navy text-white' : 'border-r border-border-gray bg-surface text-ink';

  return (
    <div className="min-h-dvh bg-mist-white">
      <aside data-sidebar className={`fixed inset-y-0 left-0 z-30 hidden w-64 lg:flex lg:flex-col ${sidebarTone}`}>
        <Sidebar {...sidebarProps} />
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="關閉選單" className="absolute inset-0 h-full w-full bg-navy-black/60" onClick={() => setMenuOpen(false)} />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="後台選單"
            className={`absolute inset-y-0 left-0 flex w-72 max-w-[calc(100vw-3rem)] flex-col ${variant === 'admin' ? 'bg-deep-navy text-white' : 'bg-surface text-ink'}`}
          >
            <Sidebar {...sidebarProps} onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      <div data-main className="flex min-h-dvh min-w-0 flex-col lg:pl-64">
        <Topbar
          context={context}
          userName={userName}
          roleLabel={roleLabel}
          isMock={isMock}
          logoutArea={logoutArea}
          switchHref={switchHref}
          switchLabel={switchLabel}
          onOpenMenu={() => setMenuOpen(true)}
        />
        <main id="main" className="min-w-0 flex-1 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full min-w-0 max-w-6xl">
            {readOnly && (
              <div className="mb-4">
                <PermissionNotice roleLabel={roleLabel ?? ''} note={findAdminRouteRule(pathname)?.note} />
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
