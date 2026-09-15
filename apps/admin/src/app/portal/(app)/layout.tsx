import type { ReactNode } from 'react';
import { PortalShell } from '@/components/shell/PortalShell';
import { requirePortalSession } from '@/lib/auth/guards';

/** layout 層 guard：已登入。各 page 另外呼叫 requirePortalPage / requireSiteAccess 檢查 workspace 與網站歸屬。 */
export default async function PortalAppLayout({ children }: { children: ReactNode }) {
  const { session, repos } = await requirePortalSession();
  const sites = await repos.customerSites.listSites();
  return (
    <PortalShell session={session} defaultSiteId={sites[0]?.id ?? null}>
      {children}
    </PortalShell>
  );
}
