import { WORKSPACE_ROLE_LABELS, type PortalSession } from '@syt/auth';
import type { ReactNode } from 'react';
import { WorkspaceSwitcher } from '@/components/auth/WorkspaceSwitcher';
import { portalNav } from '@/lib/navigation';
import { ShellFrame } from './ShellFrame';

/** 客戶自助建站後台外框：選單精簡為 9 項；session 由 requirePortalSession() 驗證後傳入 */
export function PortalShell({ session, defaultSiteId, children }: { session: PortalSession; defaultSiteId: string | null; children: ReactNode }) {
  const membership = session.memberships[0];
  return (
    <ShellFrame
      variant="portal"
      productName="森映建站後台"
      homeHref="/portal/dashboard"
      navGroups={portalNav}
      defaultSiteId={defaultSiteId}
      context={<WorkspaceSwitcher memberships={session.memberships} />}
      userName={session.user.displayName}
      roleLabel={membership ? WORKSPACE_ROLE_LABELS[membership.role] : undefined}
      isMock={session.mode === 'mock'}
      logoutArea="portal"
    >
      {children}
    </ShellFrame>
  );
}
