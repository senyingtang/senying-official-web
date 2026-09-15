import { CMS_ADMIN_ROLE_LABELS, type AdminSession } from '@syt/auth';
import type { ReactNode } from 'react';
import { filterAdminNav } from '@/lib/navigation';
import { ShellFrame } from './ShellFrame';

/** 森映官方後台外框：session 由 requireAdminSession() 驗證後傳入；選單依角色在伺服器端過濾 */
export function AdminShell({ session, children }: { session: AdminSession; children: ReactNode }) {
  return (
    <ShellFrame
      variant="admin"
      productName="森映官方後台"
      homeHref="/admin/dashboard"
      navGroups={filterAdminNav(session.role)}
      context={<p className="truncate text-sm font-semibold text-ink">森映官方後台</p>}
      userName={session.user.displayName}
      roleLabel={CMS_ADMIN_ROLE_LABELS[session.role]}
      adminRole={session.role}
      isMock={session.mode === 'mock'}
      logoutArea="admin"
      switchHref="/portal/dashboard"
      switchLabel="切換到客戶後台"
    >
      {children}
    </ShellFrame>
  );
}
